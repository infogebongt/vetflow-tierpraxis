// Zentrale Konfiguration der Tierpraxis-Suite.
// Ohne SUPABASE_URL/KEY läuft alles im Demo-Modus (Daten nur im Browser dieses Geräts).
// Für den Echtbetrieb mit mehreren Geräten: supabase_setup.sql ausführen und hier eintragen.
window.TP_CONFIG = {
  SUPABASE_URL: "https://ecshmnbwifdkwsfnkaff.supabase.co",
  SUPABASE_KEY: "sb_publishable_o38JdPENoSInFPXpXffwWw_BpydzLbt",

  // Achtung: Passwörter im Frontend sind nur ein Sichtschutz, kein echter Zugriffsschutz.
  PASSWORDS: {
    praxis: "Praxis2026",
    team: "Tierarzt2026"
  },

  PRACTICE: {
    name: "VetFlow Tierpraxis",
    address: "Musterstrasse 12 | 8000 Zürich",
    uid: "CHE-123.456.789 MWST",
    phone: "+41 44 000 00 00"
  },

  VAT_RATE: 0.081,
  PAYMENT_DAYS: 30
};
