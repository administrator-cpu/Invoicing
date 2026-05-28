import Invoice from '../Invoice/invoice.model.js';
import catchAsync from '../utils/catchAsync.js';

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export const getDashboardStats = catchAsync(async (req, res, next) => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueData,
    totalInvoicesCount,
    uniqueCustomers,
    pendingDraftsCount,
    recentInvoices,
    statusDistribution
  ] = await Promise.all([
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ['FINALIZED', 'PAID', 'PARTIAL'] },
          'dates.invoiceDate': { $gte: firstDayOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$financials.grandTotal' }
        }
      }
    ]),

    Invoice.countDocuments({ status: { $ne: 'DRAFT' } }),

    Invoice.distinct('customerSnapshot.crmCustomerId', { status: { $ne: 'CANCELLED' } }),

    Invoice.countDocuments({ status: 'DRAFT' }),

    Invoice.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber customerSnapshot.name financials.grandTotal status dates.invoiceDate'),

    Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const distributionMap = { PAID: 0, FINALIZED: 0, DRAFT: 0, CANCELLED: 0 };
  statusDistribution.forEach(item => {
    if (distributionMap[item._id] !== undefined) {
      distributionMap[item._id] = item.count;
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        mtdRevenue: revenueData.length > 0 ? round2(revenueData[0].total) : 0,
        invoicesGenerated: totalInvoicesCount,
        activeCustomers: uniqueCustomers.length,
        pendingDrafts: pendingDraftsCount
      },
      recentInvoices,
      distribution: distributionMap
    }
  });
});