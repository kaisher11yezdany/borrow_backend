const { Product, Bank, ExpenseType, CompanyBankAccount, DigitalChannel } = require("../models/lookups");
const { canManageSettings } = require("../utils/permissions");

function requireAdmin(req, res) {
  if (!canManageSettings(req.user)) {
    res.status(403).json({ error: "Not permitted to manage settings" });
    return false;
  }
  return true;
}

async function getAllSettings(req, res) {
  const [products, banks, expenseTypes, companyBankAccounts, digitalChannels] = await Promise.all([
    Product.find().sort({ name: 1 }),
    Bank.find().sort({ product: 1, name: 1 }),
    ExpenseType.find().sort({ name: 1 }),
    CompanyBankAccount.find().sort({ name: 1 }),
    DigitalChannel.find().sort({ name: 1 }),
  ]);
  const banksByProduct = {};
  banks.forEach((b) => {
    if (!banksByProduct[b.product]) banksByProduct[b.product] = [];
    banksByProduct[b.product].push(b);
  });
  res.json({ products, banksByProduct, expenseTypes, companyBankAccounts, digitalChannels });
}

// Factory for the five near-identical "name + active" lookup lists.
function lookupHandlers(Model, label) {
  return {
    add: async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const name = (req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: `${label} name is required` });
      const exists = await Model.findOne({ name: new RegExp(`^${name}$`, "i") });
      if (exists) return res.status(409).json({ error: `That ${label.toLowerCase()} already exists` });
      const doc = await Model.create({ name });
      res.status(201).json({ item: doc });
    },
    toggleActive: async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: `${label} not found` });
      doc.active = !doc.active;
      await doc.save();
      res.json({ item: doc });
    },
  };
}

const productHandlers = {
  add: async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const name = (req.body.name || "").trim();
    const color = (req.body.color || "#3B82F6").trim();
    if (!name) return res.status(400).json({ error: "Product name is required" });
    const exists = await Product.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (exists) return res.status(409).json({ error: "That product already exists" });
    const doc = await Product.create({ name, color });
    res.status(201).json({ item: doc });
  },
  toggleActive: async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const doc = await Product.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Product not found" });
    doc.active = !doc.active;
    await doc.save();
    res.json({ item: doc });
  },
  setColor: async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const color = (req.body.color || "").trim();
    if (!color) return res.status(400).json({ error: "Color is required" });
    const doc = await Product.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Product not found" });
    doc.color = color;
    await doc.save();
    res.json({ item: doc });
  },
};
const expenseTypeHandlers = lookupHandlers(ExpenseType, "Expense type");
const companyBankAccountHandlers = lookupHandlers(CompanyBankAccount, "Account");
const digitalChannelHandlers = lookupHandlers(DigitalChannel, "Channel");

async function addBank(req, res) {
  if (!requireAdmin(req, res)) return;
  const { product } = req.params;
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Bank name is required" });
  const exists = await Bank.findOne({ product, name: new RegExp(`^${name}$`, "i") });
  if (exists) return res.status(409).json({ error: "That bank is already listed" });
  const bank = await Bank.create({ product, name });
  res.status(201).json({ item: bank });
}

async function toggleBankActive(req, res) {
  if (!requireAdmin(req, res)) return;
  const bank = await Bank.findById(req.params.id);
  if (!bank) return res.status(404).json({ error: "Bank not found" });
  bank.active = !bank.active;
  await bank.save();
  res.json({ item: bank });
}

module.exports = {
  getAllSettings,
  productHandlers,
  expenseTypeHandlers,
  companyBankAccountHandlers,
  digitalChannelHandlers,
  addBank,
  toggleBankActive,
};
