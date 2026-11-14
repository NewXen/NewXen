import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Trash2, Check } from 'lucide-react';
import { Backend, uploadPhoto } from './backend';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  backend: Backend;
  max?: number;
  inline?: boolean;
  maxDim?: number;
  hint?: string;
}

export default function ImagePicker({ images, onChange, backend, max = 6, inline = false, maxDim, hint }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    const room = Math.max(0, max - images.length);
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${max} photo${max > 1 ? 's' : ''} allowed. Extra files were skipped.`);
    let current = [...images];
    setBusy(picked.length);
    for (const f of picked) {
      try {
        if (!f.type.startsWith('image/')) throw new Error('type');
        const url = await uploadPhoto(f, backend, inline, maxDim);
        current = [...current, url];
        onChange(current);
      } catch (e: any) {
        const code = e?.code || e?.message;
        setError(
          code === 'type' ? 'That file is not an image.'
            : code === 'quota_or_state' ? 'Photo storage is full. Remove unused photos or upgrade storage.'
            : code === 'rate_limited' ? 'Too many uploads at once. Wait a moment and try again.'
            : 'Could not read that photo. Try a JPG or PNG.'
        );
      } finally {
        setBusy((n) => Math.max(0, n - 1));
      }
    }
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => onChange([images[i], ...images.filter((_, idx) => idx !== i)]);
  const full = images.length >= max;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((src, i) => (
          <div key={src.slice(-40) + i} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1 left-1 bg-rose-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">COVER</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent">
              {i !== 0 ? (
                <button type="button" onClick={() => makeCover(i)} className="text-[10px] font-bold text-white bg-white/20 hover:bg-white/30 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                  <Check className="w-3 h-3" />Cover
                </button>
              ) : <span />}
              <button type="button" aria-label="Remove photo" onClick={() => remove(i)} className="text-white bg-rose-600/90 hover:bg-rose-600 rounded p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {busy > 0 && (
          <div className="aspect-[4/5] rounded-xl border border-dashed border-rose-300 bg-rose-50 flex flex-col items-center justify-center text-[10px] font-semibold text-rose-900 gap-1">
            <span className="w-5 h-5 border-2 border-rose-900 border-t-transparent rounded-full animate-spin" />
            Uploading…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button" disabled={full || busy > 0}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center gap-1.5 bg-white border border-slate-300 hover:border-rose-900 text-slate-800 font-bold px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ImagePlus className="w-4 h-4 text-rose-900" />Choose from device
        </button>
        <button
          type="button" disabled={full || busy > 0}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1.5 bg-rose-950 hover:bg-rose-900 text-white font-bold px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Camera className="w-4 h-4" />Take a photo
        </button>
      </div>

      <input
        ref={galleryRef} type="file" accept="image/*" multiple={max > 1} hidden
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      <p className="text-[10px] text-slate-400">
        {hint || `${images.length}/${max} photos. The first photo is the cover.`} On a phone, “Take a photo” opens the camera; on a computer it opens the file picker.
      </p>
      {error && <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">{error}</p>}
    </div>
  );
}
