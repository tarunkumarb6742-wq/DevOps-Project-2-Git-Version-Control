"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createProviderAdapterRegistry, provisionAfterPayment, transitionProviderServer } = require("./serverhub-provisioning.js");

const listing = { id: "listing-1", providerId: "provider-1", name: "Compute", cpu: "4 vCPU", ram: "8 GB", storage: "160 GB NVMe", bandwidth: "5 TB", location: "Frankfurt, DE" };
const unpaidOrder = { id: "order-1", providerId: "provider-1", paymentStatus: "pending", gatewayReference: null, os: "Ubuntu 24.04" };

test("refuses provisioning until a verified gateway confirmation is recorded", async () => {
  const registry = createProviderAdapterRegistry([]);
  await assert.rejects(provisionAfterPayment(unpaidOrder, listing, registry), /verified gateway webhook/);
});

test("routes confirmed orders without an API adapter to the manual fallback", async () => {
  const paidOrder = { ...unpaidOrder, paymentStatus: "confirmed", gatewayReference: "gateway-event-123" };
  const result = await provisionAfterPayment(paidOrder, listing, createProviderAdapterRegistry([]));
  assert.deepEqual(result, { mode: "manual", status: "manual_required", providerResourceId: null });
});

test("calls only the registered provider adapter with a limited server payload", async () => {
  const paidOrder = { ...unpaidOrder, paymentStatus: "confirmed", gatewayReference: "gateway-event-123" };
  let provisionInput;
  const registry = createProviderAdapterRegistry([{
    providerId: "provider-1",
    async provision(input) {
      provisionInput = input;
      return { resourceId: "resource-42" };
    }
  }]);
  const result = await provisionAfterPayment(paidOrder, listing, registry);
  assert.equal(result.status, "provisioned");
  assert.equal(result.providerResourceId, "resource-42");
  assert.deepEqual(Object.keys(provisionInput), ["orderId", "listing"]);
  assert.equal("customerId" in provisionInput, false);
});

test("tracks suspension and deletion or returns manual fallback instructions", async () => {
  const actions = [];
  const registry = createProviderAdapterRegistry([{
    providerId: "provider-1",
    provision: async () => ({ resourceId: "resource-42" }),
    async suspend(id) { actions.push(["suspend", id]); },
    async delete(id) { actions.push(["delete", id]); }
  }]);
  assert.equal((await transitionProviderServer("suspend", "provider-1", "resource-42", registry)).status, "suspended");
  assert.equal((await transitionProviderServer("delete", "provider-1", "resource-42", registry)).status, "deleted");
  assert.deepEqual(actions, [["suspend", "resource-42"], ["delete", "resource-42"]]);
  assert.equal((await transitionProviderServer("suspend", "offline-provider", "resource-1", registry)).status, "suspend_manual_required");
});

test("rejects mismatched providers and invalid adapter registries", async () => {
  const paidOrder = { ...unpaidOrder, paymentStatus: "confirmed", gatewayReference: "gateway-event-123" };
  assert.throws(() => createProviderAdapterRegistry([{}]), TypeError);
  assert.throws(() => createProviderAdapterRegistry([{ providerId: "p", provision() {} }, { providerId: "p", provision() {} }]), /Duplicate/);
  await assert.rejects(provisionAfterPayment({ ...paidOrder, providerId: "other" }, listing, createProviderAdapterRegistry([])), /do not match/);
});
