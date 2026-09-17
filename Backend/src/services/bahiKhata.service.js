import axios from "axios";
import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import CreditNote from "../modules/CreditNote/creditNote.model.js";

const BAHI_KHATA_URL = process.env.BAHI_KHATA_URL;
const INTERNAL_BAHIKHATA_SECRET = process.env.INTERNAL_BAHIKHATA_SECRET;

const bahiKhataClient = axios.create({ timeout: 15000 });

export const getCustomerOutstandingBalance = async (crmId) => {
  if (!crmId) {
    throw new Error("Missing CRM ID");
  }

  try {
    const response = await bahiKhataClient.get(
      `${BAHI_KHATA_URL}/integration/customers/crm/${crmId}/outstanding`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_BAHIKHATA_SECRET,
        },
      }
    );

    return response.data.data.outstandingBalance;
  } catch (error) {
    if (error.response?.status === 404) {
      logger.error(error.response?.data?.message || error.message);
      return 0;
    }

    console.error(
      "Failed to fetch customer outstanding balance:",
      error.response?.data?.message || error.message
    );

    throw error;
  }
};

export const syncInvoiceToBahiKhata = async ({ crmId, invoiceNo, date, amount, description = null, }) => {
  if (!crmId) {
    throw new Error("Missing CRM ID");
  }

  if (!invoiceNo) {
    throw new Error("Missing invoice number");
  }

  if (amount == null) {
    throw new Error("Missing invoice amount");
  }

  try {
    const response = await bahiKhataClient.post(`${BAHI_KHATA_URL}/integration/invoices/sync`,
      { crmId, invoiceNo, date, amount, description },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_BAHIKHATA_SECRET,
        }
      }
    );

    logger.info("Invoice synced to Bahi Khata.", {
      invoiceNo,
      crmId,
      amount,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    logger.error("Failed to sync invoice to Bahi Khata.", {
      invoiceNo,
      crmId,
      amount,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    throw error;
  }
};

export const syncCreditNoteToBahiKhata = async ({ crmId, creditNoteNo, date, amount, description = null }) => {
  if (!crmId) {
    throw new Error("Missing CRM ID");
  }

  if (!creditNoteNo) {
    throw new Error("Missing credit note number");
  }

  if (amount == null) {
    throw new Error("Missing credit note amount");
  }

  try {
    const response = await bahiKhataClient.post(`${BAHI_KHATA_URL}/integration/webhook/credit-note`,
      { crmId, creditNoteNo, date, amount, description },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_BAHIKHATA_SECRET,
        }
      }
    );

    logger.info("Credit note synced to Bahi Khata.", {
      creditNoteNo,
      crmId,
      amount,
      status: response.status,
    });

    return response.data;
  } catch (error) {
    logger.error("Failed to sync credit note to Bahi Khata.", {
      creditNoteNo,
      crmId,
      amount,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    throw error;
  }
};

export const deleteInvoiceFromBahiKhata = async (invoiceNo) => {
  if (!invoiceNo) {
    throw new Error("Missing invoice number");
  }

  try {
    const response = await bahiKhataClient.delete(`${BAHI_KHATA_URL}/integration/invoices/sync/${encodeURIComponent(invoiceNo)}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_BAHIKHATA_SECRET,
        },
      }
    );

    logger.info("Invoice removed from Bahi Khata.", { invoiceNo, status: response.status, });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    logger.error("Failed to remove invoice from Bahi Khata.", {
      invoiceNo,
      status,
      message: error.response?.data?.message || error.message,
    });

    if (status === 400) {
      throw new AppError("Cannot cancel invoice: Payments are already logged against this bill in Bahi Khata. Remove ledger payments first.", 400);
    }
    throw error;
  }
};

// Syncs a finalized invoice to Bahi Khata and persists the outcome on the
// invoice document (ledgerSyncStatus/ledgerSyncedAt/ledgerSyncError/
// ledgerEntryId/ledgerSyncAttempts) so it's visible on the invoice details
// page and can be manually retried, instead of only ever existing in logs.
export const syncInvoiceLedger = async (invoice) => {
  const crmId = invoice.customerSnapshot?.crmCustomerId;

  if (!crmId || !invoice.invoiceNumber) {
    const message = "Missing CRM customer ID or invoice number.";
    logger.error("Cannot sync invoice to Bahi Khata. Missing required data.", {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      crmId,
    });

    const update = { ledgerSyncStatus: "FAILED", ledgerSyncError: message };
    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  }

  try {
    const response = await syncInvoiceToBahiKhata({
      crmId,
      invoiceNo: invoice.invoiceNumber,
      date: invoice.dates?.invoiceDate,
      amount: invoice.financials?.grandTotal,
      description: "Monthly Invoice",
    });

    const ledgerEntryId = response?.data?.id ?? response?.data?.ledgerEntryId ?? null;
    const update = {
      ledgerSyncStatus: "SYNCED",
      ledgerSyncedAt: new Date(),
      ledgerSyncError: null,
      ledgerEntryId,
    };

    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  } catch (error) {
    const update = { ledgerSyncStatus: "FAILED", ledgerSyncError: error.message };
    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  }
};

// Same as syncInvoiceLedger, but for credit notes.
export const syncCreditNoteLedger = async (creditNote) => {
  const crmId = creditNote.customerId;

  if (!crmId || !creditNote.creditNoteNumber) {
    const message = "Missing CRM customer ID or credit note number.";
    logger.error("Cannot sync credit note to Bahi Khata. Missing required data.", {
      creditNoteId: creditNote._id,
      creditNoteNumber: creditNote.creditNoteNumber,
      crmId,
    });

    const update = { ledgerSyncStatus: "FAILED", ledgerSyncError: message };
    await CreditNote.updateOne(
      { _id: creditNote._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  }

  try {
    const response = await syncCreditNoteToBahiKhata({
      crmId,
      creditNoteNo: creditNote.creditNoteNumber,
      date: creditNote.effectiveDate,
      amount: creditNote.financials?.totalCreditAmount,
      description: `Credit Note for ${creditNote.invoiceNumber}`,
    });

    const ledgerEntryId = response?.data?.id ?? response?.data?.ledgerEntryId ?? null;
    const update = {
      ledgerSyncStatus: "SYNCED",
      ledgerSyncedAt: new Date(),
      ledgerSyncError: null,
      ledgerEntryId,
    };

    await CreditNote.updateOne(
      { _id: creditNote._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  } catch (error) {
    const update = { ledgerSyncStatus: "FAILED", ledgerSyncError: error.message };
    await CreditNote.updateOne(
      { _id: creditNote._id },
      { $set: update, $inc: { ledgerSyncAttempts: 1 } }
    );
    return update;
  }
};