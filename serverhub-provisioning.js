"use strict";

function createProviderAdapterRegistry(adapters) {
  if (!Array.isArray(adapters)) throw new TypeError("Provider adapters must be supplied as an array.");
  const registered = new Map();
  for (const adapter of adapters) {
    if (!adapter || typeof adapter.providerId !== "string" || !adapter.providerId || typeof adapter.provision !== "function") {
      throw new TypeError("Each provider adapter needs a providerId and a provision function.");
    }
    if (registered.has(adapter.providerId)) throw new Error(`Duplicate provider adapter: ${adapter.providerId}`);
    registered.set(adapter.providerId, adapter);
  }
  return Object.freeze({
    get(providerId) {
      return registered.get(providerId) || null;
    }
  });
}

async function provisionAfterPayment(order, listing, registry) {
  if (!order || order.paymentStatus !== "confirmed" || typeof order.gatewayReference !== "string" || !order.gatewayReference) {
    throw new Error("Provisioning requires a payment confirmed by a verified gateway webhook.");
  }
  if (!listing || listing.providerId !== order.providerId) throw new Error("Order and listing provider do not match.");
  const adapter = registry?.get(listing.providerId);
  if (!adapter) return Object.freeze({ mode: "manual", status: "manual_required", providerResourceId: null });
  const result = await adapter.provision({
    orderId: order.id,
    listing: Object.freeze({
      id: listing.id,
      name: listing.name,
      cpu: listing.cpu,
      ram: listing.ram,
      storage: listing.storage,
      bandwidth: listing.bandwidth,
      location: listing.location,
      os: order.os
    })
  });
  if (!result || typeof result.resourceId !== "string" || !result.resourceId) {
    throw new Error("Provider adapter did not return a server resource identifier.");
  }
  return Object.freeze({ mode: "api", status: "provisioned", providerResourceId: result.resourceId });
}

async function transitionProviderServer(action, providerId, providerResourceId, registry) {
  if (!["suspend", "delete"].includes(action)) throw new TypeError("Server action must be suspend or delete.");
  if (typeof providerResourceId !== "string" || !providerResourceId) throw new TypeError("A provider resource identifier is required.");
  const adapter = registry?.get(providerId);
  if (!adapter || typeof adapter[action] !== "function") {
    return Object.freeze({ mode: "manual", status: `${action}_manual_required`, providerResourceId });
  }
  await adapter[action](providerResourceId);
  return Object.freeze({ mode: "api", status: action === "suspend" ? "suspended" : "deleted", providerResourceId });
}

module.exports = Object.freeze({ createProviderAdapterRegistry, provisionAfterPayment, transitionProviderServer });
