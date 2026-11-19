// ServerHub is a browser-only demo. Orders and deployments are local records, not live services.
document.addEventListener("DOMContentLoaded", () => {
  const Core = window.ServerHubCore;
  if (!Core) {
    console.error("ServerHub could not load its marketplace data.");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { category: "All servers", search: "", sort: "featured", testimonial: 0, dashboardTab: "servers", compareIds: [], pendingServerId: null, pendingAction: null };
  const storageKeys = { user: "serverhub-demo-user", orders: "serverhub-demo-orders", projects: "serverhub-demo-projects", providers: "serverhub-demo-providers", listings: "serverhub-demo-listings", transactions: "serverhub-demo-transactions", tickets: "serverhub-demo-tickets" };
  const iconClasses = { "VPS Hosting": "", "Cloud Servers": "purple", "Dedicated Servers": "orange", "GPU Servers": "purple", "Game Servers": "cyan", "Application Hosting": "cyan", "Database Hosting": "" };

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error(`Could not read ${key} from local storage.`, error);
      return [];
    }
  }

  function writeValue(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save ${key} to local storage.`, error);
      showToast("Your browser could not save this demo record. Check local storage settings.", true);
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function showToast(message, isError = false) {
    const region = $("#toast-region");
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " error" : ""}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 3800);
  }

  function closeMobileNav() {
    $("#main-nav").classList.remove("open");
    $("#mobile-menu-button").setAttribute("aria-expanded", "false");
  }

  function marketplaceServers() {
    const samples = Core.servers.map((server) => ({
      ...server,
      providerId: `sample:${server.id}`,
      providerCostMonthly: Math.round(server.monthly * 55) / 100,
      providerCostHourly: server.hourly == null ? null : Math.round(server.hourly * 60 * 100000) / 100000,
      availability: true,
      approvalStatus: "approved",
      source: "sample"
    }));
    const approvedListings = readList(storageKeys.listings).filter((listing) => listing.approvalStatus === "approved" && listing.availability !== false);
    return [...samples, ...approvedListings];
  }

  function findMarketplaceServer(serverId) {
    return marketplaceServers().find((server) => server.id === serverId);
  }

  function getCurrentProvider() {
    const user = getUser();
    return user?.role === "provider" ? readList(storageKeys.providers).find((provider) => provider.id === user.providerId) : null;
  }

  function renderCategories() {
    $("#category-pills").innerHTML = ["All servers", ...Core.categories].map((category) =>
      `<button class="category-pill${state.category === category ? " active" : ""}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${state.category === category}">${escapeHtml(category)}</button>`
    ).join("");
  }

  function serverCard(server) {
    const iconClass = iconClasses[server.category] || "";
    const badge = server.badge ? `<span class="server-badge${server.badge === "NEW" ? " badge-new" : ""}">${escapeHtml(server.badge)}</span>` : "";
    return `<article class="server-card">
      <div class="server-card-top"><div class="server-card-title"><span class="server-card-icon ${iconClass}">${escapeHtml(server.icon)}</span><div><h3>${escapeHtml(server.name)}</h3><span>${escapeHtml(server.category)}</span></div></div>${badge}</div>
      <p class="server-description">${escapeHtml(server.description)}</p>
      <div class="server-specs">
        <div class="spec-item"><span>CPU</span><b>${escapeHtml(server.cpu)}</b></div><div class="spec-item"><span>Memory</span><b>${escapeHtml(server.ram)}</b></div><div class="spec-item"><span>Storage</span><b>${escapeHtml(server.storage)}</b></div><div class="spec-item"><span>Bandwidth</span><b>${escapeHtml(server.bandwidth)}</b></div>
      </div>
      <div class="server-meta"><span>${escapeHtml(server.os)}</span><span>⌖ ${escapeHtml(server.location)}</span><span class="availability">● Available</span></div>
      <div class="server-provider"><span class="provider-avatar">${escapeHtml(server.provider.slice(0, 1))}</span><span>${escapeHtml(server.provider)}</span><span class="provider-rating">★ ${server.rating.toFixed(1)}</span></div>
      <div class="server-card-footer"><div><div class="server-price">$${server.monthly}<span>/ month</span></div><small class="server-hourly">${server.hourly == null ? "Monthly plan" : `$${Number(server.hourly).toFixed(3)} / hour`}</small></div><div class="server-card-actions"><button type="button" class="compare-toggle${state.compareIds.includes(server.id) ? " selected" : ""}" data-compare-server="${escapeHtml(server.id)}" aria-pressed="${state.compareIds.includes(server.id)}">Compare</button><button type="button" data-rent-server="${escapeHtml(server.id)}">Rent <span aria-hidden="true">→</span></button></div></div>
    </article>`;
  }

  function renderServers() {
    const filtered = Core.filterServers(marketplaceServers(), state.search, state.category, state.sort);
    $("#server-grid").innerHTML = filtered.map(serverCard).join("");
    $("#server-grid").classList.toggle("hidden", filtered.length === 0);
    $("#no-results").classList.toggle("hidden", filtered.length !== 0);
    const compareBar = $("#compare-bar");
    compareBar.classList.toggle("hidden", state.compareIds.length === 0);
    $("#compare-count").textContent = `${state.compareIds.length} server${state.compareIds.length === 1 ? "" : "s"} selected`;
  }

  function openModal(content, wide = false) {
    const backdrop = $("#modal-backdrop");
    $("#modal").classList.toggle("modal-wide", wide);
    $("#modal-content").innerHTML = content;
    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $("#modal-close").focus();
  }

  function closeModal() {
    $("#modal-backdrop").classList.add("hidden");
    $("#modal-backdrop").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openRent(serverId) {
    const user = getUser();
    if (!user || user.role !== "customer") {
      state.pendingServerId = serverId;
      openAuth("customer");
      return;
    }
    const server = findMarketplaceServer(serverId);
    if (!server) return;
    const terms = [1, 3, 6, 12];
    const durationOptions = `<optgroup label="Monthly">${terms.map((month) => `<option value="month:${month}">${month} ${month === 1 ? "month" : "months"}${month === 12 ? " · save 10%" : ""}</option>`).join("")}</optgroup>${server.hourly == null ? "" : '<optgroup label="Hourly · one-time estimate"><option value="hour:1">1 hour</option><option value="hour:24">24 hours</option><option value="hour:168">1 week · 168 hours</option></optgroup>'}`;
    const providerCost = Number(server.providerCostMonthly || 0);
    const split = Core.calculateMediatorSplit(Core.calculateTotal(server.monthly, 1), providerCost);
    const total = Core.calculateTotal(server.monthly, 1);
    openModal(`<div class="modal-eyebrow">SERVER PACKAGE · DEMO CHECKOUT</div><h2 id="modal-title">${escapeHtml(server.name)}</h2><p class="modal-intro">${escapeHtml(server.description)} Choose a term and operating system to preview your rental.</p>
      <div class="modal-summary"><span><b>${escapeHtml(server.cpu)} · ${escapeHtml(server.ram)}</b><small>${escapeHtml(server.storage)} · ${escapeHtml(server.location)}</small></span><span class="availability">● Available</span></div>
      <form id="checkout-form" data-server-id="${escapeHtml(server.id)}">
        <div class="inline-fields"><div class="field"><label for="rental-term">Rental duration</label><select id="rental-term" name="duration">${durationOptions}</select></div><div class="field"><label for="server-os">Operating system</label><select id="server-os" name="os">${server.operatingSystems.map((os) => `<option>${escapeHtml(os)}</option>`).join("")}</select></div></div>
        <div class="modal-summary"><span><b>Estimated total</b><small id="checkout-term-label">For 1 month · payment pending</small></span><strong id="checkout-total">$${total.toFixed(2)}<small> USD</small></strong></div>
        <div class="mediator-breakdown"><span>Marketplace commission (${Math.round(Core.platformCommissionRate * 100)}%) <b id="checkout-commission">$${split.commission.toFixed(2)}</b></span><small>Provider payout estimate <b id="checkout-payout">$${split.providerPayout.toFixed(2)}</b></small></div>
        <div class="demo-notice">No payment gateway is connected. This creates an unpaid order only. It stays pending and cannot provision a server until a trusted payment confirmation exists.</div>
        <button class="button button-primary" type="submit">Create unpaid order <span aria-hidden="true">→</span></button>
      </form>`, false);
  }

  function updateCheckoutTotal() {
    const form = $("#checkout-form");
    if (!form) return;
    const server = findMarketplaceServer(form.dataset.serverId);
    const [unit, rawDuration] = $("#rental-term").value.split(":");
    const duration = Number(rawDuration);
    if (!server || !Number.isInteger(duration) || duration < 1) return;
    const total = unit === "hour" ? Core.calculateHourlyTotal(server.hourly, duration) : Core.calculateTotal(server.monthly, duration);
    const costPerUnit = unit === "hour" ? Number(server.providerCostHourly || 0) : Number(server.providerCostMonthly || 0);
    const split = Core.calculateMediatorSplit(total, costPerUnit * duration);
    $("#checkout-total").innerHTML = `$${total.toFixed(2)}<small> USD</small>`;
    $("#checkout-term-label").textContent = `For ${formatRentalDuration(unit, duration)} · payment pending`;
    $("#checkout-commission").textContent = `$${split.commission.toFixed(2)}`;
    $("#checkout-payout").textContent = `$${split.providerPayout.toFixed(2)}`;
  }

  function formatRentalDuration(unit, duration) {
    if (unit === "hour") return `${duration} ${duration === 1 ? "hour" : "hours"}`;
    return `${duration} ${duration === 1 ? "month" : "months"}`;
  }

  function openAuth(requestedRole = null) {
    const user = getUser();
    const role = requestedRole || user?.role || "customer";
    openModal(`<div class="modal-eyebrow">YOUR SERVERHUB WORKSPACE</div><h2 id="modal-title">${user ? "Switch demo role" : "Create a demo account"}</h2><p class="modal-intro">Choose a role to preview its marketplace workspace.</p>
      <div class="demo-notice">Demo role selection is not authentication or access control. Use fictional details. Admin actions are local previews; never enter passwords, payment credentials, or provider secrets.</div>
      <form id="auth-form"><div class="field"><label for="demo-role">Workspace role</label><select id="demo-role" name="role"><option value="customer"${role === "customer" ? " selected" : ""}>Customer</option><option value="provider"${role === "provider" ? " selected" : ""}>Server provider</option><option value="administrator"${role === "administrator" ? " selected" : ""}>Administrator preview</option></select></div><div class="field"><label for="demo-name">Your name</label><input id="demo-name" name="name" autocomplete="name" placeholder="Alex Builder" value="${escapeHtml(user?.name || "")}" required maxlength="60" /></div><div class="field"><label for="demo-email">Email address</label><input id="demo-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${escapeHtml(user?.email || "")}" required maxlength="120" /></div><button class="button button-primary" type="submit">Continue in demo mode <span aria-hidden="true">→</span></button></form>
      ${user ? '<button class="text-link" id="logout-button" type="button" style="margin-top:14px">Clear demo profile</button>' : ""}`);
  }

  function getUser() {
    try {
      const user = JSON.parse(localStorage.getItem(storageKeys.user) || "null");
      if (!user || typeof user.name !== "string" || typeof user.email !== "string") return null;
      if (!["customer", "provider", "administrator"].includes(user.role)) user.role = "customer";
      return user;
    } catch (error) {
      console.error("Could not read the demo profile from local storage.", error);
      return null;
    }
  }

  function openDeploy() {
    const user = getUser();
    if (!user || user.role !== "customer") {
      state.pendingAction = "deploy";
      openAuth("customer");
      return;
    }
    openModal(`<div class="modal-eyebrow">PROJECT DEPLOYMENT · DEMO WORKFLOW</div><h2 id="modal-title">Bring your project online.</h2><p class="modal-intro">Try a local deployment preview for a public repository. No GitHub connection or build is performed.</p>
      <form id="deploy-form">
        <div class="field"><label for="project-name">Project name</label><input id="project-name" name="name" placeholder="my-awesome-app" required maxlength="50" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]*" /></div>
        <div class="field"><label for="repo-url">Public repository URL</label><input id="repo-url" name="repository" type="url" placeholder="https://github.com/you/project" required maxlength="300" /><small>Public URL only. Do not paste access tokens or secrets.</small></div>
        <div class="inline-fields"><div class="field"><label for="project-runtime">Framework</label><select id="project-runtime" name="runtime"><option>Node.js</option><option>React</option><option>Python</option><option>PHP</option><option>Static site</option></select></div><div class="field"><label for="project-server">Preview server</label><select id="project-server" name="server">${marketplaceServers().map((server) => `<option value="${escapeHtml(server.id)}">${escapeHtml(server.name)} · $${server.monthly}/mo</option>`).join("")}</select></div></div>
        <div class="demo-notice">Environment variables, private repositories, GitHub authorization, build logs, and live deployment require a secure backend and are not enabled in this demo.</div>
        <div class="form-error" id="deploy-error"></div><button class="button button-primary" type="submit">Run demo preview <span aria-hidden="true">↗</span></button>
      </form>`, true);
  }

  function openProvider() {
    openModal(`<div class="modal-eyebrow">PROVIDER ONBOARDING · DEMO</div><h2 id="modal-title">List your infrastructure.</h2><p class="modal-intro">Create a local provider profile preview. No listing is published or payment account connected.</p>
      <form id="provider-form"><div class="field"><label for="provider-name">Provider or company name</label><input id="provider-name" name="name" placeholder="Your infrastructure company" required maxlength="80" /></div><div class="inline-fields"><div class="field"><label for="provider-email">Contact email</label><input id="provider-email" name="email" type="email" placeholder="team@example.com" required maxlength="120" /></div><div class="field"><label for="provider-category">Server category</label><select id="provider-category" name="category">${Core.categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></div></div><div class="field"><label for="provider-summary">What do you offer?</label><textarea id="provider-summary" name="summary" placeholder="Tell builders a little about your infrastructure." maxlength="300"></textarea></div><div class="demo-notice">Demo mode: provider verification, listing approval, customer management, and payouts require a real service backend.</div><button class="button button-primary" type="submit">Save provider preview <span aria-hidden="true">→</span></button></form>`, true);
  }

  function openListingForm() {
    const provider = getCurrentProvider();
    if (!provider) {
      showToast("Create a provider demo account before submitting a package.", true);
      openProvider();
      return;
    }
    openModal(`<div class="modal-eyebrow">NEW PACKAGE · ADMIN REVIEW REQUIRED</div><h2 id="modal-title">Submit a server package.</h2><p class="modal-intro">Set your specs, price, locations, and estimated costs. The listing stays hidden until admin approval.</p>
      <form id="listing-form" class="modal-wide">
        <div class="inline-fields"><div class="field"><label for="listing-name">Package name</label><input id="listing-name" name="name" required maxlength="60" placeholder="Compute Starter" /></div><div class="field"><label for="listing-category">Category</label><select id="listing-category" name="category">${Core.categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></div></div>
        <div class="inline-fields"><div class="field"><label for="listing-cpu">CPU cores / vCPU</label><input id="listing-cpu" name="cpu" required maxlength="32" placeholder="4 vCPU" /></div><div class="field"><label for="listing-ram">RAM</label><input id="listing-ram" name="ram" required maxlength="24" placeholder="8 GB" /></div></div>
        <div class="inline-fields"><div class="field"><label for="listing-storage">SSD storage</label><input id="listing-storage" name="storage" required maxlength="32" placeholder="160 GB NVMe" /></div><div class="field"><label for="listing-bandwidth">Bandwidth</label><input id="listing-bandwidth" name="bandwidth" required maxlength="32" placeholder="5 TB" /></div></div>
        <div class="inline-fields"><div class="field"><label for="listing-location">Location</label><input id="listing-location" name="location" required maxlength="60" placeholder="Frankfurt, DE" /></div><div class="field"><label for="listing-os">Operating system</label><input id="listing-os" name="os" required maxlength="32" value="Ubuntu 24.04" /></div></div>
        <div class="inline-fields"><div class="field"><label for="listing-monthly">Monthly price (USD)</label><input id="listing-monthly" name="monthly" type="number" min="1" max="100000" step="0.01" required placeholder="24.00" /></div><div class="field"><label for="listing-hourly">Hourly price (USD, optional)</label><input id="listing-hourly" name="hourly" type="number" min="0.01" max="1000" step="0.001" placeholder="0.036" /></div></div>
        <div class="inline-fields"><div class="field"><label for="listing-cost-monthly">Estimated provider cost / month (USD)</label><input id="listing-cost-monthly" name="providerCostMonthly" type="number" min="0" max="100000" step="0.01" required placeholder="12.00" /></div><div class="field"><label for="listing-cost-hourly">Estimated provider cost / hour (USD)</label><input id="listing-cost-hourly" name="providerCostHourly" type="number" min="0" max="1000" step="0.001" placeholder="0.018" /></div></div>
        <div class="field"><label for="listing-description">Package description</label><textarea id="listing-description" name="description" maxlength="180" required placeholder="What workload is this package best for?"></textarea></div>
        <div class="demo-notice">Provider cost and marketplace commission are planning estimates only. No API credentials are accepted or stored here.</div>
        <button class="button button-primary" type="submit">Submit for admin approval <span aria-hidden="true">→</span></button>
      </form>`, true);
  }

  function openCompare() {
    const servers = state.compareIds.map(findMarketplaceServer).filter(Boolean);
    if (servers.length < 2) {
      showToast("Select at least two packages to compare.", true);
      return;
    }
    const rows = [
      ["Provider", (server) => server.provider],
      ["Category", (server) => server.category],
      ["CPU", (server) => server.cpu],
      ["RAM", (server) => server.ram],
      ["Storage", (server) => server.storage],
      ["Bandwidth", (server) => server.bandwidth],
      ["Location", (server) => server.location],
      ["Monthly", (server) => `$${Number(server.monthly).toFixed(2)}`],
      ["Hourly", (server) => server.hourly == null ? "Not offered" : `$${Number(server.hourly).toFixed(3)}`],
      ["Availability", (server) => server.availability === false ? "Unavailable" : "Available"]
    ];
    openModal(`<div class="modal-eyebrow">PROVIDER COMPARISON</div><h2 id="modal-title">Compare server packages.</h2><p class="modal-intro">Compare provider, resources, location, and pricing side by side.</p><div class="compare-table-wrap"><table class="compare-table"><thead><tr><th>Specification</th>${servers.map((server) => `<th>${escapeHtml(server.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th>${servers.map((server) => `<td>${escapeHtml(value(server))}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="demo-notice">Prices and availability are sample marketplace data. Order confirmation requires a real payment gateway.</div>`, true);
  }

  function openCustomerRequest(type, orderId) {
    const user = getUser();
    if (!user || user.role !== "customer") {
      showToast("Switch to a customer demo role to submit a support request.", true);
      return;
    }
    const orders = readList(storageKeys.orders).filter((order) => order.customerId === user.email);
    const orderOptions = orders.map((order) => {
      const server = findMarketplaceServer(order.serverId);
      return `<option value="${escapeHtml(order.id)}"${order.id === orderId ? " selected" : ""}>${escapeHtml(server?.name || "Server package")} · ${escapeHtml(order.id.slice(0, 8))}</option>`;
    }).join("");
    const requestType = type || "support";
    openModal(`<div class="modal-eyebrow">CUSTOMER CARE · DEMO REQUEST</div><h2 id="modal-title">${requestType === "cancel" ? "Request cancellation." : requestType === "refund" ? "Request a refund review." : requestType === "dispute" ? "Open a dispute." : "Contact support."}</h2><p class="modal-intro">Your request is recorded locally for review; no cancellation or refund is executed.</p><form id="customer-request-form" data-type="${escapeHtml(requestType)}"><div class="field"><label for="request-order">Related order</label><select id="request-order" name="orderId" required>${orderOptions || '<option value="">No orders available</option>'}</select></div><div class="field"><label for="request-message">Details</label><textarea id="request-message" name="message" maxlength="500" required placeholder="Describe what you need help with."></textarea></div><div class="demo-notice">No payment has been taken in this demo. Refunds, chargebacks, support replies, and cancellations are not processed automatically.</div><button class="button button-primary" type="submit">Save request for review <span aria-hidden="true">→</span></button></form>`, true);
  }

  function openRentalSuccess(server, order) {
    openModal(`<div class="order-success"><span class="success-icon">✓</span><div class="modal-eyebrow">DEMO ORDER SAVED</div><h2 id="modal-title">Your workspace is ready.</h2><p><b>${escapeHtml(server.name)}</b> has been added to your local demo dashboard for ${formatRentalDuration(order.unit || "month", order.duration || order.months || 1)}.<br />Estimated total: <b>$${order.total.toFixed(2)} USD</b>.<br /><br />No payment was charged and this server was not provisioned.</p><button class="button button-primary" id="view-dashboard-button" type="button">View my dashboard <span aria-hidden="true">→</span></button></div>`);
  }

  function openDeploySuccess(project) {
    const lines = [
      "[demo] Deployment preview initialized",
      `[demo] Project: ${project.name} · ${project.runtime}`,
      `[demo] Repository URL recorded: ${project.repository}`,
      "[demo] Build and provider connection not performed",
      "[demo] Status: preview saved locally"
    ];
    openModal(`<div class="modal-eyebrow">DEPLOYMENT HISTORY · DEMO</div><h2 id="modal-title">${escapeHtml(project.name)} preview saved</h2><p class="modal-intro">This local workflow did not clone or build your repository.</p><div class="log-output">${lines.map(escapeHtml).join("\n")}</div><div class="demo-notice">Preview only. No public project URL exists and no infrastructure was started.</div><button class="button button-primary" id="view-projects-button" type="button">View my projects <span aria-hidden="true">→</span></button>`);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function renderDashboard() {
    const user = getUser();
    const role = user?.role || "customer";
    const orders = readList(storageKeys.orders);
    const transactions = readList(storageKeys.transactions);
    const listings = readList(storageKeys.listings);
    const providers = readList(storageKeys.providers);
    const tickets = readList(storageKeys.tickets);
    const content = $("#dashboard-content");
    const customerOrders = orders.filter((order) => order.customerId === user?.email);
    const customerTransactions = transactions.filter((transaction) => transaction.customerId === user?.email);
    const customerTickets = tickets.filter((ticket) => ticket.customerId === user?.email);
    const providerListings = listings.filter((listing) => listing.providerId === user?.providerId);
    const providerTransactions = transactions.filter((transaction) => transaction.providerId === user?.providerId);
    const serverFor = (id) => findMarketplaceServer(id) || listings.find((listing) => listing.id === id) || Core.servers.find((server) => server.id === id);

    if (role === "customer" && state.dashboardTab === "servers") {
      const projects = readList(storageKeys.projects).filter((project) => project.customerId === user.email);
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Rental requests</span><b>${customerOrders.length}</b></div><div class="dashboard-stat"><span>Payment confirmed</span><b>${customerOrders.filter((order) => order.paymentStatus === "confirmed").length}</b></div><div class="dashboard-stat"><span>Provisioning</span><b style="font-size:14px;color:#eac67e">Payment required</b></div></div><div class="dashboard-panel"><h3>My server orders</h3>${customerOrders.length ? customerOrders.map((order) => {
        const server = serverFor(order.serverId);
        const paymentState = order.paymentStatus === "confirmed" ? "Payment confirmed" : "Payment pending";
        const provisionState = order.provisioningStatus === "waiting_for_payment" ? "Not provisioned" : order.provisioningStatus;
        return `<div class="dashboard-row"><span class="server-card-icon ${iconClasses[server?.category] || ""}">${escapeHtml(server?.icon || "◇")}</span><span class="dashboard-row-copy"><b>${escapeHtml(server?.name || "Server package")}</b><small>${formatRentalDuration(order.unit || "month", order.duration || order.months || 1)} · ${escapeHtml(order.os)} · ${escapeHtml(provisionState)} · ${formatDate(order.createdAt)}</small></span><span class="status-label status-pending">${escapeHtml(paymentState)}</span><button class="table-action" type="button" data-customer-request="cancel" data-order-id="${escapeHtml(order.id)}">Request cancellation</button><button class="table-action" type="button" data-customer-request="support" data-order-id="${escapeHtml(order.id)}">Support</button></div>`;
      }).join("") : `<div class="dashboard-empty"><p>No rental requests yet.</p><button class="button button-quiet" type="button" id="dashboard-explore">Explore servers →</button></div>`}</div><div class="demo-notice">Orders remain unpaid until a real gateway confirms payment. No servers are provisioned in this browser-only demo.</div>`;
    } else if (role === "customer" && state.dashboardTab === "projects") {
      const projects = readList(storageKeys.projects).filter((project) => project.customerId === user.email);
      content.innerHTML = `<div class="dashboard-panel"><h3>My projects</h3>${projects.length ? projects.map((project) => `<div class="dashboard-row"><span class="server-card-icon cyan">↗</span><span class="dashboard-row-copy"><b>${escapeHtml(project.name)}</b><small>${escapeHtml(project.runtime)} · ${escapeHtml(project.repository)} · saved ${formatDate(project.createdAt)}</small></span><span class="status-label">Preview only</span></div>`).join("") : `<div class="dashboard-empty"><p>No project previews yet.</p><button class="button button-quiet" type="button" data-open-deploy>Try a demo deployment →</button></div>`}</div><div class="demo-notice">GitHub authorization, builds, environment secrets, deployment logs, and public URLs are not available in this demo.</div>`;
    } else if (role === "customer" && state.dashboardTab === "billing") {
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Pending customer total</span><b>$${customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2)}</b></div><div class="dashboard-stat"><span>Payment confirmations</span><b>${customerTransactions.filter((transaction) => transaction.paymentStatus === "confirmed").length}</b></div><div class="dashboard-stat"><span>Refunds issued</span><b>0</b></div></div><div class="dashboard-panel"><h3>Marketplace transaction ledger</h3>${customerTransactions.length ? customerTransactions.map((transaction) => {
        const server = serverFor(transaction.listingId);
        return `<div class="ledger-row"><span class="dashboard-row-copy"><b>${escapeHtml(server?.name || "Server package")} · ${escapeHtml(transaction.id.slice(0, 8))}</b><small>Gross $${Number(transaction.gross).toFixed(2)} · commission $${Number(transaction.commission).toFixed(2)} · ${formatDate(transaction.createdAt)}</small></span><span class="status-label status-pending">${escapeHtml(transaction.paymentStatus)}</span><button class="table-action" type="button" data-customer-request="refund" data-order-id="${escapeHtml(transaction.orderId)}">Refund review</button><button class="table-action" type="button" data-customer-request="dispute" data-order-id="${escapeHtml(transaction.orderId)}">Dispute</button></div>`;
      }).join("") : `<div class="dashboard-empty"><p>No transactions yet.</p></div>`}</div><div class="demo-notice">Transaction rows are local estimates. A real gateway callback is required before payment status can change from pending.</div>`;
    } else if (role === "customer" && state.dashboardTab === "support") {
      content.innerHTML = `<div class="dashboard-panel"><div class="panel-heading-row"><h3>Support and cancellation requests</h3><button class="button button-quiet" type="button" data-customer-request="support">New support request</button></div>${customerTickets.length ? customerTickets.map((ticket) => `<div class="dashboard-row"><span class="dashboard-row-copy"><b>${escapeHtml(ticket.type)} · ${escapeHtml(ticket.id.slice(0, 8))}</b><small>${escapeHtml(ticket.message)} · ${formatDate(ticket.createdAt)}</small></span><span class="status-label status-pending">${escapeHtml(ticket.status)}</span></div>`).join("") : `<div class="dashboard-empty"><p>No support requests yet.</p></div>`}</div><div class="demo-notice">Cancellation requests, refund reviews, and disputes are recorded locally and require human review.</div>`;
    } else if (role === "provider") {
      const listingIds = new Set(providerListings.map((listing) => listing.id));
      const providerOrders = orders.filter((order) => order.providerId === user.providerId);
      const estimatedPayout = providerTransactions.reduce((sum, transaction) => sum + Number(transaction.providerPayoutEstimate || 0), 0);
      const estimatedCost = providerTransactions.reduce((sum, transaction) => sum + Number(transaction.providerCostEstimate || 0), 0);
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Packages submitted</span><b>${providerListings.length}</b></div><div class="dashboard-stat"><span>Provider payout estimate</span><b>$${estimatedPayout.toFixed(2)}</b></div><div class="dashboard-stat"><span>Paid out</span><b>$0.00</b></div></div><div class="dashboard-panel"><div class="panel-heading-row"><h3>My packages · approval and availability</h3><button class="button button-primary button-small" type="button" data-create-listing>Submit package</button></div>${providerListings.length ? providerListings.map((listing) => `<div class="dashboard-row"><span class="dashboard-row-copy"><b>${escapeHtml(listing.name)}</b><small>${escapeHtml(listing.category)} · $${Number(listing.monthly).toFixed(2)}/mo · ${escapeHtml(listing.location)} · ${escapeHtml(listing.approvalStatus)}</small></span><span class="status-label ${listing.approvalStatus === "approved" ? "" : "status-pending"}">${escapeHtml(listing.approvalStatus)}</span><button class="table-action" type="button" data-toggle-availability="${escapeHtml(listing.id)}" ${listing.approvalStatus !== "approved" ? "disabled" : ""}>${listing.availability ? "Set unavailable" : "Set available"}</button></div>`).join("") : `<div class="dashboard-empty"><p>No server packages submitted yet.</p></div>`}</div><div class="dashboard-panel"><h3>Customer orders and earnings ledger</h3>${providerOrders.length ? providerOrders.map((order) => {
        const transaction = providerTransactions.find((item) => item.orderId === order.id);
        return `<div class="ledger-row"><span class="dashboard-row-copy"><b>${escapeHtml(serverFor(order.listingId)?.name || "Server package")} · ${escapeHtml(order.id.slice(0, 8))}</b><small>Gross $${Number(order.total).toFixed(2)} · commission $${Number(transaction?.commission || 0).toFixed(2)} · provider cost estimate $${Number(transaction?.providerCostEstimate || 0).toFixed(2)}</small></span><span class="status-label status-pending">${escapeHtml(order.paymentStatus)}</span></div>`;
      }).join("") : `<div class="dashboard-empty"><p>Orders for your approved packages will appear here.</p></div>`}</div><div class="dashboard-panel"><h3>Provisioning integration</h3><div class="dashboard-row"><span class="dashboard-row-copy"><b>Provider API</b><small>No authorized provider adapter is connected. No credentials are stored in this browser.</small></span><span class="status-label status-pending">Not connected</span></div><div class="dashboard-row"><span class="dashboard-row-copy"><b>Manual fallback</b><small>Manual provisioning is held until a trusted payment confirmation.</small></span><span class="status-label status-pending">Payment gated</span></div></div><div class="demo-notice">Estimated provider costs: $${estimatedCost.toFixed(2)}. Settled earnings remain $0 until confirmed gateway payments and server-side payouts exist.</div>`;
    } else if (role === "administrator" && state.dashboardTab === "review") {
      const pendingListings = listings.filter((listing) => listing.approvalStatus === "pending");
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Pending listings</span><b>${pendingListings.length}</b></div><div class="dashboard-stat"><span>Approved listings</span><b>${listings.filter((listing) => listing.approvalStatus === "approved").length}</b></div><div class="dashboard-stat"><span>Sample catalog packages</span><b>${Core.servers.length}</b></div></div><div class="dashboard-panel"><h3>Provider submissions</h3>${listings.length ? listings.map((listing) => {
        const provider = providers.find((item) => item.id === listing.providerId);
        return `<div class="review-card"><div class="review-card-head"><span class="dashboard-row-copy"><b>${escapeHtml(listing.name)} · ${escapeHtml(listing.category)}</b><small>${escapeHtml(provider?.name || listing.provider)} · ${escapeHtml(listing.location)}</small></span><span class="status-label ${listing.approvalStatus === "approved" ? "" : "status-pending"}">${escapeHtml(listing.approvalStatus)}</span></div><p>${escapeHtml(listing.cpu)} · ${escapeHtml(listing.ram)} · ${escapeHtml(listing.storage)} · ${escapeHtml(listing.bandwidth)} · $${Number(listing.monthly).toFixed(2)}/mo</p>${listing.approvalStatus === "pending" ? `<div class="review-actions"><button class="button button-primary button-small" type="button" data-review-listing="approve" data-listing-id="${escapeHtml(listing.id)}">Approve listing</button><button class="button button-quiet button-small" type="button" data-review-listing="reject" data-listing-id="${escapeHtml(listing.id)}">Reject</button></div>` : ""}</div>`;
      }).join("") : `<div class="dashboard-empty"><p>No provider submissions yet.</p></div>`}</div><div class="demo-notice">Approval actions only affect local demo listings; role selection is not real administrator authorization.</div>`;
    } else if (role === "administrator" && state.dashboardTab === "transactions") {
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Orders</span><b>${orders.length}</b></div><div class="dashboard-stat"><span>Gateway-confirmed payments</span><b>${transactions.filter((transaction) => transaction.paymentStatus === "confirmed").length}</b></div><div class="dashboard-stat"><span>Pending gross volume</span><b>$${transactions.filter((transaction) => transaction.paymentStatus === "pending").reduce((sum, item) => sum + Number(item.gross || 0), 0).toFixed(2)}</b></div></div><div class="dashboard-panel"><h3>Marketplace transactions</h3>${transactions.length ? transactions.map((transaction) => `<div class="ledger-row"><span class="dashboard-row-copy"><b>${escapeHtml(serverFor(transaction.listingId)?.name || "Server package")} · ${escapeHtml(transaction.id.slice(0, 8))}</b><small>Gross $${Number(transaction.gross).toFixed(2)} · fee $${Number(transaction.commission).toFixed(2)} · provider estimate $${Number(transaction.providerPayoutEstimate).toFixed(2)}</small></span><span class="status-label status-pending">${escapeHtml(transaction.paymentStatus)}</span><span class="status-label status-pending">${escapeHtml(transaction.refundStatus)} refund · ${escapeHtml(transaction.disputeStatus)} dispute</span></div>`).join("") : `<div class="dashboard-empty"><p>No transactions recorded.</p></div>`}</div><div class="dashboard-panel"><h3>Customer requests</h3>${tickets.length ? tickets.map((ticket) => `<div class="dashboard-row"><span class="dashboard-row-copy"><b>${escapeHtml(ticket.type)} · ${escapeHtml(ticket.id.slice(0, 8))}</b><small>${escapeHtml(ticket.message)}</small></span><span class="status-label status-pending">${escapeHtml(ticket.status)}</span><button class="table-action" type="button" data-review-ticket="${escapeHtml(ticket.id)}">Mark reviewed</button></div>`).join("") : `<div class="dashboard-empty"><p>No refund, dispute, or support requests.</p></div>`}</div><div class="demo-notice">This ledger cannot mark a payment paid or issue a refund. Those actions require verified gateway webhooks and server-side reconciliation.</div>`;
    } else if (role === "administrator") {
      const pendingGross = transactions.filter((transaction) => transaction.paymentStatus === "pending").reduce((sum, item) => sum + Number(item.gross || 0), 0);
      content.innerHTML = `<div class="dashboard-cards"><div class="dashboard-stat"><span>Demo providers</span><b>${providers.length}</b></div><div class="dashboard-stat"><span>Active sample packages</span><b>${Core.servers.length + listings.filter((listing) => listing.approvalStatus === "approved" && listing.availability).length}</b></div><div class="dashboard-stat"><span>Pending payment volume</span><b>$${pendingGross.toFixed(2)}</b></div></div><div class="dashboard-panel"><h3>Mediator summary</h3><div class="dashboard-row"><span class="dashboard-row-copy"><b>Commission rate</b><small>Applied automatically to new order estimates</small></span><b>${Math.round(Core.platformCommissionRate * 100)}%</b></div><div class="dashboard-row"><span class="dashboard-row-copy"><b>Gateway-confirmed payments</b></span><b>0</b></div><div class="dashboard-row"><span class="dashboard-row-copy"><b>Refunds processed / providers paid</b></span><b>0 / 0</b></div></div><div class="demo-notice">Administrator metrics are local demo data, not a live system. No gateway credentials or provider API secrets are present.</div>`;
    } else {
      content.innerHTML = `<div class="dashboard-empty"><p>This section is unavailable for the selected demo role.</p></div>`;
    }
  }

  function showDashboard(tab) {
    closeModal();
    closeMobileNav();
    const user = getUser();
    const role = user?.role || "customer";
    const defaults = { customer: "servers", provider: "provider", administrator: "review" };
    const visibleTabs = $$(".dashboard-tab").filter((button) => button.dataset.dashboardRoles.split(",").includes(role));
    const requestedTab = tab || defaults[role];
    state.dashboardTab = visibleTabs.some((button) => button.dataset.dashboardTab === requestedTab) ? requestedTab : defaults[role];
    $("main").classList.add("hidden");
    $(".site-header").classList.add("hidden");
    $(".site-footer").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    $$(".dashboard-tab").forEach((button) => {
      const active = button.dataset.dashboardTab === state.dashboardTab;
      button.classList.toggle("hidden", !button.dataset.dashboardRoles.split(",").includes(role));
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $("#dashboard-title").textContent = role === "provider" ? "Provider console" : role === "administrator" ? "Mediator console" : "Your dashboard";
    $("#dashboard-greeting").textContent = user ? `Welcome, ${user.name}. Your demo workspace is saved in this browser.` : "Everything you’re building, in one place.";
    renderDashboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideDashboard() {
    $("#dashboard").classList.add("hidden");
    $("main").classList.remove("hidden");
    $(".site-header").classList.remove("hidden");
    $(".site-footer").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const testimonials = [
    { quote: "I found a server that fits my side project in minutes. The specs were clear, the price was upfront, and I could focus on shipping.", name: "Jordan Lee", role: "Indie developer", initials: "JL" },
    { quote: "Having the package details side by side makes it so much easier to choose what I actually need instead of overbuying.", name: "Maya Chen", role: "Startup founder", initials: "MC" },
    { quote: "A refreshingly straightforward place to explore compute options. I can compare regions and specs without the spreadsheet.", name: "Alex Rivera", role: "Full-stack engineer", initials: "AR" }
  ];

  function renderTestimonial() {
    const item = testimonials[state.testimonial];
    $("#testimonial-quote").textContent = item.quote;
    $("#testimonial-name").textContent = item.name;
    $("#testimonial-role").textContent = item.role;
    $("#testimonial-avatar").textContent = item.initials;
  }

  $("#hero-search").addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = $("#hero-search-input").value.trim();
    $("#market-search").value = state.search;
    renderServers();
    $("#servers").scrollIntoView({ behavior: "smooth" });
  });

  $("#market-search").addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    $("#hero-search-input").value = state.search;
    renderServers();
  });
  $("#sort-select").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderServers();
  });
  $("#category-pills").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderServers();
  });
  $("#reset-filters").addEventListener("click", () => {
    state.category = "All servers";
    state.search = "";
    state.sort = "featured";
    $("#market-search").value = "";
    $("#hero-search-input").value = "";
    $("#sort-select").value = "featured";
    renderCategories();
    renderServers();
  });
  $("#server-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-rent-server]");
    if (button) openRent(button.dataset.rentServer);
    const compareButton = event.target.closest("[data-compare-server]");
    if (compareButton) {
      const id = compareButton.dataset.compareServer;
      state.compareIds = state.compareIds.includes(id)
        ? state.compareIds.filter((item) => item !== id)
        : state.compareIds.length < 3 ? [...state.compareIds, id] : state.compareIds;
      if (!state.compareIds.includes(id) && state.compareIds.length === 3) showToast("Compare up to three server packages.", true);
      renderServers();
    }
  });
  $("#clear-compare").addEventListener("click", () => {
    state.compareIds = [];
    renderServers();
  });
  $("#open-compare").addEventListener("click", openCompare);
  $("#testimonial-prev").addEventListener("click", () => {
    state.testimonial = (state.testimonial + testimonials.length - 1) % testimonials.length;
    renderTestimonial();
  });
  $("#testimonial-next").addEventListener("click", () => {
    state.testimonial = (state.testimonial + 1) % testimonials.length;
    renderTestimonial();
  });
  $("#mobile-menu-button").addEventListener("click", () => {
    const nav = $("#main-nav");
    const open = nav.classList.toggle("open");
    $("#mobile-menu-button").setAttribute("aria-expanded", String(open));
  });
  $("#main-nav").addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMobileNav();
  });
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-backdrop").addEventListener("click", (event) => {
    if (event.target === $("#modal-backdrop")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#modal-backdrop").classList.contains("hidden")) closeModal();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-deploy]")) openDeploy();
    if (event.target.closest("[data-open-provider]")) openProvider();
    if (event.target.closest("#login-button") || event.target.closest("#footer-login")) openAuth();
    if (event.target.closest("#footer-dashboard")) showDashboard("servers");
    if (event.target.closest("#dashboard-close")) hideDashboard();
    if (event.target.closest("#dashboard-explore")) hideDashboard();
    const dashboardTab = event.target.closest("[data-dashboard-tab]");
    if (dashboardTab) {
      state.dashboardTab = dashboardTab.dataset.dashboardTab;
      $$(".dashboard-tab").forEach((button) => {
        const active = button === dashboardTab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      renderDashboard();
    }
    if (event.target.closest("#view-dashboard-button")) showDashboard("servers");
    if (event.target.closest("#view-projects-button")) showDashboard("projects");
    if (event.target.closest("#view-provider-dashboard-button")) showDashboard("provider");
    if (event.target.closest("[data-create-listing]")) openListingForm();
    const requestButton = event.target.closest("[data-customer-request]");
    if (requestButton) openCustomerRequest(requestButton.dataset.customerRequest, requestButton.dataset.orderId);
    const availabilityButton = event.target.closest("[data-toggle-availability]");
    if (availabilityButton) {
      const listings = readList(storageKeys.listings);
      const listing = listings.find((item) => item.id === availabilityButton.dataset.toggleAvailability);
      if (!listing || listing.providerId !== getUser()?.providerId || listing.approvalStatus !== "approved") return;
      listing.availability = !listing.availability;
      if (writeValue(storageKeys.listings, listings)) {
        renderDashboard();
        renderServers();
        showToast(`Package set ${listing.availability ? "available" : "unavailable"}.`);
      }
    }
    const reviewButton = event.target.closest("[data-review-listing]");
    if (reviewButton) {
      const listings = readList(storageKeys.listings);
      const listing = listings.find((item) => item.id === reviewButton.dataset.listingId);
      if (!listing || getUser()?.role !== "administrator" || listing.approvalStatus !== "pending") return;
      listing.approvalStatus = reviewButton.dataset.reviewListing === "approve" ? "approved" : "rejected";
      listing.reviewedAt = new Date().toISOString();
      listing.reviewedBy = getUser().email;
      if (writeValue(storageKeys.listings, listings)) {
        renderDashboard();
        renderServers();
        showToast(`Listing ${listing.approvalStatus}.`);
      }
    }
    const ticketButton = event.target.closest("[data-review-ticket]");
    if (ticketButton) {
      const tickets = readList(storageKeys.tickets);
      const ticket = tickets.find((item) => item.id === ticketButton.dataset.reviewTicket);
      if (!ticket || getUser()?.role !== "administrator") return;
      ticket.status = "reviewed";
      ticket.reviewedAt = new Date().toISOString();
      if (ticket.orderId) {
        const transactions = readList(storageKeys.transactions);
        const transaction = transactions.find((item) => item.orderId === ticket.orderId);
        if (transaction && ticket.type === "refund") transaction.refundStatus = "reviewed_not_processed";
        if (transaction && ticket.type === "dispute") transaction.disputeStatus = "reviewed";
        writeValue(storageKeys.transactions, transactions);
      }
      if (writeValue(storageKeys.tickets, tickets)) renderDashboard();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "rental-term") updateCheckoutTotal();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id === "checkout-form") {
      event.preventDefault();
      const user = getUser();
      const server = findMarketplaceServer(form.dataset.serverId);
      if (!server) return;
      const [unit, rawDuration] = $("#rental-term").value.split(":");
      const duration = Number(rawDuration);
      const transactionId = Core.createId();
      const order = Core.createMarketplaceOrder({
        id: Core.createId(),
        transactionId,
        listing: server,
        customerId: user.email,
        unit,
        duration,
        os: $("#server-os").value,
        createdAt: new Date().toISOString()
      });
      const transaction = Core.createMediatorTransaction(order, transactionId);
      const orders = readList(storageKeys.orders);
      const transactions = readList(storageKeys.transactions);
      orders.unshift({ ...order });
      transactions.unshift({ ...transaction });
      if (writeValue(storageKeys.orders, orders)) {
        if (writeValue(storageKeys.transactions, transactions)) openRentalSuccess(server, order);
        else writeValue(storageKeys.orders, orders.slice(1));
      }
    }
    if (form.id === "auth-form") {
      event.preventDefault();
      const data = new FormData(form);
      const role = String(data.get("role"));
      if (!["customer", "provider", "administrator"].includes(role)) return;
      const user = { name: String(data.get("name")).trim(), email: String(data.get("email")).trim(), role };
      if (role === "provider") {
        const provider = readList(storageKeys.providers).find((item) => item.email.toLowerCase() === user.email.toLowerCase());
        if (provider) user.providerId = provider.id;
      }
      if (!user.name || !user.email) return;
      if (writeValue(storageKeys.user, user)) {
        const pendingServerId = state.pendingServerId;
        const pendingAction = state.pendingAction;
        state.pendingServerId = null;
        state.pendingAction = null;
        if (pendingServerId && role === "customer") {
          closeModal();
          openRent(pendingServerId);
        } else if (pendingAction === "deploy" && role === "customer") {
          closeModal();
          openDeploy();
        } else {
          showDashboard();
        }
        showToast(`Demo ${role} profile saved in this browser.`);
      }
    }
    if (form.id === "deploy-form") {
      event.preventDefault();
      const data = new FormData(form);
      const repository = String(data.get("repository")).trim();
      let parsedUrl;
      try { parsedUrl = new URL(repository); } catch { parsedUrl = null; }
      const error = $("#deploy-error");
      if (!parsedUrl || parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com" || parsedUrl.pathname.split("/").filter(Boolean).length < 2) {
        error.textContent = "Enter a valid public GitHub repository URL (https://github.com/owner/repository).";
        error.classList.add("visible");
        return;
      }
      const user = getUser();
      const project = { id: Core.createId(), customerId: user?.email || "demo-customer", name: String(data.get("name")).trim(), repository, runtime: String(data.get("runtime")), serverId: String(data.get("server")), createdAt: new Date().toISOString(), status: "preview-only" };
      if (!project.name) {
        error.textContent = "Enter a project name.";
        error.classList.add("visible");
        return;
      }
      const projects = readList(storageKeys.projects);
      projects.unshift(project);
      if (writeValue(storageKeys.projects, projects)) openDeploySuccess(project);
    }
    if (form.id === "provider-form") {
      event.preventDefault();
      const data = new FormData(form);
      const providers = readList(storageKeys.providers);
      const email = String(data.get("email")).trim();
      const existingProvider = providers.find((provider) => provider.email.toLowerCase() === email.toLowerCase());
      const provider = {
        id: existingProvider?.id || Core.createId(),
        name: String(data.get("name")).trim(),
        email,
        category: String(data.get("category")),
        summary: String(data.get("summary")).trim(),
        createdAt: existingProvider?.createdAt || new Date().toISOString(),
        verificationStatus: "pending"
      };
      const nextProviders = existingProvider
        ? providers.map((item) => item.id === existingProvider.id ? provider : item)
        : [provider, ...providers];
      const account = { name: provider.name, email: provider.email, role: "provider", providerId: provider.id };
      if (writeValue(storageKeys.providers, nextProviders) && writeValue(storageKeys.user, account)) {
        openModal(`<div class="order-success"><span class="success-icon">✓</span><div class="modal-eyebrow">PROVIDER ACCOUNT SAVED</div><h2 id="modal-title">Your provider workspace is ready.</h2><p>This local provider profile is awaiting verification. Submit packages for administrator approval; no payment account or API credential is connected.</p><button class="button button-primary" id="view-provider-dashboard-button" type="button">Open provider dashboard <span aria-hidden="true">→</span></button></div>`);
      }
    }
    if (form.id === "listing-form") {
      event.preventDefault();
      const provider = getCurrentProvider();
      if (!provider) {
        showToast("Provider demo account is missing; submit provider registration again.", true);
        return;
      }
      const data = new FormData(form);
      const monthly = Number(data.get("monthly"));
      const hourlyRaw = String(data.get("hourly")).trim();
      const providerCostHourlyRaw = String(data.get("providerCostHourly")).trim();
      const listing = {
        id: Core.createId(),
        providerId: provider.id,
        provider: provider.name,
        name: String(data.get("name")).trim(),
        category: String(data.get("category")),
        description: String(data.get("description")).trim(),
        cpu: String(data.get("cpu")).trim(),
        ram: String(data.get("ram")).trim(),
        storage: String(data.get("storage")).trim(),
        bandwidth: String(data.get("bandwidth")).trim(),
        location: String(data.get("location")).trim(),
        os: String(data.get("os")).trim(),
        operatingSystems: [String(data.get("os")).trim()],
        monthly,
        hourly: hourlyRaw ? Number(hourlyRaw) : null,
        providerCostMonthly: Number(data.get("providerCostMonthly")),
        providerCostHourly: providerCostHourlyRaw ? Number(providerCostHourlyRaw) : 0,
        rating: 5,
        badge: "REVIEW",
        icon: "◇",
        availability: true,
        approvalStatus: "pending",
        createdAt: new Date().toISOString()
      };
      if (listing.providerCostMonthly > listing.monthly || (listing.hourly != null && (!Number.isFinite(listing.hourly) || listing.hourly <= 0)) || !Number.isFinite(listing.providerCostHourly)) {
        showToast("Check package prices and provider cost estimates.", true);
        return;
      }
      const listings = readList(storageKeys.listings);
      listings.unshift(listing);
      if (writeValue(storageKeys.listings, listings)) {
        closeModal();
        showDashboard("provider");
        showToast("Package submitted; it stays hidden until admin approval.");
      }
    }
    if (form.id === "customer-request-form") {
      event.preventDefault();
      const user = getUser();
      const data = new FormData(form);
      const orderId = String(data.get("orderId"));
      const type = form.dataset.type;
      const orders = readList(storageKeys.orders);
      const order = orders.find((item) => item.id === orderId && item.customerId === user?.email);
      if (!order) {
        showToast("Select one of your orders before submitting this request.", true);
        return;
      }
      const ticket = { id: Core.createId(), orderId, customerId: user.email, type, message: String(data.get("message")).trim(), status: "open", createdAt: new Date().toISOString() };
      const tickets = readList(storageKeys.tickets);
      tickets.unshift(ticket);
      if (type === "cancel") order.cancellationStatus = "requested";
      const transactions = readList(storageKeys.transactions);
      const transaction = transactions.find((item) => item.orderId === orderId);
      if (transaction && type === "refund") transaction.refundStatus = "requested";
      if (transaction && type === "dispute") transaction.disputeStatus = "open";
      if (writeValue(storageKeys.tickets, tickets)) {
        if (type === "cancel") writeValue(storageKeys.orders, orders);
        if (transaction) writeValue(storageKeys.transactions, transactions);
        closeModal();
        showDashboard(type === "support" || type === "cancel" ? "support" : "billing");
        showToast("Your request was saved for review. No payment or service state changed.");
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#logout-button")) {
      try {
        localStorage.removeItem(storageKeys.user);
        closeModal();
        showToast("Demo profile cleared from this browser.");
      } catch (error) {
        console.error("Could not clear the demo profile.", error);
        showToast("Could not clear the demo profile from this browser.", true);
      }
    }
  });

  renderCategories();
  renderServers();
  renderTestimonial();
});
