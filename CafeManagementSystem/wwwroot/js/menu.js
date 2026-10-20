        const menuApiUrl = "https://localhost:7159/api/MenuItems";
        const categoriesApiUrl = "https://localhost:7159/api/Categories";

        let menuItems = [];
        let categories = [];

        const menuTableBody = document.getElementById("menuTableBody");
        const menuError = document.getElementById("menuError");
        const menuSuccess = document.getElementById("menuSuccess");
        const menuSearch = document.getElementById("menuSearch");
        const categoryFilter = document.getElementById("categoryFilter");

        const itemCategory = document.getElementById("itemCategory");
        const menuItemForm = document.getElementById("menuItemForm");
        const menuItemModalElement = document.getElementById("menuItemModal");
        const menuItemModal = bootstrap.Modal.getOrCreateInstance(menuItemModalElement);

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
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
                ...options.headers
            };

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

            if (!response.ok) {
                let message = `Request failed with HTTP ${response.status}.`;

                try {
                    const body = await response.json();
                    message = body.message || body.title || message;
                } catch {
                    // Keep the default error message when no JSON body is returned.
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
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.items)) return data.items;
            if (Array.isArray(data?.data)) return data.data;
            return [];
        }

        function getValue(object, ...names) {
            for (const name of names) {
                if (object?.[name] !== undefined && object[name] !== null) {
                    return object[name];
                }
            }

            return null;
        }

        function getItemId(item) {
            return getValue(item, "id", "Id", "menuItemId", "MenuItemId");
        }

        function getItemName(item) {
            return getValue(item, "name", "Name") ?? "Unnamed Item";
        }

        function getItemDescription(item) {
            return getValue(item, "description", "Description") ?? "";
        }

        function getItemPrice(item) {
            const price = Number(getValue(item, "price", "Price") ?? 0);
            return Number.isFinite(price) ? price : 0;
        }

        function getItemCategoryId(item) {
            return getValue(item, "categoryId", "CategoryId");
        }

        function getItemAvailability(item) {
            return getValue(item, "isAvailable", "IsAvailable");
        }

        function getCategoryId(category) {
            return getValue(category, "id", "Id", "categoryId", "CategoryId");
        }

        function getCategoryName(category) {
            return getValue(category, "name", "Name", "categoryName", "CategoryName")
                ?? "Uncategorized";
        }

        function showError(message) {
            menuError.textContent = message;
            menuError.classList.remove("d-none");
            menuSuccess.classList.add("d-none");
        }

        function showSuccess(message) {
            menuSuccess.textContent = message;
            menuSuccess.classList.remove("d-none");
            menuError.classList.add("d-none");
        }

        function clearMessages() {
            menuError.classList.add("d-none");
            menuSuccess.classList.add("d-none");
            menuError.textContent = "";
            menuSuccess.textContent = "";
        }

        function getCategoryNameById(categoryId, item) {
            const embeddedCategory = getValue(item, "category", "Category");

            if (embeddedCategory && typeof embeddedCategory === "object") {
                return getCategoryName(embeddedCategory);
            }

            const category = categories.find(
                c => String(getCategoryId(c)) === String(categoryId)
            );

            return category
                ? getCategoryName(category)
                : getValue(item, "categoryName", "CategoryName") ?? "Uncategorized";
        }

        function populateCategorySelects() {
            const currentFilter = categoryFilter.value;

            categoryFilter.replaceChildren();
            itemCategory.replaceChildren();

            const allOption = new Option("All Categories", "");
            categoryFilter.add(allOption);

            itemCategory.add(new Option("Select Category", ""));

            for (const category of categories) {
                const id = getCategoryId(category);
                const name = getCategoryName(category);

                categoryFilter.add(new Option(name, id));
                itemCategory.add(new Option(name, id));
            }

            if ([...categoryFilter.options].some(o => o.value === currentFilter)) {
                categoryFilter.value = currentFilter;
            }
        }

        function renderMenuItems() {
            const searchText = menuSearch.value.trim().toLowerCase();
            const selectedCategory = categoryFilter.value;

            const filteredItems = menuItems.filter(item => {
                const name = String(getItemName(item)).toLowerCase();
                const description = String(getItemDescription(item)).toLowerCase();

                const matchesSearch =
                    name.includes(searchText) || description.includes(searchText);

                const matchesCategory =
                    !selectedCategory ||
                    String(getItemCategoryId(item)) === selectedCategory;

                return matchesSearch && matchesCategory;
            });

            menuTableBody.replaceChildren();

            if (filteredItems.length === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 5;
                cell.className = "text-center text-muted py-5";
                cell.textContent = "No matching menu items found.";

                row.appendChild(cell);
                menuTableBody.appendChild(row);
            } else {
                for (const item of filteredItems) {
                    const row = document.createElement("tr");

                    const itemCell = document.createElement("td");
                    const name = document.createElement("div");
                    name.className = "menu-item-name";
                    name.textContent = getItemName(item);

                    const description = document.createElement("div");
                    description.className = "menu-item-description";
                    description.textContent = getItemDescription(item);

                    itemCell.append(name, description);

                    const categoryCell = document.createElement("td");
                    categoryCell.textContent = getCategoryNameById(
                        getItemCategoryId(item), item
                    );

                    const priceCell = document.createElement("td");
                    priceCell.textContent = new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR"
                    }).format(getItemPrice(item));

                    const availabilityCell = document.createElement("td");
                    const badge = document.createElement("span");
                    badge.className = "badge availability-badge";

                    if (getItemAvailability(item) === true) {
                        badge.classList.add("bg-success-subtle", "text-success");
                        badge.textContent = "Available";
                    } else if (getItemAvailability(item) === false) {
                        badge.classList.add("bg-secondary-subtle", "text-secondary");
                        badge.textContent = "Unavailable";
                    } else {
                        badge.classList.add("bg-light", "text-dark");
                        badge.textContent = "Not specified";
                    }

                    availabilityCell.appendChild(badge);

                    const actionsCell = document.createElement("td");
                    actionsCell.className = "text-end";

                    const editButton = document.createElement("button");
                    editButton.type = "button";
                    editButton.className = "btn btn-sm btn-outline-primary menu-action-btn";
                    editButton.textContent = "Edit";

                    editButton.addEventListener("click", function() {
                        openEditMenuItemModal(item);
                    });

                    const deleteButton = document.createElement("button");
                    deleteButton.type = "button";
                    deleteButton.className = "btn btn-sm btn-outline-danger ms-1 menu-action-btn";
                    deleteButton.textContent = "Delete";
                    deleteButton.addEventListener("click", function() {
                        deleteMenuItem(item);
                    });
                    actionsCell.append(editButton, deleteButton);
                    row.append(itemCell, categoryCell, priceCell, availabilityCell, actionsCell);
                    menuTableBody.appendChild(row);
                }
            }

            document.getElementById("totalMenuItems").textContent = menuItems.length;

            document.getElementById("availableMenuItems").textContent =
                menuItems.filter(item => getItemAvailability(item) === true).length;

            document.getElementById("totalCategories").textContent = categories.length;

            document.getElementById("menuResultCount").textContent =
                `Showing ${filteredItems.length} of ${menuItems.length} menu items`;
        }

        async function loadMenuData() {
            clearMessages();

            menuTableBody.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.className = "text-center py-5";
            cell.textContent = "Loading menu items...";
            row.appendChild(cell);
            menuTableBody.appendChild(row);

            try {
                const [menuResponse, categoryResponse] = await Promise.all([
                    apiRequest(menuApiUrl),
                    apiRequest(categoriesApiUrl)
                ]);

                menuItems = normalizeList(menuResponse);
                categories = normalizeList(categoryResponse);

                populateCategorySelects();
                renderMenuItems();
            } catch (error) {
                showError(error.message || "Unable to load menu data.");
                console.error("Menu loading failed:", error);
            }
        }

        function openAddMenuItemModal() {
            menuItemForm.reset();
            document.getElementById("menuItemId").value = "";
            document.getElementById("menuItemModalLabel").textContent = "Add Menu Item";
            document.getElementById("saveMenuItemBtn").textContent = "Save Item";
            document.getElementById("itemAvailable").checked = true;

            const formError = document.getElementById("formError");
            formError.textContent = "";
            formError.classList.add("d-none");

            menuItemModal.show();
        }
        function openEditMenuItemModal(item) {
            menuItemForm.reset();

            document.getElementById("menuItemId").value = getItemId(item);
            document.getElementById("itemName").value = getItemName(item);
            document.getElementById("itemDescription").value = getItemDescription(item);
            document.getElementById("itemPrice").value = getItemPrice(item);
            document.getElementById("itemAvailable").checked =
                getItemAvailability(item) === true;

            itemCategory.value = String(getItemCategoryId(item) ?? "");

            document.getElementById("menuItemModalLabel").textContent = "Edit Menu Item";
            document.getElementById("saveMenuItemBtn").textContent = "Update Item";

            const formError = document.getElementById("formError");
            formError.textContent = "";
            formError.classList.add("d-none");

            menuItemModal.show();
        }

        async function deleteMenuItem(item) {
            const itemId = getItemId(item);
            const itemName = getItemName(item);

            const confirmed = window.confirm(
                `Are you sure you want to delete "${itemName}" ?\n\nThis action cannot be undone.`
            );

            if (!confirmed) {
                return;
            }

            clearMessages();

            try {
                await apiRequest(
                    `${ menuApiUrl }/${encodeURIComponent(itemId)}`,
        {
            method: "DELETE"
        }
                );

        await loadMenuData();

        showSuccess(`"${itemName}" was deleted successfully.`);
            } catch (error) {
            showError(
                error.message || "Unable to delete the menu item."
            );
        }
        }

        async function saveMenuItem(event) {
            event.preventDefault();

            const formError = document.getElementById("formError");
            const saveButton = document.getElementById("saveMenuItemBtn");

            formError.classList.add("d-none");
            formError.textContent = "";

            const name = document.getElementById("itemName").value.trim();
            const description = document.getElementById("itemDescription").value.trim();
            const price = Number(document.getElementById("itemPrice").value);
            const categoryId = Number(itemCategory.value);
            const isAvailable = document.getElementById("itemAvailable").checked;

            if (!name) {
                formError.textContent = "Please enter an item name.";
                formError.classList.remove("d-none");
                return;
            }

            if (!Number.isFinite(price) || price <= 0) {
                formError.textContent = "Price must be greater than zero.";
                formError.classList.remove("d-none");
                return;
            }

            if (!categoryId || !categories.some(
                category => Number(getCategoryId(category)) === categoryId
            )) {
                formError.textContent = "Please select a valid category.";
                formError.classList.remove("d-none");
                return;
            }

            const dto = {
                name: name,
                description: description || null,
                price: price,
                categoryId: categoryId,
                isAvailable: isAvailable,
                imagePath: null
            };

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
                const itemId = document.getElementById("menuItemId").value;
                const isEditing = itemId !== "";
                await apiRequest(
                    isEditing
                        ? `${menuApiUrl}/${encodeURIComponent(itemId)}`
                        : menuApiUrl,
                    {
                        method: isEditing ? "PUT" : "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(dto)
                    }
                );
                menuItemModal.hide();
            await loadMenuData();
            showSuccess(
                isEditing
                    ? `"${name}" was updated successfully.`
                    : `"${name}" was added successfully.`
            );
        } catch (error) {
            formError.textContent = error.message || "Unable to save the menu item.";
            formError.classList.remove("d-none");
            console.error("Menu item creation failed:", error);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Item";
        }
                        }

        menuSearch.addEventListener("input", renderMenuItems);
        categoryFilter.addEventListener("change", renderMenuItems);

        document.getElementById("refreshMenuBtn")
            .addEventListener("click", loadMenuData);

        document.getElementById("addMenuItemBtn")
            .addEventListener("click", openAddMenuItemModal);

        menuItemForm.addEventListener("submit", saveMenuItem);

        loadMenuData();