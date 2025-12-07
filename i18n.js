const translations = {
  en: { home_title: "Discover Cultural Events", chat: "Event Chat", poll: "Poll" },
  tr: { home_title: "Kültürel Etkinlikleri Keşfet", chat: "Etkinlik Sohbeti", poll: "Anket" },
  fr: { home_title: "Découvrez des événements culturels", chat: "Chat d'Événement", poll: "Sondage" }
};

function applyI18n() {
  const lang = localStorage.getItem('culturhub.lang') || navigator.language.slice(0,2);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = translations[lang]?.[key] || translations['en'][key] || key;
  });
}
document.addEventListener('DOMContentLoaded', applyI18n);