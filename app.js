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

  const current = getLang();
  if (!available.some(([k]) => k === current)) setLang(available[0][0]);

  paint();
}

// ===== 2) FORM HELPERS =====
function updateReasonsVisibility(repValue) {
  const block = $("q16_block");
  if (!block) return;

  const v = Number(repValue || 0);
  const shouldShow = v > 0 && v <= 3;

  block.style.display = shouldShow ? "" : "none";

  if (!shouldShow) {
    // Clear reasons & other text
    block.querySelectorAll('input[type="checkbox"][name="q16_reason"]').forEach(cb => { cb.checked = false; });
    const otherChk = $("q16_otherChk");
    const otherTxt = $("q16_otherText");
    if (otherChk) otherChk.checked = false;
    if (otherTxt) {
      otherTxt.value = "";
      otherTxt.style.display = "none";
    }
  }
}

function setScale(scaleName, value) {
  const hidden = document.querySelector(`input[type="hidden"][name="${scaleName}"]`);
  if (!hidden) return;

  hidden.value = String(value);

  document.querySelectorAll(`button.dot[data-scale="${scaleName}"]`).forEach(btn => {
    const active = btn.dataset.value === String(value);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (scaleName === "q15_repurchase") {
    updateReasonsVisibility(value);
  }
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

    if (el.type === "checkbox") {
      if (!data[el.name]) data[el.name] = [];
      if (el.checked) data[el.name].push(el.value);
      return;
    }

    data[el.name] = el.value || "";
  });

  const otherChk = $("q16_otherChk");
  const otherTxt = $("q16_otherText");
  if (otherChk && otherTxt && !otherChk.checked) {
    data.q16_otherText = "";
  }

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
function applyLangFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang === "de" || lang === "vi" || lang === "en") setLang(lang);
}

async function copyToClipboard(text) {
  const str = String(text || "");
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch (_) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch (_) {
    return false;
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

// ===== 6) PAGE WIRING =====
function wireScaleButtons() {
  document.querySelectorAll("button.dot[data-scale]").forEach(btn => {
    btn.addEventListener("click", () => {
      setScale(btn.dataset.scale, btn.dataset.value);
    });
  });
}

function wireOtherReasonToggle() {
  const otherChk = $("q16_otherChk");
  const otherTxt = $("q16_otherText");
  if (!otherChk || !otherTxt) return;

  const sync = () => {
    otherTxt.style.display = otherChk.checked ? "" : "none";
    if (!otherChk.checked) otherTxt.value = "";
  };

  otherChk.addEventListener("change", sync);
  sync();
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

    // Validate all hidden scales (NEW + existing)
    const missing = firstMissingHiddenScale(form, [
      "q2b_mouthfeel",
      "q6_tooCheap", "q7_goodValue", "q8_expOk", "q9_tooExp",
      "q15_repurchase",
      "q14_spend"
    ]);

    if (missing) {
      scrollToScale(missing);
      alert(t({
        de: "Bitte beantworte auch die Skalen-Fragen (1–5 bzw. 1–4).",
        vi: "Vui lòng trả lời các câu thang điểm (1–5 hoặc 1–4).",
        en: "Please answer the scale questions (1–5 or 1–4)."
      }));
      return;
    }

    // If repurchase low (1-3), require at least one reason
    const rep = Number(form.querySelector('input[type="hidden"][name="q15_repurchase"]')?.value || 0);
    if (rep > 0 && rep <= 3) {
      const anyReason = Array.from(form.querySelectorAll('input[type="checkbox"][name="q16_reason"]'))
        .some(cb => cb.checked);

      if (!anyReason) {
        const block = $("q16_block");
        if (block) block.scrollIntoView({ behavior: "smooth", block: "center" });
        alert(t({
          de: "Bitte wähle mindestens einen Grund aus (D2).",
          vi: "Vui lòng chọn ít nhất 1 lý do (D2).",
          en: "Please select at least one reason (D2)."
        }));
        return;
      }
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
      const lang = getLang();
      window.location.href = `thanks.html?lang=${encodeURIComponent(lang)}`;
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

function wireThanksCopyAndAutoBack() {
  const copyBtn = $("copyBtn");
  const voucherEl = $("voucher");
  const hint = $("copyHint");
  const backBtn = $("backBtn");

  if (!voucherEl || !backBtn) return;

  const lang = getLang();
  backBtn.href = `survey.html?lang=${encodeURIComponent(lang)}`;

  if (copyBtn && voucherEl) {
    copyBtn.addEventListener("click", async () => {
      const ok = await copyToClipboard(voucherEl.textContent || "");
      if (hint) {
        hint.textContent = ok
          ? t({ de: "Kopiert.", vi: "Đã sao chép.", en: "Copied." })
          : t({ de: "Konnte nicht kopieren.", vi: "Không thể sao chép.", en: "Could not copy." });
      }
    });
  }

  setTimeout(() => {
    window.location.href = `survey.html?lang=${encodeURIComponent(lang)}`;
  }, 2500);
}

// ===== 7) MOTOR =====
window.addEventListener("DOMContentLoaded", () => {
  applyLangFromUrl();
  initLangButtons();
  wireScaleButtons();
  wireOtherReasonToggle();

  // ensure reasons hidden initially
  updateReasonsVisibility(0);

  wireSurveyForm();
  wireThanksCopyAndAutoBack();
});

// Export (optional)
window.Ginseng = {
  getLang, setLang, initLangButtons, renderI18n, t,
  setScale, collectForm,
  saveResponse, uuid,
  copyToClipboard, applyLangFromUrl
};
