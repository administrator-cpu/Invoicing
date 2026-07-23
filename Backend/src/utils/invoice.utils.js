export const activeInvoiceFilter = (id) => ({
  ...(id && { _id: id }),
  $or: [
    { isDeleted: false },
    { isDeleted: { $exists: false } },
  ],
});