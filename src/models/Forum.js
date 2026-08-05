const mongoose = require("mongoose");
const { Schema } = mongoose;

const forumMessageSchema = new Schema(
  {
    forumId: { type: Schema.Types.ObjectId, ref: "Forum", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, default: "" },
    message: { type: String, required: true },
    attachmentUrl: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  }
);

const forumSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, unique: true },
    leadName: { type: String, required: true },

    // Forum Link & Sharing
    uniqueToken: { type: String, required: true, unique: true },
    isShared: { type: Boolean, default: false },
    sharedWith: [
      {
        email: { type: String, required: true },
        name: { type: String, default: "" },
        accessGrantedAt: { type: Date, default: Date.now },
      }
    ],

    // Participants
    internalParticipants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    externalParticipants: [{ type: String }],

    // Messages
    messages: [forumMessageSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);

module.exports = {
  Forum: mongoose.model("Forum", forumSchema),
  ForumMessage: mongoose.model("ForumMessage", forumMessageSchema),
};
