/* ============================================================
   Supabase adapter.
   Exposes the same small `db` / `assets` API the app already uses with the claude.ai
   runtime (collection().onSnapshot, doc().get/set/delete, assets.upload), but stores
   everything in a Supabase project so ALL visitors share one database and one photo store.
   Plain fetch only (no SDK). Live updates are done by light polling.
   ============================================================ */

export interface SbConfig { supabaseUrl: string; supabaseKey: string }
export interface AuthApi {
  email: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirm: boolean }>;
  signOut(): void;
  signInGoogle(): void;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  recovery: boolean; // true when the visitor arrived from a "reset password" email link
}
export interface SbBackend {
  db: any; assets: any; uid: string | null; isAdmin: boolean; auth: AuthApi;
}

const SESSION_KEY = 'nx_sb_session';
const POLL_MS = 7000;
const BUCKET = 'photos';

interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } }

export function readConfig(): SbConfig | null {
  const c = (window as any).NEWXEN_CONFIG;
  const url = String(c?.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = String(c?.supabaseKey || '').trim();
  if (!/^https:\/\/.+/.test(url) || key.length < 20 || /YOUR[_-]/i.test(url + key)) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

const loadSession = (): Session | null => {
  try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s?.access_token ? s : null; } catch { return null; }
};
const saveSession = (s: Session | null) => {
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
};

export async function createSupabaseBackend(cfg: SbConfig): Promise<SbBackend> {
  const { supabaseUrl: URL_, supabaseKey: KEY } = cfg;
  let session = loadSession();
  let recovery = false;

  // Returning from Google sign-in or a password-reset email: tokens arrive in the URL hash
  try {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const at = h.get('access_token'), rt = h.get('refresh_token');
    if (at && rt) {
      const ur = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${at}` } });
      if (ur.ok) {
        const user = await ur.json();
        session = {
          access_token: at, refresh_token: rt,
          expires_at: Number(h.get('expires_at')) || Math.floor(Date.now() / 1000) + (Number(h.get('expires_in')) || 3600),
          user: { id: user.id, email: user.email }
        };
        saveSession(session);
        recovery = h.get('type') === 'recovery';
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (h.get('error')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  } catch { /* ignore */ }

  const authFetch = async (path: string, body: any) => {
    const r = await fetch(`${URL_}/auth/v1/${path}`, {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.msg || j.error_description || j.message || j.error || 'auth_failed');
    return j;
  };
  const toSession = (j: any): Session => ({
    access_token: j.access_token, refresh_token: j.refresh_token,
    expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user
  });

  const ensureFresh = async () => {
    if (!session) return;
    if (session.expires_at - 60 > Date.now() / 1000) return;
    try {
      session = toSession(await authFetch('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
      saveSession(session);
    } catch { session = null; saveSession(null); }
  };

  const headers = async (extra: Record<string, string> = {}) => {
    await ensureFresh();
    return { apikey: KEY, Authorization: `Bearer ${session?.access_token || KEY}`, ...extra };
  };
  const rest = async (qs: string, init: RequestInit & { extra?: Record<string, string> } = {}) => {
    const r = await fetch(`${URL_}/rest/v1/${qs}`, { ...init, headers: await headers({ 'Content-Type': 'application/json', ...(init.extra || {}) }) });
    if (!r.ok) throw Object.assign(new Error('db_' + r.status), { status: r.status });
    return r;
  };

  /* ---------- tiny cache + polling listeners ---------- */
  const listeners = new Set<() => Promise<void>>();
  const kick = () => { listeners.forEach((l) => { l().catch(() => {}); }); };
  const enc = encodeURIComponent;
  const idOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
  const colOf = (path: string) => path.slice(0, path.lastIndexOf('/'));

  const watch = (fetcher: () => Promise<any>, cb: (v: any) => void, onErr: (e: any) => void) => {
    let dead = false, last = '', failed = false;
    const run = async () => {
      if (dead) return;
      try {
        const v = await fetcher();
        const sig = JSON.stringify(v.sig);
        if (dead) return;
        if (sig !== last || failed) { last = sig; failed = false; cb(v.out); }
      } catch (e) {
        if (!dead && !failed) { failed = true; onErr(e); }
      }
    };
    listeners.add(run);
    run();
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') run(); }, POLL_MS);
    return () => { dead = true; clearInterval(timer); listeners.delete(run); };
  };

  const docSnap = (path: string, row: any) => ({
    id: idOf(path), exists: !!row, data: () => (row ? row.data : undefined)
  });

  const docRef = (path: string) => ({
    async get() {
      const r = await rest(`kv?path=eq.${enc(path)}&select=path,data`);
      const rows = await r.json();
      return docSnap(path, rows[0]);
    },
    async set(data: any) {
      await rest('kv?on_conflict=path', {
        method: 'POST', body: JSON.stringify({ path, data }), extra: { Prefer: 'resolution=merge-duplicates,return=minimal' }
      });
      kick();
    },
    async delete() {
      await rest(`kv?path=eq.${enc(path)}`, { method: 'DELETE', extra: { Prefer: 'return=minimal' } });
      kick();
    },
    onSnapshot(cb: (s: any) => void, err: (e: any) => void = () => {}) {
      return watch(
        async () => { const s = await docRef(path).get(); return { sig: s.data(), out: s }; },
        cb, err
      );
    }
  });

  const collRef = (col: string) => ({
    doc: (id: string) => docRef(`${col}/${id}`),
    async get() {
      const r = await rest(`kv?col=eq.${enc(col)}&select=path,data&limit=1000`);
      const rows: any[] = await r.json();
      return { docs: rows.map((row) => docSnap(row.path, row)) };
    },
    onSnapshot(cb: (s: any) => void, err: (e: any) => void = () => {}) {
      return watch(
        async () => {
          const s = await collRef(col).get();
          const sig = s.docs.map((d: any) => [d.id, d.data()]).sort((a: any, b: any) => (a[0] < b[0] ? -1 : 1));
          return { sig, out: s };
        },
        cb, err
      );
    }
  });

  const db = {
    collection: (name: string) => collRef(name),
    doc: (path: string) => docRef(path)
  };
  void colOf;

  /* ---------- photo storage (public bucket) ---------- */
  const assets = {
    async upload(blob: Blob, opts: { type?: string } = {}) {
      if (!session) throw Object.assign(new Error('signin'), { code: 'signin' });
      const name = `${session.user.id.slice(0, 8)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
        method: 'POST', body: blob,
        headers: await headers({ 'Content-Type': opts.type || 'image/jpeg', 'x-upsert': 'false', 'cache-control': '31536000' })
      });
      if (!r.ok) throw Object.assign(new Error('upload_' + r.status), { code: r.status === 413 ? 'quota_or_state' : 'upload' });
      const url = `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
      return { id: name, url, sizeBytes: blob.size, contentType: blob.type };
    }
  };

  /* ---------- auth + admin check ---------- */
  await ensureFresh();
  let isAdmin = false;
  if (session) {
    try {
      const r = await rest(`admins?uid=eq.${enc(session.user.id)}&select=uid`);
      isAdmin = (await r.json()).length > 0;
    } catch { isAdmin = false; }
  }

  const auth: AuthApi = {
    email: session?.user?.email || null,
    async signIn(email, password) {
      session = toSession(await authFetch('token?grant_type=password', { email, password }));
      saveSession(session);
    },
    async signUp(email, password) {
      const j = await authFetch('signup', { email, password });
      if (j.access_token) { session = toSession(j); saveSession(session); return { needsConfirm: false }; }
      return { needsConfirm: true };
    },
    signOut() { session = null; saveSession(null); },
    signInGoogle() {
      const back = encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.href = `${URL_}/auth/v1/authorize?provider=google&redirect_to=${back}`;
    },
    async resetPassword(email) {
      const back = encodeURIComponent(window.location.origin + window.location.pathname);
      const r = await fetch(`${URL_}/auth/v1/recover?redirect_to=${back}`, {
        method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      if (!r.ok) throw new Error('recover_failed');
    },
    async updatePassword(password) {
      const r = await fetch(`${URL_}/auth/v1/user`, {
        method: 'PUT', headers: await headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ password })
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.msg || j.message || 'update_failed'); }
    },
    recovery
  };

  return { db, assets, uid: session?.user?.id || null, isAdmin, auth };
}
