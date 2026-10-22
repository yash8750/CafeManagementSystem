const customersApiUrl = "https://managecafeapi.runasp.net/api/Customers";
let customers = [];

const customersTableBody = document.getElementById("customersTableBody");
const customerError = document.getElementById("customerError");
const customerSuccess = document.getElementById("customerSuccess");
const customerSearch = document.getElementById("customerSearch");
const customerForm = document.getElementById("customerForm");

const customerModalElement = document.getElementById("customerModal");
const customerModal = bootstrap.Modal.getOrCreateInstance(customerModalElement);

function getToken() {
    const token = sessionStorage.getItem("cafeJwtToken");

    if (!token) {
        window.location.href = "/Account/Login";
        return null;
    }

    return token;
}

async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Please sign in to continue.");
    }

    const headers = {
        "Authorization": `Bearer ${token} `,
        "Accept": "application/json",
        ...options.headers
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
        window.location.href = "/Account/Login";
        throw new Error("Your session has expired. Please sign in again.");
    }

    if (response.status === 403) {
        throw new Error("You do not have permission to perform this operation.");
    }

    if (response.status === 204) {
        return null;
    }

    const responseText = await response.text();
    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = responseText;
        }
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.title ||
            (typeof data === "string" ? data : null) ||
            `Request failed with HTTP ${response.status}.`;

        throw new Error(message);
    }

    return data;
}

function getValue(object, ...names) {
    for (const name of names) {
        if (object?.[name] !== undefined && object[name] !== null) {
            return object[name];
        }
    }

    return null;
}

function getCustomerId(customer) {
    return getValue(customer, "id", "Id", "customerId", "CustomerId");
}

function getCustomerName(customer) {
    return getValue(customer, "name", "Name") ?? "Unnamed Customer";
}

function getCustomerEmail(customer) {
    return getValue(customer, "email", "Email") ?? "";
}

function getCustomerPhone(customer) {
    return getValue(customer, "phoneNumber", "PhoneNumber") ?? "";
}

function getCustomerAddress(customer) {
    return getValue(customer, "address", "Address") ?? "";
}

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

function showCustomerError(message) {
    customerError.textContent = message;
    customerError.classList.remove("d-none");
    customerSuccess.classList.add("d-none");
}

function showCustomerSuccess(message) {
    customerSuccess.textContent = message;
    customerSuccess.classList.remove("d-none");
    customerError.classList.add("d-none");
}

function clearMessages() {
    customerError.classList.add("d-none");
    customerSuccess.classList.add("d-none");
    customerError.textContent = "";
    customerSuccess.textContent = "";
}

function renderCustomers() {
    const searchText = customerSearch.value.trim().toLowerCase();

    const filteredCustomers = customers.filter(customer => {
        const searchableText = [
            getCustomerName(customer),
            getCustomerEmail(customer),
            getCustomerPhone(customer),
            getCustomerAddress(customer)
        ].join(" ").toLowerCase();

        return searchableText.includes(searchText);
    });

    customersTableBody.replaceChildren();

    if (filteredCustomers.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "text-center text-muted py-5";
        cell.textContent = customers.length === 0
            ? "No customers found. Add your first customer."
            : "No matching customers found.";

        row.appendChild(cell);
        customersTableBody.appendChild(row);
    } else {
        for (const customer of filteredCustomers) {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            const nameContainer = document.createElement("div");
            nameContainer.className = "d-flex align-items-center gap-3";

            const avatar = document.createElement("div");
            avatar.className = "customer-avatar";
            avatar.textContent =
                getCustomerName(customer).trim().charAt(0).toUpperCase() || "?";

            const name = document.createElement("div");
            name.className = "customer-name";
            name.textContent = getCustomerName(customer);

            nameContainer.append(avatar, name);
            nameCell.appendChild(nameContainer);

            const emailCell = document.createElement("td");
            emailCell.textContent = getCustomerEmail(customer) || "—";

            const phoneCell = document.createElement("td");
            phoneCell.textContent = getCustomerPhone(customer) || "—";

            const addressCell = document.createElement("td");
            addressCell.textContent = getCustomerAddress(customer) || "—";

            const actionsCell = document.createElement("td");
            actionsCell.className = "text-end text-nowrap";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className =
                "btn btn-sm btn-outline-primary customer-action-btn";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", () => {
                openEditCustomerModal(customer);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className =
                "btn btn-sm btn-outline-danger ms-1 customer-action-btn";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                deleteCustomer(customer);
            });

            actionsCell.append(editButton, deleteButton);

            row.append(
                nameCell,
                emailCell,
                phoneCell,
                addressCell,
                actionsCell
            );

            customersTableBody.appendChild(row);
        }
    }

    document.getElementById("totalCustomers").textContent = customers.length;

    document.getElementById("customerResultCount").textContent =
        `Showing ${filteredCustomers.length} of ${customers.length} customers`;
}

async function loadCustomers() {
    clearMessages();

    customersTableBody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "text-center py-5";
    cell.textContent = "Loading customers...";

    row.appendChild(cell);
    customersTableBody.appendChild(row);

    try {
        const response = await apiRequest(customersApiUrl);
        customers = normalizeList(response);

        renderCustomers();
    } catch (error) {
        showCustomerError(error.message || "Unable to load customers.");

        const errorRow = document.createElement("tr");
        const errorCell = document.createElement("td");

        errorCell.colSpan = 5;
        errorCell.className = "text-center text-muted py-5";
        errorCell.textContent = "Unable to load customers. Check the error above.";

        errorRow.appendChild(errorCell);
        customersTableBody.replaceChildren(errorRow);

        console.error("Customer loading failed:", error);
    }
}

function openAddCustomerModal() {
    customerForm.reset();

    document.getElementById("customerId").value = "";
    document.getElementById("customerModalLabel").textContent = "Add Customer";
    document.getElementById("saveCustomerBtn").textContent = "Save Customer";

    const formError = document.getElementById("customerFormError");
    formError.textContent = "";
    formError.classList.add("d-none");

    customerModal.show();
}

function openEditCustomerModal(customer) {
    customerForm.reset();

    document.getElementById("customerId").value = getCustomerId(customer);
    document.getElementById("customerName").value = getCustomerName(customer);
    document.getElementById("customerEmail").value = getCustomerEmail(customer);
    document.getElementById("customerPhone").value = getCustomerPhone(customer);
    document.getElementById("customerAddress").value = getCustomerAddress(customer);
    document.getElementById("customerIsActive").value =
        String(getValue(customer, "isActive", "IsActive") ?? true);
    document.getElementById("customerModalLabel").textContent = "Edit Customer";
    document.getElementById("saveCustomerBtn").textContent = "Update Customer";

    const formError = document.getElementById("customerFormError");
    formError.textContent = "";
    formError.classList.add("d-none");

    customerModal.show();
}

async function saveCustomer(event) {
    event.preventDefault();

    const formError = document.getElementById("customerFormError");
    const saveButton = document.getElementById("saveCustomerBtn");

    formError.classList.add("d-none");
    formError.textContent = "";

    const name = document.getElementById("customerName").value.trim();
    const email = document.getElementById("customerEmail").value.trim();
    const phoneNumber = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();

    if (!name) {
        formError.textContent = "Customer name is required.";
        formError.classList.remove("d-none");
        return;
    }
    const customerId = document.getElementById("customerId").value;
    const isEditing = customerId !== "";

    const customerData = {
        name: name,
        email: email || null,
        phoneNumber: phoneNumber || null,
        address: address || null
    };

    if (isEditing) {
        customerData.isActive =
            document.getElementById("customerIsActive").value === "true";
    }

    const url = isEditing
        ? `${customersApiUrl}/${encodeURIComponent(customerId)}`
        : customersApiUrl;

    saveButton.disabled = true;
    saveButton.textContent = isEditing ? "Updating..." : "Saving...";

    try {
        await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(customerData)
        });

        customerModal.hide();

        await loadCustomers();

        showCustomerSuccess(
            isEditing
                ? `"${name}" was updated successfully.`
                : `"${name}" was added successfully.`
        );
    } catch (error) {
        formError.textContent =
            error.message || "Unable to save the customer.";

        formError.classList.remove("d-none");
        console.error("Customer save failed:", error);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = isEditing ? "Update Customer" : "Save Customer";
    }
}

async function deleteCustomer(customer) {
    const customerId = getCustomerId(customer);
    const customerName = getCustomerName(customer);

    const confirmed = window.confirm(
        `Are you sure you want to delete "${customerName}"?\n\n` +
        "The API may prevent deletion if this customer has existing orders."
    );

    if (!confirmed) {
        return;
    }

    clearMessages();

    try {
        await apiRequest(
            `${customersApiUrl}/${encodeURIComponent(customerId)}`,
            { method: "DELETE" }
        );

        await loadCustomers();

        showCustomerSuccess(`"${customerName}" was deleted successfully.`);
    } catch (error) {
        showCustomerError(
            error.message || "Unable to delete the customer."
        );
    }
}

customerSearch.addEventListener("input", renderCustomers);

document.getElementById("refreshCustomersBtn")
    .addEventListener("click", loadCustomers);

document.getElementById("addCustomerBtn")
    .addEventListener("click", openAddCustomerModal);

customerForm.addEventListener("submit", saveCustomer);

loadCustomers();