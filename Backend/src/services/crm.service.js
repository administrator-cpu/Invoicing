import axios from 'axios';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const crmClient = axios.create({
  baseURL: process.env.CRM_API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INTERNAL_CRM_SECRET
  }
});

const handleCrmError = (error, context) => {
  if (error.response) {
    logger.error(`CRM API Error (${context}): ${error.response.status}`, { data: error.response.data });
    throw new AppError(error.response.data.message || `CRM Request Failed: ${context}`, error.response.status);
  } else if (error.request) {
    logger.error(`CRM Unreachable (${context})`, { message: error.message });
    throw new AppError('Unable to reach the CRM server. Please try again later.', 503);
  } else {
    logger.error(`CRM Setup Error (${context})`, { message: error.message });
    throw new AppError('Internal error while connecting to CRM.', 500);
  }
};

/**
 * @desc - Fetches a list of customers for the search dropdown
 * @param {String} searchQuery - The name or email to search for
 */
export const searchCrmCustomers = async (search, page, limit, sort = 'recent') => {
  try {
    const response = await crmClient.get(`/customers?search=${search}&page=${page}&limit=${limit}&sort=${sort}`);
    return response.data;
  } catch (error) {
    handleCrmError(error, 'searchCrmCustomers');
  }
};

/**
 * @desc - Fetches the full customer details, including all associated GST profiles
 * @param {String} customerId - The CRM Customer ID
 */
export const getCrmCustomerDetails = async (customerId) => {
  try {
    const response = await crmClient.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    handleCrmError(error, 'getCrmCustomerDetails');
  }
};

/**
 * @desc - Fetches all connections for a specific customer, including their history arrays
 * @param {String} customerId - The CRM Customer ID
 */
export const getCrmCustomerConnections = async (customerId) => {
  try {
    const response = await crmClient.get(`/customers/${customerId}/connections`);
    return response.data;
  } catch (error) {
    handleCrmError(error, 'getCrmCustomerConnections');
  }
};