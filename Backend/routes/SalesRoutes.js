import express from "express";
import { prepareSale,savePreparedSale,confirmSale,abortSale,closeDailyBalance } from "../controllers/SalesController.js";
const router = express.Router();
router.post("/prepare", async (req, res) => {
  try {
    const preparedSale = await prepareSale(req.body.items, req.user.id);
    res.json(preparedSale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.post("/save-prepared", async (req, res) => {
  try {
    const result = await savePreparedSale(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/confirm/:transactionId", async (req, res) => {
  try {
    const result = await confirmSale(req.params.transactionId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Abort prepared sale
router.post("/abort/:transactionId", async (req, res) => {
  try {
    const result = await abortSale(req.params.transactionId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Close daily balance
router.post("/close-balance", async (req, res) => {
  try {
    const result = await closeDailyBalance(req.user.id, req.body.countedAmount);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;