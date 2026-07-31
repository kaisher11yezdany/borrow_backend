const mongoose = require("mongoose");
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    customerName: { type: String, default: "" },
    message: { type: String, required: true },
    stakeholderIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

notificationSchema.index({ stakeholderIds: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
