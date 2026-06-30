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
  // Assuming this resolves to a path or base64 string your PDF generator can read!
  const logoPath = path.join(process.cwd(), "assets", "fab5.png");

  return `
  <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #fed7aa; padding-bottom: 20px; font-family: sans-serif;">

    <div style="display: flex; flex-direction: column; gap: 8px;">
      <img src="${logo}" style="height: 110px; width: auto; object-fit: contain;" alt="Company Logo" />
    </div>

    <div style="text-align: right;">
      <h1 style="font-size: 30px; font-weight: 900; letter-spacing: 0.025em; margin: 0; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
        TAX INVOICE
      </h1>
      
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 4px; margin-bottom: 20px;">
        Original Copy for Recipient
      </p>
      
      <div style="font-size: 14px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #fdba74; border-radius: 4px; padding: 8px;">
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Bill No. :</span>
          <span style="font-family: monospace;">${invoice.invoiceNumber || "Draft"}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Bill Date :</span>
          <span>${formatDate(invoice.dates?.invoiceDate)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 32px;">
          <span style="font-weight: 600;">Due Date :</span>
          <span>${formatDate(invoice.dates?.dueDate)}</span>
        </div>
      </div>

    </div>

  </div>
  `;
}

function buildBilling(invoice) {
  // Customer Data
  const customer = invoice.customerSnapshot || {};
  const billing = customer.billingProfile || {};
  const address = billing.address || {};

  // Company Data
  const company = invoice.companySnapshot || {};
  const companyAddress = company.address || {};

  // Financials
  const taxes = invoice.financials?.taxes || {};
  const financials = invoice.financials || {};

  // Reusable Gradient Header Style
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;";

  return `
  <div style="display: flex; gap: 32px; margin-top:20px; align-items: stretch; font-family: 'Inter', sans-serif;">
    
    <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
      
      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Billed From
        </div>
        <div style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 8px 0; color: #111827;">
            ${company.name || "FAB FIVE NETWORK PRIVATE LIMITED"}
          </h3>
          <div style="font-size: 12px; line-height: 1.6; color: #374151;">
            <p style="margin: 0;">${companyAddress.street || ""}</p>
            <p style="margin: 0;">
              ${companyAddress.city || ""}${companyAddress.city ? ", " : ""}
              ${companyAddress.state || ""}
            </p>
            <p style="margin: 0;">${companyAddress.pincode || ""}</p>
          </div>
          
          <div style="margin-top: auto; padding-top: 16px;">
            <div style="border-top: 1px dashed #fed7aa; padding-top: 16px; font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: #4b5563;">Company GSTIN</span>
              <span style="font-weight: 500; color: #111827;">${company.gstNumber || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Billed To
        </div>
        <div style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 16px; margin: 0 0 8px 0; color: #111827;">
            ${customer.name || "-"}
          </h3>
          <div style="font-size: 12px; line-height: 1.6; color: #374151;">
            <p style="margin: 0;">${address.street || "-"}</p>
            <p style="margin: 0;">${address.city || ""}</p>
            <p style="margin: 0;">${address.state || ""} ${address.pincode || ""}</p>
          </div>
          
          <div style="margin-top: auto; padding-top: 16px;">
            <div style="border-top: 1px dashed #fed7aa; padding-top: 16px; font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: #4b5563;">Customer GSTIN</span>
              <span style="font-weight: 500; color: #111827;">${billing.gstNumber || "-"}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div style="flex: 1; display: flex; flex-direction: column;">
      
      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Summary Of Charges
        </div>
        
        <div style="padding: 24px; font-size: 12px; display: flex; flex-direction: column; flex: 1; color: #374151;">
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>Recurring Charges</span>
            <span style="font-weight: 500;">₹${money(financials.subTotal)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>One Time Charges</span>
            <span style="font-weight: 500;">₹0.00</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span>Discount</span>
            <span style="font-weight: 500;">₹${money(financials.discount)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
            <span>Sub Total</span>
            <span>₹${money(financials.subTotal)}</span>
          </div>

          ${taxes.isInterstate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>IGST (18%)</span>
              <span style="font-weight: 500;">₹${money(taxes.igstAmount)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>CGST (9%)</span>
              <span style="font-weight: 500;">₹${money(taxes.cgstAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span>SGST (9%)</span>
              <span style="font-weight: 500;">₹${money(taxes.sgstAmount)}</span>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; color: #111827; border-top: 1px solid #f3f4f6; padding-top: 12px;">
            <span>Total Tax</span>
            <span>₹${money(taxes.totalTax)}</span>
          </div>

          <div style="margin-top: auto; padding-top: 32px;">
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 18px; border-top: 1px solid #e5e7eb; padding-top: 16px; color: #111827;">
              <span>Total (INR)</span>
              <span style="color: #ea580c;">₹${money(financials.grandTotal)}</span>
            </div>

            <div style="border-top: 1px solid #fdba74; margin-top: 24px; padding-top: 16px;">
              <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.025em; margin: 0; font-weight: bold;">
                Amount in Words
              </p>
              <p style="margin-top: 8px; margin-bottom: 0; font-size: 12px; font-weight: 600; font-style: italic; color: #1f2937;">
                ${toWords.convert(financials.grandTotal)}
              </p>
            </div>
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

  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;";

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
  <div style="margin-top: 32px; border: 1px solid #fdba74; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif;">
    
    <div style="${headerStyle}; color: white; padding: 8px 16px; border-bottom: 1px solid #cbd5e1;">
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
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;";
  const rows = (invoice.items || []).map((item, index, array) => {
    const taxableAmount = Number(item.mrc ?? item.amount ?? 0);
    const lineTax = taxableAmount * 0.18;

    const aEnd = item.crmConnectionSnapshot?.technicalDetails?.aEnd?.address || item.technicalDetails?.aEnd?.address || "-";
    const bEnd = item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address || item.technicalDetails?.bEnd?.address || "-";

    // Split date for the two-line display
    const dateObj = new Date(item.periodStart);
    const dateTop = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const dateBottom = dateObj.getFullYear();

    // Determine if we need a bottom border (divide-y)
    const isLastRow = index === array.length - 1;
    const rowBorder = isLastRow ? "" : "border-bottom: 1px solid #ffedd5;";

    // Reusable vertical divider for cells (divide-x)
    const tdDivideX = "border-right: 1px solid #ffedd5;";

    return `
      <tr style="${rowBorder}">
        <td style="padding: 16px 8px; vertical-align: top; color: #111827; font-weight: 500; word-wrap: break-word; ${tdDivideX}">${item.description || "-"}</td>
        
        <td style="padding: 16px 4px; vertical-align: top; text-align: center; font-family: monospace; color: #6b7280; font-size: 11px; ${tdDivideX}">${item.sacCode || "-"}</td>
        
        <td style="padding: 16px 8px; vertical-align: top; text-align: center; color: #4b5563; font-size: 12px; ${tdDivideX}">
            <span style="display: block; font-weight: 500;">${dateTop}</span>
            <span style="display: block; color: #9ca3af;">${dateBottom}</span>
        </td>
        
        <td style="padding: 16px 4px; vertical-align: top; text-align: center; color: #374151; font-family: monospace; font-size: 12px; ${tdDivideX}">${item.crmConnectionSnapshot?.bandwidth || "-"}</td>
        
        <td style="padding: 16px 8px; vertical-align: top; color: #6b7280; font-size: 12px; white-space: pre-wrap; word-wrap: break-word; ${tdDivideX}">${aEnd}</td>
        
        <td style="padding: 16px 8px; vertical-align: top; color: #6b7280; font-size: 12px; white-space: pre-wrap; word-wrap: break-word; ${tdDivideX}">${bEnd}</td>
        
        <td style="padding: 16px 8px; vertical-align: top; text-align: right; color: #111827; font-weight: 500; ${tdDivideX}">₹${money(taxableAmount)}</td>
        
        ${isInterstate
        ? `<td style="padding: 16px 8px; vertical-align: top; text-align: right; color: #4b5563; font-size: 12px; ${tdDivideX}">₹${money(lineTax)}</td>`
        : `<td style="padding: 16px 8px; vertical-align: top; text-align: right; color: #4b5563; font-size: 12px; ${tdDivideX}">₹${money(lineTax / 2)}</td>
           <td style="padding: 16px 8px; vertical-align: top; text-align: right; color: #4b5563; font-size: 12px; ${tdDivideX}">₹${money(lineTax / 2)}</td>`
      }
        
        <td style="padding: 16px 8px; vertical-align: top; text-align: right; font-weight: bold; color: #ea580c;">₹${money(taxableAmount + lineTax)}</td>
      </tr>
    `;
  }).join("");

  const thDivideX = "border-right: 1px solid #fb923c;";
  const thStyle = "padding: 12px 8px; font-weight: 600; letter-spacing: 0.025em; line-height: 1.25; text-align: center;";

  return `
    <div style="font-family: 'Inter', sans-serif;">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 24px;">
        
        <div>
          <h1 style="font-size: 30px; font-weight: bold; letter-spacing: -0.025em; margin: 0; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
            Summary of Items
          </h1>
          <p style="color: #6b7280; margin-top: 8px; margin-bottom: 0; font-size: 16px;">
            Detailed breakdown of billed services
          </p>
        </div>

        <div style="margin-top: 40px;">
          <p style="font-size: 14px; font-weight: bold; margin: 0; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
            All amounts are in INR
          </p>
        </div>
        
      </div>

      <div style="margin-top: 32px; background-color: #ffffff; border: 1px solid #fed7aa; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); border-radius: 12px; overflow: hidden;">
        
        <table style="width: 100%; font-size: 14px; text-align: left; table-layout: fixed; border-collapse: collapse;">
          
          <thead style="${headerStyle}">
            <tr>
              <th style="width: 18%; ${thStyle} ${thDivideX}">Service<br/>Description</th>
              <th style="width: 6%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">SAC</th>
              <th style="width: 7%; ${thStyle} ${thDivideX}">Billing<br/>Date</th>
              <th style="width: 4%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">BW</th>
              <th style="width: 14%; ${thStyle} ${thDivideX}">A End<br/>Address</th>
              <th style="width: 14%; ${thStyle} ${thDivideX}">B End<br/>Address</th>
              <th style="width: 11%; ${thStyle} text-align: right; ${thDivideX}">Charge</th>
              
              ${isInterstate
      ? `<th style="width: 12%; ${thStyle} ${thDivideX}">IGST</th>`
      : `<th style="width: 6%; ${thStyle} ${thDivideX}">CGST</th>
                <th style="width: 6%; ${thStyle} ${thDivideX}">SGST</th>`
    }
              
              <th style="width: 14%; ${thStyle}">Total</th>
            </tr>
          </thead>
          
          <tbody>
            ${rows}
          </tbody>
          
          <tfoot style="background-color: #fff7ed; border-top: 2px solid #fed7aa;">
            <tr>
              <td colspan="${isInterstate ? 8 : 9}" style="padding: 16px; text-align: right; font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; border-right: 1px solid #fed7aa;">
                Grand Total
              </td>
              <td style="padding: 16px 8px; text-align: right; font-weight: 900; font-size: 14px; color: #ea580c;">
                ₹${money(invoice.financials?.grandTotal)}
              </td>
            </tr>
          </tfoot>
          
        </table>
        
      </div>
      
    </div>
  `;
}

function buildTerms() {
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 16px; border-top-left-radius: 3px; border-top-right-radius: 3px;";
  return `
  <div style="border: 1px solid #fdba74; border-radius: 8px; margin-top: 32px; overflow: hidden; font-family: 'Inter', sans-serif;">
    
    <div style="${headerStyle}; color: white; padding: 8px 16px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.025em;">
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