import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { Order } from './App';

export interface BillShop { brandName: string; brandBn: string; phone: string; email: string; address: string }

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const money = (n: number) => '৳' + Number(n || 0).toLocaleString('en-US');
const zoneLabel = (z: string) => (z === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka');
const isPaid = (o: Order) => /^paid$/i.test(o.paymentStatus);

export const billFileName = (o: Order) => `Bill-${o.id}.html`;

/** Plain-text version, for copying into a message. */
export function billText(o: Order, shop: BillShop): string {
  const lines = [
    `${shop.brandName} (${shop.brandBn}) - BILL / VOUCHER`,
    `Order ID: ${o.id}`,
    `Date: ${o.date}`,
    '',
    `Customer: ${o.customerName}`,
    `Phone: ${o.phone}`,
    `Address: ${o.address} (${zoneLabel(o.zone)})`,
    '',
    ...o.items.map((i, n) => `${n + 1}. ${i.title} (${i.size}, ${i.color}) x ${i.qty} = ${money(i.price * i.qty)}${i.storeName ? ` [${i.storeName}]` : ''}`),
    '',
    `Subtotal: ${money(o.subtotal)}`,
    ...(o.discount ? [`Discount: -${money(o.discount)}`] : []),
    `Delivery: ${o.delivery ? money(o.delivery) : 'Free'}`,
    `TOTAL: ${money(o.totalAmount)}`,
    '',
    `Payment: ${o.paymentMethod} (${o.paymentStatus})${o.trxId ? ` | TrxID: ${o.trxId}` : ''}`,
    `Thank you for shopping with ${shop.brandName}.`
  ];
  return lines.join('\n');
}

/** A self-contained, print-ready page. Open it in a browser and use Print / Save as PDF. */
export function billHtml(o: Order, shop: BillShop): string {
  const rows = o.items
    .map(
      (i, n) => `<tr><td>${n + 1}</td><td>${esc(i.title)}${i.storeName ? `<div class="sub">Seller: ${esc(i.storeName)}</div>` : ''}</td>
<td>${esc(i.size)} / ${esc(i.color)}</td><td class="r">${i.qty}</td><td class="r">${money(i.price)}</td><td class="r">${money(i.price * i.qty)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bill ${esc(o.id)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#0f172a;font:14px/1.5 system-ui,-apple-system,'Segoe UI','Hind Siliguri',sans-serif}
.page{max-width:780px;margin:24px auto;background:#fff;padding:36px;border-radius:12px;border:1px solid #e2e8f0}
.top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:3px solid #4c0519;padding-bottom:16px}
h1{margin:0;font-size:26px;color:#4c0519;letter-spacing:-.02em}.muted{color:#64748b;font-size:12px}
.tag{display:inline-block;background:#4c0519;color:#fff;font-weight:700;font-size:11px;letter-spacing:.08em;padding:4px 10px;border-radius:6px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}.meta h3{margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#fff1f2;color:#4c0519;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
th,td{padding:9px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.r{text-align:right}.sub{font-size:11px;color:#64748b}
.sum{margin-left:auto;width:280px;margin-top:14px}.sum div{display:flex;justify-content:space-between;padding:4px 0}
.sum .t{border-top:2px solid #4c0519;margin-top:6px;padding-top:8px;font-size:17px;font-weight:800;color:#4c0519}
.stamp{display:inline-block;border:2px solid;border-radius:8px;padding:3px 12px;font-weight:800;letter-spacing:.1em;transform:rotate(-4deg)}
.paid{color:#047857;border-color:#047857}.due{color:#b45309;border-color:#b45309}
.foot{margin-top:28px;padding-top:14px;border-top:1px dashed #cbd5e1;text-align:center;color:#64748b;font-size:12px}
.btn{display:block;margin:0 auto 24px;background:#4c0519;color:#fff;border:0;border-radius:10px;padding:10px 22px;font-weight:700;cursor:pointer}
@media print{body{background:#fff}.page{margin:0;border:0;border-radius:0;max-width:none}.btn{display:none}}
</style></head><body>
<div class="page">
<div class="top"><div><h1>${esc(shop.brandName)} <span class="muted">${esc(shop.brandBn)}</span></h1>
<div class="muted">${esc(shop.address)}${shop.address && shop.phone ? '<br>' : ''}${esc(shop.phone)}${shop.email ? ' · ' + esc(shop.email) : ''}</div></div>
<div style="text-align:right"><span class="tag">BILL / VOUCHER</span><div style="margin-top:8px"><b>${esc(o.id)}</b></div><div class="muted">${esc(o.date)}</div></div></div>
<div class="meta"><div><h3>Billed to</h3><b>${esc(o.customerName)}</b><br>${esc(o.phone)}<br>${esc(o.address)}<br><span class="muted">${zoneLabel(o.zone)}</span></div>
<div><h3>Payment</h3>${esc(o.paymentMethod)}${o.trxId ? '<br>TrxID: <b>' + esc(o.trxId) + '</b>' : ''}<br><br><span class="stamp ${isPaid(o) ? 'paid' : 'due'}">${isPaid(o) ? 'PAID' : esc(o.paymentMethod === 'COD' ? 'PAY ON DELIVERY' : 'PAYMENT PENDING')}</span></div></div>
<table><thead><tr><th>#</th><th>Product</th><th>Size / Color</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum"><div><span>Subtotal</span><span>${money(o.subtotal)}</span></div>${o.discount ? `<div><span>Discount</span><span>-${money(o.discount)}</span></div>` : ''}
<div><span>Delivery</span><span>${o.delivery ? money(o.delivery) : 'Free'}</span></div><div class="t"><span>Total</span><span>${money(o.totalAmount)}</span></div></div>
<div class="foot">Thank you for shopping with ${esc(shop.brandName)}. Returns are accepted for unused items with tags within the return period.</div>
</div></body></html>`.replace('<div class="page">', '<button class="btn" onclick="window.print()">Print or save as PDF</button>\n<div class="page">');
}

/** Saves a file: through the page's download permission inside claude.ai, otherwise a normal browser download. */
export async function saveTextFile(filename: string, text: string): Promise<'saved' | 'declined' | 'failed'> {
  const w = window as any;
  try {
    const dl = w.claude?.use ? await w.claude.use('downloads') : null;
    if (dl) {
      await dl.save({ filename, data: text });
      return 'saved';
    }
  } catch (e: any) {
    return e?.code === 'declined' ? 'declined' : 'failed';
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export function BillModal(props: {
  order: Order; shop: BillShop; onClose: () => void; onProduct: (id: string) => void; notify: (m: string) => void;
}) {
  const { order: o, shop, onClose, onProduct, notify } = props;
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const r = await saveTextFile(billFileName(o), billHtml(o, shop));
    setBusy(false);
    if (r === 'saved') notify('Bill file ready. Open it and press Print to save a PDF.');
    else if (r === 'failed') notify('Could not save the file here. Use "Copy bill text" instead.');
  };
  const printBill = () => {
    try {
      const fr = document.createElement('iframe');
      fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      document.body.appendChild(fr);
      const d = fr.contentWindow!.document;
      d.open(); d.write(billHtml(o, shop)); d.close();
      setTimeout(() => {
        try { fr.contentWindow!.focus(); fr.contentWindow!.print(); } catch { notify('Printing is blocked here. Use Download bill, open the file and press Print.'); }
        setTimeout(() => fr.remove(), 60000);
      }, 400);
    } catch { notify('Printing is blocked here. Use Download bill, open the file and press Print.'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(billText(o, shop)); notify('Bill text copied'); }
    catch { notify('Copy is blocked here. Select the text on the bill and copy it manually.'); }
  };

  return (
    <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-4">
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Bill / Voucher</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={printBill} className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-rose-950 px-3 py-2 rounded-xl">Print bill</button>
            <button onClick={copy} className="text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl">Copy bill text</button>
            <button disabled={busy} onClick={download} className="text-xs font-bold bg-rose-950 hover:bg-rose-900 disabled:opacity-50 text-white px-3 py-2 rounded-xl">Download bill</button>
            <button aria-label="Close" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 sm:p-7 text-sm text-slate-800">
          <div className="flex flex-wrap justify-between gap-3 border-b-[3px] border-rose-950 pb-4">
            <div>
              <div className="text-2xl font-black text-rose-950 tracking-tight">{shop.brandName} <span className="text-xs font-semibold text-slate-400">{shop.brandBn}</span></div>
              <div className="text-xs text-slate-500">{shop.address}{shop.address && shop.phone ? ' · ' : ''}{shop.phone}{shop.email ? ` · ${shop.email}` : ''}</div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-rose-950 text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-md">BILL / VOUCHER</span>
              <div className="font-mono font-black mt-1">{o.id}</div>
              <div className="text-xs text-slate-500">{o.date}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Billed to</div>
              <div className="font-bold text-slate-900 text-sm">{o.customerName}</div>
              <div>{o.phone}</div>
              <div>{o.address}</div>
              <div className="text-slate-400">{zoneLabel(o.zone)}</div>
            </div>
            <div className="sm:text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Payment</div>
              <div>{o.paymentMethod}{o.trxId ? <> · TrxID <b className="font-mono">{o.trxId}</b></> : null}</div>
              <span className={`inline-block mt-2 border-2 rounded-lg px-3 py-0.5 text-[11px] font-black tracking-widest ${isPaid(o) ? 'text-emerald-700 border-emerald-700' : 'text-amber-700 border-amber-700'}`}>
                {isPaid(o) ? 'PAID' : o.paymentMethod === 'COD' ? 'PAY ON DELIVERY' : 'PAYMENT PENDING'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[460px]">
              <thead>
                <tr className="bg-rose-50 text-rose-950 text-[10px] uppercase tracking-wider text-left">
                  <th className="p-2">#</th><th className="p-2">Product</th><th className="p-2">Size / Color</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100 align-top">
                    <td className="p-2 text-slate-400">{i + 1}</td>
                    <td className="p-2">
                      <button onClick={() => onProduct(it.id)} className="font-bold text-rose-900 hover:underline text-left inline-flex items-center gap-1">{it.title}<ArrowRight className="w-3 h-3" /></button>
                      {it.storeName && <div className="text-[10px] text-slate-400">Seller: {it.storeName}</div>}
                    </td>
                    <td className="p-2">{it.size} / {it.color}</td>
                    <td className="p-2 text-right">{it.qty}</td>
                    <td className="p-2 text-right">{money(it.price)}</td>
                    <td className="p-2 text-right font-bold">{money(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-3 w-full max-w-[17rem] text-xs space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{money(o.discount)}</span></div>}
            <div className="flex justify-between"><span>Delivery</span><span>{o.delivery ? money(o.delivery) : 'Free'}</span></div>
            <div className="flex justify-between border-t-2 border-rose-950 pt-2 mt-1 text-base font-black text-rose-950"><span>Total</span><span>{money(o.totalAmount)}</span></div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6 pt-3 border-t border-dashed border-slate-200">Thank you for shopping with {shop.brandName}.</p>
        </div>
      </div>
    </div>
  );
}
