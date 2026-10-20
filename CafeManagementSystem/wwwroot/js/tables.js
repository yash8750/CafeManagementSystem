const tablesApiUrl = "https://localhost:7159/api/Tables";

let cafeTables = [];

const tableTableBody =
    document.getElementById("tableTableBody");

const tableSearch =
    document.getElementById("tableSearch");

const tableError =
    document.getElementById("tableError");

const tableSuccess =
    document.getElementById("tableSuccess");

const tableForm =
    document.getElementById("tableForm");

const tableModalElement =
    document.getElementById("tableModal");

const tableModal =
    bootstrap.Modal.getOrCreateInstance(tableModalElement);

const saveTableBtn =
    document.getElementById("saveTableBtn");

// ================================
// AUTHENTICATION
// ================================

function getToken() {
    const token = sessionStorage.getItem("cafeJwtToken");

    if (!token) {
        window.location.href = "/Account/Login";
        return null;
    }

    return token;
}

// ================================
// API REQUEST HELPER
// ================================

async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Please log in to continue.");
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        sessionStorage.removeItem("cafeJwtToken");
        sessionStorage.removeItem("cafeUserEmail");
        sessionStorage.removeItem("cafeUserName");
        sessionStorage.removeItem("cafeUserRoles");

        window.location.href = "/Account/Login";

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "You do not have permission to perform this action."
        );
    }

    if (!response.ok) {
        let message =
            `Request failed with HTTP ${response.status}.`;

        try {
            const data = await response.json();

            message =
                data.message ||
                data.title ||
                message;

            if (data.errors) {
                const validationMessages =
                    Object.values(data.errors)
                        .flat()
                        .filter(Boolean);

                if (validationMessages.length > 0) {
                    message = validationMessages.join(" ");
                }
            }
        } catch {
            // Keep the default error message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    return null;
}

// ================================
// DATA HELPERS
// ================================

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.$values)) {
        return data.$values;
    }

    return [];
}

function getTableId(table) {
    return table.id ?? table.Id;
}

function getTableNumber(table) {
    return table.tableNumber ?? table.TableNumber ?? "";
}

function getTableCapacity(table) {
    return table.capacity ?? table.Capacity ?? 0;
}

function getTableStatus(table) {
    return Number(table.status ?? table.Status);
}

function getTableIsActive(table) {
    return table.isActive ?? table.IsActive ?? true;
}

function getTableStatusName(table) {
    switch (getTableStatus(table)) {
        case 1:
            return "Available";
        case 2:
            return "Occupied";
        case 3:
            return "Reserved";
        case 4:
            return "Cleaning";
        case 5:
            return "Inactive";
        default:
            return "Unknown";
    }
}

function getTableStatusClass(statusName) {
    switch (statusName) {
        case "Available":
            return "bg-success";
        case "Occupied":
            return "bg-danger";
        case "Reserved":
            return "bg-warning text-dark";
        case "Cleaning":
            return "bg-info text-dark";
        case "Inactive":
            return "bg-secondary";
        default:
            return "bg-dark";
    }
}

// ================================
// SUCCESS AND ERROR MESSAGES
// ================================

function clearTableMessages() {
    tableError.textContent = "";
    tableSuccess.textContent = "";

    tableError.classList.add("d-none");
    tableSuccess.classList.add("d-none");
}

function showTableError(message) {
    tableError.textContent = message;
    tableError.classList.remove("d-none");
    tableSuccess.classList.add("d-none");
}

function showTableSuccess(message) {
    tableSuccess.textContent = message;
    tableSuccess.classList.remove("d-none");
    tableError.classList.add("d-none");
}

// ================================
// RENDER TABLE LIST
// ================================

function renderTables() {
    const searchTerm =
        tableSearch.value.trim().toLowerCase();

    const filteredTables = cafeTables.filter(table => {
        const number =
            getTableNumber(table).toLowerCase();

        const status =
            getTableStatusName(table).toLowerCase();

        return number.includes(searchTerm) ||
            status.includes(searchTerm);
    });

    tableTableBody.replaceChildren();

    // Statistics
    document.getElementById("totalTables").textContent =
        cafeTables.length;

    document.getElementById("availableTables").textContent =
        cafeTables.filter(
            table => getTableStatus(table) === 1
        ).length;

    document.getElementById("occupiedTables").textContent =
        cafeTables.filter(
            table => getTableStatus(table) === 2
        ).length;

    document.getElementById("reservedTables").textContent =
        cafeTables.filter(
            table => getTableStatus(table) === 3
        ).length;

    document.getElementById("tableResultCount").textContent =
        filteredTables.length;

    // Empty state
    if (filteredTables.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.className =
            "text-center py-4 text-muted";

        cell.textContent = searchTerm
            ? "No matching tables found."
            : "No tables found.";

        row.appendChild(cell);
        tableTableBody.appendChild(row);

        return;
    }

    // Table rows
    filteredTables.forEach(table => {
        const row = document.createElement("tr");

        const numberCell = document.createElement("td");
        numberCell.className = "ps-4 fw-semibold";
        numberCell.textContent = getTableNumber(table);

        const capacityCell = document.createElement("td");
        capacityCell.textContent =
            `${getTableCapacity(table)} seats`;

        const statusCell = document.createElement("td");

        const statusName = getTableStatusName(table);
        const badge = document.createElement("span");

        badge.className =
            `badge ${getTableStatusClass(statusName)}`;

        badge.textContent = statusName;
        statusCell.appendChild(badge);

        if (getTableIsActive(table) !== true) {
            const inactiveBadge =
                document.createElement("span");

            inactiveBadge.className =
                "badge bg-secondary ms-2";

            inactiveBadge.textContent = "Inactive record";

            statusCell.appendChild(inactiveBadge);
        }

        // Action buttons
        const actionsCell = document.createElement("td");
        actionsCell.className = "text-end pe-4";

        const editButton =
            document.createElement("button");

        editButton.type = "button";
        editButton.className =
            "btn btn-sm btn-outline-primary me-2";

        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {
            openEditTableModal(table);
        });

        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "btn btn-sm btn-outline-danger";

        deleteButton.textContent = "Delete";


        deleteButton.addEventListener("click", function () {
            deleteTable(table);
        });

        actionsCell.append(editButton, deleteButton);

        row.append(
            numberCell,
            capacityCell,
            statusCell,
            actionsCell
        );

        tableTableBody.appendChild(row);
    });
}

async function deleteTable(table) {
    const tableId = getTableId(table);
    const tableNumber = getTableNumber(table);

    if (!tableId) {
        showTableError("Unable to delete the table because its ID is missing.");
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete table "${tableNumber}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `${tablesApiUrl}/${encodeURIComponent(tableId)}`,
            {
                method: "DELETE"
            }
        );

        await loadTables();

        showTableSuccess(`Table "${tableNumber}" deleted successfully.`);
    } catch (error) {
        showTableError(
            error.message || "Unable to delete the table. Please try again."
        );
    }
}

// ================================
// LOAD TABLES
// ================================

async function loadTables() {
    clearTableMessages();

    tableTableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 4;
    loadingCell.className =
        "text-center py-4 text-muted";

    loadingCell.textContent = "Loading tables...";

    loadingRow.appendChild(loadingCell);
    tableTableBody.appendChild(loadingRow);

    try {
        const data = await apiRequest(tablesApiUrl);

        cafeTables = normalizeList(data);

        renderTables();
    } catch (error) {
        cafeTables = [];
        renderTables();

        showTableError(
            error.message || "Unable to load tables."
        );
    }
}

// ================================
// OPEN ADD TABLE MODAL
// ================================

document.getElementById("addTableBtn")
    .addEventListener("click", function () {
        clearTableMessages();

        tableForm.reset();

        document.getElementById("tableId").value = "";

        document.getElementById("tableModalLabel").textContent =
            "Add Table";

        document.getElementById("tableStatus").value = "1";

        document.getElementById("tableFormError").textContent =
            "";

        saveTableBtn.textContent = "Save Table";

        tableModal.show();
    });

// ================================
// OPEN EDIT TABLE MODAL
// ================================

function openEditTableModal(table) {
    clearTableMessages();

    tableForm.reset();

    document.getElementById("tableId").value =
        getTableId(table);

    document.getElementById("tableNumber").value =
        getTableNumber(table);

    document.getElementById("tableCapacity").value =
        getTableCapacity(table);

    document.getElementById("tableStatus").value =
        String(getTableStatus(table));

    document.getElementById("tableFormError").textContent =
        "";

    document.getElementById("tableModalLabel").textContent =
        "Edit Table";

    saveTableBtn.textContent = "Update Table";

    tableModal.show();
}

// ================================
// ADD OR UPDATE TABLE
// ================================

tableForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearTableMessages();

    const formError =
        document.getElementById("tableFormError");

    formError.textContent = "";

    const tableId =
        document.getElementById("tableId").value.trim();

    const tableNumber =
        document.getElementById("tableNumber").value.trim();

    const capacity =
        Number(document.getElementById("tableCapacity").value);

    const status =
        Number(document.getElementById("tableStatus").value);

    const isEditing = tableId !== "";

    // Client-side validation
    if (!tableNumber) {
        formError.textContent =
            "Please enter a table number.";
        return;
    }

    if (tableNumber.length > 20) {
        formError.textContent =
            "Table number cannot exceed 20 characters.";
        return;
    }

    if (!Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 50) {
        formError.textContent =
            "Capacity must be between 1 and 50.";
        return;
    }

    if (![1, 2, 3, 4, 5].includes(status)) {
        formError.textContent =
            "Please select a valid table status.";
        return;
    }

    // Request body expected by CreateTableDto/UpdateTableDto.
    const payload = {
        tableNumber: tableNumber,
        capacity: capacity,
        status: status,
        isActive: status !== 5
    };

    saveTableBtn.disabled = true;

    saveTableBtn.textContent =
        isEditing ? "Updating..." : "Saving...";

    try {
        const url = isEditing
            ? `${tablesApiUrl}/${encodeURIComponent(tableId)}`
            : tablesApiUrl;

        await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        tableModal.hide();

        tableForm.reset();

        document.getElementById("tableId").value = "";

        document.getElementById("tableStatus").value = "1";

        await loadTables();

        showTableSuccess(
            isEditing
                ? `Table ${tableNumber} updated successfully.`
                : `Table ${tableNumber} added successfully.`
        );
    } catch (error) {
        formError.textContent =
            error.message || "Unable to save table.";
    } finally {
        saveTableBtn.disabled = false;

        saveTableBtn.textContent =
            "Save Table";
    }
});

// ================================
// SEARCH AND REFRESH
// ================================

tableSearch.addEventListener("input", renderTables);

document.getElementById("refreshTablesBtn")
    .addEventListener("click", loadTables);

// Initial load
loadTables();