# VetFlow – Tierpraxis Suite

Umbau des Handwerker-Pakets (CraftAI) für eine Tierarztpraxis. Reine Browser-App, keine Build-Schritte.

| Datei | Zweck | Handwerker-Vorbild |
|---|---|---|
| `index.html` | Startseite / PWA-Installation | Index.html |
| `kunden_app.html` | Tierhalter melden Patienten an (Tier, Art, Dringlichkeit, Symptome) | Kundenportal |
| `tierarzt_app.html` | Team: zugewiesene Fälle, Navi, Anruf, Behandlung dokumentieren | Techniker-App |
| `praxis_dashboard.html` | Fälle zuteilen, Tierhalter-Kartei, Team & Tarife, Rechnungen als PDF | Meister-Dashboard |
| `config.js` | Praxisdaten, Passwörter, MwSt., Supabase-Zugang | – |
| `store.js` | Datenschicht (Supabase oder lokaler Demo-Modus) | – |
| `supabase_setup.sql` | Tabellen für den Live-Betrieb | – |

## Starten

Doppelklick auf `index.html` genügt für den **Demo-Modus** (Daten nur im Browser dieses Geräts, Tabs desselben Browsers synchronisieren sich).
Für Service Worker / App-Installation lokal per Webserver öffnen, z. B. `python -m http.server 8080` im Ordner.

Demo-Passwörter (in `config.js` ändern): Praxis `Praxis2026`, Team `Tierarzt2026`.

## Live-Betrieb (mehrere Geräte)

1. Neues Supabase-Projekt anlegen, `supabase_setup.sql` im SQL-Editor ausführen.
2. `SUPABASE_URL` und `SUPABASE_KEY` (publishable key) in `config.js` eintragen.
3. Ordner auf einen Webserver legen (Netlify, Vercel, GitHub Pages).

## Wichtig

- Passwörter im Frontend und offene `anon`-Policies sind nur ein Sichtschutz. Vor echten Patienten-/Halterdaten: Supabase Auth + restriktive Policies (Datenschutz DSG/DSGVO).
- Die Tarife (TFA 75 / Assistenz 120 / Tierarzt 150 / Leitung 180 CHF/h) sind Beispielwerte, bitte an die Praxis anpassen. MwSt. 8.1 % (CH).
