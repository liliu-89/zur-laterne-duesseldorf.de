function getCookie(name) {
const t = ("; " + document.cookie).split("; " + name + "=");
return t.length === 2 ? t.pop().split(";").shift() : undefined;
}

// Marketing-Skripte nur ein einziges Mal laden
let marketingLoaded = false;

function applyMarketingScripts() {
if (marketingLoaded) return;
marketingLoaded = true;

// Google Fonts (Inter)
if (!document.getElementById("google-fonts-dynamic")) {
    const l = document.createElement("link");
    l.id = "google-fonts-dynamic";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap";
    document.head.appendChild(l);
}

// Google Material Icons
if (!document.getElementById("google-icons-dynamic")) {
    const l2 = document.createElement("link");
    l2.id = "google-icons-dynamic";
    l2.rel = "stylesheet";
    l2.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    document.head.appendChild(l2);
}

// Elfsight Script laden
if (!document.getElementById("elfsight-script")) {
    const s = document.createElement("script");
    s.id = "elfsight-script";
    s.src = "https://static.elfsight.com/platform/platform.js";
    s.defer = true;
    document.body.appendChild(s);
}

// Placeholder ausblenden und Widget zeigen
const ph = document.getElementById("reviews-placeholder");
const wg = document.getElementById("reviews-widget");
if (ph) ph.style.display = "none";
if (wg) wg.style.display = "block";

// Elfsight reinitialisieren
function reinit(i = 1) {
    if (window.ELFSIGHT_APP && typeof window.ELFSIGHT_APP.init === "function") {
    window.ELFSIGHT_APP.init();
    return;
    }
    if (i < 20) setTimeout(() => reinit(i + 1), 150);
}
reinit();
}

document.addEventListener("DOMContentLoaded", function () {
// === 1) Falls Marketing bereits erlaubt war: sofort laden ===
if (getCookie("consent_marketing") === "granted") {
    applyMarketingScripts();
}

// === 2) Buttons des Consent-Banners abgreifen ===
const btnAll = document.getElementById("btn-accept-all");           // "Alle akzeptieren"
const btnSel = document.getElementById("btn-accept-selection");     // "Auswahl speichern"

// --- "Alle akzeptieren": Marketing ist immer true ---
if (btnAll) {
    btnAll.addEventListener("click", function () {
    applyMarketingScripts();
    });
}

// --- "Auswahl speichern": nur laden, wenn Marketing ausgewählt ist ---
if (btnSel) {
    btnSel.addEventListener("click", function () {
    const mktToggle = document.getElementById("toggle-marketing");
    if (mktToggle && mktToggle.checked) {
        applyMarketingScripts();
    }
    });
}
});