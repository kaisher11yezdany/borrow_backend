const mongoose = require("mongoose");
const { Schema } = mongoose;

const expenseSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    type: { type: String, required: true },
    amount: { type: Number, default: 0 },
    bankAccount: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
