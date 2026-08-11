const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskCommentSchema = new Schema(
  {
    text: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Not Started", "Pending", "Progress", "Completed"],
      default: "Not Started"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    dueDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: { type: [taskCommentSchema], default: () => [] },
  },
  { timestamps: true }
);

taskSchema.index({ leadId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", taskSchema);
