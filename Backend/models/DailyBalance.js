import mongoose from "mongoose"

const dailyBalanceSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    countedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    difference: {
      type: Number,
      default: function () {
        return this.countedAmount - this.expectedAmount
      },
    },
    status: {
      type: String,
      enum: ["verified", "discrepancy"],
      required: true,
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sales",
      },
    ],
    discrepancyNote: {
      type: String,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure one balance per cashier per day
dailyBalanceSchema.index({ cashier: 1, date: 1 }, { unique: true })

export default mongoose.model("DailyBalance", dailyBalanceSchema)
