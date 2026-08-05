const KYC = require("../models/KYC");
const Lead = require("../models/Lead");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function getOrCreateKYC(req, res) {
  try {
    const { leadId } = req.params;
    let kyc = await KYC.findOne({ leadId });

    if (!kyc) {
      const lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      kyc = new KYC({ leadId });
      await kyc.save();
    }

    const lead = await Lead.findById(leadId);
    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateKYC(req, res) {
  try {
    const { leadId } = req.params;
    const { leadName, leadPhone, leadEmail, leadOccupation, leadCity, leadEmploymentType, ...kycBody } = req.body;

    let kyc = await KYC.findOne({ leadId });

    if (!kyc) {
      kyc = new KYC({ leadId, ...kycBody });
    } else {
      Object.assign(kyc, kycBody);
    }

    // Update Lead if Lead fields provided
    let lead = await Lead.findById(leadId);
    if (lead) {
      if (leadName) lead.customerName = leadName;
      if (leadPhone) lead.phone = leadPhone;
      if (leadEmail) lead.email = leadEmail;
      if (leadOccupation) lead.occupation = leadOccupation;
      if (leadCity) lead.city = leadCity;
      if (leadEmploymentType) lead.employmentType = leadEmploymentType;
      await lead.save();
    }

    kyc.updatedAt = new Date();
    await kyc.save();

    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addReference(req, res) {
  try {
    const { leadId } = req.params;
    const reference = req.body;

    let kyc = await KYC.findOne({ leadId });
    if (!kyc) kyc = new KYC({ leadId });

    kyc.references.push(reference);
    kyc.updatedAt = new Date();
    await kyc.save();

    const lead = await Lead.findById(leadId);
    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function removeReference(req, res) {
  try {
    const { leadId, referenceId } = req.params;
    const kyc = await KYC.findOne({ leadId });

    if (!kyc) return res.status(404).json({ error: "KYC not found" });

    kyc.references = kyc.references.filter((r) => r._id.toString() !== referenceId);
    kyc.updatedAt = new Date();
    await kyc.save();

    const lead = await Lead.findById(leadId);
    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function shareKYC(req, res) {
  try {
    const { leadId } = req.params;

    let kyc = await KYC.findOne({ leadId });
    if (!kyc) return res.status(404).json({ error: "KYC not found" });

    if (!kyc.uniqueToken) {
      kyc.uniqueToken = generateToken();
    }

    kyc.isShared = true;
    kyc.updatedAt = new Date();
    await kyc.save();

    const lead = await Lead.findById(leadId);
    const shareLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/kyc/${kyc.uniqueToken}`;
    res.json({ kyc, lead, shareLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function revokeAllKYCAccess(req, res) {
  try {
    const { leadId } = req.params;

    const kyc = await KYC.findOne({ leadId });
    if (!kyc) return res.status(404).json({ error: "KYC not found" });

    kyc.sharedWith = [];
    kyc.isShared = false;
    kyc.updatedAt = new Date();
    await kyc.save();

    const lead = await Lead.findById(leadId);
    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getKYCByToken(req, res) {
  try {
    const { token } = req.params;

    const kyc = await KYC.findOne({ uniqueToken: token });
    if (!kyc || !kyc.isShared) {
      return res.status(404).json({ error: "This KYC link is not accessible or has been revoked" });
    }

    const lead = await Lead.findById(kyc.leadId);
    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateKYCByToken(req, res) {
  try {
    const { token } = req.params;
    const { leadUpdates, ...kycBody } = req.body;

    const kyc = await KYC.findOne({ uniqueToken: token });
    if (!kyc || !kyc.isShared) {
      return res.status(404).json({ error: "This KYC link is not accessible or has been revoked" });
    }

    // Update Lead if leadUpdates provided
    let lead = await Lead.findById(kyc.leadId);
    if (leadUpdates && lead) {
      Object.assign(lead, leadUpdates);
      await lead.save();
    }

    // Update KYC
    Object.assign(kyc, kycBody);
    kyc.updatedAt = new Date();
    await kyc.save();

    res.json({ kyc, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getOrCreateKYC,
  updateKYC,
  addReference,
  removeReference,
  shareKYC,
  revokeAllKYCAccess,
  getKYCByToken,
  updateKYCByToken,
};
