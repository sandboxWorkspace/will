export function toggleCollapse(id) {
    const content = document.getElementById(id);
    const currentDisplay = window.getComputedStyle(content).display;

    if (currentDisplay === "none") {
        content.style.display = "block";
    } else {
        content.style.display = "none";
    }
}
