const LANG_KEY = "ginseng_lang";

function getLang() {
  return localStorage.getItem(LANG_KEY) || "vi";
}
function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}
function $(id){ return document.getElementById(id); }

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

function qs() {
  return new URLSearchParams(window.location.search);
}
function keepParams(extra = {}) {
  const p = qs();
  Object.entries(extra).forEach(([k,v]) => p.set(k, v));
  return p.toString();
}

window.Ginseng = { initLangButtons, renderI18n, keepParams };
