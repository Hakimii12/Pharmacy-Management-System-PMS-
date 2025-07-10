// Helper function to transform sales records
function transformSalesRecords(records) {
  const groupedOrders = {};
  
  records.forEach(record => {
    const transactionId = record.transactionId;
    
    if (!groupedOrders[transactionId]) {
      groupedOrders[transactionId] = {
        id: transactionId,
        patientName: record.patientName, // Now available
        items: [],
        totalAmount: 0,
        timestamp: record.timestamp,
        pharmacist: record.pharmacist.name,
        status: record.status
      };
    }

    // Create item structure
    const item = {
      id: record.product._id,
      name: record.product.name,
      brand: record.product.brand,
      category: record.product.category,
      dosageForm: record.product.dosageForm, // Not in your schema
      quantitySold: record.quantitySold,
      saleAmount: record.saleAmount / record.quantitySold, // Per unit price
      total: record.saleAmount
    };

    groupedOrders[transactionId].items.push(item);
    groupedOrders[transactionId].totalAmount += record.saleAmount;
  });

  return Object.values(groupedOrders);
}
export default transformSalesRecords