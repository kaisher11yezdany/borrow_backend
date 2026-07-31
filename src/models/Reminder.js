const mongoose = require("mongoose");
const { Schema } = mongoose;

const reminderSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    date: { type: Date, required: true },
    caseDetails: { type: String, required: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
