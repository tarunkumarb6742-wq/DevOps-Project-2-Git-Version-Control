"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { servers, categories, filterServers, calculateTotal, calculateHourlyTotal, calculateMediatorSplit, createMarketplaceOrder, createMediatorTransaction } = require("./serverhub-core.js");

test("the demo catalog contains every marketplace category", () => {
  assert.equal(servers.length, 7);
  assert.deepEqual(new Set(servers.map((server) => server.category)), new Set(categories));
});

test("filters server packages by category and case-insensitive text", () => {
  assert.deepEqual(filterServers(servers, "GPU", "All servers", "featured").map((server) => server.id), ["gpu-trainer"]);
  assert.deepEqual(filterServers(servers, "united states", "VPS Hosting", "featured"), []);
  assert.deepEqual(filterServers(servers, "new york", "VPS Hosting", "featured").map((server) => server.id), ["vps-starter"]);
});

test("sorts filtered listings by price and rating without changing the catalog", () => {
  assert.deepEqual(filterServers(servers, "", "All servers", "price-low").map((server) => server.monthly), [8, 12, 18, 32, 54, 89, 249]);
  assert.deepEqual(filterServers(servers, "", "All servers", "price-high")[0].id, "gpu-trainer");
  assert.deepEqual(filterServers(servers, "", "All servers", "rating")[0].id, "vps-starter");
  assert.equal(servers[0].id, "vps-starter");
});

test("calculates monthly rental totals and applies the annual demo discount", () => {
  assert.equal(calculateTotal(18, 3), 54);
  assert.equal(calculateTotal(18, 12), 194.4);
});

test("calculates hourly rental estimates without monthly discounts", () => {
  assert.equal(calculateHourlyTotal(0.012, 1), 0.01);
  assert.equal(calculateHourlyTotal(0.012, 24), 0.29);
  assert.equal(calculateHourlyTotal(0.012, 168), 2.02);
});

test("calculates the platform fee, provider payout, and cost-based margin", () => {
  assert.deepEqual(calculateMediatorSplit(100, 40), {
    gross: 100,
    commission: 12,
    providerPayout: 88,
    providerCost: 40,
    estimatedProviderMargin: 48
  });
  assert.throws(() => calculateMediatorSplit(100, 40, 1), RangeError);
});

test("creates pending rental and ledger records with no paid or provisioned state", () => {
  const listing = {
    id: "provider-listing",
    providerId: "provider-1",
    monthly: 30,
    hourly: 0.05,
    providerCostMonthly: 10,
    providerCostHourly: 0.02,
    availability: true,
    approvalStatus: "approved"
  };
  const order = createMarketplaceOrder({
    id: "order-1",
    transactionId: "transaction-1",
    listing,
    customerId: "customer@example.test",
    unit: "month",
    duration: 12,
    os: "Ubuntu 24.04",
    createdAt: "2026-01-01T00:00:00.000Z"
  });
  const transaction = createMediatorTransaction(order, "transaction-1");
  assert.equal(order.total, 324);
  assert.equal(order.commission, 38.88);
  assert.equal(order.providerPayoutEstimate, 285.12);
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.provisioningStatus, "waiting_for_payment");
  assert.equal(order.gatewayReference, null);
  assert.equal(transaction.paymentStatus, "pending");
  assert.equal(transaction.gatewayReference, null);
  assert.equal(transaction.refundStatus, "none");
});

test("blocks unavailable or unapproved listings from order creation", () => {
  const listing = { id: "hidden", providerId: "provider-1", monthly: 10, hourly: null, availability: true, approvalStatus: "pending" };
  assert.throws(() => createMarketplaceOrder({
    id: "order-2",
    transactionId: "transaction-2",
    listing,
    customerId: "customer@example.test",
    unit: "month",
    duration: 1,
    os: "Ubuntu",
    createdAt: "2026-01-01T00:00:00.000Z"
  }), /not approved/);
});

test("rejects invalid rental prices and durations", () => {
  assert.throws(() => calculateTotal(-1, 1), RangeError);
  assert.throws(() => calculateTotal(10, 0), RangeError);
  assert.throws(() => calculateTotal(10, 1.5), RangeError);
  assert.throws(() => calculateTotal(10, 121), RangeError);
  assert.throws(() => calculateHourlyTotal(null, 1), RangeError);
  assert.throws(() => calculateHourlyTotal(0.02, 0), RangeError);
  assert.throws(() => calculateHourlyTotal(0.02, 745), RangeError);
});
