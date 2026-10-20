const API_BASE_URL = "https://localhost:7159";
const KITCHEN_API = `${API_BASE_URL}/api/Kitchen/orders`;
const ORDER_STATUS_API = `${API_BASE_URL}/api/Orders`;

const ORDER_STATUS = {
    Pending: 0,
    Confirmed: 1,
    Preparing: 2,
    Ready: 3,
    Completed: 4,
    Cancelled: 5
};

let allOrders = [];
let isLoading = false;

const ordersContainer = document.getElementById("ordersContainer");
const messageBox = document.getElementById("messageBox");
const refreshButton = document.getElementById("refreshButton");

function getToken() {
    return sessionStorage.getItem("cafeJwtToken");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getStatusName(status) {
    const names = {
        0: "Pending",
        1: "Confirmed",
        2: "Preparing",
        3: "Ready",
        4: "Completed",
        5: "Cancelled"
    };

    return names[Number(status)] ?? "Unknown";
}

function getStatusBadge(status) {
    const value = Number(status);

    return `<span class="kitchen-status status-${value}">
                ${escapeHtml(getStatusName(value))}
            </span>`;
}

function getOrderType(value) {
    // Confirm the OrderType enum before assigning business labels.
    const names = {
        0: "Dine-in",
        1: "Takeaway"
    };

    return names[Number(value)] ?? `Type ${value}`;
}

function showMessage(message, type = "danger") {
    messageBox.textContent = message;
    messageBox.className = `alert alert-${type}`;
}

function hideMessage() {
    messageBox.textContent = "";
    messageBox.className = "alert d-none";
}

async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
        window.location.href = "/Account/Login";
        throw new Error("Please log in to access kitchen orders.");
    }

    const headers = {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers ?? {})
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        sessionStorage.removeItem("cafeJwtToken");
        window.location.href = "/Account/Login";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error("You do not have permission to perform this action.");
    }

    const responseText = response.status === 204
        ? ""
        : await response.text();

    if (!response.ok) {
        let detail = responseText;

        try {
            const parsed = JSON.parse(responseText);
            detail = parsed.message || parsed.title || responseText;
        } catch {
            // Keep the original response text.
        }

        throw new Error(detail || `Request failed (${response.status}).`);
    }

    if (!responseText) return null;

    try {
        return JSON.parse(responseText);
    } catch {
        return responseText;
    }
}

async function loadOrders() {
    if (isLoading) return;

    isLoading = true;
    refreshButton.disabled = true;
    refreshButton.innerHTML =
        '<span class="spinner-border spinner-border-sm me-1"></span> Refreshing';

    hideMessage();

    try {
        const data = await apiRequest(KITCHEN_API);

        allOrders = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : [];

        document.getElementById("lastUpdated").textContent =
            new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

        updateSummary();
        renderOrders();

    } catch (error) {
        ordersContainer.innerHTML = `
                    <div class="col-12">
                        <div class="kitchen-empty">
                            <i class="bi bi-exclamation-triangle text-danger"></i>
                            <h5 class="mt-3">Unable to load kitchen orders</h5>
                            <p class="mb-3">${escapeHtml(error.message)}</p>
                            <button class="btn btn-primary" onclick="loadOrders()">
                                Try Again
                            </button>
                        </div>
                    </div>`;

        showMessage(
            `Could not load kitchen orders: ${error.message}`
        );

    } finally {
        isLoading = false;
        refreshButton.disabled = false;
        refreshButton.innerHTML =
            '<i class="bi bi-arrow-clockwise me-1"></i> Refresh Orders';
    }
}

function updateSummary() {
    const waiting = allOrders.filter(order =>
        [ORDER_STATUS.Pending, ORDER_STATUS.Confirmed]
            .includes(Number(order.status))
    ).length;

    const preparing = allOrders.filter(order =>
        Number(order.status) === ORDER_STATUS.Preparing
    ).length;

    const ready = allOrders.filter(order =>
        Number(order.status) === ORDER_STATUS.Ready
    ).length;

    const active = allOrders.filter(order =>
        ![
            ORDER_STATUS.Completed,
            ORDER_STATUS.Cancelled
        ].includes(Number(order.status))
    ).length;

    document.getElementById("waitingCount").textContent = waiting;
    document.getElementById("preparingCount").textContent = preparing;
    document.getElementById("readyCount").textContent = ready;
    document.getElementById("activeCount").textContent = active;
}

function getNextAction(order) {
    const status = Number(order.status);

    if (status === ORDER_STATUS.Confirmed) {
        return {
            label: "Start Preparing",
            nextStatus: ORDER_STATUS.Preparing,
            cssClass: "btn-warning"
        };
    }

    if (status === ORDER_STATUS.Preparing) {
        return {
            label: "Mark Ready",
            nextStatus: ORDER_STATUS.Ready,
            cssClass: "btn-success"
        };
    }

    if (status === ORDER_STATUS.Ready) {
        return {
            label: "Complete Order",
            nextStatus: ORDER_STATUS.Completed,
            cssClass: "btn-primary"
        };
    }

    return null;
}

function renderOrders() {
    const search = document.getElementById("searchInput")
        .value.trim().toLowerCase();

    const statusFilter = document.getElementById("statusFilter").value;

    const filtered = allOrders.filter(order => {
        const itemNames = (order.items ?? [])
            .map(item => item.menuItemName ?? "")
            .join(" ");

        const searchable = [
            order.id,
            getOrderType(order.orderType),
            order.notes,
            itemNames
        ].join(" ").toLowerCase();

        const matchesSearch =
            !search || searchable.includes(search);

        const matchesStatus =
            statusFilter === "" ||
            Number(order.status) === Number(statusFilter);

        return matchesSearch && matchesStatus;
    });

    document.getElementById("orderCount").textContent =
        `${filtered.length} order${filtered.length === 1 ? "" : "s"} shown`;

    if (!filtered.length) {
        ordersContainer.innerHTML = `
                    <div class="col-12">
                        <div class="kitchen-empty">
                            <i class="bi bi-clipboard-check"></i>
                            <h5 class="mt-3">No orders found</h5>
                            <p class="mb-0">
                                No orders match the selected search and filters.
                            </p>
                        </div>
                    </div>`;
        return;
    }

    // Newest orders first.
    filtered.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    ordersContainer.innerHTML = filtered.map(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        const action = getNextAction(order);

        const itemsHtml = items.length
            ? items.map(item => `
                        <div class="kitchen-item">
                            <div class="fw-semibold">
                                ${escapeHtml(item.menuItemName || `Menu item #${item.menuItemId}`)}
                            </div>
                            <div class="badge bg-light text-dark border">
                                × ${escapeHtml(item.quantity)}
                            </div>
                        </div>
                    `).join("")
            : '<div class="text-muted small">No items available.</div>';

        const notesHtml = order.notes
            ? `<div class="kitchen-note mt-3">
                        <div class="fw-bold small mb-1">
                            <i class="bi bi-chat-left-text me-1"></i> Special instructions
                        </div>
                        ${escapeHtml(order.notes)}
                    </div>`
            : "";

        const actionHtml = action
            ? `<button class="btn ${action.cssClass} w-100"
                               onclick="advanceOrder(${Number(order.id)}, ${action.nextStatus})">
                            <i class="bi bi-arrow-right-circle me-1"></i>
                            ${escapeHtml(action.label)}
                       </button>`
            : `<button class="btn btn-outline-secondary w-100" disabled>
                            ${Number(order.status) === ORDER_STATUS.Pending
                ? "Awaiting Confirmation"
                : Number(order.status) === ORDER_STATUS.Completed
                    ? "Order Completed"
                    : Number(order.status) === ORDER_STATUS.Cancelled
                        ? "Order Cancelled"
                        : "No Action Available"}
                       </button>`;

        return `
                    <div class="col-12 col-md-6 col-xxl-4">
                        <div class="kitchen-order-card">
                            <div class="kitchen-order-header">
                                <div class="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <div class="small text-muted">ORDER NUMBER</div>
                                        <h5 class="fw-bold mb-1">
                                            #${escapeHtml(order.id)}
                                        </h5>
                                    </div>
                                    ${getStatusBadge(order.status)}
                                </div>

                                <div class="d-flex flex-wrap gap-2 mt-3">
                                    <span class="badge bg-light text-dark border">
                                        <i class="bi bi-bag me-1"></i>
                                        ${escapeHtml(getOrderType(order.orderType))}
                                    </span>

                                    <span class="small text-muted align-self-center">
                                        <i class="bi bi-clock me-1"></i>
                                        ${escapeHtml(formatDate(order.createdAt))}
                                    </span>
                                </div>
                            </div>

                            <div class="kitchen-order-body">
                                <div class="kitchen-section-title mb-2">
                                    Order Items (${items.length})
                                </div>

                                ${itemsHtml}

                                ${notesHtml}
                            </div>

                            <div class="kitchen-order-footer">
                                ${actionHtml}
                            </div>
                        </div>
                    </div>`;
    }).join("");
}

async function advanceOrder(orderId, nextStatus) {
    const order = allOrders.find(
        item => Number(item.id) === Number(orderId)
    );

    if (!order) {
        showMessage("Order not found. Refresh the page and try again.");
        return;
    }

    const currentStatus = Number(order.status);
    const action = getNextAction(order);

    // Prevent arbitrary status transitions from the UI.
    if (!action || action.nextStatus !== Number(nextStatus)) {
        showMessage("This order cannot be moved to that status.");
        return;
    }

    const nextStatusName = getStatusName(nextStatus);

    if (!confirm(
        `Move Order #${orderId} to "${nextStatusName}"?`
    )) {
        return;
    }

    hideMessage();

    try {
        await apiRequest(`${ORDER_STATUS_API}/${orderId}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: Number(nextStatus)
            })
        });

        showMessage(
            `Order #${orderId} updated to ${nextStatusName}.`,
            "success"
        );

        await loadOrders();

    } catch (error) {
        showMessage(
            `Could not update Order #${orderId}: ${error.message}`
        );
    }
}

refreshButton.addEventListener("click", loadOrders);

document.getElementById("searchInput")
    .addEventListener("input", renderOrders);

document.getElementById("statusFilter")
    .addEventListener("change", renderOrders);

document.addEventListener("DOMContentLoaded", loadOrders);