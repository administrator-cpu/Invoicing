export const buildInvoiceEmail = (invoice) => {
  const companyName = invoice.companySnapshot.profileName;
  const customerName = invoice.customerSnapshot?.displayName || "Customer";
  const invoiceNumber = invoice.invoiceNumber;
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString("en-IN");
  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-IN");
  const amount = invoice.totalAmount.toFixed(2);

  const subject = `Invoice ${invoiceNumber} | ${companyName}`;

  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          padding: 30px;
        }
        .container {
          background: #ffffff;
          max-width: 700px;
          margin: auto;
          padding: 30px;
          border-radius: 8px;
        }
        h2 {
          margin-top: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        td {
          padding: 8px 0;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Invoice Generated</h2>
        <p>Hello ${customerName},</p>
        <p>Please find your invoice attached.</p>
        
        <table>
          <tr>
            <td><strong>Invoice Number</strong></td>
            <td>${invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Invoice Date</strong></td>
            <td>${invoiceDate}</td>
          </tr>
          <tr>
            <td><strong>Due Date</strong></td>
            <td>${dueDate}</td>
          </tr>
          <tr>
            <td><strong>Total Amount</strong></td>
            <td>₹ ${amount}</td>
          </tr>
        </table>
        
        <p>If you have any questions regarding this invoice, please contact our billing department.</p>
        
        <div class="footer">
          ${companyName}
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