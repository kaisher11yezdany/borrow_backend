const mongoose = require("mongoose");
const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ["note", "comment"], default: "note" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
