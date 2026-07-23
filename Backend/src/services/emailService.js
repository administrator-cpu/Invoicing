import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";

function htmlToText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const RESEND_SERVICE_URL = process.env.RESEND_SERVICE_URL;
const RESEND_SERVICE_API_KEY = process.env.RESEND_SERVICE_API_KEY;
const COMPANY_NAME = process.env.COMPANY_NAME || "FAB5 Network";

if (!RESEND_SERVICE_URL) {
  logger.warn("RESEND_SERVICE_URL is missing.");
  throw new Error("RESEND_SERVICE_URL is missing.");
}

if (!RESEND_SERVICE_API_KEY) {
  logger.warn("RESEND_SERVICE_API_KEY is missing.");
  throw new Error("RESEND_SERVICE_API_KEY is missing.");
}

function normalizeEmails(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map(email => email.trim()).filter(email => email.length > 0);
  }

  return [value.trim()];
}

function validatePayload(payload) {
  const missing = [];

  if (!payload.subject) missing.push("subject");
  if (!payload.html) missing.push("html");
  if (!payload.to?.length) missing.push("to");

  if (missing.length) {
    throw new AppError(
      `Email payload missing: ${missing.join(", ")}`,
      400
    );
  }
}

export async function sendEmail(payload) {
  validatePayload(payload);

  const to = normalizeEmails(payload.to);
  const cc = normalizeEmails(payload.cc);
  const bcc = normalizeEmails(payload.bcc);

  const resendPayload = {
    to,
    subject: payload.subject,
    html: payload.html,
    text: htmlToText(payload.html),
    fromName: COMPANY_NAME,
  };

  if (cc?.length) resendPayload.cc = cc;
  if (bcc?.length) resendPayload.bcc = bcc;
  if (payload.attachments?.length) resendPayload.attachments = payload.attachments;

  logger.info(
    "Sending email through Resend Microservice",
    {
      to,
      subject: payload.subject,
      cc: cc?.length ?? 0,
      bcc: bcc?.length ?? 0,
      attachments: payload.attachments?.length ?? 0,
    }
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(RESEND_SERVICE_URL,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${RESEND_SERVICE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendPayload),
      }
    );

    if (!response.ok) {
      const error = await response.text();

      logger.error(
        "Resend Microservice returned an error",
        {
          status: response.status,
          error,
        }
      );

      throw new AppError(`Resend Microservice Error: ${response.status}`);
    }

    let result = null;

    try {
      result = await response.json();
    } catch {
      result = {};
    }
    logger.info("Email sent successfully",
      { providerId: result.id }
    );

    return result;
  } catch (error) {
    logger.error("Failed to send email",
      {
        error: error.message,
        subject: payload.subject,
        to,
      }
    );

    throw error;
  }

}