/**
 * One-time fix for the creditNoteNumber unique index, which was created as
 * non-sparse before `sparse: true` was added to the schema. Safe to run
 * against production — credit notes aren't in production use yet, and this
 * only touches the `creditnotes` collection's index + the stray null field
 * on any lingering draft.
 *
 * Usage: node scripts/fix-creditnote-index.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
const collection = mongoose.connection.db.collection("creditnotes");

// 1. Drop the old, incorrectly non-sparse unique index (if it exists).
const indexes = await collection.indexes();
if (indexes.some((idx) => idx.name === "creditNoteNumber_1")) {
  await collection.dropIndex("creditNoteNumber_1");
  console.log("Dropped old creditNoteNumber_1 index.");
} else {
  console.log("No existing creditNoteNumber_1 index found — skipping drop.");
}

// 2. Remove the stray explicit `null` from any draft so it's genuinely absent.
const unsetResult = await collection.updateMany(
  { creditNoteNumber: null },
  { $unset: { creditNoteNumber: "" } }
);
console.log(`Unset creditNoteNumber on ${unsetResult.modifiedCount} document(s).`);

// 3. Recreate the index correctly as unique + sparse.
await collection.createIndex(
  { creditNoteNumber: 1 },
  { unique: true, sparse: true }
);
console.log("Recreated creditNoteNumber_1 as unique + sparse.");

await mongoose.disconnect();
process.exit(0);
