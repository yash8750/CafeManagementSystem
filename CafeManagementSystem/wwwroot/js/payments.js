const API_BASE_URL = "https://managecafeapi.runasp.net";
const PAYMENT_API = `${API_BASE_URL}/api/Payments`;

let allPayments = [];

const paymentForm = document.getElementById("paymentForm");
const paymentsTableBody = document.getElementById("paymentsTableBody");
const messageBox = document.getElementById("messageBox");

function getToken() {
    return sessionStorage.getItem("cafeJwtToken");
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(value ?? 0));
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-IN");
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

function getPaymentMethod(value) {
    const methods = {
        0: "Cash",
        1: "Card",
        2: "UPI"
    };

    return methods[value] ?? `Unknown (${value})`;
}

function getPaymentStatus(value) {
    const statuses = {
        0: "Pending",
        1: "Completed",
        2: "Failed",
        3: "Refunded"
    };

    return statuses[value] ?? `Unknown (${value})`;
}

function getStatusBadge(value) {
    const classes = {
        0: "bg-warning text-dark",
        1: "bg-success",
        2: "bg-danger",
        3: "bg-secondary"
    };

    const label = getPaymentStatus(value);
    const cssClass = classes[value] ?? "bg-dark";

    return `<span class="badge ${cssClass}">${escapeHtml(label)}</span>`;
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
        throw new Error("Your session has expired. Please log in again.");
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
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

    if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Request failed (${response.status}).`);
    }

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function loadPayments() {
    hideMessage();

    paymentsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    Loading payments...
                </td>
            </tr>`;

    try {
        const data = await apiRequest(PAYMENT_API);

        allPayments = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

        renderPayments();
        updateSummary();

    } catch (error) {
        allPayments = [];
        renderPayments();

        if (getToken()) {
            showMessage(`Unable to load payments: ${error.message}`);
        }
    }
}

function renderPayments() {
    const search = document.getElementById("searchInput")
        .value.trim().toLowerCase();

    const statusFilter = document.getElementById("statusFilter").value;

    const filtered = allPayments.filter(payment => {
        const searchableText = [
            payment.id,
            payment.paymentId,
            payment.orderId,
            payment.transactionReference,
            payment.paymentMethod,
            payment.status
        ].join(" ").toLowerCase();

        const matchesSearch = !search || searchableText.includes(search);

        const matchesStatus = statusFilter === "" ||
            Number(payment.status) === Number(statusFilter);

        return matchesSearch && matchesStatus;
    });

    document.getElementById("resultCount").textContent =
        `${filtered.length} payment${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
        paymentsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="fw-semibold">No payments found</div>
                        <div class="text-muted small">
                            Try changing your search or recording a payment.
                        </div>
                    </td>
                </tr>`;
        return;
    }

    paymentsTableBody.innerHTML = filtered.map(payment => {
        const id = payment.id ?? payment.paymentId;
        const amount = Number(payment.amount ?? 0);

        return `
                <tr>
                    <td class="fw-semibold">#${escapeHtml(id ?? "—")}</td>
                    <td>#${escapeHtml(payment.orderId ?? "—")}</td>
                    <td class="fw-semibold">${formatMoney(amount)}</td>
                    <td>${escapeHtml(getPaymentMethod(payment.paymentMethod))}</td>
                    <td>${getStatusBadge(Number(payment.status))}</td>
                    <td>${escapeHtml(payment.transactionReference || "—")}</td>
                    <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary"
                                    onclick="viewPayment(${Number(id)})"
                                    title="View details">
                                <i class="bi bi-eye"></i>
                            </button>

                            <button class="btn btn-sm btn-outline-secondary"
                                    onclick="changePaymentStatus(${Number(id)}, ${Number(payment.status)})"
                                    title="Update status">
                                <i class="bi bi-arrow-repeat"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
    }).join("");
}

function updateSummary() {
    const completed = allPayments.filter(
        payment => Number(payment.status) === 1
    );

    const pending = allPayments.filter(
        payment => Number(payment.status) === 0
    );

    const failed = allPayments.filter(
        payment => Number(payment.status) === 2
    );

    const completedAmount = completed.reduce(
        (total, payment) => total + Number(payment.amount ?? 0), 0
    );

    document.getElementById("totalPayments").textContent =
        allPayments.length;

    document.getElementById("completedAmount").textContent =
        formatMoney(completedAmount);

    document.getElementById("pendingPayments").textContent =
        pending.length;

    document.getElementById("failedPayments").textContent =
        failed.length;
}

async function viewPayment(id) {
    const body = document.getElementById("paymentDetailsBody");

    body.innerHTML = `<div class="text-center py-4">Loading payment details...</div>`;

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById("detailsModal")
    ).show();

    try {
        const payment = await apiRequest(`${PAYMENT_API}/${id}`);

        if (!payment) {
            throw new Error("The API returned no payment details.");
        }

        body.innerHTML = `
                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Payment ID</span>
                    <strong>#${escapeHtml(payment.id ?? payment.paymentId ?? id)}</strong>
                </div>

                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Order ID</span>
                    <strong>#${escapeHtml(payment.orderId ?? "—")}</strong>
                </div>

                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Amount</span>
                    <strong class="text-primary">
                        ${formatMoney(payment.amount)}
                    </strong>
                </div>

                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Payment Method</span>
                    <strong>${escapeHtml(getPaymentMethod(payment.paymentMethod))}</strong>
                </div>

                <div class="d-flex justify-content-between mb-3">
                    <span class="text-muted">Status</span>
                    ${getStatusBadge(Number(payment.status))}
                </div>

                <div class="d-flex justify-content-between mb-3 gap-3">
                    <span class="text-muted">Reference</span>
                    <span class="text-end">
                        ${escapeHtml(payment.transactionReference || "—")}
                    </span>
                </div>

                <div class="d-flex justify-content-between mb-3 gap-3">
                    <span class="text-muted">Date</span>
                    <span class="text-end">
                        ${escapeHtml(formatDate(payment.paymentDate))}
                    </span>
                </div>

                ${payment.notes ? `
                    <hr>
                    <div>
                        <div class="text-muted small mb-1">Notes</div>
                        <div>${escapeHtml(payment.notes)}</div>
                    </div>
                ` : ""}
            `;

    } catch (error) {
        body.innerHTML = `
                <div class="alert alert-danger mb-0">
                    ${escapeHtml(error.message)}
                </div>`;
    }
}

async function changePaymentStatus(id, currentStatus) {
    const options = [
        "Pending",
        "Completed",
        "Failed",
        "Refunded"
    ];

    const selected = prompt(
        `Update status for Payment #${id}\n\n` +
        `Current status: ${getPaymentStatus(currentStatus)}\n\n` +
        options.map((label, index) => `${index}: ${label}`).join("\n") +
        "\n\nEnter the numeric status:"
    );

    if (selected === null) return;

    if (!["0", "1", "2", "3"].includes(selected.trim())) {
        showMessage("Invalid status. Enter 0, 1, 2, or 3.");
        return;
    }

    const nextStatus = Number(selected);

    if (nextStatus === currentStatus) {
        showMessage("The selected status is already assigned.", "info");
        return;
    }

    if (!confirm(
        `Change payment #${id} to "${getPaymentStatus(nextStatus)}"?`
    )) {
        return;
    }

    try {
        await apiRequest(`${PAYMENT_API}/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus })
        });

        showMessage("Payment status updated successfully.", "success");
        await loadPayments();

    } catch (error) {
        showMessage(`Unable to update payment status: ${error.message}`);
    }
}

paymentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formError = document.getElementById("formError");
    const saveButton = document.getElementById("savePaymentButton");

    formError.classList.add("d-none");
    formError.textContent = "";

    const orderId = Number(
        document.getElementById("paymentOrderId").value
    );

    if (!Number.isInteger(orderId) || orderId < 1) {
        formError.textContent = "Please enter a valid order ID.";
        formError.classList.remove("d-none");
        return;
    }

    const payload = {
        orderId: orderId,
        paymentMethod: Number(
            document.getElementById("paymentMethod").value
        ),
        transactionReference:
            document.getElementById("transactionReference").value.trim(),
        notes: document.getElementById("paymentNotes").value.trim()
    };

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        await apiRequest(PAYMENT_API, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("paymentModal")
        ).hide();

        paymentForm.reset();

        showMessage("Payment recorded successfully.", "success");
        await loadPayments();

    } catch (error) {
        formError.textContent = error.message;
        formError.classList.remove("d-none");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Record Payment";
    }
});

document.getElementById("searchInput")
    .addEventListener("input", renderPayments);

document.getElementById("statusFilter")
    .addEventListener("change", renderPayments);

document.addEventListener("DOMContentLoaded", loadPayments);