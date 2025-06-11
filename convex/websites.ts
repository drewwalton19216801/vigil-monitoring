import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all websites for dashboard
export const getAllWebsites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const websites = await ctx.db.query("websites").collect();
    
    // Get latest check for each website
    const websitesWithStatus = await Promise.all(
      websites.map(async (website) => {
        const latestCheck = await ctx.db
          .query("monitoringChecks")
          .withIndex("by_website_and_time", (q) => 
            q.eq("websiteId", website._id)
          )
          .order("desc")
          .first();

        // Calculate uptime for last 24 hours
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentChecks = await ctx.db
          .query("monitoringChecks")
          .withIndex("by_website_and_time", (q) => 
            q.eq("websiteId", website._id).gte("checkedAt", dayAgo)
          )
          .collect();

        const upChecks = recentChecks.filter(check => check.status === "up").length;
        const uptimePercentage = recentChecks.length > 0 
          ? (upChecks / recentChecks.length) * 100 
          : 0;

        // Calculate average response time
        const avgResponseTime = recentChecks.length > 0
          ? recentChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length
          : 0;

        return {
          ...website,
          currentStatus: latestCheck?.status || "unknown",
          lastChecked: latestCheck?.checkedAt || 0,
          responseTime: latestCheck?.responseTime || 0,
          statusCode: latestCheck?.statusCode,
          uptimePercentage: Math.round(uptimePercentage * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime),
          sslExpiryDate: latestCheck?.sslExpiryDate,
          sslDaysUntilExpiry: latestCheck?.sslDaysUntilExpiry,
        };
      })
    );

    return websitesWithStatus;
  },
});

// Get website details with historical data
export const getWebsiteDetails = query({
  args: { websiteId: v.id("websites") },
  returns: v.union(
    v.object({
      website: v.object({
        _id: v.id("websites"),
        _creationTime: v.number(),
        name: v.string(),
        url: v.string(),
        isActive: v.boolean(),
        checkInterval: v.number(),
        timeout: v.number(),
        expectedStatusCode: v.optional(v.number()),
        keywords: v.optional(v.array(v.string())),
        createdBy: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      checks: v.array(v.object({
        _id: v.id("monitoringChecks"),
        _creationTime: v.number(),
        websiteId: v.id("websites"),
        status: v.union(v.literal("up"), v.literal("down"), v.literal("degraded")),
        checkedAt: v.number(),
        responseTime: v.number(),
        statusCode: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        sslExpiryDate: v.optional(v.number()),
        sslDaysUntilExpiry: v.optional(v.number()),
      })),
      incidents: v.array(v.object({
        _id: v.id("incidents"),
        _creationTime: v.number(),
        websiteId: v.id("websites"),
        status: v.union(v.literal("ongoing"), v.literal("resolved")),
        severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
        description: v.string(),
        startTime: v.number(),
        endTime: v.optional(v.number()),
        resolvedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const website = await ctx.db.get(args.websiteId);
    if (!website) return null;

    // Get checks for the last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const checks = await ctx.db
      .query("monitoringChecks")
      .withIndex("by_website_and_time", (q) => 
        q.eq("websiteId", args.websiteId).gte("checkedAt", weekAgo)
      )
      .order("desc")
      .collect();

    // Get recent incidents
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_website", (q) => q.eq("websiteId", args.websiteId))
      .order("desc")
      .take(10);

    return {
      website,
      checks,
      incidents,
    };
  },
});

// Add new website
export const addWebsite = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    checkInterval: v.optional(v.number()),
    timeout: v.optional(v.number()),
    expectedStatusCode: v.optional(v.number()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL format");
    }

    const websiteId = await ctx.db.insert("websites", {
      name: args.name,
      url: args.url,
      isActive: true,
      checkInterval: args.checkInterval || 5,
      timeout: args.timeout || 30,
      expectedStatusCode: args.expectedStatusCode,
      keywords: args.keywords,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return websiteId;
  },
});

// Update website
export const updateWebsite = mutation({
  args: {
    websiteId: v.id("websites"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    checkInterval: v.optional(v.number()),
    timeout: v.optional(v.number()),
    expectedStatusCode: v.optional(v.number()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");

    const updates: any = { updatedAt: Date.now() };
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.url !== undefined) {
      try {
        new URL(args.url);
        updates.url = args.url;
      } catch {
        throw new Error("Invalid URL format");
      }
    }
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.checkInterval !== undefined) updates.checkInterval = args.checkInterval;
    if (args.timeout !== undefined) updates.timeout = args.timeout;
    if (args.expectedStatusCode !== undefined) updates.expectedStatusCode = args.expectedStatusCode;
    if (args.keywords !== undefined) updates.keywords = args.keywords;

    await ctx.db.patch(args.websiteId, updates);
    return args.websiteId;
  },
});

// Delete website
export const deleteWebsite = mutation({
  args: { websiteId: v.id("websites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const website = await ctx.db.get(args.websiteId);
    if (!website) throw new Error("Website not found");

    await ctx.db.delete(args.websiteId);
    return true;
  },
});

// Get monitoring statistics
export const getMonitoringStats = query({
  args: { 
    websiteId: v.optional(v.id("websites")),
    days: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const days = args.days || 30;
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    let checksQuery = ctx.db
      .query("monitoringChecks")
      .withIndex("by_checked_at", (q) => q.gte("checkedAt", startTime));

    if (args.websiteId) {
      checksQuery = ctx.db
        .query("monitoringChecks")
        .withIndex("by_website_and_time", (q) => 
          q.eq("websiteId", args.websiteId!).gte("checkedAt", startTime)
        );
    }

    const checks = await checksQuery.collect();

    const totalChecks = checks.length;
    const upChecks = checks.filter(check => check.status === "up").length;
    const downChecks = checks.filter(check => check.status === "down").length;
    const degradedChecks = checks.filter(check => check.status === "degraded").length;

    const avgResponseTime = checks.length > 0
      ? checks.reduce((sum, check) => sum + check.responseTime, 0) / checks.length
      : 0;

    const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0;

    return {
      totalChecks,
      upChecks,
      downChecks,
      degradedChecks,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      period: days,
    };
  },
});
