const API_BASE_URL = "https://managecafeapi.runasp.net";
let orderStatusChart;

let isRedirectingToLogin = false;

function getAuthHeaders() {
    const token = sessionStorage.getItem("cafeJwtToken");

    if (!token) {
        isRedirectingToLogin = true;

        window.location.href = "/Account/Login";

        throw new Error("Your session has expired. Redirecting to login.");
    }

    return {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function apiGet(path) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (response.status === 401) {
        sessionStorage.removeItem("cafeJwtToken");

        isRedirectingToLogin = true;

        window.location.href = "/Account/Login";

        throw new Error("Your session is unauthorized. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(
            "You do not have permission to view these reports. " +
            "Please contact your administrator."
        );
    }

    if (!response.ok) {
        let message = `API request failed with HTTP ${response.status}.`;

        try {
            const errorData = await response.json();

            if (errorData.message) {
                message = errorData.message;
            } else if (errorData.title) {
                message = errorData.title;
            }
        } catch {
            // Keep the default HTTP error message.
        }

        throw new Error(message);
    }

    return await response.json();
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? 0;
    }
}

function showError(message) {
    const error = document.getElementById("reportError");

    error.textContent = message;
    error.classList.remove("d-none");
}

function clearError() {
    const error = document.getElementById("reportError");

    error.textContent = "";
    error.classList.add("d-none");
}

async function loadDashboard() {
    const data = await apiGet("/api/Reports/dashboard");

    setText("totalOrders", data.totalOrders);
    setText("completedOrders", data.completedOrders);
    setText("pendingOrders", data.pendingOrders);
    setText("cancelledOrders", data.cancelledOrders);

    setText("totalSales", formatMoney(data.totalSales));
    setText("totalRevenue", formatMoney(data.totalRevenue));

    const chartData = [
        Number(data.completedOrders ?? 0),
        Number(data.pendingOrders ?? 0),
        Number(data.cancelledOrders ?? 0)
    ];

    const chartElement = document.getElementById("orderStatusChart");

    if (orderStatusChart) {
        orderStatusChart.destroy();
    }

    orderStatusChart = new Chart(chartElement, {
        type: "doughnut",

        data: {
            labels: [
                "Completed",
                "Pending",
                "Cancelled"
            ],

            datasets: [{
                data: chartData,
                backgroundColor: [
                    "#198754",
                    "#f0ad4e",
                    "#dc3545"
                ],
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

async function loadDailyReport(date) {
    if (!date) {
        throw new Error("Please select a date.");
    }

    const data = await apiGet(
        `/api/Reports/daily?date=${encodeURIComponent(date)}`
    );

    setText("dailyResultDate", data.date ?? date);
    setText("dailyOrders", data.totalOrders);
    setText("dailyCompleted", data.completedOrders);
    setText("dailyCancelled", data.cancelledOrders);

    setText("dailySales", formatMoney(data.totalSales));
    setText("dailyRevenue", formatMoney(data.totalRevenue));

    document.getElementById("dailyResult")
        .classList.remove("d-none");
}

async function loadMonthlyReport(year, month) {
    if (!year || !month) {
        throw new Error("Please select a month.");
    }

    const data = await apiGet(
        `/api/Reports/monthly?year=${year}&month=${month}`
    );

    setText(
        "monthlyResultDate",
        new Date(year, month - 1, 1).toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric"
            }
        )
    );

    setText("monthlyOrders", data.totalOrders);
    setText("monthlyCompleted", data.completedOrders);
    setText("monthlyCancelled", data.cancelledOrders);

    setText("monthlySales", formatMoney(data.totalSales));
    setText("monthlyRevenue", formatMoney(data.totalRevenue));

    document.getElementById("monthlyResult")
        .classList.remove("d-none");
}

async function loadAllReports() {
    clearError();

    try {
        await loadDashboard();

        if (isRedirectingToLogin) {
            return;
        }

        const dailyDate =
            document.getElementById("dailyDate").value;

        if (dailyDate) {
            await loadDailyReport(dailyDate);
        }

        const monthlyValue =
            document.getElementById("monthlyDate").value;

        if (monthlyValue) {
            const [year, month] = monthlyValue
                .split("-")
                .map(Number);

            await loadMonthlyReport(year, month);
        }
    } catch (error) {
        if (!isRedirectingToLogin) {
            showError(error.message);
        }
    }
}

document.getElementById("dailyForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        clearError();

        try {
            await loadDailyReport(
                document.getElementById("dailyDate").value
            );
        } catch (error) {
            if (!isRedirectingToLogin) {
                showError(error.message);
            }
        }
    });

document.getElementById("monthlyForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        clearError();

        try {
            const monthlyValue =
                document.getElementById("monthlyDate").value;

            if (!monthlyValue) {
                throw new Error("Please select a month.");
            }

            const [year, month] = monthlyValue
                .split("-")
                .map(Number);

            await loadMonthlyReport(year, month);
        } catch (error) {
            if (!isRedirectingToLogin) {
                showError(error.message);
            }
        }
    });

// Use local date rather than UTC to avoid selecting
// the previous day in some time zones.
const today = new Date();

const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");

document.getElementById("dailyDate").value = localDate;

document.getElementById("monthlyDate").value =
    localDate.substring(0, 7);

loadAllReports();