// Site animations and functions

function toggleCollapse(id) {
    const content = document.getElementById(id);
    if (content.style.display === "block") {
        content.style.display = "none";
    } else {
        content.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Keep this file focused on animations (like collapsing sections or other UI behaviors)
});