(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ServerHubCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  const categories = [
    "VPS Hosting",
    "Cloud Servers",
    "Dedicated Servers",
    "GPU Servers",
    "Game Servers",
    "Application Hosting",
    "Database Hosting"
  ];

  const servers = [
    { id: "vps-starter", name: "VPS Starter", category: "VPS Hosting", description: "A reliable home for side projects and small websites.", cpu: "2 vCPU", ram: "4 GB", storage: "80 GB NVMe", bandwidth: "4 TB", os: "Ubuntu 24.04", operatingSystems: ["Ubuntu 24.04", "Debian 12", "AlmaLinux 9"], location: "New York, US", monthly: 8, hourly: 0.012, provider: "Northstar Compute", rating: 4.9, badge: "POPULAR", icon: "⌘" },
    { id: "cloud-flex", name: "Cloud Flex", category: "Cloud Servers", description: "Flexible compute for growing apps and changing workloads.", cpu: "4 vCPU", ram: "8 GB", storage: "160 GB NVMe", bandwidth: "6 TB", os: "Ubuntu 24.04", operatingSystems: ["Ubuntu 24.04", "Debian 12", "Fedora 40"], location: "Frankfurt, DE", monthly: 18, hourly: 0.027, provider: "Cloudline", rating: 4.8, badge: "", icon: "◈" },
    { id: "dedicated-pro", name: "Dedicated Pro", category: "Dedicated Servers", description: "Your own dedicated resources for demanding production work.", cpu: "16 cores", ram: "64 GB", storage: "1 TB NVMe", bandwidth: "20 TB", os: "Ubuntu 24.04", operatingSystems: ["Ubuntu 24.04", "Debian 12", "Rocky Linux 9"], location: "Amsterdam, NL", monthly: 89, hourly: null, provider: "Ironstack Hosting", rating: 4.9, badge: "HIGH PERFORMANCE", icon: "▣" },
    { id: "gpu-trainer", name: "GPU Trainer", category: "GPU Servers", description: "Accelerated compute for AI experiments and rendering.", cpu: "16 vCPU", ram: "64 GB", storage: "1 TB NVMe", bandwidth: "10 TB", os: "Ubuntu 22.04", operatingSystems: ["Ubuntu 22.04", "Ubuntu 24.04"], location: "Chicago, US", monthly: 249, hourly: 0.371, provider: "Tensor Harbor", rating: 4.9, badge: "GPU", icon: "✳" },
    { id: "game-arena", name: "Game Arena", category: "Game Servers", description: "Low-latency, high-clock servers for your gaming community.", cpu: "8 vCPU", ram: "16 GB", storage: "200 GB NVMe", bandwidth: "8 TB", os: "Debian 12", operatingSystems: ["Debian 12", "Ubuntu 24.04"], location: "London, UK", monthly: 32, hourly: 0.048, provider: "Playforge Servers", rating: 4.7, badge: "", icon: "⌬" },
    { id: "app-launch", name: "App Launch", category: "Application Hosting", description: "A straightforward runtime for deploying your first app.", cpu: "2 vCPU", ram: "4 GB", storage: "60 GB SSD", bandwidth: "3 TB", os: "Ubuntu 24.04", operatingSystems: ["Ubuntu 24.04", "Debian 12"], location: "Singapore, SG", monthly: 12, hourly: 0.018, provider: "Launchpad Cloud", rating: 4.8, badge: "NEW", icon: "↗" },
    { id: "db-reliable", name: "Database Reliable", category: "Database Hosting", description: "Consistent memory and storage for your application database.", cpu: "8 vCPU", ram: "32 GB", storage: "500 GB NVMe", bandwidth: "10 TB", os: "Ubuntu 24.04", operatingSystems: ["Ubuntu 24.04", "Debian 12", "Rocky Linux 9"], location: "Toronto, CA", monthly: 54, hourly: null, provider: "Northstar Compute", rating: 4.8, badge: "", icon: "▤" }
  ];

  const platformCommissionRate = 0.12;

  function filterServers(items, query, category, sort) {
    const needle = String(query || "").trim().toLowerCase();
    const filtered = items.filter((server) => {
      const matchesCategory = !category || category === "All servers" || server.category === category;
      const searchable = [server.name, server.category, server.description, server.cpu, server.ram, server.storage, server.location, server.os, server.provider].join(" ").toLowerCase();
      return matchesCategory && (!needle || searchable.includes(needle));
    });
    if (sort === "price-low") return filtered.sort((a, b) => a.monthly - b.monthly);
    if (sort === "price-high") return filtered.sort((a, b) => b.monthly - a.monthly);
    if (sort === "rating") return filtered.sort((a, b) => b.rating - a.rating || a.monthly - b.monthly);
    return filtered;
  }

  function calculateTotal(monthlyPrice, months) {
    const price = Number(monthlyPrice);
    const term = Number(months);
    if (monthlyPrice == null || monthlyPrice === "" || !Number.isFinite(price) || price < 0 || !Number.isInteger(term) || term < 1 || term > 120) {
      throw new RangeError("Price must be non-negative and rental duration must be 1–120 whole months.");
    }
    const discount = term >= 12 ? 0.1 : 0;
    return Math.round(price * term * (1 - discount) * 100) / 100;
  }

  function calculateHourlyTotal(hourlyPrice, hours) {
    const price = Number(hourlyPrice);
    const duration = Number(hours);
    if (hourlyPrice == null || hourlyPrice === "" || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration < 1 || duration > 744) {
      throw new RangeError("Hourly price must be non-negative and rental duration must be 1–744 whole hours.");
    }
    return Math.round(price * duration * 100) / 100;
  }

  function calculateMediatorSplit(customerPayment, providerCost = 0, commissionRate = platformCommissionRate) {
    const gross = Number(customerPayment);
    const cost = Number(providerCost);
    const rate = Number(commissionRate);
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(cost) || cost < 0 || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
      throw new RangeError("Payment and provider cost must be non-negative and commission must be between 0 and 1.");
    }
    const grossCents = Math.round(gross * 100);
    const commissionCents = Math.round(grossCents * rate);
    const providerPayoutCents = grossCents - commissionCents;
    const providerCostCents = Math.round(cost * 100);
    return Object.freeze({
      gross: grossCents / 100,
      commission: commissionCents / 100,
      providerPayout: providerPayoutCents / 100,
      providerCost: providerCostCents / 100,
      estimatedProviderMargin: (providerPayoutCents - providerCostCents) / 100
    });
  }

  function createMarketplaceOrder({ id, transactionId, listing, customerId, unit, duration, os, createdAt }) {
    if (!listing || !listing.id || !listing.providerId || !customerId) throw new TypeError("An approved listing, provider, and customer are required.");
    if (listing.availability === false || (listing.approvalStatus && listing.approvalStatus !== "approved")) {
      throw new Error("This listing is not approved and available to rent.");
    }
    const term = Number(duration);
    const total = unit === "hour"
      ? calculateHourlyTotal(listing.hourly, term)
      : unit === "month"
        ? calculateTotal(listing.monthly, term)
        : NaN;
    if (!Number.isFinite(total)) throw new RangeError("Rental duration must use a supported pricing unit.");
    const providerUnitCost = unit === "hour" ? Number(listing.providerCostHourly || 0) : Number(listing.providerCostMonthly || 0);
    const split = calculateMediatorSplit(total, providerUnitCost * term);
    return Object.freeze({
      id,
      transactionId,
      listingId: listing.id,
      serverId: listing.id,
      customerId,
      providerId: listing.providerId,
      unit,
      duration: term,
      os,
      total: split.gross,
      commission: split.commission,
      providerPayoutEstimate: split.providerPayout,
      providerCostEstimate: split.providerCost,
      providerMarginEstimate: split.estimatedProviderMargin,
      paymentStatus: "pending",
      gatewayReference: null,
      orderStatus: "awaiting_payment",
      cancellationStatus: "none",
      provisioningStatus: "waiting_for_payment",
      createdAt
    });
  }

  function createMediatorTransaction(order, transactionId) {
    if (!order || order.paymentStatus !== "pending" || order.gatewayReference !== null) {
      throw new Error("A new demo transaction must remain pending until confirmed by a payment gateway.");
    }
    return Object.freeze({
      id: transactionId,
      orderId: order.id,
      transactionId,
      listingId: order.listingId,
      customerId: order.customerId,
      providerId: order.providerId,
      gross: order.total,
      commission: order.commission,
      providerPayoutEstimate: order.providerPayoutEstimate,
      providerCostEstimate: order.providerCostEstimate,
      providerMarginEstimate: order.providerMarginEstimate,
      paymentStatus: "pending",
      gatewayReference: null,
      refundStatus: "none",
      disputeStatus: "none",
      createdAt: order.createdAt
    });
  }

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  return Object.freeze({ categories: Object.freeze(categories), servers: Object.freeze(servers.map((server) => Object.freeze(server))), platformCommissionRate, filterServers, calculateTotal, calculateHourlyTotal, calculateMediatorSplit, createMarketplaceOrder, createMediatorTransaction, createId });
});
