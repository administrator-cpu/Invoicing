import emailQueue from "./src/queues/emailQueue.js";

console.log("Starting queue inspection...");

try {
  console.log("Redis / Queue connection loaded.");

  const counts = await emailQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused"
  );

  console.log("\nQUEUE COUNTS:");
  console.dir(counts, { depth: null });

  const jobs = await emailQueue.getJobs(
    ["waiting", "active", "failed", "delayed"],
    0,
    100
  );

  console.log(`\nFOUND ${jobs.length} JOBS`);

  for (const job of jobs) {
    console.log({
      id: job.id,
      name: job.name,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      data: job.data,
      failedReason: job.failedReason,
    });
  }

  console.log("\nInspection complete.");
} catch (error) {
  console.error("QUEUE INSPECTION FAILED");
  console.error(error);
} finally {
  await emailQueue.close();
}