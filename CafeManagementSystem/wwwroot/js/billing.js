const API_BASE_URL = "https://managecafeapi.runasp.net";

const invoiceForm = document.getElementById("invoiceForm");
const invoiceContent = document.getElementById("invoiceContent");
const messageBox = document.getElementById("messageBox");
const searchButton = document.getElementById("searchButton");

// Use the existing login and token-storage conventions.
function getAuthToken() {
    return sessionStorage.getItem("cafeJwtToken");
}

function showMessage(message, type = "danger") {
    messageBox.textContent = message;
    messageBox.className = `alert alert-${type}`;
}

function hideMessage() {
    messageBox.textContent = "";
    messageBox.className = "alert d-none";
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

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
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

function getOrderType(value) {
    const types = {
        0: "Dine-in",
        1: "Takeaway"
    };

    return types[value] ?? `Unknown (${value})`;
}

function getOrderStatus(value) {
    const statuses = {
        0: "Pending",
        1: "Confirmed",
        2: "Preparing",
        3: "Ready",
        4: "Completed",
        5: "Cancelled"
    };

    return statuses[value] ?? `Unknown (${value})`;
}

function getPaymentMethod(value) {
    const methods = {
        0: "Cash",
        1: "Card",
        2: "UPI",
        3: "Online"
    };

    return methods[value] ?? `Unknown (${value})`;
}

// Payment status labels depend on your API enum.
// These labels are provisional until the enum is verified.
function getPaymentStatus(value) {
    const statuses = {
        0: "Pending",
        1: "Completed",
        2: "Failed",
        3: "Refunded"
    };

return statuses[Number(value)] ?? `Unknown(${ value })`;
}


async function loadInvoice(orderId) {
    hideMessage();

    const token = getAuthToken();

    if (!token) {
        window.location.href = "/Account/Login";
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Loading...";

    invoiceContent.classList.add("d-none");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/Billing/orders/${encodeURIComponent(orderId)}/invoice`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            }
        );

        if (response.status === 401) {
            sessionStorage.removeItem("cafeJwtToken");
            window.location.href = "/Account/Login";
            return;
        }

        if (response.status === 403) {
            throw new Error("You do not have permission to view invoices.");
        }

        if (response.status === 404) {
            throw new Error("No invoice was found for this order ID.");
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `Invoice request failed (${response.status}). ${body}`
            );
        }

        const invoice = await response.json();

        renderInvoice(invoice);
        invoiceContent.classList.remove("d-none");
        showMessage("Invoice loaded successfully.", "success");

    } catch (error) {
        showMessage(error.message || "Unable to load invoice.");
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Search Invoice";
    }
}

function renderInvoice(invoice) {
    document.getElementById("invoiceNumber").textContent =
        invoice.invoiceNumber ?? "—";

    document.getElementById("invoiceNumberCard").textContent =
        invoice.invoiceNumber ?? "—";

    document.getElementById("invoiceOrderId").textContent =
        invoice.orderId ?? "—";

    document.getElementById("orderDate").textContent =
        formatDate(invoice.orderDate);

    document.getElementById("customerName").textContent =
        invoice.customerName || "Walk-in Customer";

    document.getElementById("tableNumber").textContent =
        invoice.tableNumber ? `Table: ${invoice.tableNumber}` : "";

    document.getElementById("orderType").textContent =
        getOrderType(invoice.orderType);

    const orderStatus = document.getElementById("orderStatus");
    orderStatus.textContent = getOrderStatus(invoice.orderStatus);
    orderStatus.className =
        `badge ${Number(invoice.orderStatus) === 4
            ? "bg-success"
            : Number(invoice.orderStatus) === 5
                ? "bg-danger"
                : "bg-secondary"}`;

    const subtotal = Number(invoice.subtotal ?? 0);
    const taxAmount = Number(invoice.taxAmount ?? 0);
    const totalAmount = Number(invoice.totalAmount ?? 0);
    const amountPaid = Number(invoice.amountPaid ?? 0);
    const balanceDue = Number(invoice.balanceDue ?? 0);

    document.getElementById("subtotal").textContent =
        formatMoney(subtotal);

    document.getElementById("taxAmountDetail").textContent =
        formatMoney(taxAmount);

    document.getElementById("totalAmount").textContent =
        formatMoney(totalAmount);

    document.getElementById("totalAmountDetail").textContent =
        formatMoney(totalAmount);

    document.getElementById("amountPaid").textContent =
        formatMoney(amountPaid);

    document.getElementById("amountPaidDetail").textContent =
        formatMoney(amountPaid);

    document.getElementById("balanceDue").textContent =
        formatMoney(balanceDue);

    document.getElementById("balanceDueDetail").textContent =
        formatMoney(balanceDue);

    renderItems(invoice.items ?? []);
    renderPayments(invoice.payments ?? []);
}

function renderItems(items) {
    const tbody = document.getElementById("invoiceItems");

    if (!items.length) {
        tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        No items found for this invoice.
                    </td>
                </tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => `
            <tr>
                <td>${escapeHtml(item.menuItemName ?? "Unknown item")}</td>
                <td class="text-center">${Number(item.quantity ?? 0)}</td>
                <td class="text-end">${formatMoney(item.unitPrice)}</td>
                <td class="text-end fw-semibold">${formatMoney(item.lineTotal)}</td>
            </tr>
        `).join("");
}

function renderPayments(payments) {
    const tbody = document.getElementById("paymentHistory");

    if (!payments.length) {
        tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No payment records for this invoice.
                    </td>
                </tr>`;
        return;
    }

    tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${escapeHtml(payment.paymentId ?? "—")}</td>
                <td>${escapeHtml(getPaymentMethod(payment.paymentMethod))}</td>
                <td>${escapeHtml(getPaymentStatus(payment.status))}</td>
                <td>${escapeHtml(payment.transactionReference || "—")}</td>
                <td>${escapeHtml(formatDate(payment.paymentDate))}</td>
                <td class="text-end">${formatMoney(payment.amount)}</td>
            </tr>
        `).join("");
}

invoiceForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const orderId = Number(document.getElementById("orderId").value);

    if (!Number.isInteger(orderId) || orderId < 1) {
        showMessage("Please enter a valid positive order ID.");
        return;
    }

    loadInvoice(orderId);
});

function clearInvoice() {
    document.getElementById("orderId").value = "";
    invoiceContent.classList.add("d-none");
    hideMessage();
}