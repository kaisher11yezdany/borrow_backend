const mongoose = require("mongoose");
const { STAGES } = require("../config/constants");
const { Schema } = mongoose;

const stageHistoryEntrySchema = new Schema(
  { stage: { type: String, enum: STAGES }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const verificationSchema = new Schema(
  {
    status: { type: String, default: "pending" }, // pending | duplicate_flag | verified | rejected | not_applicable | draft
    note: { type: String, default: "" },
    history: [
      {
        status: String,
        note: String,
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { _id: false }
);

const disbursementSchema = new Schema(
  {
    date: { type: Date, default: null },
    amount: { type: Number, default: 0 },
    proofPhotoUrl: { type: String, default: null },
    proofNote: { type: String, default: "" },
  },
  { _id: false }
);

const closureSchema = new Schema(
  {
    status: { type: String, enum: ["open", "withdrawn", "declined"], default: "open" },
    reason: { type: String, default: "" },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: null },
  },
  { _id: false }
);

const leadSchema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    altPhone: { type: String, default: "" },
    email: { type: String, default: "" },

    product: { type: String, required: true },
    productColor: { type: String, default: "#3B82F6" },
    loanType: { type: String, enum: ["Secure", "Unsecure"], default: "" },
    loanAmount: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },
    employmentType: { type: String, enum: ["Salaried", "Self-employed"], default: "Salaried" },

    leadSource: { type: String, enum: ["Walk-in", "Referral", "Digital Marketing"], default: "Referral" },
    leadChannel: { type: String, default: "" },
    city: { type: String, default: "" },
    occupation: { type: String, default: "" },
    notes: { type: String, default: "" },

    partnerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    stage: { type: String, enum: STAGES, default: STAGES[0] },
    stageHistory: { type: [stageHistoryEntrySchema], default: () => [{ stage: STAGES[0], at: new Date() }] },

    bankName: { type: String, default: "" },
    sanctionAmount: { type: Number, default: 0 },
    dsaCode: { type: String, default: "" },
    appId: { type: String, default: "" },

    disbursement: { type: disbursementSchema, default: () => ({}) },
    verificationProofUrl: { type: String, default: null },

    verification: { type: verificationSchema, default: () => ({ status: "pending" }) },
    finalVerification: { type: verificationSchema, default: () => ({ status: "not_applicable" }) },
    closure: { type: closureSchema, default: () => ({}) },
  },
  { timestamps: true }
);

leadSchema.index({ phone: 1 });
leadSchema.index({ partnerId: 1 });
leadSchema.index({ "closure.status": 1 });

module.exports = mongoose.model("Lead", leadSchema);
