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

  const fontRegular = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/Inter-Regular.ttf")
  ).toString("base64");

  const fontMedium = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/Inter-Medium.ttf")
  ).toString("base64");

  const fontSemiBold = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/Inter-SemiBold.ttf")
  ).toString("base64");

  const fontBold = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/Inter-Bold.ttf")
  ).toString("base64");

  const fontBlack = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts/Inter-Black.ttf")
  ).toString("base64");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>

    <style>
      @font-face { font-family: 'Inter'; src: url('${fontRegular}') format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: 'Inter'; src: url('${fontMedium}') format('truetype'); font-weight: 500; font-style: normal; }
      @font-face { font-family: 'Inter'; src: url('${fontSemiBold}') format('truetype'); font-weight: 600; font-style: normal; }
      @font-face { font-family: 'Inter'; src: url('${fontBold}') format('truetype'); font-weight: 700; font-style: normal; }
      @font-face { font-family: 'Inter'; src: url('${fontBlack}') format('truetype'); font-weight: 900; font-style: normal; }
    
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Inter', sans-serif;
      }

      body {
        background: white;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page-box {
        padding: 24px; 
        border: 2px solid #fdba74;
        border-radius: 12px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

      .first-page {
        page-break-after: always;
        break-after: page;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      @page :first {
        margin-bottom: 0; 
      }

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120px;
        font-weight: 900;
        color: rgba(220, 38, 38, 0.10); /* Semi-transparent red */
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 0.1em;
      }
    </style>
  </head>
  <body>
    ${invoice.status === 'CANCELLED' ? '<div class="watermark">CANCELLED</div>' : ''}
    <div class="page-box first-page">
      ${buildHeader(invoice)}
      ${buildBilling(invoice)}
      
      <div style="margin-top: 24px;">
        ${buildPaymentDetails()}
      </div>
    </div>
    
    <div class="page-box">
      ${buildItems(invoice, isInterstate)}
      
      <div style="margin-top: 40px; page-break-inside: avoid;">
        ${buildTerms()}
      </div>
    </div>

  </body>
  </html>
  `;
};

function buildHeader(invoice) {

  return `
  <div style="border-bottom: 2px solid #fed7aa; padding-bottom: 16px; font-family: sans-serif;">

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); align-items: center; width: 100%;">

      <!-- COLUMN 1: Logo -->
      <div style="justify-self: start; display: flex; align-items: center;">
        <svg width="204" height="86" viewBox="0 0 204 86" xmlns="http://www.w3.org/2000/svg">
          <image href="${logo}" x="2" y="5" width="200" height="77" preserveAspectRatio="xMinYMid meet" image-rendering="optimizeQuality" />
        </svg>
      </div>

      <!-- COLUMN 2: Title -->
      <div style="justify-self: center; text-align: center; display: flex; align-items: center; justify-content: center;">
        <svg width="200" height="32" viewBox="0 0 200 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="taxGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#F58220" />
              <stop offset="45%" stop-color="#E04924" />
              <stop offset="100%" stop-color="#9A0D14" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-size="24px" font-weight="900" letter-spacing="0.025em" fill="url(#taxGradient)">
            TAX INVOICE
          </text>
        </svg>
      </div>

      <!-- COLUMN 3: Original Copy + Details -->
      <div style="justify-self: end; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
        
        <p style="font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
          Original Copy for Recipient
        </p>

        <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #fdba74; border-radius: 6px; padding: 8px 10px; background-color: #fef8f4; min-width: 170px; box-sizing: border-box;">
          
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Bill No.</span>
            <span style="font-family: monospace;">${invoice.invoiceNumber || "Draft"}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Bill Date</span>
            <span>${formatDate(invoice.dates?.invoiceDate)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Due Date</span>
            <span>${formatDate(invoice.dates?.dueDate)}</span>
          </div>

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

  const formatAddress = (addr) => {
    const parts = [
      addr.street,
      addr.city,
      addr.state ? `${addr.state} ${addr.pincode || ""}`.trim() : addr.pincode
    ].filter(Boolean);
    return parts.join(", ");
  };

  const companyFullAddress = formatAddress(companyAddress);
  const customerFullAddress = formatAddress(address);

  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 14px; border-top-left-radius: 3px; border-top-right-radius: 3px;";

  return `
  <!-- Reduced top margin from 20px to 12px -->
  <div style="display: flex; gap: 32px; margin-top: 12px; align-items: stretch; font-family: 'Inter', sans-serif;">
    
    <!-- Reduced gap between the two boxes from 20px to 12px -->
    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
      
      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Bill From
        </div>
        <!-- Reduced padding from 20px to 12px 16px -->
        <div style="padding: 12px 16px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #111827;">
            ${company.name || "FAB FIVE NETWORK PRIVATE LIMITED"}
          </h3>
          <div style="font-size: 12px; line-height: 1.5; color: #374151;">
            <!-- Rendered as a single continuous line -->
            <p style="margin: 0;">${companyFullAddress || "-"}</p>
          </div>
          
          <!-- Reduced padding-top from 16px to 10px -->
          <div style="margin-top: auto; padding-top: 10px;">
            <div style="border-top: 1px dashed #fed7aa; padding-top: 10px; font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: #4b5563;">Company GSTIN</span>
              <span style="font-weight: 500; color: #111827;">${company.gstNumber || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Bill To
        </div>
        <div style="padding: 12px 16px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #111827;">
            ${customer.name || "-"}
          </h3>
          <div style="font-size: 12px; line-height: 1.5; color: #374151;">
            <!-- Rendered as a single continuous line -->
            <p style="margin: 0;">${customerFullAddress || "-"}</p>
          </div>
          
          <div style="margin-top: auto; padding-top: 10px;">
            <div style="border-top: 1px dashed #fed7aa; padding-top: 10px; font-size: 12px; display: flex; justify-content: space-between;">
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
        
        <!-- Reduced padding to match the left side -->
        <div style="padding: 12px 16px; font-size: 12px; display: flex; flex-direction: column; flex: 1; color: #374151;">
          
          <!-- Reduced margin-bottom on these rows from 12px to 8px -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Recurring Charges</span>
            <span style="font-weight: 500;">₹${money(financials.subTotal)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>One Time Charges</span>
            <span style="font-weight: 500;">₹0.00</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Discount</span>
            <span style="font-weight: 500;">₹${money(financials.discount)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
            <span>Sub Total</span>
            <span>₹${money(financials.subTotal)}</span>
          </div>

          ${taxes.isInterstate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>IGST (18%)</span>
              <span style="font-weight: 500;">₹${money(taxes.igstAmount)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>CGST (9%)</span>
              <span style="font-weight: 500;">₹${money(taxes.cgstAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>SGST (9%)</span>
              <span style="font-weight: 500;">₹${money(taxes.sgstAmount)}</span>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; color: #111827; border-top: 1px solid #f3f4f6; padding-top: 8px;">
            <span>Total Tax</span>
            <span>₹${money(taxes.totalTax)}</span>
          </div>

          <!-- Reduced padding-top from 32px to 12px -->
          <div style="margin-top: auto; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; color: #111827;">
              <span>Total (INR)</span>
              <span style="color: #ea580c;">₹${money(financials.grandTotal)}</span>
            </div>

            <div style="border-top: 1px solid #fdba74; margin-top: 16px; padding-top: 10px;">
              <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.025em; margin: 0; font-weight: bold;">
                Amount in Words
              </p>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 11px; font-weight: 600; font-style: italic; color: #1f2937; line-height: 1.4;">
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
      <td style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; font-weight: 500; color: #334155;">
        ${bank.bank}
      </td>
      <td style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; font-family: monospace; color: #334155;">
        ${bank.accountNumber}
      </td>
      <td style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; font-family: monospace; color: #334155;">
        ${bank.ifsc}
      </td>
      <td style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; color: #334155;">
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
            <th style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              Bank
            </th>
            <th style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              Account Number
            </th>
            <th style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
              IFSC Code
            </th>
            <th style="border: 1px solid #fdba74; padding: 8px 12px; text-align: center; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
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
  const rows = (invoice.items || []).map((item, index, array) => {
    const taxableAmount = Number(item.mrc ?? item.amount ?? 0);
    const lineTax = taxableAmount * 0.18;

    const installationAddress =
      item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address ||
      item.technicalDetails?.bEnd?.address ||
      item.crmConnectionSnapshot?.technicalDetails?.aEnd?.address ||
      item.technicalDetails?.aEnd?.address ||
      "-";

    const billingCycle = `${formatDate(item.periodStart)}<br/>to<br/>${formatDate(item.periodEnd)}`;

    const isLastRow = index === array.length - 1;
    const rowBorder = isLastRow ? "" : "border-bottom: 1px solid #ffedd5;";

    const tdDivideX = "border-right: 1px solid #ffedd5;";
    const tdBase = "padding: 16px 4px; vertical-align: top; text-align: center; font-size: 11px; font-weight: 500; color: #111827;";

    return `
      <tr style="${rowBorder}">
        <td style="${tdBase} padding: 16px 8px; word-break: normal; overflow-wrap: normal; ${tdDivideX}">
          ${item.description || "-"}
        </td>
        <td style="${tdBase} ${tdDivideX}">
          ${item.sacCode || "-"}
        </td>
        <td style="${tdBase} line-height: 1.5; ${tdDivideX}">
          ${billingCycle}
        </td>
        <td style="${tdBase} ${tdDivideX}">
          ${item.sourceType === "CONNECTION" ? (item.crmConnectionSnapshot?.bandwidth ?? "-") : (item.qty ?? "-")}
        </td>
        <td style="${tdBase} padding: 16px 6px; line-height: 1.4; ${tdDivideX}">
          <div style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; word-break: normal; white-space: normal;">
            ${installationAddress}
          </div>
        </td>
        <td style="${tdBase} white-space: nowrap; ${tdDivideX}">
          ₹${money(taxableAmount)}
        </td>
        
        ${isInterstate
        ? `<td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(lineTax)}</td>`
        : `<td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(lineTax / 2)}</td>
           <td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(lineTax / 2)}</td>`
      }
        
        <td style="padding: 16px 4px; vertical-align: top; text-align: center; font-size: 11px; font-weight: 700; color: #ea580c; white-space: nowrap;">
          ₹${money(taxableAmount + lineTax)}
        </td>
      </tr>
    `;
  }).join("");

  const thDivideX = "border-right: 1px solid #fb923c;";
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white;";
  const thStyle = "background-color: transparent; padding: 12px 8px; font-weight: 600; letter-spacing: 0.025em; line-height: 1.25; text-align: center;";

  const tableHeaderRows = isInterstate
    ? `
        <!-- IGST LAYOUT (8 Columns total) -> More width given to Description and Address -->
        <tr>
          <th style="width: 22%; ${thStyle} ${thDivideX}">Service<br/>Description</th>
          <th style="width: 8%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">SAC</th>
          <th style="width: 12%; ${thStyle} ${thDivideX}">Billing<br/>Period</th>
          <th style="width: 6%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">BW/<br/>Qty</th>
          <th style="width: 20%; ${thStyle} ${thDivideX}">Installation<br/>Address</th>
          <th style="width: 10%; ${thStyle} text-align: right; ${thDivideX}">Charge</th>
          <th style="width: 10%; ${thStyle} text-align: right; ${thDivideX}">IGST</th>
          <th style="width: 12%; ${thStyle} text-align: right;">Total</th>
        </tr>
      `
    : `
        <!-- CGST/SGST LAYOUT (9 Columns total) -> Original balanced widths -->
        <tr>
          <th style="width: 20%; ${thStyle} ${thDivideX}">Service<br/>Description</th>
          <th style="width: 6%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">SAC</th>
          <th style="width: 11%; ${thStyle} ${thDivideX}">Billing<br/>Period</th>
          <th style="width: 5%; ${thStyle} padding-left: 4px; padding-right: 4px; ${thDivideX}">BW/<br/>Qty</th>
          <th style="width: 18%; ${thStyle} ${thDivideX}">Installation<br/>Address</th>
          <th style="width: 10%; ${thStyle} text-align: right; ${thDivideX}">Charge</th>
          <th style="width: 9%; ${thStyle} text-align: right; ${thDivideX}">CGST</th>
          <th style="width: 9%; ${thStyle} text-align: right; ${thDivideX}">SGST</th>
          <th style="width: 12%; ${thStyle} text-align: right;">Total</th>
        </tr>
      `;

  return `
    <div style="font-family: 'Inter', sans-serif;">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 24px;">
        <div>
          <div style="margin: 0; display: flex; align-items: center;">
            <svg width="280" height="36" viewBox="0 0 280 36" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="summaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#F58220" />
                  <stop offset="45%" stop-color="#E04924" />
                  <stop offset="100%" stop-color="#9A0D14" />
                </linearGradient>
              </defs>
              <text x="0" y="50%" dominant-baseline="central" text-anchor="start" font-family="sans-serif" font-size="30px" font-weight="bold" letter-spacing="-0.025em" fill="url(#summaryGradient)">
                Summary of Items
              </text>
            </svg>
          </div>
          <p style="color: #6b7280; margin-top: 8px; margin-bottom: 0; font-size: 12px;">
            Detailed breakdown of billed services
          </p>
        </div>

        <div style="margin-top: 40px;">
          <p style="font-size: 14px; font-weight: bold; margin: 0; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
            All amounts are in INR
          </p>
        </div>
      </div>

      <div style="margin-top: 32px; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; -webkit-box-decoration-break: clone; box-decoration-break: clone;">
        
        <table style="width: 100%; font-size: 14px; text-align: left; table-layout: fixed; border-collapse: collapse;">
          <thead style="${headerStyle}">
            ${tableHeaderRows}
          </thead>
          
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end; align-items: center; width: 100%; box-sizing: border-box; background-color: #fff7ed; border-top: 2px solid #fed7aa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; padding: 16px; page-break-inside: avoid;">
          
          <div style="font-weight: bold; color: #1f2937; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; margin-right: 24px;">
            Grand Total
          </div>
          
          <div style="font-weight: 900; font-size: 14px; color: #ea580c; white-space: nowrap; min-width: 120px; text-align: center;">
            ₹${money(invoice.financials?.grandTotal)}
          </div>
          
        </div>
        
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
          In case of queries reach out to billing@fab5network.com
        </li>
      </ol>
      
      <p style="text-align: right; font-weight: bold; font-style: italic; color: #000; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
        Thank you for your business!
      </p>
    </div>
    
  </div>
  `;
}