// Gemeinsame Datenschicht: Supabase (live) oder localStorage (Demo-Modus).
(function () {
  const C = window.TP_CONFIG;

  // Demo-Modus für Interessenten: ?demo=1 → Beispieldaten nur im eigenen Browser, ohne Anmeldung, nie die Live-Datenbank.
  if (new URLSearchParams(location.search).get('demo') === '1') sessionStorage.setItem('tp_demo', '1');
  const demo = sessionStorage.getItem('tp_demo') === '1';
  const live = !demo && !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);
  const sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY) : null;
  const listeners = {};

  const lget = t => { try { return JSON.parse(localStorage.getItem('tp_data_' + t)) || []; } catch (e) { return []; } };
  const lset = (t, rows) => localStorage.setItem('tp_data_' + t, JSON.stringify(rows));
  const emit = t => (listeners[t] || []).forEach(cb => cb());

  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith('tp_data_')) emit(e.key.slice(8));
  });

  const store = {
    live,

    async list(table, opts = {}) {
      if (live) {
        let q = sb.from(table).select('*');
        if (opts.ids) q = q.in('id', opts.ids);
        q = table === 'tickets' ? q.order('created_at', { ascending: false }) : q.order('id', { ascending: true });
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return data || [];
      }
      let rows = lget(table);
      if (opts.ids) rows = rows.filter(r => opts.ids.includes(r.id));
      return table === 'tickets' ? rows.sort((a, b) => b.id - a.id) : rows.sort((a, b) => a.id - b.id);
    },

    async insert(table, row) {
      if (live) {
        const { data, error } = await sb.from(table).insert([row]).select();
        if (error) throw new Error(error.message);
        return data[0];
      }
      const rows = lget(table);
      const full = Object.assign({ id: rows.reduce((m, r) => Math.max(m, r.id), 0) + 1, created_at: new Date().toISOString() }, row);
      rows.push(full);
      lset(table, rows);
      emit(table);
      return full;
    },

    async update(table, id, patch) {
      if (live) {
        const { error } = await sb.from(table).update(patch).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      lset(table, lget(table).map(r => r.id === id ? Object.assign({}, r, patch) : r));
      emit(table);
    },

    async remove(table, id) {
      if (live) {
        const { error } = await sb.from(table).delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      lset(table, lget(table).filter(r => r.id !== id));
      emit(table);
    },

    // Tierhalter-Portal: nur über Funktionen, kein Tabellenzugriff. token = geheimer Schlüssel pro Anfrage.
    async submitTicket(t) {
      if (live) {
        const { data, error } = await sb.rpc('submit_ticket', {
          p_customer_name: t.customer_name, p_email: t.email, p_phone: t.phone, p_address: t.address,
          p_patient_name: t.patient_name, p_species: t.species, p_complaint: t.complaint, p_urgency: t.urgency
        });
        if (error) throw new Error(error.message);
        return { id: data[0].ticket_id, token: data[0].token };
      }
      const row = await store.insert('tickets', Object.assign({ status: 'Neu' }, t));
      return { id: row.id, token: String(row.id) };
    },

    async myTickets(tokens) {
      if (!tokens.length) return [];
      if (live) {
        const { data, error } = await sb.rpc('my_tickets', { p_tokens: tokens });
        if (error) throw new Error(error.message);
        return data || [];
      }
      return store.list('tickets', { ids: tokens.map(Number) });
    },

    subscribe(table, cb) {
      (listeners[table] = listeners[table] || []).push(cb);
      if (live) {
        sb.channel('tp:' + table + ':' + Math.random().toString(36).slice(2))
          .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
          .subscribe();
      }
    }
  };

  function seedDemo() {
    if (!demo || localStorage.getItem('tp_demo_seeded')) return;
    const now = new Date().toISOString();
    const done = { vet: 'Dr. Anna Keller', hours: 0.5, rate: 180, diagnosis: 'Gesund, Impfung aufgefrischt', treatment: 'Jahresimpfung, Allgemeinuntersuchung',
      materialDesc: 'Impfstoff', labor: '90.00', mat: '35.00', fee: '0.00', netto: '125.00', vat: '10.13', brutto: '135.13', date: new Date().toLocaleDateString('de-CH') };
    lset('team', [
      { id: 1, created_at: now, name: 'Dr. Anna Keller', category: 'Leitung', role: 'Praxisleitung', rate: 180, phone: '+41 79 111 22 33', status: 'Bereit' },
      { id: 2, created_at: now, name: 'Dr. Marco Weber', category: 'Tierarzt', role: 'Tierarzt/Tierärztin', rate: 150, phone: '+41 79 222 33 44', status: 'Unterwegs' },
      { id: 3, created_at: now, name: 'Sandra Meier', category: 'TFA', role: 'Tiermed. Praxisassistenz', rate: 75, phone: '+41 79 333 44 55', status: 'Bereit' }
    ]);
    lset('customers', [
      { id: 1, created_at: now, name: 'Markus Weber', email: 'markus.weber@example.ch', phone: '+41 79 987 65 43', address: 'Bahnhofstr. 12, 8001 Zürich', animals: 'Bello (Hund, Labrador)', notes: 'Stammkunde seit 2023' },
      { id: 2, created_at: now, name: 'Stefan Fischer', email: 'stefan.fischer@example.ch', phone: '+41 78 555 44 33', address: 'Hauptstr. 88, 5400 Baden', animals: 'Minka (Katze); Felix (Katze)', notes: 'Wohnungskatzen, Transportbox nötig' }
    ]);
    lset('tickets', [
      { id: 1, created_at: now, customer_name: 'Markus Weber', email: 'markus.weber@example.ch', phone: '+41 79 987 65 43', address: 'Bahnhofstr. 12, 8001 Zürich', patient_name: 'Bello', species: 'Hund', complaint: 'Hat Schokolade gefressen, erbricht seit 1 Stunde', urgency: 'Notfall', status: 'Neu', vet: null, report: null },
      { id: 2, created_at: now, customer_name: 'Stefan Fischer', email: 'stefan.fischer@example.ch', phone: '+41 78 555 44 33', address: 'Hauptstr. 88, 5400 Baden', patient_name: 'Minka', species: 'Katze', complaint: 'Humpelt seit gestern, Pfote geschwollen', urgency: 'Dringend', status: 'In Bearbeitung', vet: 'Dr. Marco Weber', report: null },
      { id: 3, created_at: now, customer_name: 'Lea Frei', email: 'lea.frei@example.ch', phone: '+41 76 123 45 67', address: 'Seestrasse 5, 8700 Küsnacht', patient_name: 'Rex', species: 'Hund', complaint: 'Jährliche Impfung', urgency: 'Normal', status: 'Abgeschlossen & Verrechnet', vet: 'Dr. Anna Keller', report: done }
    ]);
    localStorage.setItem('tp_demo_seeded', '1');
  }
  seedDemo();

  function demoBar() {
    if (!demo) return;
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;background:#10201e;color:#fff8ef;font:600 12px Inter,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;gap:12px;align-items:center;white-space:nowrap;max-width:94vw';
    bar.innerHTML = '<span>🐾 Demo mit Beispieldaten</span><a href="apps.html" style="color:#2dd4bf">Alle Apps</a><a href="#" id="tp-demo-reset" style="color:#ff6b57">Zurücksetzen</a><a href="index.html" id="tp-demo-exit" style="color:#fff8ef;opacity:.7">Beenden</a>';
    document.body.appendChild(bar);
    document.getElementById('tp-demo-reset').onclick = e => {
      e.preventDefault();
      ['tickets', 'team', 'customers'].forEach(t => localStorage.removeItem('tp_data_' + t));
      localStorage.removeItem('tp_demo_seeded'); localStorage.removeItem('tp_my_tokens');
      location.reload();
    };
    document.getElementById('tp-demo-exit').onclick = () => sessionStorage.removeItem('tp_demo');
  }
  document.addEventListener('DOMContentLoaded', demoBar);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Math.round(n * 100) / 100).toFixed(2);

  function calcInvoice({ hours = 0, rate = 0, mat = 0, fee = 0 }) {
    const labor = hours * rate;
    const netto = labor + mat + fee;
    const vat = netto * C.VAT_RATE;
    return { labor, mat, fee, netto, vat, brutto: netto + vat };
  }

  // Anmeldung: live = Supabase Auth (E-Mail + Passwort, Rolle aus Tabelle staff); Demo = Passwort aus config.js
  const auth = {
    live, demo,
    async role() {
      if (demo) return 'praxis';
      if (!live) return sessionStorage.getItem('tp_demo_role');
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const r = await sb.rpc('my_role');
      return r.error ? null : r.data;
    },
    async login(email, pw, allowed) {
      if (!live) {
        const role = pw === C.PASSWORDS.praxis ? 'praxis' : (pw === C.PASSWORDS.team ? 'team' : null);
        if (!role || !allowed.includes(role)) return { ok: false, error: 'Falsches Passwort!' };
        sessionStorage.setItem('tp_demo_role', role);
        return { ok: true, role };
      }
      const { error } = await sb.auth.signInWithPassword({ email: (email || '').trim(), password: pw });
      if (error) return { ok: false, error: 'E-Mail oder Passwort falsch.' };
      const role = await auth.role();
      if (!role || !allowed.includes(role)) {
        await sb.auth.signOut();
        return { ok: false, error: 'Dieses Konto hat keinen Zugriff auf diesen Bereich.' };
      }
      return { ok: true, role };
    },
    async resume(allowed) {
      const role = await auth.role();
      return !!role && allowed.includes(role);
    },
    async logout() {
      sessionStorage.removeItem('tp_demo_role');
      if (demo) { sessionStorage.removeItem('tp_demo'); location.href = 'index.html'; return; }
      if (live) await sb.auth.signOut();
      location.reload();
    }
  };

  window.TP = { store, auth, esc, money, calcInvoice, C };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
