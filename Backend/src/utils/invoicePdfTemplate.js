import fs from "fs";
import path from "path";
import { ToWords } from "to-words";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true
  }
});

const logoPath = path.join(process.cwd(), "assets", "fab5.svg");
const logoBase64 = fs.readFileSync(logoPath, "base64");
const logo = `data:image/svg+xml;base64,${logoBase64}`;

const money = (value = 0) => Number(value).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const buildInvoiceHTML = (invoice) => {
  const taxes = invoice.financials?.taxes;
  const isInterstate = taxes?.isInterstate;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">

    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Inter', sans-serif;
      }

      /* 1. Reset body to let our wrapper handle the spacing */
      html, body {
        margin: 0;
        padding: 0;
        background: white;
      }

      /* 2. Global Page Settings - margin adds space between paper edge and border */
      .page {
        margin: 24px;
        width: calc(100% - 48px);
        padding: 32px;
        border: 2px solid #fdba74;
        border-radius: 12px;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
      }

      /* 3. Strict lock for Page 1 */
      .first-page {
        height: calc(100vh - 48px);
        overflow: hidden;
      }

      /* 4. For Page 2+ (Service Items), allow it to stretch if needed, but maintain minimum height */
      .subsequent-page {
        min-height: calc(100vh - 48px);
        height: auto;
      }

      .page:last-child {
        page-break-after: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        font-size: 11px;
        vertical-align: top;
      }

      th {
        background: #f97316;
        color: white;
      }

      .summary-table td {
        border: none;
        padding: 3px 0;
      }
    </style>
  </head>
  <body>

    <div class="page first-page">
      ${buildHeader(invoice)}
      ${buildBilling(invoice)}
      
      <div>
        ${buildPaymentDetails()}
      </div>
    </div>
    
    <div class="page subsequent-page">
      ${buildItems(invoice, isInterstate)}
      ${buildTerms()}
    </div>

  </body>
  </html>
  `;
};

function buildHeader(invoice) {
  const logoPath = path.join(process.cwd(), "assets", "fab5.png");

  return `
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #fed7aa; padding-bottom: 32px; font-family: sans-serif;">

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <img src="${logo}" style="height: 80px; width: auto; object-fit: contain;" alt="Company Logo" />
      <div style="font-size: 14px; line-height: 24px;">
        <h2 style="font-size: 16px; font-weight: bold; color: #dc2626; text-transform: uppercase; margin: 0;">
          FAB FIVE NETWORK PRIVATE LIMITED
        </h2>
        <p style="margin: 0;">
          ${invoice.companySnapshot?.address?.street || ''}
        </p>
        <p style="margin: 0;">
          ${invoice.companySnapshot?.address?.city || ''}, 
          ${invoice.companySnapshot?.address?.state || ''}
        </p>
        <p style="margin: 0;">
          ${invoice.companySnapshot?.address?.country || ''} 
          ${invoice.companySnapshot?.address?.pincode || ''}
        </p>
      </div>
    </div>

    <div style="text-align: right;">
      <h1 style="font-size: 36px; font-weight: 900; color: #ea580c; letter-spacing: 0.025em; margin: 0;">
        TAX INVOICE
      </h1>
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 4px; margin-bottom: 20px;">
        Original Copy for Recipient
      </p>
      
      <div style="font-size: 14px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Invoice No</span>
          <span style="font-family: monospace;">${invoice.invoiceNumber || "Draft"}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Invoice Date</span>
          <span>${formatDate(invoice.dates?.invoiceDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Due Date</span>
          <span>${formatDate(invoice.dates?.dueDate)}</span>
        </div>
      </div>
    </div>

  </div>
  `;
}

function buildBilling(invoice) {
  const customer = invoice.customerSnapshot;
  const billing = customer.billingProfile || {};
  const address = billing.address || {};

  const taxes = invoice.financials.taxes || {};
  const financials = invoice.financials || {};

  const stateCode = billing.gstNumber ? billing.gstNumber.substring(0, 2) : "-";

  return `
  <div style="display: flex; gap: 32px; margin-top: 32px; align-items: stretch; font-family: 'Inter', sans-serif;">
    
    <div style="flex: 2; display: flex; flex-direction: column; gap: 20px;">
      
      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="background-color: #f97316; color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;">
          Billing Address
        </div>
        <div style="padding: 20px;">
          <h3 style="font-weight: bold; font-size: 18px; margin-bottom: 24px; color: #000;">
            ${customer.name || '-'}
          </h3>
          <div style="font-size: 12px; line-height: 1.6; color: #222;">
            <p style="margin: 0;">${address.street || "-"}</p>
            <p style="margin: 0;">${address.city || ""}</p>
            <p style="margin: 0;">${address.state || ""} ${address.pincode || ""}</p>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="background-color: #f97316; color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;">
          GSTIN Details
        </div>
        <div style="padding: 20px; font-size: 12px; display: flex; flex-direction: column; gap: 12px; color: #222;">
          <div style="display: flex; justify-content: space-between;">
            <span>Customer GSTIN</span>
            <span>${billing.gstNumber || "-"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Place of Supply</span>
            <span>${address.state || "-"}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>State Code</span>
            <span>${stateCode}</span>
          </div>
        </div>
      </div>

    </div>

    <div style="flex: 3; display: flex; flex-direction: column;">
      
      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="background-color: #f97316; color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;">
          Summary Of Charges
        </div>
        
        <div style="padding: 24px; font-size: 12px; display: flex; flex-direction: column; color: #222;">
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>Recurring Charges</span>
            <span>₹${money(financials.subTotal)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>One Time Charges</span>
            <span>₹0.00</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>Discount</span>
            <span>₹${money(financials.discount)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
            <span>Sub Total</span>
            <span>₹${money(financials.subTotal)}</span>
          </div>

          ${taxes.isInterstate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>IGST (18%)</span>
              <span>₹${money(taxes.igstAmount)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>CGST (9%)</span>
              <span>₹${money(taxes.cgstAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>SGST (9%)</span>
              <span>₹${money(taxes.sgstAmount)}</span>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
            <span>Total (INR)</span>
            <span>₹${money(financials.grandTotal)}</span>
          </div>

          <div style="border-top: 1px solid #fdba74; margin-top: 24px; padding-top: 16px;">
            <p style="font-size: 12px; color: #4b5563; margin: 0; font-weight: 600;">
              Amount in Words :
            </p>
            <p style="margin-top: 8px; margin-bottom: 0; font-size: 12px; font-weight: 500; font-style: italic; color: #222;">
              ${toWords.convert(financials.grandTotal)}
            </p>
          </div>

        </div>
      </div>

    </div>

  </div>
  `;
}

function buildPaymentDetails() {
  const BANKS = [
    {
      bank: "Yes Bank",
      accountNumber: "023527000000147",
      ifsc: "YESB0000235",
      branch: "Nehru Place, Delhi"
    },
    {
      bank: "Kotak Mahindra Bank",
      accountNumber: "9948232207",
      ifsc: "KKBK0004634",
      branch: "Netaji Subhash Place, Pitampura, Delhi"
    }
  ];

  // Map through the array to generate the table rows
  const bankRows = BANKS.map(bank => `
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 500; color: #334155;">
        ${bank.bank}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-family: monospace; color: #334155;">
        ${bank.accountNumber}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-family: monospace; color: #334155;">
        ${bank.ifsc}
      </td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #334155;">
        ${bank.branch}
      </td>
    </tr>
  `).join('');

  return `
  <div style="margin-top: 32px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif;">
    
    <div style="background-color: #f97316; color: white; padding: 8px 16px; border-bottom: 1px solid #cbd5e1;">
      <h3 style="margin: 0; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.025em;">
        Payment Instructions
      </h3>
    </div>

    <div style="padding: 16px;">
      
      <p style="font-size: 14px; color: #334155; line-height: 24px; margin-top: 0; margin-bottom: 16px;">
        You can pay the invoice amount online through NEFT, IMPS, RTGS using any of the bank
        accounts listed below:
      </p>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <thead>
          <tr style="background-color: #fff7ed; color: #c2410c;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              Bank
            </th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              Account Number
            </th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              IFSC Code
            </th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              Branch
            </th>
          </tr>
        </thead>
        <tbody>
          ${bankRows}
        </tbody>
      </table>

      <p style="font-size: 12px; color: #64748b; font-style: italic; margin: 0;">
        After completing the payment, kindly share the UTR/Transaction Reference with our accounts team for quicker verification.
      </p>

    </div>
  </div>
  `;
}

function buildItems(invoice, isInterstate) {
  const rows = (invoice.items || []).map((item) => {
    const taxableAmount = Number(item.mrc ?? item.amount ?? 0);
    const lineTax = round2(taxableAmount * 0.18);

    const aEnd = item.crmConnectionSnapshot?.technicalDetails?.aEnd?.address || item.technicalDetails?.aEnd?.address || "-";
    const bEnd = item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address || item.technicalDetails?.bEnd?.address || "-";

    // Split date for the two-line display
    const dateObj = new Date(item.periodStart);
    const dateTop = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const dateBottom = dateObj.getFullYear();

    const cellStyle = "padding:8px; font-size:10px; border:1px solid #fdba74; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;";

    return `
      <tr>
        <td style="padding:10px; font-size:11px; border: 1px solid #fdba74;">${item.description || "-"}</td>
        <td style="padding:10px; text-align:center; font-family:monospace; font-size:10px; border: 1px solid #fdba74;">${item.sacCode || "-"}</td>
        <td style="padding:10px; text-align:center; font-size:10px; border: 1px solid #fdba74;">
            <div style="font-weight:600;">${dateTop}</div>
            <div style="color:#666;">${dateBottom}</div>
        </td>
        <td style="padding:10px; text-align:center; font-weight:bold; border: 1px solid #fdba74;">${item.crmConnectionSnapshot?.bandwidth || "-"}</td>
        <td style="padding:10px; font-size:10px; line-height:1.4; border: 1px solid #fdba74; word-wrap: break-word;">${aEnd}</td>
        <td style="padding:10px; font-size:10px; line-height:1.4; border: 1px solid #fdba74; word-wrap: break-word;">${bEnd}</td>
        <td style="padding:10px; text-align:right; border: 1px solid #fdba74;">₹${money(taxableAmount)}</td>
        
        ${isInterstate
        ? `<td style="padding:10px; text-align:right; border: 1px solid #fdba74;">₹${money(lineTax)}</td>`
        : `<td style="padding:10px; text-align:right; border: 1px solid #fdba74;">₹${money(lineTax / 2)}</td>
             <td style="padding:10px; text-align:right; border: 1px solid #fdba74;">₹${money(lineTax / 2)}</td>`
      }
        
        <td style="padding:10px; text-align:right; font-weight:bold; color:#ea580c; border: 1px solid #fdba74;">₹${money(taxableAmount + lineTax)}</td>
      </tr>
    `;
  }).join("");

  return `
    <h2 style="margin-bottom:18px; color:#ea580c; font-size:22px; font-weight:bold;">SUMMARY OF ITEMS</h2>

    <table style="width:100%; border-collapse:collapse; table-layout:fixed; border:1px solid #fdba74; font-family: 'Inter', sans-serif;">
      <thead>
        <tr style="background:#ea580c; color:white;">
          <th style="width:18%; padding:10px; border:1px solid #fdba74; font-size:12px;">Service<br>Description</th>
          <th style="width:6%; padding:10px; border:1px solid #fdba74; font-size:12px;">SAC</th>
          <th style="width:8%; padding:10px; border:1px solid #fdba74; font-size:12px;">Billing<br>Period</th>
          <th style="width:5%; padding:10px; border:1px solid #fdba74; font-size:12px;">BW</th>
          <th style="width:14%; padding:10px; border:1px solid #fdba74; font-size:12px;">A End Address</th>
          <th style="width:14%; padding:10px; border:1px solid #fdba74; font-size:12px;">B End Address</th>
          <th style="width:10%; padding:10px; border:1px solid #fdba74; font-size:12px; text-align:right;">Charge</th>
          ${isInterstate
      ? `<th style="width:10%; padding:10px; border:1px solid #fdba74; font-size:12px; text-align:right;">IGST</th>`
      : `<th style="width:7%; padding:10px; border:1px solid #fdba74; font-size:12px; text-align:right;">CGST</th>
               <th style="width:7%; padding:10px; border:1px solid #fdba74; font-size:12px; text-align:right;">SGST</th>`
    }
          <th style="width:11%; padding:10px; border:1px solid #fdba74; font-size:12px; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background:#fff7ed; font-weight:bold;">
          <td colspan="${isInterstate ? 8 : 9}" style="padding:12px; text-align:right; border:1px solid #fdba74; font-size:13px;">
            Grand Total
          </td>
          <td style="padding:12px; text-align:right; border:1px solid #fdba74; font-size:13px; color:#ea580c; font-weight:bold;">
            ₹${money(invoice.financials.grandTotal)}
          </td>
        </tr>
      </tfoot>
    </table>
  `;
}

function buildTerms() {
  return `
  <div style="border: 1px solid #fdba74; border-radius: 8px; margin-top: 32px; overflow: hidden; font-family: 'Inter', sans-serif;">
    
    <div style="background-color: #f97316; color: white; padding: 8px 16px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.025em;">
      Terms & Conditions
    </div>
    
    <div style="padding: 20px; font-size: 12px; line-height: 1.8; color: #334155;">
      <ol style="margin-left: 20px; padding-left: 10px;">
        <li style="margin-bottom: 8px;">
          Fab Five Network Pvt. Ltd. reserves the right to suspend service in case of non-payment by the due date. The customer shall continue to be liable for the charges during the period of suspension.
        </li>
        <li style="margin-bottom: 8px;">
          The invoice will be deemed accepted in case of variation/dispute not reported by due date of invoice.
        </li>
        <li style="margin-bottom: 8px;">
          A 10% interest rate per month is chargeable for payments received after the due date.
        </li>
        <li style="margin-bottom: 8px;">
          All such arbitration would take place within Delhi city limits.
        </li>
        <li style="margin-bottom: 8px;">
          In case of queries reach out to <a href="mailto:billing@fab5network.com" style="color: #2563eb; text-decoration: underline;">billing@fab5network.com</a>
        </li>
      </ol>
      
      <p style="text-align: center; margin-top: 32px; font-weight: bold; font-style: italic; color: #000;">
        Thank you for your business!
      </p>
    </div>
    
  </div>
  `;
}