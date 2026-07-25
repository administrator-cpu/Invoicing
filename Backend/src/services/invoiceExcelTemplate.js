import ExcelJS from "exceljs";

const DEFAULT_TAX_RATE = 18;
const DEFAULT_INVOICE_TYPE = "Regular B2B";
const DEFAULT_DESCRIPTION = "Internet Services";

export const generateGSTReport = async ({ invoices, month, year }, res) => {
  const workbook = new ExcelJS.Workbook();

  // 1. Workbook Metadata
  workbook.creator = "FAB Five Network Private Limited";
  workbook.company = "FAB5";
  workbook.subject = "GST Sales Report";
  workbook.title = `GST Sales Report ${month}/${year}`;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("GST Report");

  // 2. Define Columns
  worksheet.columns = [
    { header: "Customer GSTIN", key: "gstin", width: 22 },
    { header: "Customer Name", key: "customerName", width: 30 },
    { header: "Invoice Number", key: "invoiceNumber", width: 20 },
    { header: "Invoice Date", key: "invoiceDate", width: 18 },
    { header: "Invoice Value", key: "invoiceValue", width: 18 },
    { header: "Place Of Supply", key: "placeOfSupply", width: 20 },
    { header: "Place Of Billing", key: "placeOfBilling", width: 20 },
    { header: "Tax Rate (%)", key: "taxRate", width: 15 },
    { header: "Invoice Type", key: "invoiceType", width: 20 },
    { header: "Taxable Value", key: "taxableValue", width: 18 },
    { header: "CGST", key: "cgst", width: 15 },
    { header: "SGST", key: "sgst", width: 15 },
    { header: "IGST", key: "igst", width: 15 },
    { header: "SAC Code", key: "sacCode", width: 15 },
    { header: "Description", key: "description", width: 40 }
  ];

  // 3. Insert Title Row
  worksheet.spliceRows(1, 0, []);
  worksheet.mergeCells("A1:O1");

  const title = worksheet.getCell("A1");
  title.value = `GST Sales Report - ${month}/${year}`;
  title.font = { bold: true, size: 16 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 24;

  // 4. Populate Data Rows
  for (const invoice of invoices) {
    const parsedDate = invoice.dates?.invoiceDate
      ? new Date(invoice.dates.invoiceDate)
      : null;

    worksheet.addRow({
      gstin: invoice.customerSnapshot?.billingProfile?.gstNumber ?? "",
      customerName: invoice.customerSnapshot?.name ?? "",
      invoiceNumber: invoice.invoiceNumber ?? "",
      invoiceDate: parsedDate,
      invoiceValue: invoice.financials?.grandTotal ?? 0,
      placeOfSupply: invoice.customerSnapshot?.billingProfile?.address?.state ?? "",
      placeOfBilling: invoice.companySnapshot?.address?.state ?? "",
      taxRate: DEFAULT_TAX_RATE,
      invoiceType: DEFAULT_INVOICE_TYPE,
      taxableValue: (invoice.financials?.subTotal ?? 0) - (invoice.financials?.discount ?? 0),
      cgst: invoice.financials?.taxes?.cgstAmount ?? 0,
      sgst: invoice.financials?.taxes?.sgstAmount ?? 0,
      igst: invoice.financials?.taxes?.igstAmount ?? 0,
      sacCode: invoice.items?.find(item => item.sacCode)?.sacCode ?? "",
      description: DEFAULT_DESCRIPTION
    });
  }

  // 5. Formatting (Numbers & Dates)
  const currencyCols = ["invoiceValue", "taxableValue", "cgst", "sgst", "igst"];
  currencyCols.forEach(col => {
    worksheet.getColumn(col).numFmt = '#,##0.00';
  });
  worksheet.getColumn("invoiceDate").numFmt = 'dd/mm/yyyy';

  // 6. Freeze Panes & AutoFilter
  worksheet.autoFilter = { from: "A2", to: "O2" };
  worksheet.views = [{ state: "frozen", ySplit: 2 }];

  // 7. Styling: Headers
  const headerRow = worksheet.getRow(2);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.eachCell(cell => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" }
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" }
    };
  });

  // 8. Styling: Data Rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFEAEAEA" } },
          left: { style: "thin", color: { argb: "FFEAEAEA" } },
          right: { style: "thin", color: { argb: "FFEAEAEA" } },
          bottom: { style: "thin", color: { argb: "FFEAEAEA" } }
        };
      });
    }
  });

  return workbook;
};