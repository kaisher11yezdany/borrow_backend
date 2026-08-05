const mongoose = require("mongoose");
const { Schema } = mongoose;

const referenceSchema = new Schema(
  {
    name: { type: String, required: true },
    contact: { type: String, required: true },
    relationship: { type: String },
    type: { type: String, enum: ["relative", "friend"], required: true },
    address: { type: String },
  },
  { _id: true }
);

const kycSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, unique: true },

    // Additional Contact Information
    officialEmail: { type: String, default: "" },

    // Family Information
    maritalStatus: { type: String, enum: ["single", "married", "divorced", "widowed", ""], default: "" },
    spouseName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    numberOfDependents: { type: Number, default: 0 },

    // Work Experience
    workExperienceCurrentCompany: { type: String, default: "" },
    totalWorkExperience: { type: String, default: "" },

    // Address Information
    yearsAtCurrentAddress: { type: Number, default: 0 },
    yearsInCurrentCity: { type: Number, default: 0 },
    currentAddressType: { type: String, enum: ["owned", "rented", ""], default: "" },

    // Permanent Address (detailed)
    permanentAddressSTDCode: { type: String, default: "" },
    permanentMobileNumber: { type: String, default: "" },
    permanentAddress: { type: String, default: "" },
    permanentLandmark: { type: String, default: "" },

    // Current Address (optional, same as permanent if not filled)
    currentAddress: { type: String, default: "" },
    currentLandmark: { type: String, default: "" },
    sameAsPermament: { type: Boolean, default: true },

    // Company Address
    companyAddress: { type: String, default: "" },
    companyLandmark: { type: String, default: "" },

    // References
    references: [referenceSchema],

    // Sharing
    uniqueToken: { type: String, unique: true, sparse: true },
    isShared: { type: Boolean, default: false },
    sharedWith: [
      {
        email: { type: String, required: true },
        name: { type: String },
        accessGrantedAt: { type: Date, default: Date.now },
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("KYC", kycSchema);
