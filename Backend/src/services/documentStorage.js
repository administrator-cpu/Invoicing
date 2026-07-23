import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH || "./storage";

const buildInvoiceDirectory = (invoice) => {
  const tenant = invoice.tenantId?.toString() || "default";
  const year = new Date(invoice.invoiceDate || invoice.createdAt).getFullYear();

  return path.join(
    STORAGE_ROOT,
    "invoices",
    tenant,
    year.toString()
  );
};

const buildRelativePath = (invoice) => {
  const tenant = invoice.tenantId?.toString() || "default";
  const year = new Date(invoice.invoiceDate || invoice.createdAt).getFullYear();
  const safeFileName = `${invoice.invoiceNumber}`.replace(/[<>:"/\\|?*]/g, "-");

  return path.join(
    "invoices",
    tenant,
    year.toString(),
    `${safeFileName}.pdf`
  );
};

export const saveInvoicePdf = async (invoice, document) => {
  const directory = buildInvoiceDirectory(invoice);

  await fs.mkdir(directory, { recursive: true, });

  const absolutePath = path.join(
    directory,
    document.fileName
  );

  await fs.writeFile(
    absolutePath,
    document.buffer,
    { flag: "w" }
  );

  return {
    fileName: document.fileName,
    relativePath: buildRelativePath(invoice),
    size: document.buffer.length,
    generatedAt: new Date(),
  };
};

export const readInvoicePdf = async (relativePath) => {
  const absolutePath = path.join(STORAGE_ROOT, relativePath);
  return fs.readFile(absolutePath);
};

export const pdfExists = async (relativePath) => {
  try {
    const absolutePath = path.join(
      STORAGE_ROOT,
      relativePath
    );
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
};