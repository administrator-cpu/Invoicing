import Invoice from "../Invoice/invoice.model.js";
import catchAsync from "../../utils/catchAsync.js";
import logger from "../../utils/logger.js";
import { searchCrmCustomers, getCrmCustomerConnections } from "../../services/crm.service.js";

export const getDashboard = catchAsync(async (req, res, next) => {

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [outstanding, monthBilling, draftCount, invoiceStatus, recentInvoices, upcomingDueInvoices, paymentSummary] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          status: {
            $in: ["FINALIZED", "PARTIAL", "OVERDUE"]
          },
          "financials.balanceDue": {
            $gt: 0
          }
        }
      },
      {
        $group: {
          _id: null,
          totalOutstanding: {
            $sum: "$financials.balanceDue"
          },
          count: {
            $sum: 1
          }
        }
      }
    ]),

    Invoice.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          status: {
            $in: ["FINALIZED", "PARTIAL", "PAID", "OVERDUE"]
          },
          "dates.invoiceDate": {
            $gte: monthStart,
            $lt: monthEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: "$financials.grandTotal"
          },
          count: {
            $sum: 1
          }
        }
      }
    ]),

    Invoice.countDocuments({
      status: "DRAFT",
      isDeleted: { $ne: true }
    }),

    Invoice.aggregate([
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1
          }
        }
      }
    ]),

    Invoice.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "invoiceNumber customerSnapshot.name financials.grandTotal financials.balanceDue status dates.invoiceDate dates.dueDate"
      ),

    Invoice.find({
      isDeleted: { $ne: true },
      status: {
        $in: ["FINALIZED", "PARTIAL", "OVERDUE"]
      },
      "financials.balanceDue": {
        $gt: 0
      },
      "dates.dueDate": {
        $gte: new Date()
      }
    }).sort({
      "dates.invoiceDate": -1
    }).limit(5).select("invoiceNumber customerSnapshot.name financials.balanceDue status dates.dueDate"),

    Invoice.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          status: {
            $in: ["FINALIZED", "PARTIAL", "PAID", "OVERDUE"]
          }
        }
      },
      {
        $group: {
          _id: null,

          collected: {
            $sum: "$financials.amountPaid"
          },

          outstanding: {
            $sum: "$financials.balanceDue"
          },

          totalBilled: {
            $sum: "$financials.grandTotal"
          }
        }
      }
    ])
  ]);

  const statusSummary = {
    draft: 0,
    finalized: 0,
    partial: 0,
    paid: 0,
    cancelled: 0,
    overdue: 0
  };

  invoiceStatus.forEach((item) => {
    switch (item._id) {
      case "DRAFT":
        statusSummary.draft = item.count;
        break;
      case "FINALIZED":
        statusSummary.finalized = item.count;
        break;
      case "PARTIAL":
        statusSummary.partial = item.count;
        break;
      case "PAID":
        statusSummary.paid = item.count;
        break;
      case "CANCELLED":
        statusSummary.cancelled = item.count;
        break;
      case "OVERDUE":
        statusSummary.overdue = item.count;
        break;
      default:
        break;
    }
  });

  const payment = paymentSummary[0] || { collected: 0, outstanding: 0, totalBilled: 0 };

  const collectionPercentage = payment.totalBilled > 0
    ? Number(((payment.collected / payment.totalBilled) * 100).toFixed(2))
    : 0;

  res.status(200).json({
    status: "success",
    generatedAt: new Date(),
    data: {
      hero: {
        outstanding: {
          amount: outstanding[0]?.totalOutstanding || 0,
          count: outstanding[0]?.count || 0
        },
        monthBilling: {
          amount: monthBilling[0]?.totalAmount || 0,
          count: monthBilling[0]?.count || 0
        },
        drafts: {
          count: draftCount
        },
        finalized: statusSummary.finalized,
        paid: statusSummary.paid
      },
      invoiceStatus: statusSummary,
      payments: {
        collected: payment.collected || 0,
        outstanding: payment.outstanding || 0,
        totalBilled: payment.totalBilled || 0,
        collectionPercentage
      },
      recentInvoices,
      upcomingDueInvoices,
      recentActivity: []
    }
  });

});

export const getPendingBillableCustomers = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

  const now = new Date();
  const billingCycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const billingCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const billedCustomerIds = await Invoice.distinct(
    "customerSnapshot.crmCustomerId",
    {
      isDeleted: { $ne: true },
      status: { $ne: "CANCELLED" },
      "dates.billingCycleStart": {
        $gte: billingCycleStart,
        $lt: billingCycleEnd,
      },
    }
  );

  const billedCustomerSet = new Set(
    billedCustomerIds.map(id => String(id))
  );

  const crmResponse = await searchCrmCustomers("", 1, 1000, "recent");

  const allCustomers = crmResponse.customers || [];

  const customersWithoutInvoice = allCustomers.filter(customer => {
    const customerId = String(customer._id || customer.id);
    return !billedCustomerSet.has(customerId);
  });

  const pendingCustomers = (
    await Promise.all(
      customersWithoutInvoice.map(async customer => {
        const customerId = customer._id || customer.id;

        try {
          const connectionData = await getCrmCustomerConnections(customerId);

          if (!connectionData?.count) {
            return null;
          }

          return {
            ...customer,
            connectionCount: connectionData.count,
          };
        } catch (error) {
          logger.error("Failed to fetch CRM connections", {
            customerId,
            customerName: customer.name,
            status: error.response?.status,
            response: error.response?.data,
            message: error.message,
          });

          return null;
        }
      })
    )
  ).filter(Boolean);

  const totalResults = pendingCustomers.length;
  const totalPages = Math.ceil(totalResults / limit);

  const paginatedCustomers = pendingCustomers.slice((page - 1) * limit, page * limit);

  res.status(200).json({
    status: "success",
    source: "api",

    pagination: {
      page,
      limit,
      totalResults,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },

    data: paginatedCustomers,
  });
});