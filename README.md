# NewXen (নিউজেন) – Storefront + Admin Panel

React + TypeScript + Tailwind CSS + Vite.

## চালানোর নিয়ম

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
```

## Admin লগইন (ডেমো)

- Email: `admin@newxen.com`
- Password: `newxen@2026`

পাসওয়ার্ড বদলাতে `src/App.tsx`-এর উপরের `ADMIN_PASSWORD` পরিবর্তন করুন।

## লাইভ করার আগে যা বদলাতে হবে (`src/App.tsx` এর CONFIG অংশ)

- `MERCHANT_NUMBER` – আপনার আসল bKash/Nagad নম্বর
- `WHATSAPP_NUMBER` – আপনার WhatsApp নম্বর (৮৮০ কোড সহ)
- ফোন নম্বর ও ফুটার তথ্য
- `COUPON_CODE`, `FREE_DELIVERY_OVER`, ডেলিভারি চার্জ

## গুরুত্বপূর্ণ সীমাবদ্ধতা

এখন সব ডেটা (প্রোডাক্ট, অর্ডার, কার্ট) ব্রাউজারের `localStorage`-এ থাকে এবং অ্যাডমিন লগইন শুধু ফ্রন্টএন্ড ডেমো।
সত্যিকারের ব্যবসার জন্য অর্ডার, প্রোডাক্ট ও লগইন একটি ব্যাকএন্ড/ডেটাবেসে (যেমন Supabase বা Firebase) সরাতে হবে —
না হলে এক ডিভাইসের অর্ডার অন্য ডিভাইসে (এমনকি আপনার অ্যাডমিন প্যানেলেও) দেখা যাবে না।
