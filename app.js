const LANG_KEY = "ginseng_lang";

// ===== Language =====
function getLang() {
  return localStorage.getItem(LANG_KEY) || "vi";
}
function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}
function $(id) { return document.getElementById(id); }

function t(obj) {
  // obj = {vi:"...", en:"..."}
  return getLang() === "vi" ? (obj.vi || "") : (obj.en || "");
}

function renderI18n() {
  document.querySelectorAll("[data-vi]").forEach(el => {
    el.textContent = getLang() === "vi" ? el.dataset.vi : el.dataset.en;
  });
}

function initLangButtons() {
  const viBtn = $("btnVi");
  const enBtn = $("btnEn");
  if (!viBtn || !enBtn) return;

  const paint = () => {
    viBtn.classList.toggle("active", getLang() === "vi");
    enBtn.classList.toggle("active", getLang() === "en");
    renderI18n();
  };

  viBtn.onclick = () => { setLang("vi"); paint(); };
  enBtn.onclick = () => { setLang("en"); paint(); };
  paint();
}

// ===== URL params =====
function qs() {
  return new URLSearchParams(window.location.search);
}
function keepParams(extra = {}) {
  const p = qs();
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}

// ===== Utils =====
function uuid() {
  // simple UUID (good enough for pilot)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ===== Likert scale buttons (dots) =====
function setScale(scaleName, value) {
  // scaleName is the hidden input name (e.g., q6_tooCheap)
  const hidden = document.querySelector(`input[type="hidden"][name="${scaleName}"]`);
  if (!hidden) return;

  hidden.value = value;

  // visual active dot
  document.querySelectorAll(`button.dot[data-scale="${scaleName}"]`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === String(value));
  });
}

// ===== Form collection =====
function collectForm(formEl = document.getElementById("surveyForm")) {
  const data = {};

  // Include Role/City (optional)
  const role = document.getElementById("role")?.value || "";
  const city = document.getElementById("city")?.value || "";
  if (role) data.role = role;
  if (city) data.city = city;

  if (!formEl) return data;

  // collect all inputs/selects/textarea
  const els = formEl.querySelectorAll("input, select, textarea");

  els.forEach(el => {
    if (!el.name) return;

    if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
      return;
    }

    if (el.type === "checkbox") {
      if (!data[el.name]) data[el.name] = [];
      if (el.checked) data[el.name].push(el.value);
      return;
    }

    // hidden / text / select / textarea
    data[el.name] = el.value ?? "";
  });

  return data;
}

// ===== Saving =====
// 1) Set this when ready (Realtime DB URL without trailing slash)
const FIREBASE_DB_URL = ""; // e.g. "https://xxxx.europe-west1.firebasedatabase.app"
const FIREBASE_PATH = "ginseng_pilot_responses";

async function saveResponse(payload) {
  // If Firebase not configured yet, store locally as backup
  if (!FIREBASE_DB_URL) {
    const key = "ginseng_pilot_local";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr));
    return { local: true };
  }

  const url = `${FIREBASE_DB_URL}/${FIREBASE_PATH}.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firebase save failed: ${res.status} ${txt}`);
  }

  return await res.json(); // contains { name: "<pushId>" }
}

window.Ginseng = {
  // i18n
  initLangButtons,
  renderI18n,
  t,
  // url
  keepParams,
  // form & scale
  collectForm,
  setScale,
  // utils
  uuid,
  copyToClipboard,
  // saving
  saveResponse
};
