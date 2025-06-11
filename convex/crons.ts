import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run monitoring checks every 1 minute
crons.interval(
  "monitoring checks",
  { minutes: 1 },
  internal.monitoring.runMonitoringChecks,
  {}
);

// Send daily summary reports at 8 AM
crons.cron(
  "daily summary reports",
  "0 8 * * *",
  internal.alerts.sendSummaryReports,
  { type: "daily" }
);

// Send weekly summary reports on Monday at 8 AM
crons.cron(
  "weekly summary reports", 
  "0 8 * * 1",
  internal.alerts.sendSummaryReports,
  { type: "weekly" }
);

export default crons;
