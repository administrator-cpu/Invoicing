import catchAsync from "../../utils/catchAsync.js";
import { getInvoiceEmailHistory, getCreditNoteEmailHistory } from "./emailLog.service.js";

const formatEmailHistory = (history) => history.map(email => ({
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
}));

export const getInvoiceHistory = catchAsync(async (req, res, next) => {
  const history = await getInvoiceEmailHistory(req.params.id);

  res.status(200).json({
    status: "success",
    result: history.length,
    data: formatEmailHistory(history)
  });
});

export const getCreditNoteHistory = catchAsync(async (req, res, next) => {
  const history = await getCreditNoteEmailHistory(req.params.id);

  res.status(200).json({
    status: "success",
    result: history.length,
    data: formatEmailHistory(history)
  });
});