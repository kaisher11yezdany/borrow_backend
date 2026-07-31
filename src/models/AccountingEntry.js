const mongoose = require("mongoose");
const { ACCT_FIELDS } = require("../config/constants");
const { Schema } = mongoose;

const installmentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    bankAccount: { type: String, default: "" },
    note: { type: String, default: "" },
    isAdvance: { type: Boolean, default: false },
    reconciled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const accountingEntrySchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    field: { type: String, enum: ACCT_FIELDS, required: true },
    ratePct: { type: Number, default: 0 },
    expectedAmount: { type: Number, default: 0 },
    invoiceRaised: { type: Boolean, default: false },
    installments: { type: [installmentSchema], default: [] },
  },
  { timestamps: true }
);

accountingEntrySchema.index({ leadId: 1, field: 1 }, { unique: true });

module.exports = mongoose.model("AccountingEntry", accountingEntrySchema);
