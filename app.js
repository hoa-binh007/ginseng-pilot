const LANG_KEY = "ginseng_lang";

// ===== 1. SPRACH-LOGIK =====
function getLang() { 
  return localStorage.getItem(LANG_KEY) || "de"; 
}

function setLang(lang) { 
  localStorage.setItem(LANG_KEY, lang); 
}

function $(id) { return document.getElementById(id); }

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

function initLangButtons() {
  const btns = { vi: $("btnVi"), en: $("btnEn"), de: $("btnDe") };
  if (!btns.vi || !btns.en || !btns.de) return;

  const paint = () => {
    Object.keys(btns).forEach(k => {
      btns[k].classList.toggle("active", getLang() === k);
    });
    renderI18n();
  };

  Object.keys(btns).forEach(k => {
    btns[k].onclick = () => { setLang(k); paint(); };
  });
  paint();
}

// ===== 2. FORMULAR-LOGIK =====
function setScale(scaleName, value) {
  const hidden = document.querySelector(`input[type="hidden"][name="${scaleName}"]`);
  if (!hidden) return;
  hidden.value = value;
  document.querySelectorAll(`button.dot[data-scale="${scaleName}"]`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === String(value));
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
    } else { 
      data[el.name] = el.value || ""; 
    }
  });
  return data;
}

// ===== 3. DATENSPEICHERUNG (FIREBASE) =====
const FIREBASE_DB_URL = "https://rote-ginseng-vn-default-rtdb.europe-west1.firebasedatabase.app";

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

// ===== 4. EVENT LISTENER (DER MOTOR) =====
window.addEventListener("DOMContentLoaded", () => {
  initLangButtons();
  
  const form = $("surveyForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const data = collectForm(form);
      const now = new Date();
      
      const payload = {
        id: Math.random().toString(36).substr(2, 9),
        ts_utc: now.toISOString(),
        ts_local: now.toLocaleString(), // Lokale Zeit (Vietnam, Deutschland, etc.)
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Zeitzonen-Name
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

  // Skalen-Buttons (Dots) aktivieren
  document.querySelectorAll("button.dot[data-scale]").forEach(btn => {
    btn.addEventListener("click", () => {
      setScale(btn.dataset.scale, btn.dataset.value);
    });
  });
});

// Globale Funktionen für HTML-Zugriff
window.Ginseng = { setScale, collectForm, saveResponse, t };
