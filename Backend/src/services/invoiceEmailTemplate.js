export const buildInvoiceEmail = (invoice) => {
  const customerName = invoice.customerSnapshot?.name || "Customer";
  const invoiceNumber = invoice.invoiceNumber;
  const amount = invoice.financials?.grandTotal ? invoice.financials.grandTotal.toFixed(2) : "0.00";
  const isCancelled = invoice.status === "CANCELLED";

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString("en-IN") : "N/A";
  };

  const invoiceDate = formatDate(invoice.dates?.invoiceDate);
  const dueDate = formatDate(invoice.dates?.dueDate);
  const billingCycleStart = formatDate(invoice.dates?.billingCycleStart);
  const billingCycleEnd = formatDate(invoice.dates?.billingCycleEnd);

  const subject = `${customerName}: ${invoiceNumber}`;

  const introMessage = isCancelled
    ? "This is to inform you that the invoice recently issued to you is being <strong>cancelled</strong> due to necessary corrections in the billing details.<br><br>A revised invoice with the corrected details will be issued and shared with you shortly."
    : "Please find the attached invoice(s) generated for the services.";

  const footerMessage = isCancelled
    ? "We regret any inconvenience caused and request you to kindly disregard the earlier invoice.<br><br>Thank you for your cooperation and understanding."
    : 'In case of any discrepancy with the invoice, would request you to write an email to <a href="mailto:billing@fab5network.com">billing@fab5network.com</a> on or before due date. Post due date it will be assumed the invoices are accurate.';

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
          text-align: center;
          font-size: 14px;
        }
        .invoice-table th {
          background-color: #f97316;
          color: #ffffff;
          padding: 12px;
          border: 1px solid #f97316;
          font-weight: bold;
          white-space: nowrap;
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
            <td class="header-title">${isCancelled ? 'Cancellation Notification' : 'Invoice Notification'}</td>
          </tr>
        </table>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">Dear customer,</div>
          
          <div class="intro-text">
            <strong>Greetings from FAB5!</strong><br>
            ${introMessage}
          </div>
          
          <!-- Data Table (Fixed layout for scaling) -->
          <table class="invoice-table">
            <tr>
              <th>Invoice No.</th>
              <th>Invoice Date</th>
              ${!isCancelled ? '<th>Due Date</th>' : ''}
              <th>Invoice Amount</th>
              <th>Period</th>
              ${isCancelled ? '<th>Status</th>' : ''}
            </tr>
            <tr>
              <td>${invoiceNumber}</td>
              <td>${invoiceDate}</td>
              ${!isCancelled ? `<td>${dueDate}</td>` : ''}
              <td>₹ ${amount}</td>
              <td>${billingCycleStart} To ${billingCycleEnd}</td>
              ${isCancelled ? '<td style="color: #ef4444;">CANCELLED</td>' : ''}
            </tr>
          </table>
          
          <!-- Footer Disclaimers -->
          <div class="footer-text">
            ${footerMessage}<br>
            Regards,<br>
            <span style="font-weight: bold;">Billing Team</span><br></br>
            <span style="font-weight: bold;">8929882020</span><br></br>
            <span style="font-weight: bold;">FAB Five Network Pvt. Ltd.</span>
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
};