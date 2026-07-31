const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount);

const formatDate = (date) => new Intl.DateTimeFormat("en-GB").format(new Date(date));

const getOverdueDays = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
};

const reminderConfig = {
  1: {
    header: "Payment Reminder",
    subjectSuffix: "1ST REMINDER",
    introTitle: "First Reminder",
    intro: `
      This is the <strong>First Reminder</strong> regarding an outstanding payment.
      We haven't been able to verify your payment.
      If you have already paid and shared the payment information,
      please ignore this email.
    `,
    closing: `
      We at <strong>Fab Five Network Private Limited</strong> depend on your timely
      payments in order to provide uninterrupted services and quality support.
      Please be informed that repeated or prolonged payment delays may negatively
      affect service availability, service support, and our business relationship.
    `,
    footer: `
      Please contact our Billing Team if you require any clarification.
    `,
  },

  2: {
    header: "Payment Reminder",
    subjectSuffix: "2ND REMINDER",
    introTitle: "Second Reminder",
    intro: `
      This is the <strong>Second Reminder</strong> regarding an outstanding payment.
      We still haven't been able to verify your payment.
      If payment has already been made and shared with our Billing Team,
      please ignore this email.
    `,
    closing: `
      We request you to clear the outstanding dues immediately to avoid
      interruption of services. Continued non-payment may result in suspension
      of your services.
    `,
    footer: `
      Please contact our Billing Team if you require any clarification.
    `,
  },

  3: {
    header: "Service Suspension Notice",
    subjectSuffix: "SERVICE SUSPENSION NOTICE",
    introTitle: "Final Reminder",
    intro: `
      This is our <strong>last and final reminder</strong> about an outstanding payment.
      We tried our best to communicate with you and find a solution regarding this
      delayed payment. If you are receiving this message, it means we have exhausted
      all options to prevent your service suspension.
      If you have already paid and informed
      <strong>billing@fab5network.com</strong>,
      please ignore this message.
    `,
    closing: `
      We need to verify your payment now in order to keep your services
      up and running.
      <strong>There will be no further notice.</strong>
      Please contact
      <strong>billing@fab5network.com</strong>
      immediately to avoid service interruption.
    `,
    footer: `
      Please contact our Billing Team if you require any clarification.
    `,
  },
};

export function buildReminderEmail(invoice, reminderNumber) {
  const config = reminderConfig[reminderNumber];
  if (!config) {
    throw new Error("Invalid reminder number.");
  }
  const customerName = invoice.customerSnapshot.name || "Customer";
  const subject = `${customerName.toUpperCase()} : ${invoice.invoiceNumber} - OUTSTANDING PAYMENT (${config.subjectSuffix})`;
  const overdueDays = getOverdueDays(invoice.dates.dueDate);

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background: #f5f5f5;
          padding: 20px;
          color: #333333;
          margin: 0;
        }
        .container {
          background: #ffffff;
          width: 750px; /* Fixed width forces mobile devices to scale the desktop view */
          margin: auto;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          border: 1px solid #cccccc; /* Added border to wrap everything in a box */
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-logo {
          padding: 10px 20px;
          border-bottom: 2px solid #eaeaea;
          text-align: left;
        }
        .header-title {
          background-color: #f97316;
          color: #ffffff;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          padding: 2px 30px; /* Reduced top and bottom padding significantly */
          width: 1%;
          white-space: nowrap;
          vertical-align: middle;
        }
        .content {
          padding: 25px;
        }
        .greeting {
          color: #f97316;
          font-size: 16px;
          margin-bottom: 15px;
        }
        .intro-text {
          margin-bottom: 25px;
          line-height: 1.6;
          font-size: 15px;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          text-align: left; /* Aligned left for key-value reminder details */
          font-size: 14px;
        }
        .invoice-table th {
          background-color: #f97316;
          color: #ffffff;
          padding: 12px;
          border: 1px solid #f97316;
          font-weight: bold;
          white-space: nowrap;
          width: 35%;
        }
        .invoice-table td {
          padding: 12px;
          border: 1px solid #dddddd;
          background-color: #ffffff;
          font-weight: bold; 
          color: #222222;
        }
        .footer-text {
          font-size: 14px;
          color: #555555;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .footer-text a {
          color: #f97316;
          text-decoration: none;
        }
        .bottom-banner {
          background-color: #f97316;
          padding: 12px 25px;
          text-align: left;
        }
        .bottom-banner a {
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header Section -->
        <table class="header-table">
          <tr>
            <td class="header-logo">
              <a href="https://fab5network.com" target="_blank" style="text-decoration: none; outline: none;">
                <img src="https://res.cloudinary.com/drrour6hl/image/upload/v1784807941/fab5_r0fhvg.svg"
                  alt="FAB5 Network Private Limited"
                  height="50"
                  style="height: 50px; display: inline-block;"
                />
              </a>
            </td>
            <td class="header-title">${config.header}</td>
          </tr>
        </table>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">Dear <strong>Customer</strong>,</div>
          
          <div class="intro-text">
            ${config.intro}
            <p>
              ${config.closing}
            </p>
          </div>
          
          <!-- Data Table (Vertical Layout adapted to approved styling) -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #6b7280; width: 40%; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
                Invoice No.
              </td>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff; font-weight: bold; color: #111827; font-size: 15px;">
                ${invoice.invoiceNumber}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
                Due Date
              </td>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff; font-weight: bold; color: #111827; font-size: 15px;">
                ${formatDate(invoice.dates.dueDate)} 
                <span style="color: #ef4444; font-size: 13px; margin-left: 6px; background-color: #fef2f2; padding: 2px 8px; border-radius: 12px; border: 1px solid #fee2e2;">
                  ${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">
                Outstanding Amount
              </td>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff; font-weight: 900; color: #ea580c; font-size: 18px;">
                ${formatCurrency(invoice.financials.balanceDue)}
              </td>
            </tr>
          </table>
          
          <div class="intro-text">
            <p>
              ${config.footer}
            </p>
          </div>
          
          <!-- Footer Disclaimers -->
          <div class="footer-text">
            Regards,<br>
            <span style="font-weight: bold;">Billing Team</span><br></br>
            <span style="font-weight: bold;">8929882020</span><br></br>
            <span style="font-weight: bold;">Fab Five Network Pvt. Ltd.</span>
          </div>
        </div>
        
        <!-- Orange Footer Banner -->
        <div class="bottom-banner">
          <a href="https://www.fab5network.com" target="_blank">www.fab5network.com</a>
        </div>
      </div>
    </body>
  </html>
  `;

  return {
    subject,
    html,
  };
}