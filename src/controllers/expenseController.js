const Lead = require("../models/Lead");
const Expense = require("../models/Expense");
const { canEditAccounting } = require("../utils/permissions");

async function listForLead(req, res) {
  const expenses = await Expense.find({ leadId: req.params.leadId }).sort({ date: -1 });
  res.json({ expenses });
}

async function addExpense(req, res) {
  const lead = await Lead.findById(req.params.leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (!canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  const b = req.body;
  if (!b.type) return res.status(400).json({ error: "Expense type is required" });
  const expense = await Expense.create({
    leadId: lead._id,
    type: b.type,
    amount: Number(b.amount) || 0,
    bankAccount: b.bankAccount || "",
    date: b.date ? new Date(b.date) : new Date(),
  });
  res.status(201).json({ expense });
}

async function removeExpense(req, res) {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  const lead = await Lead.findById(expense.leadId);
  if (!lead || !canEditAccounting(lead, req.user)) return res.status(403).json({ error: "Accounting is locked for this lead" });
  await expense.deleteOne();
  res.json({ ok: true });
}

module.exports = { listForLead, addExpense, removeExpense };
