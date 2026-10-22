const categoriesApiUrl = "https://managecafeapi.runasp.net/api/Categories";
let categories = [];

const categoryTableBody =
    document.getElementById("categoryTableBody");

const categorySearch =
    document.getElementById("categorySearch");

const categoryError =
    document.getElementById("categoryError");

const categorySuccess =
    document.getElementById("categorySuccess");

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

        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(
            "You do not have permission to perform this action."
        );
    }

    if (!response.ok) {
        let message = `Request failed with HTTP ${response.status}.`;

        try {
            const data = await response.json();
            message = data.message || data.title || message;
        } catch {
            // Keep the default error message.
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

function normalizeList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.$values)) {
        return data.$values;
    }

    return [];
}

function getCategoryId(category) {
    return category.id ?? category.Id;
}

function getCategoryName(category) {
    return category.name ?? category.Name ?? "";
}

function getCategoryDescription(category) {
    return category.description ?? category.Description ?? "";
}

function showCategoryError(message) {
    categoryError.textContent = message;
    categoryError.classList.remove("d-none");
    categorySuccess.classList.add("d-none");
}

function showCategorySuccess(message) {
    categorySuccess.textContent = message;
    categorySuccess.classList.remove("d-none");
    categoryError.classList.add("d-none");
}

function clearCategoryMessages() {
    categoryError.textContent = "";
    categorySuccess.textContent = "";

    categoryError.classList.add("d-none");
    categorySuccess.classList.add("d-none");
}

function renderCategories() {
    const searchTerm = categorySearch.value
        .trim()
        .toLowerCase();

    const filteredCategories = categories.filter(category => {
        const name = getCategoryName(category).toLowerCase();
        const description =
            getCategoryDescription(category).toLowerCase();

        return name.includes(searchTerm) ||
            description.includes(searchTerm);
    });

    categoryTableBody.replaceChildren();

    document.getElementById("totalCategories").textContent =
        categories.length;

    document.getElementById("loadedCategories").textContent =
        categories.length;

    document.getElementById("categoryResultCount").textContent =
        filteredCategories.length;

    if (filteredCategories.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.className = "text-center py-4 text-muted";
        cell.textContent = searchTerm
            ? "No matching categories found."
            : "No categories found. Add your first category.";

        row.appendChild(cell);
        categoryTableBody.appendChild(row);

        return;
    }

    filteredCategories.forEach((category, index) => {
        const row = document.createElement("tr");

        const numberCell = document.createElement("td");
        numberCell.className = "ps-4";
        numberCell.textContent = index + 1;

        const nameCell = document.createElement("td");
        nameCell.className = "fw-semibold";
        nameCell.textContent = getCategoryName(category);

        const descriptionCell = document.createElement("td");
        descriptionCell.className = "text-muted";
        descriptionCell.textContent =
            getCategoryDescription(category) || "—";

        const actionsCell = document.createElement("td");
        actionsCell.className = "text-end pe-4";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className =
            "btn btn-sm btn-outline-primary me-2";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", function () {
            openEditCategoryModal(category);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-sm btn-outline-danger";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function () { deleteCategory(category); });

        actionsCell.append(editButton, deleteButton);

        row.append(
            numberCell,
            nameCell,
            descriptionCell,
            actionsCell
        );

        categoryTableBody.appendChild(row);
    });
}

function openAddCategoryModal() {
    document.getElementById("categoryForm").reset();

    document.getElementById("categoryId").value = "";

    document.getElementById("categoryModalLabel").textContent =
        "Add Category";

    document.getElementById("saveCategoryBtn").textContent =
        "Save Category";

    const formError = document.getElementById("categoryFormError");

    formError.textContent = "";
    formError.classList.add("d-none");

    clearCategoryMessages();

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById("categoryModal")
    ).show();
}

function openEditCategoryModal(category) {
    document.getElementById("categoryForm").reset();

    document.getElementById("categoryId").value = getCategoryId(category);

    document.getElementById("categoryName").value = getCategoryName(category);

    document.getElementById("categoryDescription").value = getCategoryDescription(category);

    document.getElementById("categoryModalLabel").textContent = "Edit Category";

    document.getElementById("saveCategoryBtn").textContent = "Update Category";

    const formError = document.getElementById("categoryFormError");

    formError.textContent = "";
    formError.classList.add("d-none");

    clearCategoryMessages();

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById("categoryModal")
    ).show();
}

async function saveCategory(event) {
    event.preventDefault();

    const nameInput = document.getElementById("categoryName");
    const descriptionInput =
        document.getElementById("categoryDescription");

    const formError = document.getElementById("categoryFormError");
    const saveButton = document.getElementById("saveCategoryBtn");

    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();

    formError.textContent = "";
    formError.classList.add("d-none");

    if (!name) {
        formError.textContent = "Category name is required.";
        formError.classList.remove("d-none");
        nameInput.focus();
        return;
    }

    if (name.length > 100) {
        formError.textContent =
            "Category name cannot exceed 100 characters.";
        formError.classList.remove("d-none");
        nameInput.focus();
        return;
    }

    const categoryId =
        document.getElementById("categoryId").value;

    const isEditing = categoryId !== "";

    const duplicateExists = categories.some(category =>
        String(getCategoryId(category)) !== String(categoryId) &&
        getCategoryName(category).toLowerCase() === name.toLowerCase()
    );

    if (duplicateExists) {
        formError.textContent =
            "A category with this name already exists.";
        formError.classList.remove("d-none");
        nameInput.focus();
        return;
    }

    const dto = {
        name: name,
        description: description || null
    };

    const originalButtonText = saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        await apiRequest(
            isEditing
                ? `${categoriesApiUrl}/${encodeURIComponent(categoryId)}`
                : categoriesApiUrl,
            {
                method: isEditing ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dto)
            }
        );

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("categoryModal")
        ).hide();

        await loadCategories();

        showCategorySuccess(
            isEditing
                ? `Category "${name}" was updated successfully.`
                : `Category "${name}" was added successfully.`
        );
    } catch (error) {
        formError.textContent =
            error.message || "Unable to save the category.";

        formError.classList.remove("d-none");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

async function deleteCategory(category) {
    const categoryId = getCategoryId(category);
    const categoryName = getCategoryName(category);

    const confirmed = window.confirm(
        `Are you sure you want to delete "${categoryName}"?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    clearCategoryMessages();

    try {
        await apiRequest(
            `${categoriesApiUrl}/${encodeURIComponent(categoryId)}`,
            {
                method: "DELETE"
            }
        );

        await loadCategories();

        showCategorySuccess(
            `Category "${categoryName}" was deleted successfully.`
        );
    } catch (error) {
        showCategoryError(
            error.message || "Unable to delete the category."
        );
    }
}

async function loadCategories() {
    clearCategoryMessages();

    categoryTableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 4;
    loadingCell.className = "text-center py-4 text-muted";
    loadingCell.textContent = "Loading categories...";

    loadingRow.appendChild(loadingCell);
    categoryTableBody.appendChild(loadingRow);

    try {
        const data = await apiRequest(categoriesApiUrl);

        categories = normalizeList(data);

        renderCategories();
    } catch (error) {
        categories = [];
        renderCategories();

        showCategoryError(
            error.message || "Unable to load categories."
        );
    }
}

categorySearch.addEventListener("input", renderCategories);

document.getElementById("refreshCategoriesBtn").addEventListener("click", loadCategories);

document.getElementById("addCategoryBtn").addEventListener("click", openAddCategoryModal);

document.getElementById("categoryForm").addEventListener("submit", saveCategory);

loadCategories();