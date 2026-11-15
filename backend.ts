import { useEffect, useRef, useState } from 'react';
import { AuthApi, createSupabaseBackend, readConfig } from './supabase';

/* ============================================================
   Backend layer.
   - Inside claude.ai (published artifact): shared database (`db`), photo storage
     (`assets`) and real owner/editor detection (`user`).
   - Anywhere else (plain Vite site, no claude runtime): falls back to this
     browser's localStorage so the site still works.
   ============================================================ */

export interface Backend {
  db: any; // claude `db` namespace or null
  assets: any; // claude `assets` namespace or null (editors only)
  uid: string | null; // viewer id (needed to place orders in shared mode)
  isAdmin: boolean; // owner / editor of the artifact
  auth?: AuthApi; // only when running on a Supabase-backed site (own sign-in)
}
export const NO_BACKEND: Backend = { db: null, assets: null, uid: null, isAdmin: false };

const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export async function initBackend(): Promise<Backend> {
  const w = window as any;
  const cfg = readConfig();
  if (cfg) {
    try { return (await createSupabaseBackend(cfg)) as Backend; } catch { return NO_BACKEND; }
  }
  // the runtime object can appear a moment after first paint
  for (let i = 0; i < 10 && !w.claude?.use; i++) await new Promise((r) => setTimeout(r, 100));
  const c = w.claude;
  if (!c || typeof c.use !== 'function') return NO_BACKEND;
  try {
    const [db, user, assets] = await Promise.all([
      withTimeout<any>(c.use('db')),
      withTimeout<any>(c.use('user')),
      withTimeout<any>(c.use('assets'))
    ]);
    if (!db) return NO_BACKEND;
    const isAdmin = user ? !!(await user.canEdit()) : false;
    const uid = user ? await user.id() : null;
    return { db, assets: assets || null, uid, isAdmin };
  } catch {
    return NO_BACKEND;
  }
}

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const byAsc = (a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0);
export const byDesc = (a: any, b: any) => (b.sort ?? 0) - (a.sort ?? 0);

/** localStorage-backed state (used for cart, wishlist, language, and local mode data). */
export function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable or full */ }
  }, [key, value]);
  return [value, setValue];
}

/**
 * A list that lives in the shared database (one document per item) when available,
 * otherwise in localStorage. The setter takes a new array (or an updater) like useState
 * and writes only what changed.
 */
export function useSynced<T extends { id: string; sort?: number }>(
  name: string,
  seed: T[],
  backend: Backend,
  seeded: boolean | null,
  order: (a: T, b: T) => number,
  localKey: string,
  enabled = true
): [T[], (v: T[] | ((prev: T[]) => T[])) => void] {
  const [local, setLocal] = useLocalStorage<T[]>(localKey, seed);
  const [remote, setRemote] = useState<T[] | null>(null);
  const db = backend.db;

  useEffect(() => {
    if (!db || !enabled) return;
    const unsub = db.collection(name).onSnapshot(
      (snap: any) => setRemote(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as T)),
      () => setRemote([])
    );
    return () => unsub();
  }, [db, name, enabled]);

  let items: T[];
  if (!db) items = local;
  else if (!enabled || remote === null || (remote.length === 0 && seeded !== true)) items = seed;
  else items = [...remote].sort(order);

  const ref = useRef(items);
  ref.current = items;

  const setItems = (v: T[] | ((prev: T[]) => T[])) => {
    const prev = ref.current;
    const next = typeof v === 'function' ? (v as (p: T[]) => T[])(prev) : v;
    if (!db) { setLocal(next); return; }
    const pm = new Map(prev.map((x) => [x.id, x]));
    const keep = new Set(next.map((x) => x.id));
    (async () => {
      for (const n of next) {
        const p = pm.get(n.id);
        if (p && JSON.stringify(p) === JSON.stringify(n)) continue;
        const withSort = { ...n, sort: n.sort ?? p?.sort ?? Date.now() };
        await db.collection(name).doc(n.id).set(clean(withSort));
      }
      for (const p of prev) if (!keep.has(p.id)) await db.collection(name).doc(p.id).delete();
    })().catch(() => window.dispatchEvent(new CustomEvent('nx-save-error')));
  };
  return [items, setItems];
}

export function watchSeeded(b: Backend, cb: (v: boolean) => void): () => void {
  return b.db.doc('meta/seeded').onSnapshot((s: any) => cb(!!s.exists), () => cb(true));
}

export async function seedCatalog(
  b: Backend,
  d: { products: any[]; categories: any[]; subCategories: any[]; banners: any[]; staff: any[] }
) {
  const put = async (name: string, arr: any[], sortOf: (i: number) => number) => {
    for (let i = 0; i < arr.length; i++) {
      await b.db.collection(name).doc(arr[i].id).set(clean({ ...arr[i], sort: sortOf(i) }));
    }
  };
  await put('products', d.products, (i) => 1000 - i);
  await put('categories', d.categories, (i) => i);
  await put('subcategories', d.subCategories, (i) => i);
  await put('banners', d.banners, (i) => i);
  await put('staff', d.staff, (i) => i);
  await b.db.doc('meta/seeded').set({ at: Date.now() });
}

/** What a customer may see when tracking: no name, phone or address. */
export function toTracking(o: any) {
  return clean({
    id: o.id, orderStatus: o.orderStatus, date: o.date, items: o.items,
    subtotal: o.subtotal, discount: o.discount, delivery: o.delivery, totalAmount: o.totalAmount,
    paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, parts: o.parts || []
  });
}
export function fromTracking(d: any): any {
  return {
    customerName: '', phone: '', address: '', zone: 'inside_dhaka', trxId: '',
    subtotal: 0, discount: 0, delivery: 0, ...d
  };
}

/* ---------------- images ---------------- */

async function loadBitmap(file: Blob): Promise<any> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' } as any); } catch { /* fall through */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
    img.src = url;
  });
}

/** Resize + re-encode a photo so phone camera shots (often 5-12 MB) become ~150-400 KB. */
export async function compressImage(file: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bmp = await loadBitmap(file);
  const w0 = bmp.width, h0 = bmp.height;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', quality));
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

/** Upload one photo; returns the URL to store on the product. */
export async function uploadPhoto(file: File, backend: Backend, inline = false, maxDim?: number): Promise<string> {
  if (backend.assets) {
    const blob = await compressImage(file, maxDim || 1400, 0.85);
    const r = await backend.assets.upload(blob, { type: 'image/jpeg' });
    return backend.auth ? r.url : '/_blob/' + r.id; // Supabase: public URL; claude.ai: blob path
  }
  if (inline) {
    // seller photos (claude.ai preview) are stored inside the product record so every visitor can see them
    return blobToDataUrl(await compressImage(file, 640, 0.6));
  }
  // local mode: keep a small copy inside the browser
  const blob = await compressImage(file, Math.min(maxDim || 800, 1280), 0.7);
  return blobToDataUrl(blob);
}
