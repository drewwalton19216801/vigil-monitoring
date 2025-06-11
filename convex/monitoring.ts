import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Main monitoring action that checks all active websites
export const runMonitoringChecks = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("Starting monitoring checks...");
    
    // Get all active websites
    const websites = await ctx.runQuery(internal.monitoring.queryActiveWebsites);
    
    // Check each website
    const results = await Promise.allSettled(
      websites.map(website => 
        ctx.runAction(internal.monitoring.checkWebsite, { websiteId: website._id })
      )
    );

    console.log(`Completed monitoring checks for ${websites.length} websites`);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to check website ${websites[index]._id}:`, result.reason);
      }
    });

    return { 
      totalWebsites: websites.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  },
});

// Query active websites for monitoring
export const queryActiveWebsites = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all active websites
    const websites = await ctx.db
      .query("websites")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    // Filter websites that are due for a check
    const websitesDueForCheck = await Promise.all(
      websites.map(async (website) => {
        // Get the last check for this website
        const lastCheck = await ctx.db
          .query("monitoringChecks")
          .withIndex("by_website_and_time", (q) => q.eq("websiteId", website._id))
          .order("desc")
          .first();

        // If no previous check, website is due for check
        if (!lastCheck) return website;

        // Calculate time since last check in minutes
        const minutesSinceLastCheck = (now - lastCheck.checkedAt) / (60 * 1000);

        // Return website if it's due for a check
        return minutesSinceLastCheck >= website.checkInterval ? website : null;
      })
    );

    // Filter out null values (websites not due for check)
    return websitesDueForCheck.filter((website): website is NonNullable<typeof website> => website !== null);
  },
});

// Check individual website
export const checkWebsite = internalAction({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args): Promise<any> => {
    const website = await ctx.runQuery(internal.monitoring.getWebsite, { websiteId: args.websiteId });
    if (!website) {
      throw new Error(`Website ${args.websiteId} not found`);
    }

    const startTime = Date.now();
    let status: "up" | "down" | "degraded" = "down";
    let responseTime = 0;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;
    let sslExpiryDate: number | undefined;
    let sslDaysUntilExpiry: number | undefined;

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), website.timeout * 1000);

      const response = await fetch(website.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Website Monitor Bot/1.0',
        },
      });

      clearTimeout(timeoutId);
      responseTime = Date.now() - startTime;
      statusCode = response.status;

      // Check if status code matches expected
      const expectedStatus = website.expectedStatusCode || 200;
      if (response.status === expectedStatus) {
        status = "up";
      } else if (response.status >= 200 && response.status < 400) {
        status = "degraded";
      } else {
        status = "down";
        errorMessage = `HTTP ${response.status}`;
      }

      // Check for keywords if specified
      if (website.keywords && website.keywords.length > 0 && status === "up") {
        const text = await response.text();
        const hasAllKeywords = website.keywords.every((keyword: string) => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!hasAllKeywords) {
          status = "degraded";
          errorMessage = "Required keywords not found";
        }
      }

      // Check SSL certificate if HTTPS
      if (website.url.startsWith('https://')) {
        try {
          const url = new URL(website.url);
          // Note: In a real implementation, you'd use a proper SSL checker
          // For now, we'll simulate SSL checking
          const mockSslExpiry = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days from now
          sslExpiryDate = mockSslExpiry;
          sslDaysUntilExpiry = Math.floor((mockSslExpiry - Date.now()) / (24 * 60 * 60 * 1000));
        } catch (sslError) {
          console.warn(`SSL check failed for ${website.url}:`, sslError);
        }
      }

    } catch (error: any) {
      responseTime = Date.now() - startTime;
      status = "down";
      
      if (error.name === 'AbortError') {
        errorMessage = `Timeout after ${website.timeout}s`;
      } else {
        errorMessage = error.message || 'Unknown error';
      }
    }

    // Store the check result
    await ctx.runMutation(internal.monitoring.saveCheckResult, {
      websiteId: args.websiteId,
      status,
      responseTime,
      statusCode,
      errorMessage,
      sslExpiryDate,
      sslDaysUntilExpiry,
    });

    // Check if we need to send alerts
    await ctx.runAction(internal.monitoring.processAlerts, {
      websiteId: args.websiteId,
      status,
      responseTime,
      sslDaysUntilExpiry,
    });

    return {
      websiteId: args.websiteId,
      status,
      responseTime,
      statusCode,
      errorMessage,
    };
  },
});

// Get website by ID
export const getWebsite = internalQuery({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.websiteId);
  },
});

// Save monitoring check result
export const saveCheckResult = internalMutation({
  args: {
    websiteId: v.id("websites"),
    status: v.union(v.literal("up"), v.literal("down"), v.literal("degraded")),
    responseTime: v.number(),
    statusCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    sslExpiryDate: v.optional(v.number()),
    sslDaysUntilExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("monitoringChecks", {
      websiteId: args.websiteId,
      status: args.status,
      responseTime: args.responseTime,
      statusCode: args.statusCode,
      errorMessage: args.errorMessage,
      sslExpiryDate: args.sslExpiryDate,
      sslDaysUntilExpiry: args.sslDaysUntilExpiry,
      checkedAt: Date.now(),
    });

    // Get the previous check to see if status changed
    const previousChecks = await ctx.db
      .query("monitoringChecks")
      .withIndex("by_website_and_time", (q) => q.eq("websiteId", args.websiteId))
      .order("desc")
      .take(2);

    const previousCheck = previousChecks[1]; // Second most recent (first is the one we just inserted)
    
    // Create or resolve incidents based on status changes
    if (args.status === "down" && (!previousCheck || previousCheck.status !== "down")) {
      // Website went down, create incident
      await ctx.db.insert("incidents", {
        websiteId: args.websiteId,
        startTime: Date.now(),
        status: "ongoing",
        severity: "high",
        description: args.errorMessage || "Website is down",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (args.status === "up" && previousCheck && previousCheck.status === "down") {
      // Website recovered, resolve incident
      const ongoingIncident = await ctx.db
        .query("incidents")
        .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
        .filter((q) => q.eq(q.field("status"), "ongoing"))
        .first();

      if (ongoingIncident) {
        await ctx.db.patch(ongoingIncident._id, {
          endTime: Date.now(),
          status: "resolved",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// Process alerts for a website check
export const processAlerts = internalAction({
  args: {
    websiteId: v.id("websites"),
    status: v.union(v.literal("up"), v.literal("down"), v.literal("degraded")),
    responseTime: v.number(),
    sslDaysUntilExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get alert configurations for this website
    const alertConfigs = await ctx.runQuery(internal.monitoring.getAlertConfigs, { websiteId: args.websiteId });

    // Get previous check to determine if status changed
    const previousChecks = await ctx.runQuery(internal.monitoring.getPreviousChecks, { websiteId: args.websiteId });
    const previousCheck = previousChecks[1];

    for (const config of alertConfigs) {
      const alertsToSend: string[] = [];

      // Check for downtime alerts
      if (config.alertTypes.includes("downtime") && 
          args.status === "down" && 
          (!previousCheck || previousCheck.status !== "down")) {
        alertsToSend.push("downtime");
      }

      // Check for recovery alerts
      if (config.alertTypes.includes("recovery") && 
          args.status === "up" && 
          previousCheck && previousCheck.status === "down") {
        alertsToSend.push("recovery");
      }

      // Check for slow response alerts
      if (config.alertTypes.includes("slow_response") && 
          args.responseTime > config.responseTimeThreshold) {
        alertsToSend.push("slow_response");
      }

      // Check for SSL expiry alerts
      if (config.alertTypes.includes("ssl_expiry") && 
          args.sslDaysUntilExpiry !== undefined &&
          args.sslDaysUntilExpiry <= config.sslExpiryThreshold) {
        alertsToSend.push("ssl_expiry");
      }

      // Send alerts
      for (const alertType of alertsToSend) {
        await ctx.runAction(internal.alerts.sendAlert, {
          websiteId: args.websiteId,
          userId: config.userId,
          alertType: alertType as any,
          responseTime: args.responseTime,
          sslDaysUntilExpiry: args.sslDaysUntilExpiry,
        });
      }
    }
  },
});

// Get alert configurations for a website
export const getAlertConfigs = internalQuery({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("alertConfigs")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get previous checks for a website
export const getPreviousChecks = internalQuery({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monitoringChecks")
      .withIndex("by_website_and_time", (q) => q.eq("websiteId", args.websiteId))
      .order("desc")
      .take(2);
  },
});
