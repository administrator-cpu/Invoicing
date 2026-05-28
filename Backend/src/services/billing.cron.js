import cron from 'node-cron';
import logger from '../utils/logger.js';
import CompanyProfile from '../CompanyProfile/companyProfile.model.js';
import Invoice from '../Invoice/invoice.model.js';
import { searchCrmCustomers, getCrmCustomerConnections } from './crm.service.js';
import { calculateTaxes } from '../utils/invoiceCalculator.js';

const generateMonthlyDrafts = async () => {
  logger.info("Starting automated monthly draft generation...");

  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    periodEnd.setHours(23, 59, 59, 999);

    logger.info(`Billing Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    const defaultCompany = await CompanyProfile.findOne({ isActive: true });
    if (!defaultCompany) {
      throw new Error("No active Company Profile found. Cannot run automated billing.");
    }

    let allCustomers = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const crmResponse = await searchCrmCustomers('', currentPage, 50);
      allCustomers = [...allCustomers, ...crmResponse.customers];
      totalPages = crmResponse.pagination.pages;
      currentPage++;
    } while (currentPage <= totalPages);

    logger.info(`Fetched ${allCustomers.length} customers from CRM.`);

    let draftsCreated = 0;

    for (const customer of allCustomers) {

      const connections = await getCrmCustomerConnections(customer._id);

      if (!connections || connections.length === 0) continue;

      let subTotal = 0;
      const processedItems = [];

      connections.forEach(conn => {
        const calculatedData = calculateConnectionProRata(conn, periodStart, periodEnd);

        if (calculatedData.amount > 0) {
          subTotal += calculatedData.amount;
          calculatedData.lineItems.forEach(line => {
            processedItems.push({
              connectionId: calculatedData.connectionId,
              fabCircuitId: calculatedData.fabCircuitId,
              description: line.description,
              sacCode: "998422",
              periodStart: line.periodStart,
              periodEnd: line.periodEnd,
              billedDays: line.billedDays,
              rate: line.rate,
              amount: line.amount
            });
          });
        }
      });

      if (subTotal === 0) continue;

      const customerBillingProfile = customer.billingProfile?.[0] || {};
      const customerState = customerBillingProfile.address?.state || "";
      const companyState = defaultCompany.address.state;

      const applyIgst = customerState.trim().toLowerCase() !== companyState.trim().toLowerCase();
      const taxes = calculateTaxes(subTotal, applyIgst);
      const grandTotal = subTotal + taxes.totalTax;

      const draftSequence = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `AUTO-DRAFT-${Date.now().toString().slice(-4)}-${draftSequence}`;

      await Invoice.create({
        invoiceNumber,
        status: 'DRAFT',
        dates: {
          invoiceDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
          billingCycleStart: periodStart,
          billingCycleEnd: periodEnd
        },
        companySnapshot: {
          profileId: defaultCompany._id,
          label: defaultCompany.label,
          gstNumber: defaultCompany.gstNumber,
          address: defaultCompany.address
        },
        customerSnapshot: {
          crmCustomerId: customer._id,
          name: customer.name,
          email: customer.email,
          billingProfile: customerBillingProfile
        },
        items: processedItems,
        financials: {
          subTotal,
          taxes,
          grandTotal,
          amountPaid: 0,
          balanceDue: grandTotal
        },
        // createdBy: adminId // Uncomment if Schema strictly requires a valid ObjectId
      });

      draftsCreated++;
    }

    logger.info(`Automated billing complete. ${draftsCreated} DRAFT invoices generated.`);

  } catch (error) {
    logger.error("Error running monthly billing cron", { error: error.message });
  }
};

export const initBillingCron = () => {
  if (process.env.ENABLE_BILLING_CRON === "true") {
    cron.schedule('0 0 1 * *', generateMonthlyDrafts, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });
    logger.info("Monthly Billing Cron Job Initialized (Active)");
  } else {
    logger.warn("Monthly Billing Cron Job is DISABLED in environment variables.");
  }
};