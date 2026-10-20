(() => {
    "use strict";

    // Redirect unauthenticated visitors to the login page.
    // The API must still enforce authorization independently.
    const token = sessionStorage.getItem("cafeJwtToken");

    if (!token) {
        window.location.replace("/Account/Login");
        return;
    }

    const ordersApiUrl = "https://localhost:7159/api/Orders";
    const menuItemsApiUrl = "https://localhost:7159/api/MenuItems";
    const customersApiUrl = "https://localhost:7159/api/Customers";
    const tablesApiUrl = "https://localhost:7159/api/Tables";

    // This matches the 5% tax shown in the existing test orders.
    // The server-calculated total remains authoritative.
    const estimatedTaxRate = 0.05;

    let allOrders = [];
    let availableMenuItems = [];
    let availableCustomers = [];
    let availableTables = [];
    let createOrderSubmitting = false;

    const orderStatusNames = {
        0: "Pending",
        1: "Confirmed",
        2: "Preparing",
        3: "Ready",
        4: "Completed",
        5: "Cancelled"
    };

    const orderTypeNames = {
        0: "Dine-in",
        1: "Takeaway"
    };

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function showAlert(message, type = "danger") {
        document.getElementById("alertContainer").innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close"
                        data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
    }

    function showCreateOrderMessage(message, type = "danger") {
        document.getElementById("createOrderAlert").innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close"
                        data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
    }

    async function apiRequest(url, options = {}) {
        const currentToken = sessionStorage.getItem("cafeJwtToken");

        if (!currentToken) {
            window.location.replace("/Account/Login");
            throw new Error("Please sign in to continue.");
        }

        const headers = {
            "Accept": "application/json",
            ...(options.headers || {}),
            "Authorization": `Bearer ${currentToken}`
        };

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            sessionStorage.removeItem("cafeJwtToken");
            window.location.replace("/Account/Login");
            throw new Error("Your session has expired. Please sign in again.");
        }

        if (response.status === 403) {
            throw new Error("You do not have permission to perform this action.");
        }

        if (!response.ok) {
            let message = `Request failed with HTTP ${response.status}.`;

            try {
                const body = await response.json();
                message = body.message || body.title || body.detail || message;
            } catch {
                // Use the HTTP status message if the response is not JSON.
            }

            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            return await response.json();
        }

        return null;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getStatusName(status) {
        return orderStatusNames[status] ?? `Unknown (${status})`;
    }

    function getTypeName(type) {
        return orderTypeNames[type] ?? `Unknown (${type})`;
    }

    function updateStatistics(orders) {
        document.getElementById("totalOrdersCount").textContent = orders.length;
        document.getElementById("pendingOrdersCount").textContent =
            orders.filter(order => order.status === 0).length;
        document.getElementById("preparingOrdersCount").textContent =
            orders.filter(order => order.status === 2).length;
        document.getElementById("completedOrdersCount").textContent =
            orders.filter(order => order.status === 4).length;
    }

    function renderOrders() {
        const search = document.getElementById("searchOrders")
            .value.trim().toLowerCase();

        const selectedStatus = document.getElementById("filterStatus").value;
        const selectedType = document.getElementById("filterType").value;

        const filtered = allOrders.filter(order => {
            const searchable = [
                order.id,
                order.customerName || "",
                order.tableNumber || "",
                getTypeName(order.orderType),
                getStatusName(order.status)
            ].join(" ").toLowerCase();

            return searchable.includes(search)
                && (selectedStatus === "" ||
                    String(order.status) === selectedStatus)
                && (selectedType === "" ||
                    String(order.orderType) === selectedType);
        });

        const tbody = document.getElementById("ordersTableBody");

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-state">
                        <i class="bi bi-receipt fs-1 d-block mb-3"></i>
                        <h5>No orders found</h5>
                        <p class="mb-0">Try changing your search or filter.</p>
                    </div>
                </td></tr>`;

            document.getElementById("ordersCount").textContent =
                `Showing 0 of ${allOrders.length} orders`;
            return;
        }

        tbody.innerHTML = filtered.map(order => {
            const id = Number(order.id);
            const status = Number(order.status);
            const type = Number(order.orderType);
            const canManage = status !== 4 && status !== 5;

            return `
                <tr>
                    <td class="fw-bold">#${escapeHtml(id)}</td>
                    <td>${escapeHtml(order.customerName || "Walk-in Customer")}</td>
                    <td><span class="order-type-badge">
                        ${escapeHtml(getTypeName(type))}
                    </span></td>
                    <td>${escapeHtml(order.tableNumber || "—")}</td>
                    <td class="fw-semibold">${formatCurrency(order.totalAmount)}</td>
                    <td><span class="status-badge status-${status}">
                        ${escapeHtml(getStatusName(status))}
                    </span></td>
                    <td>${escapeHtml(formatDate(order.createdAt))}</td>
                    <td class="text-end text-nowrap">
                        <button type="button"
                                class="btn btn-sm btn-outline-primary view-order-btn"
                                data-id="${id}" title="View details">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${canManage ? `
                            <button type="button"
                                    class="btn btn-sm btn-outline-success update-status-btn"
                                    data-id="${id}" data-status="${status}"
                                    title="Update status">
                                <i class="bi bi-arrow-repeat"></i>
                            </button>
                            <button type="button"
                                    class="btn btn-sm btn-outline-danger cancel-order-btn"
                                    data-id="${id}" data-status="${status}"
                                    title="Cancel order">
                                <i class="bi bi-x-circle"></i>
                            </button>` : ""}
                    </td>
                </tr>`;
        }).join("");

        document.getElementById("ordersCount").textContent =
            `Showing ${filtered.length} of ${allOrders.length} orders`;
    }

    async function loadOrders() {
        const tbody = document.getElementById("ordersTableBody");

        tbody.innerHTML = `
            <tr><td colspan="8">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="mt-2">Loading orders...</div>
                </div>
            </td></tr>`;

        try {
            const data = await apiRequest(ordersApiUrl);

            if (!Array.isArray(data)) {
                throw new Error("The Orders API did not return an array.");
            }

            allOrders = data;
            updateStatistics(allOrders);
            renderOrders();
        } catch (error) {
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-state text-danger">
                        <i class="bi bi-exclamation-triangle fs-1 d-block mb-3"></i>
                        <h5>Unable to load orders</h5>
                        <p>${escapeHtml(error.message)}</p>
                    </div>
                </td></tr>`;

            if (!error.message.includes("sign in")) {
                showAlert(error.message);
            }
        }
    }

    function viewOrderDetails(orderId) {
        const order = allOrders.find(item => Number(item.id) === orderId);

        if (!order) {
            showAlert("Order not found.");
            return;
        }

        const items = Array.isArray(order.items) ? order.items : [];

        const itemRows = items.map(item => `
            <tr>
                <td>${escapeHtml(item.menuItemName || "Menu item")}</td>
                <td class="text-center">${escapeHtml(item.quantity)}</td>
                <td class="text-end">${formatCurrency(item.unitPrice)}</td>
                <td class="text-end">${formatCurrency(item.lineTotal)}</td>
            </tr>`).join("");

        document.getElementById("orderDetailsBody").innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-6 col-md-3">
                    <div class="detail-label">Order ID</div>
                    <div class="detail-value">#${escapeHtml(order.id)}</div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="detail-label">Order Type</div>
                    <div class="detail-value">${escapeHtml(getTypeName(order.orderType))}</div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${escapeHtml(getStatusName(order.status))}</div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="detail-label">Table</div>
                    <div class="detail-value">${escapeHtml(order.tableNumber || "—")}</div>
                </div>
                <div class="col-12 col-md-6">
                    <div class="detail-label">Customer</div>
                    <div class="detail-value">${escapeHtml(order.customerName || "Walk-in Customer")}</div>
                </div>
                <div class="col-12 col-md-6">
                    <div class="detail-label">Created At</div>
                    <div class="detail-value">${escapeHtml(formatDate(order.createdAt))}</div>
                </div>
                <div class="col-12">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${escapeHtml(order.notes || "No notes")}</div>
                </div>
            </div>

            <h6 class="fw-bold mb-3">Order Items</h6>
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead><tr>
                        <th>Menu Item</th>
                        <th class="text-center">Quantity</th>
                        <th class="text-end">Unit Price</th>
                        <th class="text-end">Line Total</th>
                    </tr></thead>
                    <tbody>${itemRows || `
                        <tr><td colspan="4" class="text-center">No items found.</td></tr>`}
                    </tbody>
                </table>
            </div>

            <div class="row justify-content-end">
                <div class="col-12 col-md-6">
                    <div class="d-flex justify-content-between py-1">
                        <span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong>
                    </div>
                    <div class="d-flex justify-content-between py-1">
                        <span>Tax</span><strong>${formatCurrency(order.taxAmount)}</strong>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between fs-5">
                        <span>Total</span><strong>${formatCurrency(order.totalAmount)}</strong>
                    </div>
                </div>
            </div>`;

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("orderDetailsModal")
        ).show();
    }

    async function changeOrderStatus(orderId, currentStatus) {
        const transitions = {
            0: { value: 1, label: "Confirmed" },
            1: { value: 2, label: "Preparing" },
            2: { value: 3, label: "Ready" },
            3: { value: 4, label: "Completed" }
        };

        const next = transitions[currentStatus];

        if (!next) {
            showAlert("No status transition is available for this order.", "warning");
            return;
        }

        if (!confirm(`Change order #${orderId} to ${next.label}?`)) {
            return;
        }

        try {
            await apiRequest(`${ordersApiUrl}/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: next.value })
            });

            showAlert(`Order #${orderId} status updated.`, "success");
            await loadOrders();
        } catch (error) {
            showAlert(error.message);
        }
    }

    async function cancelOrder(orderId, currentStatus) {
        if (currentStatus === 4 || currentStatus === 5) {
            showAlert("This order cannot be cancelled again.", "warning");
            return;
        }

        if (!confirm(`Are you sure you want to cancel order #${orderId}?`)) {
            return;
        }

        try {
            await apiRequest(`${ordersApiUrl}/${orderId}/cancel`, {
                method: "POST"
            });

            showAlert(`Order #${orderId} cancelled successfully.`, "success");
            await loadOrders();
        } catch (error) {
            showAlert(error.message);
        }
    }

    // CREATE ORDER

    async function loadCreateOrderData() {
        try {
            const [menuData, customerData, tableData] = await Promise.all([
                apiRequest(menuItemsApiUrl),
                apiRequest(customersApiUrl),
                apiRequest(tablesApiUrl)
            ]);

            availableMenuItems = Array.isArray(menuData) ? menuData : [];
            availableCustomers = Array.isArray(customerData) ? customerData : [];
            availableTables = Array.isArray(tableData) ? tableData : [];

            populateCustomers();
            populateTables();
            renderOrderItemRows();
        } catch (error) {
            showCreateOrderMessage(
                "Unable to load menu items, customers, or tables. " + error.message
            );
        }
    }

    function populateCustomers() {
        const select = document.getElementById("newOrderCustomer");
        select.innerHTML = `<option value="">Walk-in Customer</option>`;

        availableCustomers
            .filter(customer => customer.isActive !== false)
            .forEach(customer => {
                const option = document.createElement("option");
                option.value = customer.id;
                option.textContent =
                    `${customer.name} (${customer.phoneNumber || customer.email || "Customer"})`;
                select.appendChild(option);
            });
    }

    function populateTables() {
        const select = document.getElementById("newOrderTable");

        select.innerHTML = `<option value="">Select a table</option>`;

        // In your API, status 1 means Available.
        const availableTablesList = availableTables.filter(table => {
            return table.isActive !== false &&
                Number(table.status) === 1;
        });

        if (availableTablesList.length === 0) {
            select.innerHTML = `
            <option value="">No available tables found</option>
        `;
            return;
        }

        availableTablesList.forEach(table => {
            const option = document.createElement("option");

            option.value = table.id;
            option.textContent =
                `${table.tableNumber} — Capacity ${table.capacity}`;

            select.appendChild(option);
        });
    }

    function getActiveMenuItems() {
        return availableMenuItems.filter(item => item.isActive !== false);
    }

    function buildMenuOptions() {
        return `<option value="">Select a menu item</option>` +
            getActiveMenuItems().map(item => {
                const id = Number(item.id);
                const name = item.name || item.menuItemName || `Item ${id}`;
                const price = Number(item.price ?? item.unitPrice ?? 0);

                return `<option value="${id}" data-price="${price}">
                    ${escapeHtml(name)} — ${formatCurrency(price)}
                </option>`;
            }).join("");
    }

    function addOrderItemRow() {
        const tbody = document.getElementById("newOrderItemsBody");
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <select class="form-select order-menu-item" required>
                    ${buildMenuOptions()}
                </select>
            </td>
            <td class="order-unit-price">₹0.00</td>
            <td>
                <input type="number" class="form-control order-quantity"
                       value="1" min="1" max="1000" step="1" required>
            </td>
            <td class="order-line-total fw-semibold">₹0.00</td>
            <td class="text-center">
                <button type="button"
                        class="btn btn-outline-danger btn-sm remove-order-item"
                        title="Remove item">
                    <i class="bi bi-trash"></i>
                </button>
            </td>`;

        tbody.appendChild(row);

        row.querySelector(".order-menu-item")
            .addEventListener("change", calculateTotals);

        row.querySelector(".order-quantity")
            .addEventListener("input", calculateTotals);

        row.querySelector(".remove-order-item")
            .addEventListener("click", () => {
                row.remove();
                calculateTotals();
            });

        calculateTotals();
    }

    function renderOrderItemRows() {
        document.getElementById("newOrderItemsBody").innerHTML = "";
        addOrderItemRow();
    }

    function calculateTotals() {
        const rows = document.querySelectorAll("#newOrderItemsBody tr");
        let subtotal = 0;

        rows.forEach(row => {
            const select = row.querySelector(".order-menu-item");
            const quantityInput = row.querySelector(".order-quantity");
            const option = select.selectedOptions[0];

            const price = option ? Number(option.dataset.price || 0) : 0;
            const quantity = Math.max(0, Number.parseInt(quantityInput.value, 10) || 0);
            const lineTotal = price * quantity;

            row.querySelector(".order-unit-price").textContent =
                formatCurrency(price);
            row.querySelector(".order-line-total").textContent =
                formatCurrency(lineTotal);

            subtotal += lineTotal;
        });

        const tax = subtotal * estimatedTaxRate;

        document.getElementById("newOrderSubtotal").textContent =
            formatCurrency(subtotal);
        document.getElementById("newOrderTax").textContent =
            formatCurrency(tax);
        document.getElementById("newOrderTotal").textContent =
            formatCurrency(subtotal + tax);
        document.getElementById("noOrderItemsMessage").style.display =
            rows.length === 0 ? "block" : "none";
    }

    function updateOrderTypeFields() {
        const isDineIn =
            Number(document.getElementById("newOrderType").value) === 0;

        const tableContainer =
            document.getElementById("orderTableContainer");
        const tableSelect =
            document.getElementById("newOrderTable");

        tableContainer.style.display = isDineIn ? "" : "none";
        tableSelect.required = isDineIn;

        if (!isDineIn) {
            tableSelect.value = "";
        }
    }

    function resetCreateOrderForm() {
        document.getElementById("createOrderForm").reset();
        document.getElementById("createOrderAlert").innerHTML = "";
        document.getElementById("newOrderItemsBody").innerHTML = "";
        updateOrderTypeFields();
    }

    async function submitCreateOrder(event) {
        event.preventDefault();

        if (createOrderSubmitting) return;

        const orderType = Number(
            document.getElementById("newOrderType").value
        );

        const customerValue =
            document.getElementById("newOrderCustomer").value;
        const tableValue =
            document.getElementById("newOrderTable").value;
        const notes =
            document.getElementById("newOrderNotes").value.trim();

        const rows = [
            ...document.querySelectorAll("#newOrderItemsBody tr")
        ];

        if (rows.length === 0) {
            showCreateOrderMessage("Add at least one menu item.");
            return;
        }

        const items = [];

        for (const row of rows) {
            const menuItemId = Number(
                row.querySelector(".order-menu-item").value
            );
            const quantity = Number(
                row.querySelector(".order-quantity").value
            );

            if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
                showCreateOrderMessage("Select a menu item for every row.");
                return;
            }

            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
                showCreateOrderMessage("Quantity must be between 1 and 1000.");
                return;
            }

            items.push({ menuItemId, quantity });
        }

        if (orderType === 0 && !tableValue) {
            showCreateOrderMessage("Select a table for a dine-in order.");
            return;
        }

        const payload = {
            orderType,
            customerId: customerValue ? Number(customerValue) : null,
            cafeTableId: orderType === 0 ? Number(tableValue) : null,
            notes,
            items
        };

        const button = document.getElementById("saveOrderBtn");

        createOrderSubmitting = true;
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Creating...`;

        try {
            await apiRequest(ordersApiUrl, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            bootstrap.Modal.getOrCreateInstance(
                document.getElementById("createOrderModal")
            ).hide();

            showAlert("Order created successfully.", "success");
            resetCreateOrderForm();

            // Reload tables as the selected table may now be occupied.
            await Promise.all([
                loadOrders(),
                refreshTableOptions()
            ]);
        } catch (error) {
            showCreateOrderMessage(error.message);
        } finally {
            createOrderSubmitting = false;
            button.disabled = false;
            button.innerHTML =
                `<i class="bi bi-check-circle me-1"></i>Create Order`;
        }
    }

    async function refreshTableOptions() {
        try {
            const data = await apiRequest(tablesApiUrl);
            availableTables = Array.isArray(data) ? data : [];
            populateTables();
        } catch {
            // Keep the current list if refreshing tables fails.
        }
    }

    // Event delegation for dynamically rendered order buttons.
    document.getElementById("ordersTableBody")
        .addEventListener("click", event => {
            const viewButton = event.target.closest(".view-order-btn");
            const statusButton = event.target.closest(".update-status-btn");
            const cancelButton = event.target.closest(".cancel-order-btn");

            if (viewButton) {
                viewOrderDetails(Number(viewButton.dataset.id));
            } else if (statusButton) {
                changeOrderStatus(
                    Number(statusButton.dataset.id),
                    Number(statusButton.dataset.status)
                );
            } else if (cancelButton) {
                cancelOrder(
                    Number(cancelButton.dataset.id),
                    Number(cancelButton.dataset.status)
                );
            }
        });

    document.getElementById("refreshOrdersBtn")
        .addEventListener("click", loadOrders);

    document.getElementById("searchOrders")
        .addEventListener("input", renderOrders);

    document.getElementById("filterStatus")
        .addEventListener("change", renderOrders);

    document.getElementById("filterType")
        .addEventListener("change", renderOrders);

    document.getElementById("newOrderBtn")
        .addEventListener("click", () => {
            bootstrap.Modal.getOrCreateInstance(
                document.getElementById("createOrderModal")
            ).show();
        });

    document.getElementById("newOrderType")
        .addEventListener("change", updateOrderTypeFields);

    document.getElementById("addOrderItemBtn")
        .addEventListener("click", addOrderItemRow);

    document.getElementById("createOrderForm")
        .addEventListener("submit", submitCreateOrder);

    document.getElementById("createOrderModal")
        .addEventListener("show.bs.modal", async () => {
            resetCreateOrderForm();
            await loadCreateOrderData();
        });

    updateOrderTypeFields();
    loadOrders();
})();