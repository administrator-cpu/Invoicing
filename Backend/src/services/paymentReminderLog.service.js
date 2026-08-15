import PaymentReminderLog from "./paymentReminderLog.model.js";

export async function claimPaymentReminder({
  customerId,
  invoiceMonth,
  reminderNumber,
  invoiceIds,
}) {
  const existing = await PaymentReminderLog.findOne({
    customerId,
    invoiceMonth,
    reminderNumber,
  });

  if (existing) {
    if (existing.status === "SENT") {
      return {
        claimed: false,
        reason: "ALREADY_SENT",
        log: existing,
      };
    }

    if (
      existing.status === "PROCESSING" &&
      existing.processingAt
    ) {
      const processingAge =
        Date.now() - existing.processingAt.getTime();

      const fifteenMinutes = 15 * 60 * 1000;

      if (processingAge < fifteenMinutes) {
        return {
          claimed: false,
          reason: "ALREADY_PROCESSING",
          log: existing,
        };
      }
    }

    const recovered =
      await PaymentReminderLog.findOneAndUpdate(
        {
          _id: existing._id,
        },
        {
          $set: {
            status: "PROCESSING",
            processingAt: new Date(),
            invoiceIds,
            error: null,
          },
          $inc: {
            attempts: 1,
          },
        },
        {
          returnDocument: "after",
        }
      );

    return {
      claimed: true,
      log: recovered,
    };
  }

  try {
    const created = await PaymentReminderLog.create({
      customerId,
      invoiceMonth,
      reminderNumber,
      invoiceIds,
      status: "PROCESSING",
      processingAt: new Date(),
      attempts: 1,
    });

    return {
      claimed: true,
      log: created,
    };
  } catch (error) {
    if (error.code === 11000) {
      return {
        claimed: false,
        reason: "CLAIMED_BY_ANOTHER_PROCESS",
      };
    }

    throw error;
  }
}