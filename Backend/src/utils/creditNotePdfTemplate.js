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

export const buildCreditNoteHTML = (creditNote) => {
  const taxType = creditNote.items?.find((i) => i.taxType && i.taxType !== "NONE")?.taxType
    || (Number(creditNote.financials?.igstCreditAmount) > 0 ? "IGST" : "CGST_SGST");
  const isInterstate = taxType === "IGST";

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

      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120px;
        font-weight: 900;
        color: rgba(220, 38, 38, 0.10);
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 0.1em;
      }
    </style>
  </head>
  <body>
    ${creditNote.status === 'CANCELLED' ? '<div class="watermark">CANCELLED</div>' : ''}
    <div class="page-box">
      ${buildHeader(creditNote)}
      ${buildBilling(creditNote, isInterstate)}

      <div style="margin-top: 24px;">
        ${buildItems(creditNote, isInterstate)}
      </div>

      <div style="margin-top: 32px; page-break-inside: avoid;">
        ${buildNote(creditNote)}
      </div>
    </div>
  </body>
  </html>
  `;
};

function buildHeader(creditNote) {
  return `
  <div style="border-bottom: 2px solid #fed7aa; padding-bottom: 16px; font-family: sans-serif;">

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); align-items: center; width: 100%;">

      <div style="justify-self: start; display: flex; align-items: center;">
        <svg width="204" height="86" viewBox="0 0 204 86" xmlns="http://www.w3.org/2000/svg">
          <image href="${logo}" x="2" y="5" width="200" height="77" preserveAspectRatio="xMinYMid meet" image-rendering="optimizeQuality" />
        </svg>
      </div>

      <div style="justify-self: center; text-align: center; display: flex; align-items: center; justify-content: center;">
        <svg width="220" height="32" viewBox="0 0 220 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="taxGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#F58220" />
              <stop offset="45%" stop-color="#E04924" />
              <stop offset="100%" stop-color="#9A0D14" />
            </linearGradient>
          </defs>
          <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-size="22px" font-weight="900" letter-spacing="0.025em" fill="url(#taxGradient)">
            CREDIT NOTE
          </text>
        </svg>
      </div>

      <div style="justify-self: end; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">

        <p style="font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
          Original Copy for Recipient
        </p>

        <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; border: 1px solid #fdba74; border-radius: 6px; padding: 8px 10px; background-color: #fef8f4; min-width: 190px; box-sizing: border-box;">

          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Credit Note No.</span>
            <span style="font-family: monospace;">${creditNote.creditNoteNumber || "Draft"}</span>
          </div>

          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Date</span>
            <span>${formatDate(creditNote.effectiveDate)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span style="font-weight: 600;">Against Invoice</span>
            <span style="font-family: monospace;">${creditNote.invoiceNumber || "-"}</span>
          </div>

        </div>
      </div>

    </div>

  </div>
  `;
}

function buildBilling(creditNote, isInterstate) {
  const customer = creditNote.customerSnapshot || {};
  const billing = customer.billingProfile || {};
  const address = billing.address || {};

  const company = creditNote.companySnapshot || {};
  const companyAddress = company.address || {};

  const financials = creditNote.financials || {};

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
  <div style="display: flex; gap: 32px; margin-top: 12px; align-items: stretch; font-family: 'Inter', sans-serif;">

    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">

      <div style="border: 1px solid #fdba74; border-radius: 4px; display: flex; flex-direction: column; flex: 1;">
        <div style="${headerStyle}">
          Issued By
        </div>
        <div style="padding: 12px 16px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #111827;">
            ${company.name || "FAB FIVE NETWORK PRIVATE LIMITED"}
          </h3>
          <div style="font-size: 12px; line-height: 1.5; color: #374151;">
            <p style="margin: 0;">${companyFullAddress || "-"}</p>
          </div>

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
          Issued To
        </div>
        <div style="padding: 12px 16px; display: flex; flex-direction: column; flex: 1;">
          <h3 style="font-weight: bold; font-size: 14px; margin: 0 0 6px 0; color: #111827;">
            ${customer.name || "-"}
          </h3>
          <div style="font-size: 12px; line-height: 1.5; color: #374151;">
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
          Summary Of Credit
        </div>

        <div style="padding: 12px 16px; font-size: 12px; display: flex; flex-direction: column; flex: 1; color: #374151;">

          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
            <span>Credit Base Amount</span>
            <span>₹${money(financials.creditBaseAmount)}</span>
          </div>

          ${isInterstate ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>IGST Credit</span>
              <span style="font-weight: 500;">₹${money(financials.igstCreditAmount)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>CGST Credit</span>
              <span style="font-weight: 500;">₹${money(financials.cgstCreditAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>SGST Credit</span>
              <span style="font-weight: 500;">₹${money(financials.sgstCreditAmount)}</span>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; color: #111827; border-top: 1px solid #f3f4f6; padding-top: 8px;">
            <span>Total Tax Credit</span>
            <span>₹${money(financials.taxCreditAmount)}</span>
          </div>

          <div style="margin-top: auto; padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; color: #111827;">
              <span>Total Credit (INR)</span>
              <span style="color: #ea580c;">₹${money(financials.totalCreditAmount)}</span>
            </div>

            <div style="border-top: 1px solid #fdba74; margin-top: 16px; padding-top: 10px;">
              <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.025em; margin: 0; font-weight: bold;">
                Amount in Words
              </p>
              <p style="margin-top: 4px; margin-bottom: 0; font-size: 11px; font-weight: 600; font-style: italic; color: #1f2937; line-height: 1.4;">
                ${toWords.convert(financials.totalCreditAmount || 0)}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>

  </div>
  `;
}

function buildItems(creditNote, isInterstate) {
  const rows = (creditNote.items || []).map((item, index, array) => {
    const isLastRow = index === array.length - 1;
    const rowBorder = isLastRow ? "" : "border-bottom: 1px solid #ffedd5;";

    const tdDivideX = "border-right: 1px solid #ffedd5;";
    const tdBase = "padding: 16px 4px; vertical-align: top; text-align: center; font-size: 11px; font-weight: 500; color: #111827;";

    const creditQtyOrRate = item.adjustmentType === "MANUAL"
      ? "-"
      : `${item.creditedQty ?? "-"} x ₹${money(item.creditedRate ?? 0)}`;

    return `
      <tr style="${rowBorder}">
        <td style="${tdBase} padding: 16px 8px; text-align: left; word-break: normal; overflow-wrap: normal; ${tdDivideX}">
          ${item.description || "-"}
        </td>
        <td style="${tdBase} ${tdDivideX}">
          ${item.sacCode || "-"}
        </td>
        <td style="${tdBase} ${tdDivideX}">
          ${creditQtyOrRate}
        </td>
        <td style="${tdBase} white-space: nowrap; ${tdDivideX}">
          ₹${money(item.creditAmount)}
        </td>

        ${isInterstate
        ? `<td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(item.igstCreditAmount)}</td>`
        : `<td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(item.cgstCreditAmount)}</td>
           <td style="${tdBase} white-space: nowrap; ${tdDivideX}">₹${money(item.sgstCreditAmount)}</td>`
      }

        <td style="padding: 16px 4px; vertical-align: top; text-align: center; font-size: 11px; font-weight: 700; color: #ea580c; white-space: nowrap;">
          ₹${money(item.totalCreditAmount)}
        </td>
      </tr>
    `;
  }).join("");

  const thDivideX = "border-right: 1px solid #fb923c;";
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white;";
  const thStyle = "background-color: transparent; padding: 12px 8px; font-weight: 600; letter-spacing: 0.025em; line-height: 1.25; text-align: center;";

  const tableHeaderRows = isInterstate
    ? `
        <tr>
          <th style="width: 30%; ${thStyle} text-align: left; padding-left: 12px; ${thDivideX}">Description</th>
          <th style="width: 10%; ${thStyle} ${thDivideX}">SAC</th>
          <th style="width: 16%; ${thStyle} ${thDivideX}">Qty x Rate</th>
          <th style="width: 12%; ${thStyle} text-align: right; ${thDivideX}">Credit Amt</th>
          <th style="width: 12%; ${thStyle} text-align: right; ${thDivideX}">IGST</th>
          <th style="width: 20%; ${thStyle} text-align: right;">Total Credit</th>
        </tr>
      `
    : `
        <tr>
          <th style="width: 28%; ${thStyle} text-align: left; padding-left: 12px; ${thDivideX}">Description</th>
          <th style="width: 9%; ${thStyle} ${thDivideX}">SAC</th>
          <th style="width: 15%; ${thStyle} ${thDivideX}">Qty x Rate</th>
          <th style="width: 12%; ${thStyle} text-align: right; ${thDivideX}">Credit Amt</th>
          <th style="width: 10%; ${thStyle} text-align: right; ${thDivideX}">CGST</th>
          <th style="width: 10%; ${thStyle} text-align: right; ${thDivideX}">SGST</th>
          <th style="width: 16%; ${thStyle} text-align: right;">Total Credit</th>
        </tr>
      `;

  return `
    <div style="font-family: 'Inter', sans-serif;">

      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
        <div>
          <p style="font-size: 18px; font-weight: bold; margin: 0; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
            Credited Items
          </p>
          <p style="color: #6b7280; margin-top: 6px; margin-bottom: 0; font-size: 12px;">
            Detailed breakdown of credited charges
          </p>
        </div>
      </div>

      <div style="margin-top: 24px; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; -webkit-box-decoration-break: clone; box-decoration-break: clone;">

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
            Total Credit
          </div>

          <div style="font-weight: 900; font-size: 14px; color: #ea580c; white-space: nowrap; min-width: 120px; text-align: center;">
            ₹${money(creditNote.financials?.totalCreditAmount)}
          </div>

        </div>

      </div>
    </div>
  `;
}

function buildNote(creditNote) {
  const headerStyle = "background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); color: white; padding: 8px 16px; font-weight: bold; font-size: 14px; border-top-left-radius: 3px; border-top-right-radius: 3px;";
  return `
  <div style="border: 1px solid #fdba74; border-radius: 8px; overflow: hidden; font-family: 'Inter', sans-serif;">

    <div style="${headerStyle} text-transform: uppercase; letter-spacing: 0.025em;">
      Reason For Credit
    </div>

    <div style="padding: 20px; font-size: 12px; line-height: 1.7; color: #334155;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #111827;">
        ${creditNote.reason || "-"}
      </p>

      ${creditNote.remarks ? `
        <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">
          ${creditNote.remarks}
        </p>
      ` : ""}

      <p style="text-align: right; margin-top: 24px; font-weight: bold; font-style: italic; background: linear-gradient(to right, #F58220 0%, #E04924 45%, #9A0D14 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;">
        This is a system-generated credit note.
      </p>
    </div>

  </div>
  `;
}
