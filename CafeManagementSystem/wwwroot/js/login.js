const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginError.classList.add("d-none");
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const response = await fetch(
            "https://localhost:7159/api/Auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: document.getElementById("email").value.trim(),
                    password: document.getElementById("password").value
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                response.status === 401
                    ? "Invalid email or password."
                    : "Unable to sign in. Please try again."
            );
        }

        const result = await response.json();

        if (!result.token) {
            throw new Error("The server did not return an authentication token.");
        }

        if (!Array.isArray(result.roles) ||
            !result.roles.some(role =>
                ["Admin", "Manager"].includes(role))) {
            throw new Error(
                "Your account does not have permission to access the dashboard."
            );
        }

        sessionStorage.setItem("cafeJwtToken", result.token);
        sessionStorage.setItem("cafeUserEmail", result.email);
        sessionStorage.setItem("cafeUserName", result.fullName || result.email);
        sessionStorage.setItem("cafeUserRoles", JSON.stringify(result.roles));

        window.location.href = "/Dashboard/Index";
    }
    catch (error) {
        loginError.textContent = error.message;
        loginError.classList.remove("d-none");
    }
    finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});