import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Websites being monitored
  websites: defineTable({
    name: v.string(),
    url: v.string(),
    isActive: v.boolean(),
    checkInterval: v.number(), // minutes
    timeout: v.number(), // seconds
    expectedStatusCode: v.optional(v.number()),
    keywords: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_created_by", ["createdBy"]),

  // Monitoring checks and results
  monitoringChecks: defineTable({
    websiteId: v.id("websites"),
    status: v.union(v.literal("up"), v.literal("down"), v.literal("degraded")),
    responseTime: v.number(), // milliseconds
    statusCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    sslExpiryDate: v.optional(v.number()),
    sslDaysUntilExpiry: v.optional(v.number()),
    checkedAt: v.number(),
  })
    .index("by_website", ["websiteId"])
    .index("by_website_and_time", ["websiteId", "checkedAt"])
    .index("by_checked_at", ["checkedAt"]),

  // Alert configurations
  alertConfigs: defineTable({
    websiteId: v.id("websites"),
    userId: v.id("users"),
    alertTypes: v.array(v.union(
      v.literal("downtime"),
      v.literal("recovery"),
      v.literal("slow_response"),
      v.literal("ssl_expiry"),
      v.literal("daily_summary"),
      v.literal("weekly_summary")
    )),
    responseTimeThreshold: v.number(), // milliseconds
    sslExpiryThreshold: v.number(), // days
    isActive: v.boolean(),
  })
    .index("by_website", ["websiteId"])
    .index("by_user", ["userId"])
    .index("by_website_and_user", ["websiteId", "userId"]),

  // Alert history
  alerts: defineTable({
    websiteId: v.id("websites"),
    userId: v.id("users"),
    type: v.union(
      v.literal("downtime"),
      v.literal("recovery"),
      v.literal("slow_response"),
      v.literal("ssl_expiry"),
      v.literal("daily_summary"),
      v.literal("weekly_summary")
    ),
    message: v.string(),
    sentAt: v.number(),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("pending")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_website", ["websiteId"])
    .index("by_user", ["userId"])
    .index("by_sent_at", ["sentAt"]),

  // User profiles with contact info
  userProfiles: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("viewer")),
    timezone: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role"]),

  // Incident tracking
  incidents: defineTable({
    websiteId: v.id("websites"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.union(v.literal("ongoing"), v.literal("resolved")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.string(),
    resolvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_website", ["websiteId"])
    .index("by_status", ["status"])
    .index("by_start_time", ["startTime"]),

  // System settings
  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
