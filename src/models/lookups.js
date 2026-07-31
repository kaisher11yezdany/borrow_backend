const mongoose = require("mongoose");
const { Schema } = mongoose;

// Shared shape for simple admin-managed lookup lists (name + active toggle, never hard-deleted).
function nameActiveSchema(extra = {}) {
  return new Schema(
    { name: { type: String, required: true, trim: true }, active: { type: Boolean, default: true }, ...extra },
    { timestamps: true }
  );
}

const productSchema = nameActiveSchema({ color: { type: String, default: "#3B82F6" } });
productSchema.index({ name: 1 }, { unique: true });

const bankSchema = nameActiveSchema({ product: { type: String, required: true } });
bankSchema.index({ product: 1, name: 1 }, { unique: true });

const expenseTypeSchema = nameActiveSchema();
expenseTypeSchema.index({ name: 1 }, { unique: true });

const companyBankAccountSchema = nameActiveSchema();
companyBankAccountSchema.index({ name: 1 }, { unique: true });

const digitalChannelSchema = nameActiveSchema();
digitalChannelSchema.index({ name: 1 }, { unique: true });

module.exports = {
  Product: mongoose.model("Product", productSchema),
  Bank: mongoose.model("Bank", bankSchema),
  ExpenseType: mongoose.model("ExpenseType", expenseTypeSchema),
  CompanyBankAccount: mongoose.model("CompanyBankAccount", companyBankAccountSchema),
  DigitalChannel: mongoose.model("DigitalChannel", digitalChannelSchema),
};
