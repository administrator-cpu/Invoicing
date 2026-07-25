import AppError from "../../utils/AppError.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const sameDate = (a, b) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
};

const createCreditContext = (original, edited) => {

  const normalizedOriginal = normalizeInvoiceItem(original);
  const normalizedEdited = normalizeInvoiceItem(edited);

  const comparison = compareInvoiceItem(normalizedOriginal, normalizedEdited);

  return {
    original: normalizedOriginal,
    edited: normalizedEdited,
    comparison,
    creditItem: null
  };
};

const normalizeInvoiceItem = (item) => ({
  ...item,
  qty: Number(item.qty ?? 1),
  rate: Number(item.rate ?? 0),
  mrc: Number(item.billingMeta?.monthlyMrc ?? item.mrc ?? 0),
  periodStart: new Date(item.periodStart),
  periodEnd: new Date(item.periodEnd),
  description: item.description?.trim() ?? "",
  billingMeta: {
    ...(item.billingMeta || {}),
    monthlyMrc: Number(item.billingMeta?.monthlyMrc ?? item.mrc ?? 0)
  }
});

const compareInvoiceItem = (original, edited) => {
  const sourceType = original.sourceType;

  const originalMrc = Number(original.billingMeta?.monthlyMrc ?? original.mrc ?? 0);
  const editedMrc = Number(edited.billingMeta?.monthlyMrc ?? edited.mrc ?? 0);

  const changes = {
    description: original.description !== edited.description,
    qty: Number(original.qty) !== Number(edited.qty),
    rate: Number(original.rate) !== Number(edited.rate),
    mrc: false,
    period: !sameDate(original.periodStart, edited.periodStart) || !sameDate(original.periodEnd, edited.periodEnd),
    deleted: edited.isRemoved === true
  };

  return {
    sourceType,
    changed: Object.values(changes).some(Boolean),
    changes,
    originalMrc,
    editedMrc,
  };

};

const cloneInvoiceItem = (item) => structuredClone(item);

const toEngineItem = (invoiceItem) => {
  const engineItem = structuredClone(invoiceItem);
  delete engineItem.amount;
  delete engineItem.wasEdited;
  delete engineItem.statusSnapshot;

  return engineItem;
};

const createCreditItem = (ctx) => {
  const { original } = ctx;

  const creditItem = toEngineItem(original);

  creditItem.originalInvoiceItemId =
    original._id?.toString() ?? null;

  creditItem.creditReason = null;

  creditItem.creditMeta = {
    adjustmentType: "PARTIAL",
    generatedFrom: "DIFFERENCE"
  };

  ctx.creditItem = creditItem;

  return ctx;
};

const applyCreditChanges = (ctx) => {
  const { original, edited, comparison, creditItem } = ctx;

  if (comparison.changes.deleted) {
    creditItem.creditMeta.adjustmentType = "FULL_REVERSAL";
    ctx.creditItem = creditItem;
    return ctx;
  }

  if (comparison.changes.description) {
    creditItem.description = edited.description;
  }

  if (comparison.changes.qty) {
    creditItem.qty = Number(edited.qty);
  }

  if (comparison.changes.rate) {
    creditItem.rate = Number(edited.rate);
  }

  if (comparison.changes.period) {
    creditItem.periodStart = new Date(edited.periodStart);
    creditItem.periodEnd = new Date(edited.periodEnd);
  }

  ctx.creditItem = creditItem;
  return ctx;
};


/* Builds credit note items */
export const buildCreditNoteItems = ({ originalInvoiceItems = [], editedItems = [] }) => {
  const creditItems = [];

  const editedMap = new Map(editedItems.map(item => [
    String(item._id ?? item.originalInvoiceItemId),
    item
  ]));

  for (const original of originalInvoiceItems) {
    const edited = editedMap.get(String(original._id));
    if (!edited) continue;
    let ctx = createCreditContext(original, edited);

    if (!ctx.comparison.changed) continue;
    ctx = createCreditItem(ctx);
    ctx = applyCreditChanges(ctx);

    creditItems.push(ctx.creditItem);
  }

  return creditItems;
};