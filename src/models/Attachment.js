const mongoose = require("mongoose");
const { Schema } = mongoose;

const attachmentSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    label: { type: String, default: "" },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attachment", attachmentSchema);
