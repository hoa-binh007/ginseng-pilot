const LANG_KEY = "ginseng_lang";

function getLang() { return localStorage.getItem(LANG_KEY) || "de"; }
function setLang(lang) { localStorage.setItem(LANG_KEY, lang); }
function $(id) { return document.getElementById(id); }

function t(obj) {
  const l = getLang();
  return obj[l] || obj.en || "";
}

function renderI18n() {
  document.querySelectorAll("[data-vi]").forEach(el => {
    const l = getLang();
    el.textContent = (l === "vi") ? el.dataset.vi : (l === "en" ? el.dataset.en : el.dataset.de);
  });
}

function initLangButtons() {
  const btns = { vi: $("btnVi"), en: $("btnEn"), de: $("btnDe") };
  if (!btns.vi || !btns.en || !btns.de) return;

  const paint = () => {
    Object.keys(btns).forEach(k => btns[k].classList.toggle("active", getLang() === k));
    renderI18n();
  };

  Object.keys(btns).forEach(k => {
    btns[k].onclick = () => { setLang(k); paint(); };
  });
  paint();
}

function setScale(scaleName, value) {
  const hidden = document.querySelector(`input[type="hidden"][name="${scaleName}"]`);
  if (!hidden) return;
  hidden.value = value;
  document.querySelectorAll(`button.dot[data-scale="${scaleName}"]`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === String(value));
  });
}

function collectForm(formEl) {
  const data = { role: $("role")?.value || "", city: $("city")?.value || "" };
  formEl.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.name) return;
    if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
    else { data[el.name] = el.value || ""; }
  });
  return data;
}

const FIREBASE_DB_URL = "https://rote-ginseng-vn-default-rtdb.europe-west1.firebasedatabase.app";
async function saveResponse(payload) {
  const url = `${FIREBASE_DB_URL}/ginseng_pilot_responses.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

window.Ginseng = { 
  initLangButtons, renderI18n, t, setScale, collectForm, saveResponse, 
  uuid: () => Math.random().toString(36).substr(2, 9), 
  keepParams: () => window.location.search.substring(1) 
};
