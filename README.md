# ServerHub

ServerHub is a responsive server-rental marketplace and mediator workflow demo built with HTML, CSS, and vanilla JavaScript. It includes a sample catalog, provider comparison, role-specific workspaces, provider listing review, local rental and transaction records, support requests, and a provider-provisioning adapter contract.

## Run locally

No dependency installation or build tool is required. Open `index.html` in a browser, or serve this folder with any static HTTP server. For example:

```sh
npx serve .
```

Run the marketplace, commission, order-state, and provisioning-contract tests with:

```sh
npm test
npm run build
```

## Demo-mode behavior

This repository is still a static browser demo. It does not have a PostgreSQL database or trusted application server. Profiles, listings, orders, transactions, and support tickets are saved in this browser's local storage; selecting an administrator role is not secure authorization.

- Providers can create a demo account, set package specifications and prices/cost estimates, and submit listings. Listings remain hidden until the administrator-preview role approves them. Providers can toggle availability for approved demo listings.
- Customers can compare providers, create an unpaid rental order, see the 12% commission and provider payout estimate, and submit cancellation, support, refund-review, or dispute requests.
- Every browser-created order and transaction is initialized as `pending`, with no gateway reference and a `waiting_for_payment` provisioning state. There is deliberately no action that marks an order paid, settles provider funds, executes a refund, or provisions a server.
- Payment statuses must only be updated by a trusted server after it validates a payment provider's signed webhook and idempotently reconciles the gateway event. A browser form or a customer redirect is not payment confirmation.
- Provider API credentials are never requested or stored by the demo. Provider integrations must keep credentials in a server-side secrets manager and expose only authorized, audited server operations.

## Provider provisioning adapter

`serverhub-provisioning.js` defines a server-side adapter contract for provider-specific provision, suspend, and delete operations. `provisionAfterPayment` refuses to call any provider until its caller supplies an order with confirmed payment and a gateway reference. If no adapter is registered, it returns a `manual_required` result rather than pretending a server was created.

The adapter contract does not verify payment webhooks, connect a real provider, or persist server resources. In production, call it only from an authenticated backend after gateway-signature verification, use provider-scoped credentials from a secret manager, audit every lifecycle action, persist idempotency/resource state, and send manual fallback work to an authorized operator queue.

## Project structure

```text
index.html                       Page structure and workspace shells
style.css                        Responsive marketplace and role workspaces
script.js                        Browser interactions and local demo workflows
serverhub-core.js                Sample catalog, mediator math, pending orders
serverhub-core.test.js           Marketplace and ledger unit tests
serverhub-provisioning.js        Server-side provider adapter contract
serverhub-provisioning.test.js   Provisioning safety and fallback tests
```
