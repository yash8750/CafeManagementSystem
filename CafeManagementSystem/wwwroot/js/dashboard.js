document.addEventListener("DOMContentLoaded", function () {
    const reportUrl = "https://managecafeapi.runasp.net/api/Reports/dashboard";

    const errorBox = document.getElementById("dashboardError");
    const refreshButton = document.getElementById("refreshDashboard");

    if (!errorBox || !refreshButton) {
        console.error(
            "Dashboard initialization failed: dashboardError or refreshDashboard element is missing."
        );
        return; 
    }

    function formatCurrency(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "Unavailable";
        }

        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        });
    }

    async function loadDashboard() {
        errorBox.classList.add("d-none");
        errorBox.textContent = "";

        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";

        try {
            const token = sessionStorage.getItem("cafeJwtToken");

            if (!token) {
                console.warn(
                    "JWT token not found in sessionStorage. Redirecting to Login."
                );

                window.location.href = "/Account/Login";
                return;
            }

            const response = await fetch(reportUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${ token } `,
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                const responseBody = await response.text();

                console.error("Reports API error:", {
                    status: response.status,
                    statusText: response.statusText,
                    responseBody: responseBody
                });

                if (response.status === 401) {
                    errorBox.textContent =
                        "Authentication failed. Your session may have expired. Please log in again.";

                    errorBox.classList.remove("d-none");

                    // Clear the invalid token only after the API rejects it.
                    sessionStorage.removeItem("cafeJwtToken");

                    return;
                }

                if (response.status === 403) {
                    throw new Error(
                        "Access denied. Your account may not have the required permissions."
                    );
                }

                if (response.status === 404) {
                    throw new Error(
                        "Dashboard Reports API endpoint was not found. Check the API controller route."
                    );
                }

                throw new Error(
                    `Reports API returned HTTP ${ response.status }.`
                );
            }

            const data = await response.json();

            document.getElementById("totalOrders").textContent =
                data.totalOrders ?? 0;

            document.getElementById("completedOrders").textContent =
                data.completedOrders ?? 0;

            document.getElementById("pendingOrders").textContent =
                data.pendingOrders ?? 0;

            document.getElementById("cancelledOrders").textContent =
                data.cancelledOrders ?? 0;

            document.getElementById("totalSales").textContent =
                formatCurrency(data.totalSales);

            document.getElementById("totalRevenue").textContent =
                formatCurrency(data.totalRevenue);

            console.log("Dashboard data loaded successfully.", data);
        }
        catch (error) {
            console.error("Dashboard loading failed:", error);

            errorBox.textContent =
                error.message ||
                "Unable to load dashboard data. Check the API and browser console.";

            errorBox.classList.remove("d-none");
        }
        finally {
            refreshButton.disabled = false;
            refreshButton.textContent = "↻ Refresh";
        }
    }

    refreshButton.addEventListener("click", loadDashboard);

    loadDashboard();
});
