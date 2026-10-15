/**
 * Hub theme system — dark (authored default), light, or follow-OS.
 *
 * - Tokens live in src/css/base.css under :root (dark) and
 *   :root[data-theme="light"] (+ prefers-color-scheme media query).
 * - Every page head ships a 3-line pre-paint inline script that sets
 *   <html data-theme> before paint (module scripts are deferred).
 * - This module owns runtime switching: localStorage.hubTheme persists an
 *   explicit choice ('dark' | 'light'); absent = follow the OS.
 * - One-time migration: legacy scanMatchTheme (Scan Match's old private key)
 *   becomes the hub choice, then the old key is removed.
 * - theme-color meta is managed here (a single element, created if absent).
 * - A floating sun/moon toggle is injected on pages that don't ship their own
 *   switch (Scan Match's #themeToggleInput is wired instead).
 *
 * Call initTheme() unconditionally from scripts.js on every page.
 */
import '../../css/toggleSwitch.css';

const KEY = 'hubTheme';
const LEGACY_KEY = 'scanMatchTheme';
const LIGHT_BG = '#f5f5f7';
const DARK_BG = '#121212';

const lightMedia = window.matchMedia('(prefers-color-scheme: light)');

function readSetting() {
    try {
        return localStorage.getItem(KEY); // null | 'dark' | 'light' | 'system'
    } catch (err) {
        return null;
    }
}

/** The theme currently in effect: explicit choice, else the OS. */
export function getTheme() {
    const setting = readSetting();
    if (setting === 'dark' || setting === 'light') return setting;
    return lightMedia.matches ? 'light' : 'dark';
}

/** The stored setting ('system' when nothing explicit is stored). */
export function getSetting() {
    const setting = readSetting();
    return setting === 'dark' || setting === 'light' || setting === 'system' ? setting : 'system';
}

/** Switch explicitly ('dark' | 'light' | 'system' — system clears the choice). */
export function setTheme(setting) {
    try {
        if (setting === 'system') localStorage.removeItem(KEY);
        else if (setting === 'dark' || setting === 'light') localStorage.setItem(KEY, setting);
    } catch (err) { /* storage unavailable */ }
    apply();
}

function apply() {
    const theme = getTheme();
    document.documentElement.dataset.theme = theme;

    let meta = document.querySelector('meta[name="theme-color"][data-hub]');
    if (!meta) meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.dataset.hub = '1';
        document.head.appendChild(meta);
    }
    meta.content = theme === 'light' ? LIGHT_BG : DARK_BG;

    document
        .querySelectorAll('.switch.theme-switch input')
        .forEach((input) => {
            input.checked = theme === 'dark';
        });
}

function migrate() {
    try {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy && !localStorage.getItem(KEY)) {
            localStorage.setItem(KEY, legacy);
        }
        if (legacy) localStorage.removeItem(LEGACY_KEY);
    } catch (err) { /* storage unavailable */ }
}

/** Build a sun/moon switch and append it to the given container. */
export function renderThemeToggle(container) {
    const label = document.createElement('label');
    label.className = 'switch theme-switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('aria-label', 'Toggle dark theme');
    input.checked = getTheme() === 'dark';
    const slider = document.createElement('span');
    slider.className = 'slider round';
    label.appendChild(input);
    label.appendChild(slider);
    input.addEventListener('change', () => {
        setTheme(input.checked ? 'dark' : 'light');
    });
    container.appendChild(label);
    return label;
}

/**
 * Initialize: migrate legacy key, apply theme, reflect OS changes when the
 * user hasn't chosen, and make sure every page has a toggle (inject a
 * floating one unless the page ships its own #themeToggleInput).
 */
export function initTheme() {
    migrate();
    apply();
    lightMedia.addEventListener('change', () => {
        if (getSetting() === 'system') apply();
    });

    const pageSwitch = document.getElementById('themeToggleInput');
    if (pageSwitch) {
        pageSwitch.checked = getTheme() === 'dark';
        pageSwitch.addEventListener('change', () => {
            setTheme(pageSwitch.checked ? 'dark' : 'light');
        });
        return;
    }

    renderThemeToggle(document.body).classList.add('hub-theme-toggle');
}
