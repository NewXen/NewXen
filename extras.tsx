import React, { useRef, useState } from 'react';
import { Backend, uploadPhoto } from './backend';

export const isImgIcon = (v: string) => /^(https?:|data:image|\/_blob\/)/.test(v || '');

/** Category icon: an emoji or a small uploaded picture. */
export function CatIcon({ icon, className = '' }: { icon: string; className?: string }) {
  if (isImgIcon(icon)) return <img src={icon} alt="" className={`inline-block object-cover rounded-md align-middle ${className || 'w-5 h-5'}`} />;
  return <span className={className}>{icon}</span>;
}

const EMOJIS = ['👗', '🥻', '🧥', '🧕', '💎', '👜', '👠', '👡', '💄', '🧣', '👚', '👖', '🩱', '👒', '🕶️', '⌚', '💍', '📿', '🎀', '🌸', '✨', '🛍️', '🎁', '🧵', '👶', '🧸', '🏠', '🔥'];

export function IconPicker({ value, onChange, backend, label }: { value: string; onChange: (v: string) => void; backend: Backend; label: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const pickFile = async (f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    setBusy(true);
    try { onChange(await uploadPhoto(f, backend, true, 160)); setOpen(false); } catch { /* ignore */ }
    setBusy(false);
  };
  return (
    <span className="relative inline-block">
      <button type="button" aria-label={label} title={label} onClick={() => setOpen(!open)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-300 hover:border-rose-900 text-lg">
        <CatIcon icon={value} className="w-6 h-6 text-lg" />
      </button>
      {open && (
        <div className="absolute z-40 left-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2">
          <div className="grid grid-cols-7 gap-1">
            {EMOJIS.map((e) => <button type="button" key={e} onClick={() => { onChange(e); setOpen(false); }} className="h-8 rounded-lg hover:bg-rose-50 text-lg">{e}</button>)}
          </div>
          <input aria-label="Type any emoji" placeholder="Type any emoji" maxLength={8} onChange={(e) => { if (e.target.value.trim()) { onChange(e.target.value.trim()); } }} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-rose-900" />
          <button type="button" disabled={busy} onClick={() => file.current?.click()} className="w-full text-xs font-bold border border-slate-300 hover:border-rose-900 rounded-lg py-1.5">{busy ? 'Uploading…' : 'Upload your own icon picture'}</button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => setOpen(false)} className="w-full text-[11px] text-slate-400">Close</button>
        </div>
      )}
    </span>
  );
}
