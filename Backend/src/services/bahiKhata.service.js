import axios from "axios";
import logger from "../utils/logger.js";
import AppError from "../utils/AppError.js";

const BAHI_KHATA_URL = process.env.BAHI_KHATA_URL;
const INTERNAL_BAHIKHATA_SECRET = process.env.INTERNAL_BAHIKHATA_SECRET;

export const getCustomerOutstandingBalance = async (crmId) => {
  if (!crmId) {
    throw new Error("Missing CRM ID");
  }

  try {
    const response = await axios.get(
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
    const response = await axios.post(`${BAHI_KHATA_URL}/integration/invoices/sync`,
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

export const deleteInvoiceFromBahiKhata = async (invoiceNo) => {
  if (!invoiceNo) {
    throw new Error("Missing invoice number");
  }

  try {
    const response = await axios.delete(`${BAHI_KHATA_URL}/integration/invoices/sync/${encodeURIComponent(invoiceNo)}`,
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

export const syncFinalizedInvoiceToBahiKhata = (invoice) => {
  const crmId = invoice.customerSnapshot?.crmCustomerId;

  if (!crmId || !invoice.invoiceNumber) {
    logger.error("Cannot sync finalized invoice to Bahi Khata. Missing required data.", {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      crmId,
    });

    return;
  }

  void syncInvoiceToBahiKhata({
    crmId,
    invoiceNo: invoice.invoiceNumber,
    date: invoice.dates?.invoiceDate,
    amount: invoice.financials?.grandTotal,
    description: 'Monthly Invoice',
  }).catch((error) => {
    logger.error("Background Bahi Khata invoice sync failed.", {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      crmId,
      message: error.message,
    });
  });
};