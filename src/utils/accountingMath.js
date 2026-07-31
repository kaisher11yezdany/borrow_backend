function acctBasisAmount(lead) {
  return lead.disbursement.amount || lead.sanctionAmount || lead.loanAmount || 0;
}
function calcExpectedFromRate(lead, ratePct) {
  return Math.round(((ratePct || 0) / 100) * acctBasisAmount(lead));
}
function installmentsTotal(entry) {
  return (entry?.installments || []).reduce((s, i) => s + Number(i.amount || 0), 0);
}
function entryBalance(entry) {
  return (entry?.expectedAmount || 0) - installmentsTotal(entry);
}
function entryStatusLabel(entry, doneLabel) {
  const total = installmentsTotal(entry);
  if (total <= 0) return entry?.invoiceRaised ? "Invoice Sent" : "Pending";
  if (total < (entry?.expectedAmount || 0)) return "Partially " + doneLabel;
  return doneLabel;
}
function latestInstallmentDate(entry) {
  const dates = (entry?.installments || []).map((i) => i.date).filter(Boolean);
  return dates.length ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))) : null;
}
function totalExpenses(expenses) {
  return (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
}
function grossRevenue(entriesByField) {
  return installmentsTotal(entriesByField.receivable) + installmentsTotal(entriesByField.serviceFee);
}
function netRevenue(entriesByField, expenses) {
  return (
    grossRevenue(entriesByField) -
    installmentsTotal(entriesByField.payable) -
    installmentsTotal(entriesByField.managerComp) -
    totalExpenses(expenses)
  );
}

const ACCT_FIELD_LABELS = {
  receivable: { done: "Received", account: "Received into", hasRate: true, isOutgoing: false },
  payable: { done: "Paid", account: "Paid from", hasRate: true, isOutgoing: true },
  managerComp: { done: "Paid", account: "Paid from", hasRate: false, isOutgoing: true },
  serviceFee: { done: "Received", account: "Received into", hasRate: false, isOutgoing: false },
};

module.exports = {
  acctBasisAmount,
  calcExpectedFromRate,
  installmentsTotal,
  entryBalance,
  entryStatusLabel,
  latestInstallmentDate,
  totalExpenses,
  grossRevenue,
  netRevenue,
  ACCT_FIELD_LABELS,
};
