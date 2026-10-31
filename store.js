// Gemeinsame Datenschicht: Supabase (live) oder localStorage (Demo-Modus).
(function () {
  const C = window.TP_CONFIG;
  const live = !!(C.SUPABASE_URL && C.SUPABASE_KEY && window.supabase);
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

    subscribe(table, cb) {
      (listeners[table] = listeners[table] || []).push(cb);
      if (live) {
        sb.channel('tp:' + table + ':' + Math.random().toString(36).slice(2))
          .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
          .subscribe();
      }
    }
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (Math.round(n * 100) / 100).toFixed(2);

  function calcInvoice({ hours = 0, rate = 0, mat = 0, fee = 0 }) {
    const labor = hours * rate;
    const netto = labor + mat + fee;
    const vat = netto * C.VAT_RATE;
    return { labor, mat, fee, netto, vat, brutto: netto + vat };
  }

  window.TP = { store, esc, money, calcInvoice, C };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
