const Lead = require("../models/Lead");
const AccountingEntry = require("../models/AccountingEntry");
const Expense = require("../models/Expense");
const { ACCT_FIELDS } = require("../config/constants");
const { visibleLeadsFilter } = require("../utils/hierarchy");
const { canManageAccounting, canSeeMargin, canEditAccounting } = require("../utils/permissions");
const {
  calcExpectedFromRate,
  grossRevenue,
  netRevenue,
  ACCT_FIELD_LABELS,
} = require("../utils/accountingMath");

async function getOrCreateEntry(leadId, field) {
  return AccountingEntry.findOneAndUpdate(
    { leadId, field },
    { $setOnInsert: { leadId, field } },
    { new: true, upsert: true }
  );
}

function assertField(field, res) {
  if (!ACCT_FIELDS.includes(field)) {
    res.status(400).json({ error: "Invalid accounting field" });
    return false;
  }
  return true;
}

// Table view for the Accounting tab: paginated list of visible, non-closed leads
// with their entries + expenses + computed gross/net revenue.
async function listAccounting(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = await visibleLeadsFilter(req.user);
  filter["closure.status"] = "open";

  // Apply additional filters
  if (req.query.search && req.query.search.trim()) {
    filter.$or = [
      { customerName: { $regex: req.query.search, $options: "i" } },
      { phone: { $regex: req.query.search, $options: "i" } },
    ];
  }
  if (req.query.product && req.query.product !== "All") {
    filter.product = req.query.product;
  }
  if (req.query.sourcedBy) {
    filter.partnerId = req.query.sourcedBy;
  }
  if (req.query.stage && req.query.stage !== "Any stage") {
    filter.stage = req.query.stage;
  }

  const [leads, total, products] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
    require("../models/lookups").Product.find().lean(),
  ]);

  const leadIds = leads.map((l) => l._id);
  const [entries, expenses] = await Promise.all([
    AccountingEntry.find({ leadId: { $in: leadIds } }).lean(),
    Expense.find({ leadId: { $in: leadIds } }).lean(),
  ]);

  // Create product color map
  const productColorMap = {};
  products.forEach((p) => {
    productColorMap[p.name] = p.color || "#3B82F6";
  });

  // Populate productColor for leads that don't have it
  leads.forEach((lead) => {
    if (!lead.productColor) {
      lead.productColor = productColorMap[lead.product] || "#3B82F6";
    }
  });

  const entriesByLead = new Map();
  entries.forEach((e) => {
    const key = String(e.leadId);
    if (!entriesByLead.has(key)) entriesByLead.set(key, {});
    entriesByLead.get(key)[e.field] = e;
  });
  const expensesByLead = new Map();
  expenses.forEach((e) => {
    const key = String(e.leadId);
    if (!expensesByLead.has(key)) expensesByLead.set(key, []);
    expensesByLead.get(key).push(e);
  });

  const canEditAtAll = canManageAccounting(req.user);
  const seeMargin = canSeeMargin(req.user);

  const rows = leads.map((lead) => {
    const key = String(lead._id);
    const byField = entriesByLead.get(key) || {};
    const leadExpenses = expensesByLead.get(key) || [];
    const base = {
      lead,
      editable: canEditAtAll && lead.finalVerification.status === "verified",
      payable: byField.payable || { expectedAmount: 0, installments: [] },
    };
    if (!seeMargin) return base;
    return {
      ...base,
      receivable: byField.receivable || { expectedAmount: 0, installments: [] },
      serviceFee: byField.serviceFee || { expectedAmount: 0, installments: [] },
      managerComp: byField.managerComp || { expectedAmount: 0, installments: [] },
      expenses: leadExpenses,
      grossRevenue: grossRevenue(byField),
      netRevenue: netRevenue(byField, leadExpenses),
    };
  });

  const totalPages = Math.ceil(total / limit);
  res.json({ rows, seeMargin, canEditAtAll, total, page, totalPages });
}

async function getEntry(req, res) {
  const { leadId, field } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const entry = await getOrCreateEntry(leadId, field);
  res.json({ entry, editable: canEditAccounting(lead, req.user) });
}

async function setRate(req, res) {
  const { leadId, field } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  entry.ratePct = Number(req.body.ratePct) || 0;
  entry.expectedAmount = calcExpectedFromRate(lead, entry.ratePct);
  await entry.save();
  res.json({ entry });
}

async function setExpected(req, res) {
  const { leadId, field } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  entry.expectedAmount = Number(req.body.expectedAmount) || 0;
  await entry.save();
  res.json({ entry });
}

async function setInvoiceRaised(req, res) {
  const { leadId, field } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  entry.invoiceRaised = !!req.body.invoiceRaised;
  await entry.save();
  res.json({ entry });
}

async function addInstallment(req, res) {
  const { leadId, field } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  const b = req.body;
  const installment = {
    amount: Number(b.amount) || 0,
    date: b.date ? new Date(b.date) : new Date(),
    bankAccount: b.bankAccount || "",
    note: (b.note || "").trim(),
  };
  if (ACCT_FIELD_LABELS[field].isOutgoing) {
    installment.isAdvance = !!b.isAdvance;
    installment.reconciled = false;
  }
  entry.installments.push(installment);
  await entry.save();
  res.json({ entry });
}

async function removeInstallment(req, res) {
  const { leadId, field, idx } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  entry.installments.splice(Number(idx), 1);
  await entry.save();
  res.json({ entry });
}

async function reconcileInstallment(req, res) {
  const { leadId, field, idx } = req.params;
  if (!assertField(field, res)) return;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const entry = await getOrCreateEntry(leadId, field);
  const installment = entry.installments[Number(idx)];
  if (!installment) return res.status(404).json({ error: "Installment not found" });
  installment.reconciled = true;
  await entry.save();
  res.json({ entry });
}

module.exports = {
  listAccounting,
  getEntry,
  setRate,
  setExpected,
  setInvoiceRaised,
  addInstallment,
  removeInstallment,
  reconcileInstallment,
};
