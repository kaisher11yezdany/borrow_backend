require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Lead = require("../models/Lead");
const AccountingEntry = require("../models/AccountingEntry");
const Expense = require("../models/Expense");
const Reminder = require("../models/Reminder");
const Notification = require("../models/Notification");
const { Product, Bank, ExpenseType, CompanyBankAccount, DigitalChannel } = require("../models/lookups");

const SEED_PASSWORD = "password123";

async function run() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    AccountingEntry.deleteMany({}),
    Expense.deleteMany({}),
    Reminder.deleteMany({}),
    Notification.deleteMany({}),
    Product.deleteMany({}),
    Bank.deleteMany({}),
    ExpenseType.deleteMany({}),
    CompanyBankAccount.deleteMany({}),
    DigitalChannel.deleteMany({}),
  ]);

  async function makeUser({ name, email, role, reportsTo, phone }) {
    const user = new User({ name, email, role, reportsTo: reportsTo || null, phone: phone || "" });
    await user.setPassword(SEED_PASSWORD);
    await user.save();
    return user;
  }

  // Admin -> Branch Manager -> Sales Manager -> Team Lead -> RM -> Referral Partner.
  // Two RMs (each with their own Referral Partner) so peer-isolation is visible
  // immediately after seeding: RM-A must never see RM-B's partner's leads.
  // Backend is a cross-cutting role with no position in the tree (reportsTo: null).
  const admin = await makeUser({ name: "Praveen K C Reddy", email: "praveen@company.local", role: "Admin" });
  const backend = await makeUser({ name: "Ops Backend", email: "backend@company.local", role: "Backend" });
  const branchManager = await makeUser({ name: "Shanti", email: "shanti@company.local", role: "Branch Manager", reportsTo: admin._id });
  const salesManager = await makeUser({ name: "Roja", email: "roja@company.local", role: "Sales Manager", reportsTo: branchManager._id });
  const teamLead = await makeUser({ name: "Karthik", email: "karthik@company.local", role: "Team Lead", reportsTo: salesManager._id });
  const rmA = await makeUser({ name: "Ravi Kumar", email: "ravi@company.local", role: "RM", reportsTo: teamLead._id });
  const rmB = await makeUser({ name: "Meena", email: "meena@company.local", role: "RM", reportsTo: teamLead._id });
  const partnerA = await makeUser({ name: "Ramachandra", email: "ramachandra@company.local", role: "Referral Partner", reportsTo: rmA._id });
  const partnerB = await makeUser({ name: "Lakshmi", email: "lakshmi@company.local", role: "Referral Partner", reportsTo: rmB._id });

  await Product.insertMany([
    { name: "Home Loan", active: true },
    { name: "Personal Loan", active: true },
    { name: "Business Loan", active: true },
    { name: "Loan Against Property", active: true },
  ]);

  await Bank.insertMany([
    { product: "Home Loan", name: "HDFC Bank", active: true },
    { product: "Home Loan", name: "SBI", active: true },
    { product: "Home Loan", name: "ICICI Bank", active: true },
    { product: "Personal Loan", name: "Bajaj Finserv", active: true },
    { product: "Personal Loan", name: "HDFC Bank", active: true },
    { product: "Personal Loan", name: "Axis Bank", active: true },
    { product: "Business Loan", name: "ICICI Bank", active: true },
    { product: "Business Loan", name: "Kotak Mahindra Bank", active: true },
    { product: "Loan Against Property", name: "SBI", active: true },
    { product: "Loan Against Property", name: "LIC Housing Finance", active: true },
  ]);

  await ExpenseType.insertMany([
    { name: "Processing Fee", active: true },
    { name: "Marketing", active: true },
    { name: "Referral Bonus", active: true },
    { name: "Other", active: true },
  ]);

  await CompanyBankAccount.insertMany([{ name: "Main Business Account", active: true }]);

  await DigitalChannel.insertMany([
    { name: "WhatsApp Campaign", active: true },
    { name: "Instagram", active: true },
    { name: "Website", active: true },
    { name: "Facebook/Meta Ads", active: true },
    { name: "Google Ads", active: true },
  ]);

  await Lead.create({
    customerName: "Shyam Reddy",
    phone: "9900011111",
    product: "Business Loan",
    loanType: "Unsecure",
    loanAmount: 2500000,
    employmentType: "Self-employed",
    occupation: "Fabrication Business",
    city: "Kolar",
    partnerId: partnerA._id,
    addedBy: partnerA._id,
  });

  await Lead.create({
    customerName: "Deepa Nair",
    phone: "9900022222",
    product: "Personal Loan",
    loanType: "Unsecure",
    loanAmount: 600000,
    employmentType: "Salaried",
    occupation: "Software Engineer",
    city: "Bengaluru",
    partnerId: partnerB._id,
    addedBy: partnerB._id,
  });

  console.log("Seed complete. Login credentials (all users share the seed password):");
  console.log(`  Password: ${SEED_PASSWORD}`);
  [admin, backend, branchManager, salesManager, teamLead, rmA, rmB, partnerA, partnerB].forEach((u) =>
    console.log(`  ${u.role.padEnd(16)} ${u.email}`)
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
