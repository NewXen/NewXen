import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit, X, Lock, Package, Store, User, Eye, EyeOff, LogOut, Check } from 'lucide-react';
import ImagePicker from './ImagePicker';
import type { Backend } from './backend';
import type { Product, OrderItem, OrderStatus, Category, SubCategory } from './App';

/* ============================================================
   Customer account, Seller hub and the admin "Sellers & Customers" view.
   Accounts are claude.ai accounts: a person is "signed in" when the page
   can read their id. Seller approval is decided by the store admin.
   ============================================================ */

export interface SellerProfile {
  id: string; storeName: string; ownerName: string; phone: string; city: string; bio: string; logo: string; createdAt: number;
}
export interface SellerStatus { status: 'approved' | 'suspended' | 'rejected'; note?: string; at?: number }
export interface CustomerProfile {
  id?: string; name: string; phone: string; address: string; zone: 'inside_dhaka' | 'outside_dhaka'; updatedAt?: number;
}
export interface InboxOrder {
  id: string; items: OrderItem[]; customerName: string; phone: string; address: string; zone: string;
  paymentMethod: string; paymentStatus: string; status: OrderStatus; stockDeducted?: boolean; createdAt: number; total: number;
  date?: string;
}

type TFn = (en: string, bn: string) => string;
const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_BN: Record<OrderStatus, string> = { Pending: 'পেন্ডিং', Processing: 'প্রসেসিং', Shipped: 'শিপড', Delivered: 'ডেলিভার্ড', Cancelled: 'বাতিল' };
const isBDPhone = (p: string) => /^(?:\+?88)?01[3-9]\d{8}$/.test(p.replace(/[\s-]/g, ''));
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-900';
const card = 'bg-white rounded-3xl p-6 border border-slate-200 shadow-sm';

export const statusChip = (s: string) =>
  s === 'Delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : s === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300'
    : s === 'Cancelled' || s === 'rejected' || s === 'suspended' ? 'bg-slate-200 text-slate-600 border-slate-300'
    : s === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : 'bg-rose-100 text-rose-900 border-rose-300';


export function AuthCard({ backend, t, title, text }: { backend: Backend; t: (en: string, bn: string) => string; title: string; text: string }) {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backend.auth) return;
    setBusy(true); setMsg('');
    try {
      if (mode === 'forgot') {
        await backend.auth.resetPassword(email.trim());
        setMsg(t('If this email has an account, a reset link has been sent. Check your inbox (and spam).', 'এই ইমেইলে অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হয়েছে। ইনবক্স (ও স্প্যাম) দেখুন।'));
        setBusy(false); return;
      }
      if (mode === 'up') {
        const r = await backend.auth.signUp(email.trim(), pass);
        if (r.needsConfirm) { setMsg(t('Account created. Check your email and click the confirmation link, then sign in.', 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলে কনফার্মেশন লিংকে ক্লিক করে তারপর সাইন ইন করুন।')); setMode('in'); setBusy(false); return; }
      } else {
        await backend.auth.signIn(email.trim(), pass);
      }
      window.location.reload();
    } catch (err: any) {
      const m = String(err?.message || '');
      setMsg(/invalid login/i.test(m) ? t('Wrong email or password.', 'ইমেইল বা পাসওয়ার্ড ভুল।')
        : /already/i.test(m) ? t('This email is already registered. Sign in instead.', 'এই ইমেইল আগেই নিবন্ধিত। সাইন ইন করুন।')
        : /password/i.test(m) ? t('Password must be at least 6 characters.', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।')
        : t('Could not continue. Check your internet and try again.', 'চালিয়ে যাওয়া যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।'));
      setBusy(false);
    }
  };
  if (!backend.auth) return <Notice icon={<Lock className="w-6 h-6" />} title={title} text={text} />;
  return (
    <form onSubmit={submit} className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-rose-100 text-rose-950 rounded-full flex items-center justify-center mx-auto"><Lock className="w-6 h-6" /></div>
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button type="button" onClick={() => { setMode('in'); setMsg(''); }} className={`py-2 rounded-lg ${mode === 'in' ? 'bg-white shadow text-rose-950' : 'text-slate-500'}`}>{t('Sign in', 'সাইন ইন')}</button>
          <button type="button" onClick={() => { setMode('up'); setMsg(''); }} className={`py-2 rounded-lg ${mode === 'up' ? 'bg-white shadow text-rose-950' : 'text-slate-500'}`}>{t('Create account', 'নতুন অ্যাকাউন্ট')}</button>
        </div>
      )}
      {mode !== 'forgot' && (
        <>
          <button type="button" onClick={() => backend.auth!.signInGoogle()} className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:border-rose-900 bg-white text-slate-800 font-bold py-2.5 rounded-xl text-sm">
            <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            {mode === 'up' ? t('Sign up with Google', 'Google দিয়ে সাইন আপ') : t('Continue with Google', 'Google দিয়ে চালিয়ে যান')}
          </button>
          <div className="flex items-center gap-2 text-[10px] text-slate-400"><span className="flex-1 h-px bg-slate-200" />{t('or use email', 'অথবা ইমেইল দিয়ে')}<span className="flex-1 h-px bg-slate-200" /></div>
        </>
      )}
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-900" />
      {mode !== 'forgot' && (
        <div className="relative">
          <input type={show ? 'text' : 'password'} required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t('Password (min 6 characters)', 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)')} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-11 py-2.5 text-sm outline-none focus:border-rose-900" />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-900">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      )}
      {msg && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{msg}</p>}
      <button disabled={busy} className="w-full bg-rose-950 hover:bg-rose-900 text-white font-bold py-3 rounded-xl disabled:opacity-60">{busy ? '…' : mode === 'in' ? t('Sign in', 'সাইন ইন') : mode === 'up' ? t('Create account', 'অ্যাকাউন্ট খুলুন') : t('Send reset link', 'রিসেট লিংক পাঠান')}</button>
      {mode === 'in' && <button type="button" onClick={() => { setMode('forgot'); setMsg(''); }} className="w-full text-center text-xs font-bold text-rose-900 hover:underline">{t('Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}</button>}
      {mode === 'forgot' && <button type="button" onClick={() => { setMode('in'); setMsg(''); }} className="w-full text-center text-xs font-bold text-slate-500 hover:underline">{t('Back to sign in', 'সাইন ইনে ফিরে যান')}</button>}
    </form>
  );
}

export function RecoveryModal({ backend, t }: { backend: Backend; t: (en: string, bn: string) => string }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await backend.auth!.updatePassword(pw); setDone(true); }
    catch { setMsg(t('Could not change the password. Use at least 6 characters or request a new link.', 'পাসওয়ার্ড বদলানো যায়নি। কমপক্ষে ৬ অক্ষর দিন বা নতুন লিংক নিন।')); }
  };
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-3 shadow-2xl">
        <h3 className="font-black text-slate-900 text-lg">{t('Set a new password', 'নতুন পাসওয়ার্ড দিন')}</h3>
        {done ? (
          <>
            <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-4 h-4" />{t('Password changed. You are signed in.', 'পাসওয়ার্ড বদলেছে। আপনি সাইন ইন আছেন।')}</p>
            <button type="button" onClick={() => setOpen(false)} className="w-full bg-rose-950 text-white font-bold py-2.5 rounded-xl">OK</button>
          </>
        ) : (
          <>
            <div className="relative">
              <input type={show ? 'text' : 'password'} required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('New password', 'নতুন পাসওয়ার্ড')} className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-11 py-2.5 text-sm outline-none focus:border-rose-900" />
              <button type="button" aria-label="Show password" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            {msg && <p className="text-[11px] text-rose-700">{msg}</p>}
            <button className="w-full bg-rose-950 text-white font-bold py-2.5 rounded-xl">{t('Save password', 'পাসওয়ার্ড সেভ করুন')}</button>
          </>
        )}
      </form>
    </div>
  );
}

export function SignOutBar({ backend, t }: { backend: Backend; t: (en: string, bn: string) => string }) {
  if (!backend.auth || !backend.uid) return null;
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      <span className="truncate">{t('Signed in as', 'সাইন ইন করা আছে')}: <b className="text-slate-700">{backend.auth.email}</b></span>
      <button onClick={() => { backend.auth!.signOut(); window.location.reload(); }} className="flex items-center gap-1 font-bold text-rose-900 shrink-0"><LogOut className="w-3.5 h-3.5" />{t('Sign out', 'সাইন আউট')}</button>
    </div>
  );
}

function Notice({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-3 text-center">
      <div className="w-12 h-12 bg-rose-100 text-rose-950 rounded-full flex items-center justify-center mx-auto">{icon}</div>
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-bold text-slate-700 text-xs block mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- customer account */

export function AccountPage(props: {
  backend: Backend; t: TFn; profile: CustomerProfile | null; orders: any[];
  onSave: (p: CustomerProfile) => Promise<boolean>; onTrack: (id: string) => void; notify: (m: string) => void;
}) {
  const { backend, t, profile, orders, onSave, onTrack, notify } = props;
  const [f, setF] = useState<CustomerProfile>({ name: '', phone: '', address: '', zone: 'inside_dhaka' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [live, setLive] = useState<Record<string, { orderStatus: OrderStatus; parts?: { sid: string; storeName: string; status: OrderStatus }[] }>>({});

  useEffect(() => { if (profile && !dirty) setF({ name: profile.name, phone: profile.phone, address: profile.address, zone: profile.zone }); }, [profile, dirty]);

  const key = orders.slice(0, 15).map((o) => o.id).join(',');
  useEffect(() => {
    if (!backend.db || !key) return;
    let dead = false;
    (async () => {
      const out: typeof live = {};
      for (const id of key.split(',')) {
        try {
          const s = await backend.db.doc(`tracking/${id}`).get();
          if (s.exists) { const d = s.data(); out[id] = { orderStatus: d.orderStatus, parts: d.parts }; }
        } catch { /* ignore one failed lookup */ }
      }
      if (!dead) setLive(out);
    })();
    return () => { dead = true; };
  }, [backend.db, key]);

  if (!backend.db) {
    return <Notice icon={<User className="w-6 h-6" />} title={t('Accounts are not switched on yet', 'অ্যাকাউন্ট এখনো চালু হয়নি')}
      text={t('This site is not connected to its database yet. The site owner must finish the Supabase setup (SETUP-GUIDE-bn.md) and fill in config.js. After that, sign up and sign in will appear here.', 'এই সাইট এখনো ডাটাবেসের সাথে যুক্ত নয়। সাইটের মালিককে Supabase সেটআপ (SETUP-GUIDE-bn.md) শেষ করে config.js পূরণ করতে হবে। এরপর এখানে সাইন আপ ও সাইন ইন দেখা যাবে।')} />;
  }
  if (!backend.uid) {
    return <AuthCard backend={backend} t={t} title={t('Sign in to see your account', 'অ্যাকাউন্ট দেখতে সাইন ইন করুন')}
      text={t('Sign in to claude.ai to save your delivery details and see your orders.', 'ডেলিভারির তথ্য সেভ করতে এবং অর্ডার দেখতে claude.ai-তে সাইন ইন করুন।')} />;
  }

  const set = (p: Partial<CustomerProfile>) => { setF({ ...f, ...p }); setDirty(true); };
  const save = async () => {
    if (f.phone && !isBDPhone(f.phone)) { notify(t('Enter a valid mobile number like 017xxxxxxxx', 'সঠিক মোবাইল নম্বর দিন, যেমন 017xxxxxxxx')); return; }
    setSaving(true);
    const ok = await onSave(f);
    setSaving(false);
    if (ok) { setDirty(false); notify(t('Account details saved', 'অ্যাকাউন্টের তথ্য সেভ হয়েছে')); } else notify(t('Could not save. Try again.', 'সেভ করা যায়নি। আবার চেষ্টা করুন।'));
  };

  return (
    <div className="space-y-6">
      <SignOutBar backend={backend} t={t} />
      <div className={card + ' space-y-4'}>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><User className="w-5 h-5 text-rose-900" />{t('My Account', 'আমার অ্যাকাউন্ট')}</h2>
        <p className="text-xs text-slate-500">{t('These details fill your checkout form automatically.', 'এই তথ্য দিয়ে চেকআউট ফর্ম নিজে থেকে পূরণ হবে।')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <L label={t('Full name', 'পূর্ণ নাম')}><input id="acc-name" value={f.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} /></L>
          <L label={t('Mobile number', 'মোবাইল নম্বর')}><input id="acc-phone" type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="017xxxxxxxx" className={inputCls} /></L>
        </div>
        <L label={t('Delivery address', 'ডেলিভারি ঠিকানা')}><textarea id="acc-address" rows={2} value={f.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} /></L>
        <L label={t('Delivery zone', 'ডেলিভারি এলাকা')}>
          <select id="acc-zone" value={f.zone} onChange={(e) => set({ zone: e.target.value as CustomerProfile['zone'] })} className={inputCls}>
            <option value="inside_dhaka">{t('Inside Dhaka', 'ঢাকার ভেতরে')}</option>
            <option value="outside_dhaka">{t('Outside Dhaka', 'ঢাকার বাইরে')}</option>
          </select>
        </L>
        <button disabled={!dirty || saving} onClick={save} className="bg-rose-950 hover:bg-rose-900 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">
          {saving ? t('Saving…', 'সেভ হচ্ছে…') : t('Save details', 'তথ্য সেভ করুন')}
        </button>
      </div>

      <div className={card + ' space-y-3'}>
        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Package className="w-5 h-5 text-rose-900" />{t('My Orders', 'আমার অর্ডার')}</h3>
        {orders.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">{t('You have not placed any orders yet.', 'আপনি এখনো কোনো অর্ডার করেননি।')}</p>}
        {orders.map((o) => {
          const lv = live[o.id];
          const status: OrderStatus = lv?.orderStatus || o.orderStatus;
          return (
            <div key={o.id} className="border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-mono font-black text-rose-950 text-sm">{o.id}</span><span className="text-slate-400 ml-2">{o.date}</span></div>
                <span className={`px-2.5 py-1 rounded-lg border font-bold ${statusChip(status)}`}>{t(status, STATUS_BN[status])}</span>
              </div>
              <div className="text-slate-600">{o.items.map((it: OrderItem) => `${it.title} × ${it.qty}`).join(', ')}</div>
              {lv?.parts && lv.parts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lv.parts.map((p) => <span key={p.sid} className="bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{p.storeName}: <b>{t(p.status, STATUS_BN[p.status])}</b></span>)}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900">৳{o.totalAmount.toLocaleString()} <span className="font-normal text-slate-400">· {o.paymentMethod}</span></span>
                <button onClick={() => onTrack(o.id)} className="text-rose-900 font-bold hover:underline">{t('Track', 'ট্র্যাক করুন')}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- seller hub */

interface PForm {
  id?: string; titleEn: string; titleBn: string; categoryId: string; subCategoryId: string; price: string; regularPrice: string; stock: string;
  sizes: string; colors: string; fabric: string; description: string; images: string[];
}
const emptyP = (categoryId: string): PForm => ({
  titleEn: '', titleBn: '', categoryId, subCategoryId: '', price: '', regularPrice: '', stock: '10', sizes: 'Free Size', colors: 'Standard', fabric: '', description: '', images: []
});

export function SellerHub(props: {
  backend: Backend; t: TFn; brand: string; profile: SellerProfile | undefined; status: SellerStatus | undefined;
  categories: Category[]; subCategories: SubCategory[]; myProducts: Product[]; inbox: InboxOrder[];
  onSaveProfile: (p: Omit<SellerProfile, 'id' | 'createdAt'>) => Promise<boolean>;
  onSaveProduct: (p: Product) => Promise<boolean>; onDeleteProduct: (id: string) => Promise<boolean>;
  onInboxStatus: (o: InboxOrder, s: OrderStatus) => Promise<boolean>;
  askConfirm: (msg: string, yes: () => void) => void; notify: (m: string) => void;
}) {
  const { backend, t, brand, profile, status, categories, subCategories, myProducts, inbox, onSaveProfile, onSaveProduct, onDeleteProduct, onInboxStatus, askConfirm, notify } = props;
  const [tab, setTab] = useState<'products' | 'orders' | 'profile'>('products');
  const [pf, setPf] = useState({ storeName: '', ownerName: '', phone: '', city: '', bio: '', logo: '' });
  const [pfDirty, setPfDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PForm | null>(null);
  const [formErr, setFormErr] = useState('');

  useEffect(() => {
    if (profile && !pfDirty) setPf({ storeName: profile.storeName, ownerName: profile.ownerName, phone: profile.phone, city: profile.city, bio: profile.bio, logo: profile.logo });
  }, [profile, pfDirty]);

  if (!backend.db) {
    return <Notice icon={<Store className="w-6 h-6" />} title={t('Seller accounts are not switched on yet', 'সেলার অ্যাকাউন্ট এখনো চালু হয়নি')}
      text={t('This site is not connected to its database yet. The site owner must finish the Supabase setup (SETUP-GUIDE-bn.md) and fill in config.js. After that, sellers can sign up and apply here.', 'এই সাইট এখনো ডাটাবেসের সাথে যুক্ত নয়। মালিককে Supabase সেটআপ শেষ করে config.js পূরণ করতে হবে। এরপর সেলাররা এখানে সাইন আপ করে আবেদন করতে পারবে।')} />;
  }
  if (!backend.uid) {
    return <AuthCard backend={backend} t={t} title={t('Sign in to open a store', 'স্টোর খুলতে সাইন ইন করুন')}
      text={t('Sign in to claude.ai, then come back here to apply as a seller.', 'claude.ai-তে সাইন ইন করে এখানে ফিরে এসে সেলার হিসেবে আবেদন করুন।')} />;
  }

  const setP = (p: Partial<typeof pf>) => { setPf({ ...pf, ...p }); setPfDirty(true); };
  const saveProfile = async () => {
    if (pf.storeName.trim().length < 2) { notify(t('Enter your store name', 'স্টোরের নাম দিন')); return; }
    if (!isBDPhone(pf.phone)) { notify(t('Enter a valid mobile number like 017xxxxxxxx', 'সঠিক মোবাইল নম্বর দিন, যেমন 017xxxxxxxx')); return; }
    setBusy(true);
    const ok = await onSaveProfile({ ...pf, storeName: pf.storeName.trim(), ownerName: pf.ownerName.trim(), city: pf.city.trim(), bio: pf.bio.trim() });
    setBusy(false);
    if (ok) { setPfDirty(false); notify(profile ? t('Store profile saved', 'স্টোর প্রোফাইল সেভ হয়েছে') : t('Application sent. The admin will review it.', 'আবেদন পাঠানো হয়েছে। অ্যাডমিন যাচাই করবেন।')); }
    else notify(t('Could not save. Try again.', 'সেভ করা যায়নি। আবার চেষ্টা করুন।'));
  };

  const profileForm = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <L label={t('Store or brand name *', 'স্টোর বা ব্র্যান্ডের নাম *')}><input id="sl-store" value={pf.storeName} onChange={(e) => setP({ storeName: e.target.value })} className={inputCls} /></L>
      <L label={t('Your name', 'আপনার নাম')}><input id="sl-owner" value={pf.ownerName} onChange={(e) => setP({ ownerName: e.target.value })} className={inputCls} /></L>
      <L label={t('Contact mobile * (shown on your store)', 'যোগাযোগের মোবাইল * (স্টোরে দেখাবে)')}><input id="sl-phone" type="tel" value={pf.phone} onChange={(e) => setP({ phone: e.target.value })} placeholder="017xxxxxxxx" className={inputCls} /></L>
      <L label={t('City', 'শহর')}><input id="sl-city" value={pf.city} onChange={(e) => setP({ city: e.target.value })} className={inputCls} /></L>
      <div className="sm:col-span-2"><L label={t('About your store', 'স্টোর সম্পর্কে')}><textarea id="sl-bio" rows={3} value={pf.bio} onChange={(e) => setP({ bio: e.target.value })} className={inputCls} /></L></div>
      <div className="sm:col-span-2">
        <L label={t('Store logo', 'স্টোরের লোগো')}>
          <ImagePicker images={pf.logo ? [pf.logo] : []} onChange={(a) => setP({ logo: a[0] || '' })} backend={backend} max={1} inline />
        </L>
      </div>
    </div>
  );

  // ---- no application yet
  if (!profile) {
    return (
      <div className={card + ' max-w-3xl mx-auto space-y-4'}>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Store className="w-5 h-5 text-rose-900" />{t(`Sell on ${brand}`, `${brand}-এ বিক্রি করুন`)}</h2>
        <p className="text-xs text-slate-500">{t('Open a store under your own name or brand. The admin reviews every application before your store goes live.', 'নিজের নাম বা ব্র্যান্ডে স্টোর খুলুন। স্টোর চালুর আগে অ্যাডমিন প্রতিটি আবেদন যাচাই করবেন।')}</p>
        {profileForm}
        <button disabled={busy} onClick={saveProfile} className="bg-rose-950 hover:bg-rose-900 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">
          {busy ? t('Sending…', 'পাঠানো হচ্ছে…') : t('Apply for a store', 'স্টোরের জন্য আবেদন করুন')}
        </button>
      </div>
    );
  }

  // ---- applied but not live
  if (!status || status.status !== 'approved') {
    const st = status?.status;
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <SignOutBar backend={backend} t={t} />
        <div className={card + ' space-y-2'}>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{profile.storeName}</h2>
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${statusChip(st || 'Pending')}`}>
              {st === 'suspended' ? t('Suspended', 'স্থগিত') : st === 'rejected' ? t('Not approved', 'অনুমোদিত হয়নি') : t('Waiting for approval', 'অনুমোদনের অপেক্ষায়')}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {st === 'suspended' ? t('Your store is hidden from customers for now.', 'আপাতত আপনার স্টোর ক্রেতাদের কাছে লুকানো আছে।')
              : st === 'rejected' ? t('Your application was not approved. You can update the details and contact the admin.', 'আপনার আবেদন অনুমোদিত হয়নি। তথ্য আপডেট করে অ্যাডমিনের সাথে যোগাযোগ করুন।')
              : t('The admin is reviewing your application. You can add products as soon as it is approved.', 'অ্যাডমিন আপনার আবেদন যাচাই করছেন। অনুমোদনের পর পণ্য যোগ করতে পারবেন।')}
          </p>
          {status?.note && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2">{t('Note from admin:', 'অ্যাডমিনের নোট:')} {status.note}</p>}
        </div>
        <div className={card + ' space-y-4'}>
          <h3 className="font-bold text-slate-900">{t('Store details', 'স্টোরের তথ্য')}</h3>
          {profileForm}
          <button disabled={!pfDirty || busy} onClick={saveProfile} className="bg-rose-950 hover:bg-rose-900 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">{t('Save changes', 'পরিবর্তন সেভ করুন')}</button>
        </div>
      </div>
    );
  }

  // ---- approved seller
  const openNew = () => { setFormErr(''); setForm(emptyP(categories[0]?.id || '')); };
  const openEdit = (p: Product) => {
    setFormErr('');
    setForm({
      id: p.id, titleEn: p.titleEn, titleBn: p.titleBn, categoryId: p.categoryId, subCategoryId: p.subCategoryId || '', price: String(p.price), regularPrice: String(p.regularPrice),
      stock: String(p.stock), sizes: p.sizes.join(', '), colors: p.colors.join(', '), fabric: p.fabric, description: p.description, images: [...p.images]
    });
  };
  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const price = Number(form.price);
    if (!(price > 0)) { setFormErr(t('Enter a selling price', 'বিক্রয় মূল্য দিন')); return; }
    if (form.images.length === 0) { setFormErr(t('Add at least one photo', 'কমপক্ষে একটি ছবি দিন')); return; }
    const old = myProducts.find((p) => p.id === form.id);
    const regular = Number(form.regularPrice) || price;
    const p: Product = {
      id: form.id || `sp-${(backend.uid || 'x').slice(2, 10)}-${Date.now().toString(36)}`,
      titleEn: form.titleEn.trim(), titleBn: form.titleBn.trim() || form.titleEn.trim(),
      categoryId: form.categoryId, subCategoryId: form.subCategoryId, price, regularPrice: regular < price ? price : regular,
      stock: Math.max(0, Number(form.stock) || 0), badge: '', rating: old?.rating ?? 0, reviews: old?.reviews ?? 0,
      sizes: splitList(form.sizes).length ? splitList(form.sizes) : ['Free Size'],
      colors: splitList(form.colors).length ? splitList(form.colors) : ['Standard'],
      fabric: form.fabric.trim(), description: form.description.trim() || form.fabric.trim(), images: form.images,
      hidden: old?.hidden || false
    };
    setBusy(true);
    const ok = await onSaveProduct(p);
    setBusy(false);
    if (ok) { setForm(null); notify(form.id ? t('Product updated', 'পণ্য আপডেট হয়েছে') : t('Product published', 'পণ্য প্রকাশিত হয়েছে')); }
    else setFormErr(t('Could not save. The photos may be too large. Try fewer or smaller photos.', 'সেভ করা যায়নি। ছবি বড় হতে পারে। কম বা ছোট ছবি দিন।'));
  };

  const pending = inbox.filter((o) => o.status === 'Pending').length;
  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-xs font-bold transition ${tab === k ? 'bg-rose-950 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>{label}</button>
  );

  return (
    <div className="space-y-5">
      <SignOutBar backend={backend} t={t} />
      <div className="bg-slate-900 text-white rounded-3xl p-5 flex flex-wrap items-center gap-4">
        {profile.logo ? <img src={profile.logo} alt="" className="w-14 h-14 rounded-2xl object-cover bg-white" /> : <div className="w-14 h-14 rounded-2xl bg-rose-950 flex items-center justify-center"><Store className="w-6 h-6" /></div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h2 className="text-lg font-bold truncate">{profile.storeName}</h2><span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded">{t('LIVE', 'চালু')}</span></div>
          <p className="text-xs text-slate-400">{t('Seller dashboard', 'সেলার ড্যাশবোর্ড')} · {myProducts.length} {t('products', 'টি পণ্য')}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabBtn('products', t('My products', 'আমার পণ্য'))}
        {tabBtn('orders', `${t('Orders', 'অর্ডার')}${pending ? ` (${pending})` : ''}`)}
        {tabBtn('profile', t('Store profile', 'স্টোর প্রোফাইল'))}
      </div>

      {tab === 'products' && (
        <div className={card + ' space-y-4'}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">{t('My products', 'আমার পণ্য')}</h3>
            <button onClick={openNew} className="bg-rose-950 hover:bg-rose-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"><Plus className="w-4 h-4" />{t('Add product', 'পণ্য যোগ করুন')}</button>
          </div>
          {myProducts.length === 0 && <p className="text-xs text-slate-400 py-8 text-center">{t('No products yet. Add your first product to start selling.', 'এখনো কোনো পণ্য নেই। বিক্রি শুরু করতে প্রথম পণ্য যোগ করুন।')}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myProducts.map((p) => (
              <div key={p.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 items-center">
                <img src={p.images[0]} alt={p.titleEn} className="w-16 h-16 object-cover rounded-xl bg-white" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 truncate">{p.titleEn}</h4>
                  <div className="text-xs font-black text-rose-950">৳{p.price.toLocaleString()}</div>
                  <div className={`text-[10px] font-bold ${p.stock <= 5 ? 'text-rose-600' : 'text-slate-500'}`}>{t('Stock', 'স্টক')}: {p.stock}</div>
                </div>
                <button onClick={async () => { const ok = await onSaveProduct({ ...p, hidden: !p.hidden }); notify(ok ? (p.hidden ? t('Product is now Live', 'পণ্য এখন লাইভ') : t('Product hidden from the shop', 'পণ্য শপ থেকে লুকানো হয়েছে')) : t('Could not update', 'আপডেট করা যায়নি')); }}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border ${p.hidden ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {p.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{p.hidden ? t('Hidden', 'হিডেন') : t('Live', 'লাইভ')}
                </button>
                <button aria-label="Edit" onClick={() => openEdit(p)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg"><Edit className="w-4 h-4" /></button>
                <button aria-label="Delete" onClick={() => askConfirm(`Delete "${p.titleEn}"?`, async () => { if (!(await onDeleteProduct(p.id))) notify(t('Could not delete', 'মোছা যায়নি')); })} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className={card + ' space-y-3'}>
          <h3 className="font-bold text-slate-900 text-lg">{t('Orders for my products', 'আমার পণ্যের অর্ডার')}</h3>
          {inbox.length === 0 && <p className="text-xs text-slate-400 py-8 text-center">{t('No orders yet. Orders appear here after the store confirms them.', 'এখনো কোনো অর্ডার নেই। স্টোর কনফার্ম করার পর অর্ডার এখানে আসবে।')}</p>}
          {inbox.map((o) => (
            <div key={o.id} className="border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><span className="font-mono font-black text-rose-950 text-sm">{o.id}</span><span className="text-slate-400 ml-2">{o.date}</span></div>
                <select value={o.status} onChange={async (e) => { if (!(await onInboxStatus(o, e.target.value as OrderStatus))) notify(t('Could not update the status', 'স্ট্যাটাস আপডেট করা যায়নি')); }}
                  className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border ${statusChip(o.status)}`}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                <div className="font-bold text-slate-800">{o.customerName} · {o.phone}</div>
                <div className="text-slate-600">{o.address} ({o.zone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</div>
              </div>
              {o.items.map((it, i) => <div key={i} className="text-slate-700">• {it.title} ({it.size}, {it.color}) × {it.qty} = ৳{(it.price * it.qty).toLocaleString()}</div>)}
              <div className="flex justify-between text-slate-500"><span>{t('Payment', 'পেমেন্ট')}: {o.paymentMethod} ({o.paymentStatus})</span><b className="text-slate-900">৳{o.total.toLocaleString()}</b></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'profile' && (
        <div className={card + ' space-y-4'}>
          <h3 className="font-bold text-slate-900 text-lg">{t('Store profile', 'স্টোর প্রোফাইল')}</h3>
          {profileForm}
          <button disabled={!pfDirty || busy} onClick={saveProfile} className="bg-rose-950 hover:bg-rose-900 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition">{t('Save changes', 'পরিবর্তন সেভ করুন')}</button>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitProduct} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">{form.id ? t('Edit product', 'পণ্য এডিট') : t('Add product', 'পণ্য যোগ করুন')}</h3>
              <button type="button" aria-label="Close" onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <L label={t('Title (English) *', 'নাম (ইংরেজি) *')}><input id="sp-title" required value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className={inputCls} /></L>
              <L label={t('Title (Bangla)', 'নাম (বাংলা)')}><input id="sp-titlebn" value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} className={inputCls} /></L>
              <L label={t('Selling price (৳) *', 'বিক্রয় মূল্য (৳) *')}><input id="sp-price" required type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} /></L>
              <L label={t('Regular price (৳)', 'আসল দাম (৳)')}><input id="sp-reg" type="number" min={0} value={form.regularPrice} onChange={(e) => setForm({ ...form, regularPrice: e.target.value })} className={inputCls} /></L>
              <L label={t('Category', 'ক্যাটাগরি')}>
                <select id="sp-cat" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} className={inputCls}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                </select>
              </L>
              <L label={t('Sub-category', 'সাব-ক্যাটাগরি')}>
                <select id="sp-sub" value={form.subCategoryId} onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })} className={inputCls}>
                  <option value="">{t('— None —', '— নেই —')}</option>
                  {subCategories.filter((x) => x.categoryId === form.categoryId).map((x) => <option key={x.id} value={x.id}>{x.nameEn}</option>)}
                </select>
              </L>
              <L label={t('Stock quantity', 'স্টক')}><input id="sp-stock" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} /></L>
              <L label={t('Sizes (comma separated)', 'সাইজ (কমা দিয়ে)')}><input id="sp-sizes" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className={inputCls} /></L>
              <L label={t('Colors (comma separated)', 'রঙ (কমা দিয়ে)')}><input id="sp-colors" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} className={inputCls} /></L>
            </div>
            <L label={t('Fabric and details', 'ফ্যাব্রিক ও বিবরণ')}><input id="sp-fabric" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} className={inputCls} /></L>
            <L label={t('Description', 'বর্ণনা')}><textarea id="sp-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></L>
            <L label={t('Photos (up to 3)', 'ছবি (সর্বোচ্চ ৩টি)')}>
              <ImagePicker images={form.images} onChange={(images) => setForm((f) => (f ? { ...f, images } : f))} backend={backend} max={3} inline />
            </L>
            {formErr && <p className="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{formErr}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50">{t('Cancel', 'বাতিল')}</button>
              <button type="submit" disabled={busy} className="flex-1 bg-rose-950 hover:bg-rose-900 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">{busy ? t('Saving…', 'সেভ হচ্ছে…') : t('Save product', 'পণ্য সেভ করুন')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- admin: sellers & customers */

export function AdminPeople(props: {
  sellers: SellerProfile[]; statuses: Record<string, SellerStatus>; productCount: Record<string, number>; customers: CustomerProfile[];
  onSetStatus: (id: string, status: SellerStatus['status'], note: string) => Promise<boolean>; notify: (m: string) => void;
}) {
  const { sellers, statuses, productCount, customers, onSetStatus, notify } = props;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = async (id: string, s: SellerStatus['status']) => {
    const ok = await onSetStatus(id, s, notes[id] || '');
    notify(ok ? `Seller marked ${s}` : 'Could not update the seller');
  };
  const sorted = [...sellers].sort((a, b) => (statuses[a.id] ? 1 : 0) - (statuses[b.id] ? 1 : 0) || b.createdAt - a.createdAt);
  return (
    <div className="space-y-6">
      <div className={card + ' space-y-3'}>
        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Store className="w-5 h-5 text-rose-900" />Seller applications and stores</h3>
        {sorted.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">No sellers yet. Applications appear here.</p>}
        {sorted.map((s) => {
          const st = statuses[s.id]?.status;
          const label = st || 'pending';
          return (
            <div key={s.id} className="border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                {s.logo ? <img src={s.logo} alt="" className="w-11 h-11 rounded-xl object-cover bg-slate-100" /> : <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-950 flex items-center justify-center"><Store className="w-5 h-5" /></div>}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{s.storeName}</div>
                  <div className="text-slate-500">{s.ownerName || 'No name'} · {s.phone}{s.city ? ` · ${s.city}` : ''}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg border font-bold capitalize ${statusChip(st || 'Pending')}`}>{label}</span>
                <span className="text-slate-400">{productCount[s.id] || 0} products</span>
              </div>
              {s.bio && <p className="text-slate-600">{s.bio}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Note to seller" value={notes[s.id] ?? statuses[s.id]?.note ?? ''} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} placeholder="Note to seller (optional)" className={inputCls + ' flex-1 min-w-[10rem]'} />
                {st !== 'approved' && <button onClick={() => act(s.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg">Approve</button>}
                {st === 'approved' && <button onClick={() => act(s.id, 'suspended')} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-lg">Suspend</button>}
                {st !== 'rejected' && st !== 'approved' && <button onClick={() => act(s.id, 'rejected')} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-2 rounded-lg">Reject</button>}
              </div>
            </div>
          );
        })}
      </div>

      <div className={card + ' space-y-3'}>
        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><User className="w-5 h-5 text-rose-900" />Customers with saved accounts</h3>
        {customers.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">No customer accounts yet.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {customers.map((c) => (
            <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <div className="font-bold text-slate-900">{c.name || 'No name'}</div>
              <div className="text-slate-500">{c.phone}</div>
              <div className="text-slate-500">{c.address}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
