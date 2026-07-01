import { toggleCollapse } from '../utils/utils.js';

export default function initCollapsibleSections() {
  document.querySelectorAll(".collapse-button[data-target]").forEach(button => {
    const targetId = button.dataset.target;
    if (!targetId) return;
    button.addEventListener("click", () => toggleCollapse(button, targetId));
    if (button.dataset.defaultOpen === 'true') {
      const targetElement = document.getElementById(targetId);
      if (targetElement) toggleCollapse(button, targetId);
    }
  });
}
