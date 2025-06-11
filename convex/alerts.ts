import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Send alert via SMS using Twilio
export const sendAlert = internalAction({
  args: {
    websiteId: v.id("websites"),
    userId: v.id("users"),
    alertType: v.union(
      v.literal("downtime"),
      v.literal("recovery"),
      v.literal("slow_response"),
      v.literal("ssl_expiry")
    ),
    responseTime: v.optional(v.number()),
    sslDaysUntilExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get website and user details
    const website = await ctx.runQuery(internal.alerts.getWebsite, { websiteId: args.websiteId });
    const user = await ctx.runQuery(internal.alerts.getUser, { userId: args.userId });
    const userProfile = await ctx.runQuery(internal.alerts.getUserProfile, { userId: args.userId });

    if (!website || !user || !userProfile || !userProfile.phoneNumber) {
      console.error("Missing required data for alert", { website: !!website, user: !!user, userProfile: !!userProfile });
      return;
    }

    // Generate alert message
    let message = "";
    switch (args.alertType) {
      case "downtime":
        message = `🚨 ALERT: ${website.name} (${website.url}) is DOWN. Please check immediately.`;
        break;
      case "recovery":
        message = `✅ RECOVERY: ${website.name} (${website.url}) is back online.`;
        break;
      case "slow_response":
        message = `⚠️ SLOW RESPONSE: ${website.name} responded in ${args.responseTime}ms, which exceeds the threshold.`;
        break;
      case "ssl_expiry":
        message = `🔒 SSL WARNING: ${website.name} SSL certificate expires in ${args.sslDaysUntilExpiry} days.`;
        break;
    }

    try {
      // In a real implementation, you would use Twilio SDK here
      // For now, we'll simulate the SMS sending
      console.log(`Sending SMS to ${userProfile.phoneNumber}: ${message}`);
      
      // Simulate Twilio API call
      const success = Math.random() > 0.1; // 90% success rate for simulation
      
      if (success) {
        // Log successful alert
        await ctx.runMutation(internal.alerts.logAlert, {
          websiteId: args.websiteId,
          userId: args.userId,
          type: args.alertType,
          message,
          status: "sent",
        });
      } else {
        throw new Error("Simulated SMS failure");
      }
    } catch (error: any) {
      console.error("Failed to send SMS alert:", error);
      
      // Log failed alert
      await ctx.runMutation(internal.alerts.logAlert, {
        websiteId: args.websiteId,
        userId: args.userId,
        type: args.alertType,
        message,
        status: "failed",
        errorMessage: error.message,
      });
    }
  },
});

// Helper queries for sendAlert
export const getWebsite = internalQuery({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.websiteId);
  },
});

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Log alert mutation
export const logAlert = internalMutation({
  args: {
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
    status: v.union(v.literal("sent"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alerts", {
      websiteId: args.websiteId,
      userId: args.userId,
      type: args.type,
      message: args.message,
      sentAt: Date.now(),
      status: args.status,
      errorMessage: args.errorMessage,
    });
  },
});

// Get alert configurations for a user
export const getUserAlertConfigs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const configs = await ctx.db
      .query("alertConfigs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get website details for each config
    const configsWithWebsites = await Promise.all(
      configs.map(async (config) => {
        const website = await ctx.db.get(config.websiteId);
        return {
          ...config,
          website,
        };
      })
    );

    return configsWithWebsites;
  },
});

// Create or update alert configuration
export const upsertAlertConfig = mutation({
  args: {
    websiteId: v.id("websites"),
    alertTypes: v.array(v.union(
      v.literal("downtime"),
      v.literal("recovery"),
      v.literal("slow_response"),
      v.literal("ssl_expiry"),
      v.literal("daily_summary"),
      v.literal("weekly_summary")
    )),
    responseTimeThreshold: v.number(),
    sslExpiryThreshold: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if config already exists
    const existingConfig = await ctx.db
      .query("alertConfigs")
      .withIndex("by_website_and_user", (q) => 
        q.eq("websiteId", args.websiteId).eq("userId", userId)
      )
      .first();

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        alertTypes: args.alertTypes,
        responseTimeThreshold: args.responseTimeThreshold,
        sslExpiryThreshold: args.sslExpiryThreshold,
        isActive: args.isActive,
      });
      return existingConfig._id;
    } else {
      // Create new config
      return await ctx.db.insert("alertConfigs", {
        websiteId: args.websiteId,
        userId,
        alertTypes: args.alertTypes,
        responseTimeThreshold: args.responseTimeThreshold,
        sslExpiryThreshold: args.sslExpiryThreshold,
        isActive: args.isActive,
      });
    }
  },
});

// Delete alert configuration
export const deleteAlertConfig = mutation({
  args: {
    configId: v.id("alertConfigs"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the config to verify ownership
    const config = await ctx.db.get(args.configId);
    if (!config) throw new Error("Alert configuration not found");
    if (config.userId !== userId) throw new Error("Not authorized to delete this configuration");

    // Delete the config
    await ctx.db.delete(args.configId);
  },
});

// Get alert history
export const getAlertHistory = query({
  args: {
    websiteId: v.optional(v.id("websites")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let alerts;
    
    if (args.websiteId) {
      alerts = await ctx.db
        .query("alerts")
        .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId!))
        .order("desc")
        .take(args.limit || 50);
    } else {
      alerts = await ctx.db
        .query("alerts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 50);
    }

    // Get website details for each alert
    const alertsWithWebsites = await Promise.all(
      alerts.map(async (alert) => {
        const website = await ctx.db.get(alert.websiteId);
        return {
          ...alert,
          website,
        };
      })
    );

    return alertsWithWebsites;
  },
});

// Send daily/weekly summary reports
export const sendSummaryReports = internalAction({
  args: { 
    type: v.union(v.literal("daily"), v.literal("weekly")) 
  },
  handler: async (ctx, args) => {
    const alertType = args.type === "daily" ? "daily_summary" : "weekly_summary";
    
    // Get all users who want summary reports
    const alertConfigs = await ctx.runQuery(internal.alerts.getSummaryConfigs, { alertType });

    // Group by user
    const userConfigs = new Map();
    for (const config of alertConfigs) {
      if (!userConfigs.has(config.userId)) {
        userConfigs.set(config.userId, []);
      }
      userConfigs.get(config.userId).push(config);
    }

    // Send summary to each user
    for (const [userId, configs] of userConfigs) {
      await ctx.runAction(internal.alerts.sendUserSummary, {
        userId,
        websiteIds: configs.map((c: any) => c.websiteId),
        type: args.type,
      });
    }
  },
});

// Get summary alert configurations
export const getSummaryConfigs = internalQuery({
  args: { alertType: v.string() },
  handler: async (ctx, args) => {
    const allConfigs = await ctx.db.query("alertConfigs").collect();
    return allConfigs.filter(config => 
      config.isActive && config.alertTypes.includes(args.alertType as any)
    );
  },
});

export const sendUserSummary = internalAction({
  args: {
    userId: v.id("users"),
    websiteIds: v.array(v.id("websites")),
    type: v.union(v.literal("daily"), v.literal("weekly")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.alerts.getUser, { userId: args.userId });
    const userProfile = await ctx.runQuery(internal.alerts.getUserProfile, { userId: args.userId });

    if (!user || !userProfile || !userProfile.phoneNumber) {
      return;
    }

    const period = args.type === "daily" ? 24 : 168; // hours
    const startTime = Date.now() - period * 60 * 60 * 1000;

    let summaryText = `📊 ${args.type.toUpperCase()} SUMMARY:\n\n`;
    
    for (const websiteId of args.websiteIds) {
      const website = await ctx.runQuery(internal.alerts.getWebsite, { websiteId });
      if (!website) continue;

      const checks = await ctx.runQuery(internal.alerts.getWebsiteChecks, { 
        websiteId, 
        startTime 
      });

      if (checks.length === 0) continue;

      const upChecks = checks.filter((c: any) => c.status === "up").length;
      const uptime = (upChecks / checks.length) * 100;
      const avgResponse = checks.reduce((sum: number, c: any) => sum + c.responseTime, 0) / checks.length;

      summaryText += `${website.name}: ${uptime.toFixed(1)}% uptime, ${avgResponse.toFixed(0)}ms avg response\n`;
    }

    // Send summary SMS (simulated)
    console.log(`Sending ${args.type} summary to ${userProfile.phoneNumber}: ${summaryText}`);
    
    // Log the summary alert
    await ctx.runMutation(internal.alerts.logAlert, {
      websiteId: args.websiteIds[0], // Use first website as reference
      userId: args.userId,
      type: args.type === "daily" ? "daily_summary" : "weekly_summary",
      message: summaryText,
      status: "sent",
    });
  },
});

// Get website checks for summary
export const getWebsiteChecks = internalQuery({
  args: { 
    websiteId: v.id("websites"), 
    startTime: v.number() 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monitoringChecks")
      .withIndex("by_website_and_time", (q) => 
        q.eq("websiteId", args.websiteId).gte("checkedAt", args.startTime)
      )
      .collect();
  },
});
