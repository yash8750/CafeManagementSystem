document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleButton = document.getElementById("sidebarToggle");

    if (!sidebar || !toggleButton) {
        return;
    }

    toggleButton.addEventListener("click", function () {
        sidebar.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", function (event) {
        const isMobile = window.innerWidth <= 991;

        if (
            isMobile &&
            !sidebar.contains(event.target) &&
            !toggleButton.contains(event.target)
        ) {
            sidebar.classList.remove("sidebar-open");
        }
    });
});