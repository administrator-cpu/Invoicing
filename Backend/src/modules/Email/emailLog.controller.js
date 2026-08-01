import { get } from "mongoose";
import catchAsync from "../../utils/catchAsync.js";
import { getInvoiceEmailHistory } from "./emailLog.service.js";

export const getInvoiceHistory = catchAsync(async (req, res, next) => {
  const history = await getInvoiceEmailHistory(req.params.id);

  res.status(200).json({
    status: "success",
    result: history.length,
    data: history.map(email => ({
      id: email._id,
      status: email.status,
      provider: email.provider,
      providerMessageId: email.providerMessageId,
      subject: email.subject,
      recipients: email.recipients,
      attempts: email.attempts,
      error: email.error,
      sentAt: email.sentAt,
      createdAt: email.createdAt
    }))
  });
});