import Invoice from "../Invoice/invoice.model.js";
import catchAsync from "../../utils/catchAsync.js";

export const getDashboard = catchAsync(async (req, res, next) => {

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [outstanding, monthBilling, draftCount, invoiceStatus, recentInvoices, upcomingDueInvoices, paymentSummary] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: {
            $in: ["FINALIZED", "PARTIAL", "OVERDUE"]
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
      status: "DRAFT"
    }),

    Invoice.aggregate([
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1
          }
        }
      }
    ]),

    Invoice.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "invoiceNumber customerSnapshot.name financials.grandTotal financials.balanceDue status dates.invoiceDate dates.dueDate"
      ),

    Invoice.find({
      status: {
        $in: ["FINALIZED", "PARTIAL"]
      }
    }).sort({
      "dates.dueDate": 1
    }).limit(5).select("invoiceNumber customerSnapshot.name financials.balanceDue status dates.dueDate"),

    Invoice.aggregate([
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
        }
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