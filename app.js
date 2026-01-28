const LANG_KEY = "ginseng_lang";
const FIREBASE_DB_URL = "https://rote-ginseng-vn-default-rtdb.europe-west1.firebasedatabase.app";

function $(id) { return document.getElementById(id); }

// ===== 1) LANGUAGE =====
function getLang() {
  return localStorage.getItem(LANG_KEY) || "de";
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

function t(obj) {
  const l = getLang();
  return obj[l] || obj.en || obj.vi || "";
}

function renderI18n() {
  document.querySelectorAll("[data-vi]").forEach(el => {
    const l = getLang();
    if (l === "vi") el.textContent = el.dataset.vi;
    else if (l === "en") el.textContent = el.dataset.en;
    else el.textContent = el.dataset.de;
  });
}

// Flexible: works on pages with 2 or 3 buttons
function initLangButtons() {
  const btnMap = { vi: $("btnVi"), en: $("btnEn"), de: $("btnDe") };
  const available = Object.entries(btnMap).filter(([, el]) => !!el);

  if (available.length === 0) return;

  const paint = () => {
    available.forEach(([k, el]) => el.classList.toggle("active", getLang() === k));
    renderI18n();
  };

  available.forEach(([k, el]) => {
    el.onclick = () => { setLang(k); paint(); };
  });

  // If stored lang doesn't exist on this page, fallback to first available
  const current = getLang();
  if (!available.some(([k]) => k === current)) setLang(available[0][0]);

  paint();
}

// ===== 2) FORM =====
function setScale(scaleName, value) {
  const hidden = document.querySelector(`input[type="hidden"][name="${scaleName}"]`);
  if (!hidden) return;

  hidden.value = String(value);

  document.querySelectorAll(`button.dot[data-scale="${scaleName}"]`).forEach(btn => {
    const active = btn.dataset.value === String(value);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function collectForm(formEl) {
  const data = {
    role: $("role")?.value || "not_set",
    city: $("city")?.value || "not_set"
  };

  formEl.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.name) return;

    if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
      return;
    }

    data[el.name] = el.value || "";
  });

  return data;
}

// ===== 3) VALIDATION =====
function firstMissingHiddenScale(formEl, names) {
  for (const n of names) {
    const el = formEl.querySelector(`input[type="hidden"][name="${n}"]`);
    if (el && !el.value) return n;
  }
  return null;
}

function scrollToScale(scaleName) {
  const block = document.querySelector(`[data-qscale="${scaleName}"]`);
  if (block && typeof block.scrollIntoView === "function") {
    block.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ===== 4) HELPERS =====
function keepParams() {
  const params = new URLSearchParams(window.location.search);
  return params.toString();
}

async function copyToClipboard(text) {
  const str = String(text || "");
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = str;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch (e2) {
      return false;
    }
  }
}

// ===== 5) STORAGE =====
function uuid() {
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

async function saveResponse(payload) {
  const url = `${FIREBASE_DB_URL}/ginseng_pilot_responses.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Firebase save failed");
  return res.json();
}

// ===== 6) PAGE WIRING (one motor for all pages) =====
function wireScaleButtons() {
  document.querySelectorAll("button.dot[data-scale]").forEach(btn => {
    btn.addEventListener("click", () => {
      setScale(btn.dataset.scale, btn.dataset.value);
    });
  });
}

function wireSurveyForm() {
  const form = $("surveyForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const missing = firstMissingHiddenScale(form, ["q6_tooCheap", "q7_goodValue", "q8_expOk", "q9_tooExp"]);
    if (missing) {
      scrollToScale(missing);
      alert(t({
        de: "Bitte beantworte auch die Preis-Fragen (Q6–Q9) mit 1–5.",
        vi: "Vui lòng trả lời các câu về giá (Q6–Q9) bằng thang 1–5.",
        en: "Please answer the price questions (Q6–Q9) using 1–5."
      }));
      return;
    }

    const data = collectForm(form);
    const now = new Date();

    const payload = {
      id: uuid(),
      ts_utc: now.toISOString(),
      ts_local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: getLang(),
      answers: data
    };

    try {
      await saveResponse(payload);
      window.location.href = "thanks.html";
    } catch (err) {
      console.error(err);
      alert(t({
        de: "Fehler beim Speichern. Bitte erneut versuchen.",
        vi: "Lưu dữ liệu thất bại. Vui lòng thử lại.",
        en: "Saving failed. Please try again."
      }));
    }
  });
}

function wireStartAndBackLinks() {
  const qp = keepParams();
  const startBtn = $("startBtn");
  if (startBtn) startBtn.href = qp ? ("survey.html?" + qp) : "survey.html";

  const backBtn = $("backBtn");
  if (backBtn) backBtn.href = qp ? ("index.html?" + qp) : "index.html";
}

function wireThanksCopy() {
  const copyBtn = $("copyBtn");
  const voucherEl = $("voucher");
  if (!copyBtn || !voucherEl) return;

  copyBtn.addEventListener("click", async () => {
    await copyToClipboard(voucherEl.textContent || "");
    alert(t({ de: "Kopiert!", vi: "Đã sao chép!", en: "Copied!" }));
  });
}

// ===== 7) MOTOR =====
window.addEventListener("DOMContentLoaded", () => {
  initLangButtons();      // includes renderI18n()
  wireStartAndBackLinks();
  wireScaleButtons();
  wireSurveyForm();
  wireThanksCopy();
});

// Export for optional HTML calls
window.Ginseng = {
  // language
  getLang, setLang, initLangButtons, renderI18n, t,
  // form
  setScale, collectForm,
  // storage
  saveResponse, uuid,
  // helpers
  keepParams, copyToClipboard
};
