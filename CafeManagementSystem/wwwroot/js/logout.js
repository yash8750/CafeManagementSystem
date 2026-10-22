function logout() {
    // Clear the current user's authentication information.
    sessionStorage.removeItem("cafeJwtToken");
    sessionStorage.removeItem("cafeUserEmail");
    sessionStorage.removeItem("cafeUserName");
    sessionStorage.removeItem("cafeUserRoles");

    // Redirect to the login page.
    window.location.href = "/Account/Login";
}