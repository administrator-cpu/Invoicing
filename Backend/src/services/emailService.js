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

const buildHtmlTemplate = (htmlContent) => {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">

    <div style="width: 100%; box-sizing: border-box; font-family: system-ui, Arial, sans-serif; font-size: 14px; padding: 24px; background-color: #ffffff; color: #333;">

      <div style="line-height: 1.6;">
        ${htmlContent}
      </div>

      <div style=" margin-top: 32px; padding-top: 16px; border-top: 1px solid #eaeaea; text-align: center;">
        <a href="https://fab5network.com" target="_blank" style="text-decoration: none; outline: none;">
          <img src="https://res.cloudinary.com/drrour6hl/image/upload/v1784807941/fab5_r0fhvg.svg"
            alt="FAB5 Network Private Limited"
            height="80"
            style="height: 80px; display: block; margin: 0 auto;"
          />
        </a>
        <p style="margin: 8px 0 4px; font-size: 12px; color: #999;">
          © ${currentYear} Fab Five Network Private Limited. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 12px; color: #999;">
          <a href="https://fab5network.com" style="color: #999; text-decoration: none;">
            https://fab5network.com
          </a>
        </p>
      </div>

    </div>

  </body>
</html>`;
};

export async function sendEmail(payload) {
  validatePayload(payload);

  const to = normalizeEmails(payload.to);
  const cc = normalizeEmails(payload.cc);
  const bcc = normalizeEmails(payload.bcc);

  const html = buildHtmlTemplate(payload.html);

  const resendPayload = {
    to,
    subject: payload.subject,
    html,
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