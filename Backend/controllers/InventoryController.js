// inventoryController.js
import Product from "../models/ProductModel.js";
import Store from "../models/StoreModel.js";
import Dispensary from "../models/DispensaryModel.js";
import Transfare from "../models/Transfer.js";
import Sales from "../models/SalesModel.js";

// Get current inventory status for a specific product
export async function GetProductInventory(req, res) {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    const store = await Store.findOne({ product: productId, isDeleted: { $ne: true } });
    const dispensary = await Dispensary.findOne({ product: productId, isDeleted: { $ne: true } });
    
    // Get recent transfers
    const recentTransfers = await Transfare.find({ product: productId })
      .sort({ date: -1 })
      .limit(10)
      .populate("user", "name");
    
    // Get recent sales
    const recentSales = await Sales.find({ product: productId, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate("pharmacist", "name")
      .populate("cashier", "name");
    
    res.json({
      product: {
        id: product._id,
        name: product.name,
        batchNo: product.batchNo,
        expiryDate: product.expiryDate
      },
      inventory: {
        store: store ? store.quantity : 0,
        dispensary: dispensary ? dispensary.quantity : 0,
        total: product.quantity
      },
      recentTransfers,
      recentSales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Calculate dispensary inventory based on transfers and sales
export async function CalculateDispensaryInventory(req, res) {
  try {
    const productId = req.params.id;
    const { startDate, endDate } = req.query;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Build date filter if provided
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }
    
    // Get all transfers to dispensary
    const issues = await Transfare.find({
      product: productId,
      type: "ISSUE_TO_DISPENSARY",
      ...dateFilter
    });
    
    // Get all returns to store
    const returns = await Transfare.find({
      product: productId,
      type: "RETURN_TO_STORE",
      ...dateFilter
    });
    
    // Get all sales from dispensary - FIXED: Use timestamp instead of completedAt
    let salesFilter = { product: productId, status: "completed" };
    
    if (startDate || endDate) {
      salesFilter.timestamp = {};  // Changed from completedAt to timestamp
      if (startDate) salesFilter.timestamp.$gte = new Date(startDate);
      if (endDate) salesFilter.timestamp.$lte = new Date(endDate);
    }
    
    const sales = await Sales.find(salesFilter);
    
    // Calculate totals
    const totalIssued = issues.reduce((sum, issue) => sum + issue.quantity, 0);
    const totalReturned = returns.reduce((sum, returnItem) => sum + returnItem.quantity, 0);
    const totalSold = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);
    
    // Get current dispensary quantity6
    const dispensary = await Dispensary.findOne({ product: productId, isDeleted: { $ne: true } });
    const currentDispensaryQty = dispensary ? dispensary.quantity : 0;
    
    // Calculate expected quantity based on transfers and sales
    const expectedDispensaryQty = totalIssued - totalReturned - totalSold;
    
    res.json({
      product: {
        id: product._id,
        name: product.name,
        batchNo: product.batchNo
      },
      calculations: {
        totalIssued,
        totalReturned,
        totalSold,
        expectedDispensaryQty,
        actualDispensaryQty: currentDispensaryQty,
        discrepancy: currentDispensaryQty - expectedDispensaryQty
      },
      timePeriod: {
        startDate: startDate || "Beginning of records",
        endDate: endDate || "Current date"
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Get inventory adjustment history
export async function GetInventoryHistory(req, res) {
  try {
    const productId = req.params.id;
    const { limit = 50 } = req.query;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Get transfers
    const transfers = await Transfare.find({ product: productId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate("user", "name");
    
    // Get sales
    const sales = await Sales.find({ product: productId, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .populate("pharmacist", "name")
      .populate("cashier", "name");
    
    // Combine and sort all events
    const allEvents = [
      ...transfers.map(t => ({
        type: "TRANSFER",
        date: t.date,
        action: t.type === "ISSUE_TO_DISPENSARY" ? "ISSUE_TO_DISPENSARY" : "RETURN_TO_STORE",
        quantity: t.quantity,
        user: t.user.name,
        details: t
      })),
      ...sales.map(s => ({
        type: "SALE",
        date: s.completedAt,
        action: "SALE",
        quantity: s.quantitySold,
        user: s.cashier ? s.cashier.name : (s.pharmacist ? s.pharmacist.name : "Unknown"),
        details: s
      }))
    ].sort((a, b) => b.date - a.date);
    
    res.json({
      product: {
        id: product._id,
        name: product.name,
        batchNo: product.batchNo
      },
      history: allEvents.slice(0, parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Reconcile inventory discrepancies
export async function ReconcileInventory(req, res) {
  try {
    const productId = req.params.id;
    const { adjustmentQty, reason, location } = req.body;
    const userId = req.user._id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    if (location === "store") {
      const store = await Store.findOne({ product: productId });
      if (!store) {
        return res.status(404).json({ message: "Store record not found" });
      }
      
      // Update store quantity
      store.quantity += adjustmentQty;
      await store.save();
      
      // Update product total quantity
      const dispensary = await Dispensary.findOne({ product: productId });
      const dispensaryQty = dispensary ? dispensary.quantity : 0;
      product.quantity = store.quantity + dispensaryQty;
      await product.save();
      
    } else if (location === "dispensary") {
      const dispensary = await Dispensary.findOne({ product: productId });
      if (!dispensary) {
        return res.status(404).json({ message: "Dispensary record not found" });
      }
      
      // Update dispensary quantity
      dispensary.quantity += adjustmentQty;
      await dispensary.save();
      
      // Update product total quantity
      const store = await Store.findOne({ product: productId });
      const storeQty = store ? store.quantity : 0;
      product.quantity = storeQty + dispensary.quantity;
      await product.save();
    } else {
      return res.status(400).json({ message: "Invalid location. Use 'store' or 'dispensary'" });
    }
    
    // Create adjustment record
    const adjustment = new Transfare({
      product: productId,
      user: userId,
      type: "INVENTORY_ADJUSTMENT",
      quantity: adjustmentQty,
      quantityLeft: location === "store" 
        ? (await Store.findOne({ product: productId })).quantity
        : (await Dispensary.findOne({ product: productId })).quantity,
      totalQuantity: product.quantity,
      adjustmentReason: reason
    });
    
    await adjustment.save();
    
    res.json({
      message: "Inventory reconciled successfully",
      adjustment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}