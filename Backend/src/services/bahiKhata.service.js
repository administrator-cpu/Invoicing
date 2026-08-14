import axios from "axios";
import logger from "../utils/logger.js";

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