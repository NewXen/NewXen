import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag, Heart, Search, X, Plus, Trash2, Edit, ShieldCheck, Truck, Phone, ArrowRight,
  Globe, SlidersHorizontal, Eye, DollarSign, Package, Clock, Lock, LogOut, ChevronLeft,
  ChevronRight, Check, Star, MessageCircle, Tag, AlertTriangle, RotateCcw, Minus, User, Store, ChevronDown, ArrowUp, ArrowDown, EyeOff
} from 'lucide-react';
import { AccountPage, SellerHub, AdminPeople, AuthCard, SignOutBar, RecoveryModal } from './Marketplace';
import { CatIcon, IconPicker } from './extras';
import { BillModal } from './invoice';
import type { SellerProfile, SellerStatus, CustomerProfile, InboxOrder } from './Marketplace';
import ImagePicker from './ImagePicker';
import {
  Backend, NO_BACKEND, initBackend, useLocalStorage, useSynced, byAsc, byDesc, watchSeeded, seedCatalog,
  toTracking, fromTracking
} from './backend';

/* ============================================================
   NEWXEN – Women's Fashion Storefront + Admin Portal
   NOTE: Admin login here is a FRONT-END DEMO only. Before going live,
   move authentication, orders and products to a real backend/database.
   ============================================================ */

// ---------- CONFIG ----------
const ADMIN_EMAIL = 'admin@newxen.com';
const ADMIN_PASSWORD = 'newxen@2026'; // demo only – change & move to backend
const COUPON_CODE = 'NEWXEN15';
const COUPON_PERCENT = 15;
const FREE_DELIVERY_OVER = 5000;
const DELIVERY_INSIDE = 80;
const DELIVERY_OUTSIDE = 150;
const LOW_STOCK_LIMIT = 5;
const FALLBACK_IMG = placeholder('🛍️', '#fecdd3', '#9f1239');

/** Built-in picture used until real photos are uploaded (works without internet). */
function placeholder(emoji: string, c1: string, c2: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><text x='200' y='290' font-size='150' text-anchor='middle'>${emoji}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---------- TYPES ----------
type Lang = 'en' | 'bn';
type Tab = 'shop' | 'tracking' | 'admin' | 'account' | 'seller';
type AdminSection = 'overview' | 'people' | 'settings' | 'orders' | 'products' | 'categories' | 'banners' | 'staff';
export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Category { id: string; nameEn: string; nameBn: string; slug: string; icon: string; sort?: number }
export interface SubCategory { id: string; categoryId: string; nameEn: string; nameBn: string; sort?: number }
interface Banner {
  id: string; titleEn: string; titleBn: string; subtitleEn: string; subtitleBn: string;
  bgGradient: string; image: string; ctaEn: string; ctaBn: string; link?: string; sort?: number; squareImage?: string;
}
export interface Product {
  id: string; titleEn: string; titleBn: string; categoryId: string; subCategoryId: string;
  price: number; regularPrice: number; stock: number; badge: string; rating: number; reviews: number;
  sizes: string[]; colors: string[]; fabric: string; description: string; images: string[]; sort?: number; sellerId?: string; storeName?: string; hidden?: boolean;
}
interface CartItem extends Product { qty: number; size: string; color: string }
export interface OrderItem { id: string; title: string; size: string; color: string; qty: number; price: number; sellerId?: string; storeName?: string }
export interface Order {
  id: string; customerName: string; phone: string; address: string; zone: 'inside_dhaka' | 'outside_dhaka';
  subtotal: number; discount: number; delivery: number; totalAmount: number;
  paymentMethod: string; trxId: string; paymentStatus: string; orderStatus: OrderStatus;
  date: string; items: OrderItem[]; parts?: { sid: string; storeName: string; status: OrderStatus }[]; uid?: string; stockDeducted?: boolean; createdAt?: number;
}
interface Staff { id: string; name: string; email: string; role: string; sort?: number }

// ---------- INITIAL DATA ----------
const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', nameEn: 'Three-Piece & Kamiz', nameBn: 'থ্রি-পিস ও কামিজ', slug: 'three-piece', icon: '👗' },
  { id: 'cat-2', nameEn: 'Sarees', nameBn: 'শাড়ি', slug: 'sarees', icon: '🥻' },
  { id: 'cat-3', nameEn: 'Abaya & Burkha', nameBn: 'আবায়া ও বোরকা', slug: 'abaya-burkha', icon: '🧥' },
  { id: 'cat-4', nameEn: 'Hijab & Orna', nameBn: 'হিজাব ও ওরনা', slug: 'hijab-orna', icon: '🧕' },
  { id: 'cat-5', nameEn: 'Jewelry & Ornaments', nameBn: 'গহনা ও অর্নামেন্টস', slug: 'jewelry', icon: '💎' }
];

const INITIAL_SUBCATEGORIES: SubCategory[] = [
  { id: 'sub-1', categoryId: 'cat-1', nameEn: 'Cotton Kamiz', nameBn: 'কটন কামিজ' },
  { id: 'sub-2', categoryId: 'cat-1', nameEn: 'Designer Three-Piece', nameBn: 'ডিজাইনার থ্রি-পিস' },
  { id: 'sub-3', categoryId: 'cat-2', nameEn: 'Jamdani Saree', nameBn: 'জামদানি শাড়ি' },
  { id: 'sub-4', categoryId: 'cat-2', nameEn: 'Katan & Silk', nameBn: 'কাতান ও সিল্ক' },
  { id: 'sub-5', categoryId: 'cat-3', nameEn: 'Dubai Kaftan Abaya', nameBn: 'দুবাই কাফতান আবায়া' },
  { id: 'sub-6', categoryId: 'cat-3', nameEn: 'Modest Burkha Set', nameBn: 'মডেস্ট বোরকা সেট' },
  { id: 'sub-7', categoryId: 'cat-4', nameEn: 'Chiffon Hijab', nameBn: 'শিফন হিজাব' },
  { id: 'sub-8', categoryId: 'cat-5', nameEn: 'Kundun Necklaces', nameBn: 'কুন্দন নেকলেস' }
];

const INITIAL_BANNERS: Banner[] = [
  {
    id: 'b-1', titleEn: 'Exclusive Eid Collection 2026', titleBn: 'এক্সক্লুসিভ ঈদ কালেকশন ২০২৬',
    subtitleEn: 'Premium Designer Three-Pieces & Silk Sarees', subtitleBn: 'প্রিমিয়াম ডিজাইনার থ্রি-পিস ও সিল্ক শাড়ি',
    bgGradient: 'from-rose-900 via-purple-900 to-slate-900',
    image: '',
    ctaEn: 'Explore Now', ctaBn: 'এখনই কিনুন'
  },
  {
    id: 'b-2', titleEn: 'Royal Abaya & Hijab Luxury', titleBn: 'রয়্যাল আবায়া ও হিজাব কালেকশন',
    subtitleEn: 'Imported Dubai Nidha Fabric & Hand Embroidery', subtitleBn: 'দুবাই নিধা ফ্যাব্রিক ও এম্ব্রয়ডারি কাজ',
    bgGradient: 'from-amber-950 via-rose-950 to-stone-900',
    image: '',
    ctaEn: 'Shop Abayas', ctaBn: 'আবায়া গ্যালারি'
  },
  {
    id: 'b-3', titleEn: 'Handcrafted Bridal Jewelry', titleBn: 'হস্তশিল্প ব্রাইডাল জুয়েলারি',
    subtitleEn: 'Flat 20% OFF on Traditional Katan & Gold Polki Sets', subtitleBn: 'ট্রেডিশনাল পলকি ও কুন্দন সেটে ২০% ছাড়',
    bgGradient: 'from-slate-900 via-rose-950 to-pink-950',
    image: '',
    ctaEn: 'View Ornaments', ctaBn: 'গহনা দেখুন'
  }
];

const GRADIENTS = [
  'from-rose-900 via-purple-900 to-slate-900',
  'from-amber-950 via-rose-950 to-stone-900',
  'from-slate-900 via-rose-950 to-pink-950'
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-101', titleEn: 'Luxury Floral Chiffon Three-Piece', titleBn: 'লক্সারি ফ্লোরাল শিফন থ্রি-পিস',
    categoryId: 'cat-1', subCategoryId: 'sub-2', price: 3450, regularPrice: 4200, stock: 14, badge: 'HOT',
    rating: 4.9, reviews: 28, sizes: ['S', 'M', 'L', 'XL'], colors: ['Rose Pink', 'Emerald Green', 'Deep Navy'],
    fabric: 'Pure Georgette Chiffon with Heavy Embroidery Dupatta',
    description: 'Elevate your festive look with this heavily crafted 3-piece suit featuring zari work and digital silk prints.',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'p-102', titleEn: 'Handloom Pure Dhakai Jamdani Saree', titleBn: 'হ্যান্ডলুম ঢাকাই জামদানি শাড়ি',
    categoryId: 'cat-2', subCategoryId: 'sub-3', price: 6800, regularPrice: 8500, stock: 6, badge: 'NEW',
    rating: 5.0, reviews: 42, sizes: ['Free Size'], colors: ['Maroon Gold', 'Royal Blue'],
    fabric: '100% Authentic Fine Cotton Dhakai Jamdani',
    description: 'Handcrafted by master weavers from Narayanganj. Features traditional floral motifs and rich pallu.',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'p-103', titleEn: 'Dubai Kaftan Butterfly Abaya Set', titleBn: 'দুবাই বাটারফ্লাই আবায়া সেট',
    categoryId: 'cat-3', subCategoryId: 'sub-5', price: 4500, regularPrice: 5200, stock: 20, badge: 'SALE',
    rating: 4.8, reviews: 19, sizes: ['52', '54', '56'], colors: ['Jet Black', 'Dusty Rose', 'Olive Green'],
    fabric: 'Original Dubai Cherry Silk Fabric with Matching Hijab',
    description: 'Breathable, non-transparent flowy silhouette adorned with stone border detailing on sleeves.',
    images: ['https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80']
  },
  {
    id: 'p-104', titleEn: 'Premium Kundun Choker & Earrings Set', titleBn: 'প্রিমিয়াম কুন্দন চোকার ও কানের দুল সেট',
    categoryId: 'cat-5', subCategoryId: 'sub-8', price: 1850, regularPrice: 2400, stock: 12, badge: 'TRENDING',
    rating: 4.7, reviews: 35, sizes: ['Adjustable'], colors: ['Gold Red', 'Gold Pearl'],
    fabric: 'Brass Alloy with Antique Gold Plating & Micro Zircon',
    description: 'Stunning royal necklace set crafted for weddings, bridal events, and special celebrations.',
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80']
  },
  {
    id: 'p-105', titleEn: 'Turkish Bubble Chiffon Instant Hijab', titleBn: 'টার্কিশ বাবল শিফন ইনস্ট্যান্ট হিজাব',
    categoryId: 'cat-4', subCategoryId: 'sub-7', price: 650, regularPrice: 850, stock: 45, badge: 'POPULAR',
    rating: 4.9, reviews: 64, sizes: ['Standard'], colors: ['Nude Pink', 'Mocha', 'Charcoal', 'Burgundy'],
    fabric: 'Stretchable Georgette Bubble Chiffon',
    description: 'Pinless, non-slip comfortable daily wear hijab with breathable texture and elegant drape.',
    images: ['https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80']
  },
  {
    id: 'p-106', titleEn: 'Katan Silk Party Wear Kurti', titleBn: 'কাতান সিল্ক পার্টি ওয়্যার কুর্তি',
    categoryId: 'cat-1', subCategoryId: 'sub-1', price: 2250, regularPrice: 2800, stock: 9, badge: 'HOT',
    rating: 4.6, reviews: 14, sizes: ['M', 'L', 'XL'], colors: ['Wine Red', 'Royal Gold'],
    fabric: 'Semi-Silk Katan with Thread Embroidery Work',
    description: 'Stylish single kamiz featuring round neck, full sleeves, and modern cut suitable for formal wear.',
    images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80']
  }
];

const PH_BY_CAT: Record<string, [string, string, string]> = {
  'cat-1': ['👗', '#fecdd3', '#9f1239'], 'cat-2': ['🥻', '#fde68a', '#881337'], 'cat-3': ['🧥', '#fda4af', '#1e293b'],
  'cat-4': ['🧕', '#fbcfe8', '#881337'], 'cat-5': ['💎', '#fde68a', '#4c0519']
};
const SEED_PRODUCTS: Product[] = INITIAL_PRODUCTS.map((p) => {
  const [e, c1, c2] = PH_BY_CAT[p.categoryId] || ['🛍️', '#fecdd3', '#9f1239'];
  return { ...p, images: [placeholder(e, c1, c2)] };
});

const INITIAL_ORDERS: Order[] = [
  {
    id: 'NX-9821', customerName: 'Nusrat Jahan', phone: '01712345678', address: 'House 42, Road 11, Banani, Dhaka',
    zone: 'inside_dhaka', subtotal: 3450, discount: 0, delivery: 80, totalAmount: 3530, paymentMethod: 'bKash',
    trxId: '9K3L2M1N0P', paymentStatus: 'Paid', orderStatus: 'Processing', stockDeducted: true, date: '28/03/2026, 14:32',
    items: [{ id: 'p-101', title: 'Luxury Floral Chiffon Three-Piece', size: 'M', color: 'Rose Pink', qty: 1, price: 3450 }]
  },
  {
    id: 'NX-9822', customerName: 'Sultana Razia', phone: '01898765432', address: 'GEC Circle, Nasirabad, Chattogram',
    zone: 'outside_dhaka', subtotal: 4500, discount: 0, delivery: 150, totalAmount: 4650, paymentMethod: 'COD',
    trxId: '', paymentStatus: 'Pending', orderStatus: 'Pending', date: '29/03/2026, 10:15',
    items: [{ id: 'p-103', title: 'Dubai Kaftan Butterfly Abaya Set', size: '54', color: 'Jet Black', qty: 1, price: 4500 }]
  }
];

const INITIAL_STAFF: Staff[] = [
  { id: 'st-1', name: 'Super Admin', email: 'admin@newxen.com', role: 'Super Admin' },
  { id: 'st-2', name: 'Manager Nusrat', email: 'nusrat@newxen.com', role: 'Sub-Admin' }
];

const STATUS_STEPS: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STATUS_BN: Record<OrderStatus, string> = {
  Pending: 'পেন্ডিং', Processing: 'প্রসেসিং', Shipped: 'শিপড', Delivered: 'ডেলিভার্ড', Cancelled: 'বাতিল'
};

// ---------- HELPERS ----------
const isValidBDPhone = (p: string) => /^(?:\+?88)?01[3-9]\d{8}$/.test(p.replace(/[\s-]/g, ''));
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-900';

interface ProductForm {
  titleEn: string; titleBn: string; categoryId: string; subCategoryId: string; price: string; regularPrice: string;
  stock: string; badge: string; sizes: string; colors: string; fabric: string; description: string; images: string[];
}
const emptyForm = (categoryId: string): ProductForm => ({
  titleEn: '', titleBn: '', categoryId, subCategoryId: '', price: '', regularPrice: '', stock: '15', badge: 'NEW',
  sizes: 'Free Size', colors: 'Standard', fabric: '', description: '', images: []
});

// ============================================================

// ---------- SITE SETTINGS (editable from Admin > Site Settings) ----------
interface QuickLink { id: string; labelEn: string; labelBn: string; target: string } // 'shop' | 'tracking' | 'cat:<id>' | 'url:https://...'
interface PayMethod { id: string; name: string; type: 'cod' | 'mobile'; enabled: boolean; number: string; note: string }
interface Settings {
  brandName: string; brandBn: string; taglineEn: string; taglineBn: string;
  announceEn: string; announceBn: string; couponCode: string; couponPercent: number;
  freeDeliveryOver: number; deliveryInside: number; deliveryOutside: number;
  phone: string; whatsapp: string; email: string; address: string; facebook: string; instagram: string;
  deliveryNoteEn: string; deliveryNoteBn: string;
  footerEn: string; footerBn: string; returnEn: string; returnBn: string; returnShortEn: string; returnShortBn: string;
  quickLinks: QuickLink[]; payments: PayMethod[];
}
const DEFAULT_SETTINGS: Settings = {
  brandName: 'NewXen', brandBn: 'নিউজেন', taglineEn: "Women's Fashion & Lifestyle", taglineBn: 'মহিলাদের ফ্যাশন ও লাইফস্টাইল',
  announceEn: '', announceBn: '', couponCode: COUPON_CODE, couponPercent: COUPON_PERCENT,
  freeDeliveryOver: FREE_DELIVERY_OVER, deliveryInside: DELIVERY_INSIDE, deliveryOutside: DELIVERY_OUTSIDE,
  phone: '+880 1700-000000', whatsapp: '01700000000', email: '', address: '', facebook: '', instagram: '',
  deliveryNoteEn: 'Fast Delivery Nationwide', deliveryNoteBn: 'সারা বাংলাদেশে দ্রুত ডেলিভারি',
  footerEn: 'Premium Bangladeshi women’s fashion store delivering handloom sarees, three-pieces, abayas, and bridal jewelry directly to your doorstep.',
  footerBn: 'প্রিমিয়াম বাংলাদেশি নারীদের ফ্যাশন ব্র্যান্ড। হাতের তৈরি শাড়ি, থ্রি-পিস, আবায়া ও গহনার বিশ্বস্ত প্রতিষ্ঠান।',
  returnEn: 'Return policy: 7 days for unused items with tags', returnBn: 'রিটার্ন পলিসি: ট্যাগসহ অব্যবহৃত পণ্য ৭ দিনের মধ্যে',
  returnShortEn: '7-day return policy', returnShortBn: '৭ দিনের রিটার্ন',
  quickLinks: [
    { id: 'ql-1', labelEn: 'Eid Collection 2026', labelBn: 'ঈদ কালেকশন', target: 'cat:cat-1' },
    { id: 'ql-2', labelEn: 'Jamdani Saree Festival', labelBn: 'জামদানি মেলা', target: 'cat:cat-2' },
    { id: 'ql-3', labelEn: 'Dubai Abaya Line', labelBn: 'দুবাই আবায়া সিরিজ', target: 'cat:cat-3' },
    { id: 'ql-4', labelEn: 'Track Your Order', labelBn: 'অর্ডার ট্র্যাকিং', target: 'tracking' }
  ],
  payments: [
    { id: 'pay-cod', name: 'COD', type: 'cod', enabled: true, number: '', note: '' },
    { id: 'pay-bkash', name: 'bKash', type: 'mobile', enabled: true, number: '01700-000000', note: '' },
    { id: 'pay-nagad', name: 'Nagad', type: 'mobile', enabled: true, number: '01700-000000', note: '' }
  ]
};
const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : '');
const waDigits = (n: string) => { const d = n.replace(/\D/g, ''); return d.startsWith('0') ? '88' + d : d; };

function Field(props: {
  label: string; value: string | number; onChange: (v: string) => void; placeholder?: string;
  rows?: number; hint?: string; type?: string;
}) {
  const cls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-900';
  return (
    <div>
      <label className="font-bold text-slate-700 block mb-1">{props.label}</label>
      {props.rows ? (
        <textarea rows={props.rows} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} className={cls} />
      ) : (
        <input type={props.type || 'text'} min={props.type === 'number' ? 0 : undefined} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} className={cls} />
      )}
      {props.hint && <p className="text-[10px] text-slate-400 mt-1">{props.hint}</p>}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useLocalStorage<Lang>('nx_lang', 'en');
  const [activeTab, setActiveTab] = useState<Tab>('shop');

  // Persistent data
  // ---- backend: shared database + photo uploads when running inside claude.ai ----
  const [backend, setBackend] = useState<Backend>(NO_BACKEND);
  const [bReady, setBReady] = useState(false);
  const [seeded, setSeeded] = useState<boolean | null>(null);
  useEffect(() => { initBackend().then((b) => { setBackend(b); setBReady(true); }); }, []);
  useEffect(() => (backend.db ? watchSeeded(backend, setSeeded) : undefined), [backend]);

  const [products, setProducts] = useSynced<Product>('products', SEED_PRODUCTS, backend, seeded, byDesc, 'nx_products');
  const [categories, setCategories] = useSynced<Category>('categories', INITIAL_CATEGORIES, backend, seeded, byAsc, 'nx_categories');
  const [subCategories, setSubCategories] = useSynced<SubCategory>('subcategories', INITIAL_SUBCATEGORIES, backend, seeded, byAsc, 'nx_subcategories');
  const [banners, setBanners] = useSynced<Banner>('banners', INITIAL_BANNERS, backend, seeded, byAsc, 'nx_banners');
  const [staffList, setStaffList] = useSynced<Staff>('staff', INITIAL_STAFF, backend, seeded, byAsc, 'nx_staff', backend.isAdmin);

  // site settings (contact info, quick links, payment options, offers...) live in one shared document
  const [localSettings, setLocalSettings] = useLocalStorage<Partial<Settings>>('nx_settings', {});
  const [remoteSettings, setRemoteSettings] = useState<Partial<Settings> | null>(null);
  const [settingsWait, setSettingsWait] = useState(true);
  useEffect(() => { const id = setTimeout(() => setSettingsWait(false), 4000); return () => clearTimeout(id); }, []);
  useEffect(() => {
    if (!backend.db) return;
    const unsub = backend.db.doc('settings/site').onSnapshot(
      (snap: any) => setRemoteSettings(snap.exists ? (snap.data() as Partial<Settings>) : {}),
      () => setRemoteSettings({})
    );
    return () => unsub();
  }, [backend]);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...((backend.db ? remoteSettings : localSettings) || {}) };
  const S = settings;
  const saveSettings = async (next: Settings): Promise<boolean> => {
    if (!backend.db) { setLocalSettings(next); return true; }
    try { await backend.db.doc('settings/site').set(JSON.parse(JSON.stringify(next))); return true; } catch { return false; }
  };

  // ---- marketplace: sellers, their products, customers ----
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [sellerStatuses, setSellerStatuses] = useState<Record<string, SellerStatus>>({});
  const [sellerItems, setSellerItems] = useState<Record<string, Product[]>>({});
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [myProfile, setMyProfile] = useState<CustomerProfile | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [inbox, setInbox] = useState<InboxOrder[]>([]);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [saveDetails, setSaveDetails] = useState(true);
  const uid = backend.uid;

  useEffect(() => {
    if (!backend.db) return;
    const u1 = backend.db.collection('sellers').onSnapshot(
      (snap: any) => setSellerProfiles(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as SellerProfile)), () => setSellerProfiles([]));
    const u2 = backend.db.collection('sellerStatus').onSnapshot(
      (snap: any) => { const m: Record<string, SellerStatus> = {}; snap.docs.forEach((d: any) => { m[d.id] = d.data(); }); setSellerStatuses(m); }, () => setSellerStatuses({}));
    return () => { u1(); u2(); };
  }, [backend]);

  const approvedIds = sellerProfiles.filter((p) => sellerStatuses[p.id]?.status === 'approved').map((p) => p.id);
  const approvedKey = approvedIds.sort().join(',');
  useEffect(() => {
    if (!backend.db || !approvedKey) { setSellerItems({}); return; }
    const unsubs = approvedKey.split(',').map((id) =>
      backend.db.collection(`sellerProducts/${id}/items`).onSnapshot(
        (snap: any) => setSellerItems((m) => ({ ...m, [id]: snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as Product) })),
        () => setSellerItems((m) => ({ ...m, [id]: [] }))
      ));
    return () => unsubs.forEach((u: () => void) => u());
  }, [backend, approvedKey]);

  useEffect(() => {
    if (!backend.db || !backend.isAdmin) return;
    const u = backend.db.collection('customers').onSnapshot(
      (snap: any) => setCustomers(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as CustomerProfile)), () => setCustomers([]));
    return () => u();
  }, [backend]);

  useEffect(() => {
    if (!backend.db || !uid) return;
    const u1 = backend.db.doc(`customers/${uid}`).onSnapshot((s: any) => setMyProfile(s.exists ? (s.data() as CustomerProfile) : null), () => setMyProfile(null));
    const u2 = backend.db.doc(`orders/${uid}`).onSnapshot(
      (s: any) => setMyOrders(s.exists ? ((((s.data() as any).orders as Order[]) || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) : []), () => setMyOrders([]));
    return () => { u1(); u2(); };
  }, [backend, uid]);

  const myStatus = uid ? sellerStatuses[uid]?.status : undefined;
  useEffect(() => {
    if (!backend.db || !uid || myStatus !== 'approved') { setInbox([]); return; }
    const u = backend.db.collection(`sellerInbox/${uid}/orders`).onSnapshot(
      (snap: any) => setInbox(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as InboxOrder).sort((a: InboxOrder, b: InboxOrder) => (b.createdAt || 0) - (a.createdAt || 0))),
      () => setInbox([]));
    return () => u();
  }, [backend, uid, myStatus]);

  const sellerCatalog: Product[] = approvedIds.flatMap((id) => {
    const sp = sellerProfiles.find((p) => p.id === id);
    return (sellerItems[id] || []).map((p) => ({ ...p, sellerId: id, storeName: sp?.storeName || 'Seller' }));
  });
  const allProducts: Product[] = [...products, ...sellerCatalog];
  const catalogProducts: Product[] = allProducts.filter((p) => !p.hidden); // what shoppers see (Live only)
  const clean = (v: any) => JSON.parse(JSON.stringify(v));

  const saveCustomerProfile = async (p: CustomerProfile): Promise<boolean> => {
    if (!backend.db || !uid) return false;
    try { await backend.db.doc(`customers/${uid}`).set(clean({ name: p.name, phone: p.phone, address: p.address, zone: p.zone, updatedAt: Date.now() })); return true; } catch { return false; }
  };
  const saveSellerProfile = async (p: Omit<SellerProfile, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!backend.db || !uid) return false;
    const mine = sellerProfiles.find((x) => x.id === uid);
    try { await backend.db.doc(`sellers/${uid}`).set(clean({ ...p, createdAt: mine?.createdAt || Date.now() })); return true; } catch { return false; }
  };
  const saveSellerProduct = async (p: Product): Promise<boolean> => {
    if (!backend.db || !uid) return false;
    const { sellerId: _a, storeName: _b, ...rest } = p;
    try { await backend.db.doc(`sellerProducts/${uid}/items/${p.id}`).set(clean(rest)); return true; } catch { return false; }
  };
  const deleteSellerProduct = async (id: string): Promise<boolean> => {
    if (!backend.db || !uid) return false;
    try { await backend.db.doc(`sellerProducts/${uid}/items/${id}`).delete(); return true; } catch { return false; }
  };
  const setSellerStatus = async (id: string, status: SellerStatus['status'], note: string): Promise<boolean> => {
    if (!backend.db) return false;
    try { await backend.db.doc(`sellerStatus/${id}`).set(clean({ status, note, at: Date.now() })); return true; } catch { return false; }
  };
  const inboxStatus = async (o: InboxOrder, status: OrderStatus): Promise<boolean> => {
    if (!backend.db || !uid) return false;
    const want = status !== 'Pending' && status !== 'Cancelled';
    const had = !!o.stockDeducted;
    try {
      if (want !== had) {
        const need = new Map<string, number>();
        o.items.forEach((it) => need.set(it.id, (need.get(it.id) || 0) + it.qty));
        const mine = sellerItems[uid] || [];
        if (want) {
          for (const [pid, q] of need) {
            const p = mine.find((x) => x.id === pid);
            if (p && p.stock < q) { showToast(`Not enough stock for "${p.titleEn}"`); return false; }
          }
        }
        for (const [pid, q] of need) {
          const p = mine.find((x) => x.id === pid);
          if (!p) continue;
          const { sellerId: _a, storeName: _b, ...rest } = p;
          await backend.db.doc(`sellerProducts/${uid}/items/${pid}`).set(clean({ ...rest, stock: Math.max(0, p.stock + (want ? -q : q)) }));
        }
      }
      await backend.db.doc(`sellerInbox/${uid}/orders/${o.id}`).set(clean({ ...o, status, stockDeducted: want }));
      const tr = await backend.db.doc(`tracking/${o.id}`).get();
      if (tr.exists) {
        const d = tr.data() as any;
        const parts = ((d.parts || []) as any[]).map((p) => (p.sid === uid ? { ...p, status } : p));
        await backend.db.doc(`tracking/${o.id}`).set(clean({ ...d, parts }));
      }
      return true;
    } catch { return false; }
  };

  // fill the checkout form from the saved account details
  useEffect(() => {
    if (!myProfile) return;
    setCheckout((c) => (c.name || c.phone || c.address ? c : { ...c, name: myProfile.name || '', phone: myProfile.phone || '', address: myProfile.address || '', zone: myProfile.zone || 'inside_dhaka' }));
  }, [myProfile]);

  // first time the owner opens the page: fill the shared store with the sample catalog
  const seedingRef = useRef(false);
  useEffect(() => {
    if (!backend.db || !backend.isAdmin || seeded !== false || seedingRef.current) return;
    seedingRef.current = true;
    seedCatalog(backend, {
      products: SEED_PRODUCTS, categories: INITIAL_CATEGORIES, subCategories: INITIAL_SUBCATEGORIES,
      banners: INITIAL_BANNERS, staff: INITIAL_STAFF
    }).catch(() => { seedingRef.current = false; });
  }, [backend, seeded]);

  // orders: customers write only their own document; only the owner/editors read them all
  const [localOrders, setLocalOrders] = useLocalStorage<Order[]>('nx_orders', INITIAL_ORDERS);
  const [remoteOrders, setRemoteOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!backend.db || !backend.isAdmin) return;
    const unsub = backend.db.collection('orders').onSnapshot(
      (snap: any) => {
        const all: Order[] = [];
        snap.docs.forEach((d: any) => (((d.data() as any).orders as Order[]) || []).forEach((o) => all.push({ ...o, uid: o.uid || d.id })));
        all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRemoteOrders(all);
      },
      () => setRemoteOrders([])
    );
    return () => unsub();
  }, [backend]);
  const orders = backend.db ? remoteOrders : localOrders;
  const setOrders = (next: Order[]) => {
    if (!backend.db) { setLocalOrders(next); return; }
    const prev = new Map(remoteOrders.map((o) => [o.id, o]));
    const uids = new Set<string>();
    next.forEach((o) => { const p = prev.get(o.id); if (o.uid && (!p || JSON.stringify(p) !== JSON.stringify(o))) uids.add(o.uid); });
    setRemoteOrders(next);
    (async () => {
      for (const uid of uids) await backend.db.doc(`orders/${uid}`).set({ orders: JSON.parse(JSON.stringify(next.filter((o) => o.uid === uid))) });
    })().catch(() => showToast('Could not save the change. Check your connection and try again.'));
  };
  const syncTracking = async (o: Order) => {
    if (!backend.db) return;
    try {
      const cur = await backend.db.doc(`tracking/${o.id}`).get();
      let parts = (cur.exists ? (cur.data() as any).parts : o.parts) || [];
      if (o.orderStatus === 'Cancelled') parts = parts.map((p: any) => ({ ...p, status: 'Cancelled' }));
      await backend.db.doc(`tracking/${o.id}`).set({ ...toTracking(o), parts: JSON.parse(JSON.stringify(parts)) });
    } catch { showToast('Could not update the customer tracking page'); }
  };
  const placeOrderRemote = async (o: Order) => {
    if (!backend.db) { setLocalOrders([o, ...localOrders]); return; }
    if (!backend.uid) throw new Error('signin');
    const order = { ...o, uid: backend.uid };
    const ref = backend.db.doc(`orders/${backend.uid}`);
    const snap = await ref.get();
    const prev: Order[] = snap.exists ? (((snap.data() as any).orders as Order[]) || []) : [];
    await ref.set({ orders: JSON.parse(JSON.stringify([order, ...prev])) });
    await backend.db.doc(`tracking/${o.id}`).set(toTracking(order));
  };

  const [cart, setCart] = useLocalStorage<CartItem[]>('nx_cart', []);
  const [wishlist, setWishlist] = useLocalStorage<string[]>('nx_wishlist', []);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSub, setSelectedSub] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState(10000);
  const [sortBy, setSortBy] = useState('default');

  // UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [qvSize, setQvSize] = useState('');
  const [qvColor, setQvColor] = useState('');
  const [qvQty, setQvQty] = useState(1);
  const [qvImg, setQvImg] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [toast, setToast] = useState('');
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  // Tracking
  const [trackId, setTrackId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState(false);

  // Admin
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const goToProduct = (id: string) => {
    const p = allProducts.find((x) => x.id === id);
    if (!p) { showToast('This product is no longer in the shop'); return; }
    setBillOrder(null);
    openQuickView(p);
  };
  const editProductFromOrder = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) { showToast('Only your own products can be edited here'); return; }
    setAdminSection('products');
    openProductForm(p);
  };
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<ProductForm>(emptyForm('cat-1'));
  const [orderFilter, setOrderFilter] = useState<'All' | OrderStatus>('All');

  // Checkout form
  const [checkout, setCheckout] = useState({
    name: '', phone: '', address: '', zone: 'inside_dhaka' as 'inside_dhaka' | 'outside_dhaka',
    paymentMethod: 'COD', trxId: ''
  });
  const [checkoutError, setCheckoutError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const emptyBanner = { id: '', titleEn: '', titleBn: '', subtitleEn: '', subtitleBn: '', ctaEn: 'Shop Now', ctaBn: 'কিনুন', link: 'shop', bgGradient: GRADIENTS[0], image: '', squareImage: '' };
  const [bForm, setBForm] = useState(emptyBanner);
  useEffect(() => {
    if (!menuOpen) return;
    const down = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [menuOpen]);
  const [confirmDlg, setConfirmDlg] = useState<{ msg: string; onYes: () => void } | null>(null);
  const askConfirm = (msg: string, onYes: () => void) => setConfirmDlg({ msg, onYes });
  const [sDraft, setSDraft] = useState<Settings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const payOptions = S.payments.filter((p) => p.enabled);
  const activePay = payOptions.find((p) => p.name === checkout.paymentMethod) || payOptions[0];
  const goLink = (target: string) => {
    if (target.startsWith('cat:')) { pickCategory(target.slice(4)); setTimeout(scrollToProducts, 60); }
    else if (target === 'tracking') { setActiveTab('tracking'); window.scrollTo({ top: 0 }); }
    else { pickCategory('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  const t = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    const h = () => showToast('Could not save. Check that you are signed in as the owner, then try again.');
    window.addEventListener('nx-save-error', h);
    return () => window.removeEventListener('nx-save-error', h);
  }, []);

  // Hero auto-slide
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);
  useEffect(() => {
    if (currentSlide >= banners.length) setCurrentSlide(0);
  }, [banners.length, currentSlide]);

  // Lock body scroll when overlays open
  const overlayOpen = isCartOpen || isWishlistOpen || isCheckoutOpen || !!quickView || !!successOrder || productFormOpen;
  useEffect(() => {
    document.body.style.overflow = overlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [overlayOpen]);

  // ---------- CART LOGIC ----------
  const stockOf = (id: string) => catalogProducts.find((p) => p.id === id)?.stock ?? 0;

  const addToCart = (product: Product, size?: string, color?: string, qty = 1) => {
    if (product.stock <= 0) { showToast(t('Sorry, this item is out of stock', 'দুঃখিত, পণ্যটি স্টকে নেই')); return; }
    const s = size || product.sizes[0] || 'Free';
    const c = color || product.colors[0] || 'Standard';
    const existing = cart.find((i) => i.id === product.id && i.size === s && i.color === c);
    const inCart = cart.filter((i) => i.id === product.id).reduce((a, b) => a + b.qty, 0);
    if (inCart + qty > product.stock) {
      showToast(t(`Only ${product.stock} pcs available`, `মাত্র ${product.stock}টি স্টকে আছে`));
      return;
    }
    if (existing) {
      setCart(cart.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i)));
    } else {
      setCart([...cart, { ...product, qty, size: s, color: c }]);
    }
    setIsCartOpen(true);
  };

  const updateCartQty = (index: number, delta: number) => {
    const item = cart[index];
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty > stockOf(item.id)) { showToast(t('Stock limit reached', 'স্টকের সীমা পৌঁছে গেছে')); return; }
    setCart(cart.map((it, i) => (i === index ? { ...it, qty: newQty } : it)).filter((it) => it.qty > 0));
  };
  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const toggleWishlist = (id: string) =>
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cartSubtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discount = couponApplied ? Math.round((cartSubtotal * S.couponPercent) / 100) : 0;
  const freeDelivery = cartSubtotal > S.freeDeliveryOver;
  const deliveryCharge = freeDelivery ? 0 : checkout.zone === 'inside_dhaka' ? S.deliveryInside : S.deliveryOutside;
  const cartTotal = cartSubtotal - discount + deliveryCharge;
  const cartCount = cart.reduce((a, b) => a + b.qty, 0);

  const applyCoupon = () => {
    if (couponInput.trim().toUpperCase() === S.couponCode) {
      setCouponApplied(true);
      showToast(t(`Coupon applied: ${S.couponPercent}% OFF`, `কুপন প্রয়োগ হয়েছে: ${S.couponPercent}% ছাড়`));
    } else {
      setCouponApplied(false);
      showToast(t('Invalid coupon code', 'কুপন কোডটি সঠিক নয়'));
    }
  };

  // ---------- QUICK VIEW ----------
  const openQuickView = (p: Product) => {
    setQuickView(p);
    setQvSize(p.sizes[0] || '');
    setQvColor(p.colors[0] || '');
    setQvQty(1);
    setQvImg(0);
  };

  // ---------- FILTERING ----------
  const visibleSubs = subCategories.filter((s) => s.categoryId === selectedCategory);
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogProducts
      .filter((p) => {
        const matchesStore = !storeFilter || p.sellerId === storeFilter;
        const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
        const matchesSub = selectedSub === 'all' || p.subCategoryId === selectedSub;
        const matchesSearch = !q || p.titleEn.toLowerCase().includes(q) || p.titleBn.includes(searchQuery.trim()) || p.fabric.toLowerCase().includes(q);
        return matchesStore && matchesCat && matchesSub && matchesSearch && p.price <= priceFilter;
      })
      .sort((a, b) => {
        if (sortBy === 'low-high') return a.price - b.price;
        if (sortBy === 'high-low') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [products, sellerItems, sellerProfiles, sellerStatuses, storeFilter, selectedCategory, selectedSub, searchQuery, priceFilter, sortBy]);

  const pickCategory = (id: string) => {
    setSelectedCategory(id);
    setSelectedSub('all');
    setStoreFilter(null);
    setActiveTab('shop');
  };
  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pickSub = (catId: string, subId: string) => {
    setSelectedCategory(catId);
    setSelectedSub(subId);
    setStoreFilter(null);
    setActiveTab('shop');
    setMenuOpen(false);
    setTimeout(scrollToProducts, 60);
  };
  const saveBanner = () => {
    if (!bForm.titleEn.trim()) { showToast('Enter a banner title'); return; }
    const data: Banner = {
      id: bForm.id || `b-${Date.now()}`, titleEn: bForm.titleEn.trim(), titleBn: bForm.titleBn.trim() || bForm.titleEn.trim(),
      subtitleEn: bForm.subtitleEn.trim(), subtitleBn: bForm.subtitleBn.trim() || bForm.subtitleEn.trim(),
      ctaEn: bForm.ctaEn.trim() || 'Shop Now', ctaBn: bForm.ctaBn.trim() || bForm.ctaEn.trim() || 'কিনুন',
      link: bForm.link || 'shop', bgGradient: bForm.bgGradient, image: bForm.image, squareImage: bForm.squareImage || ''
    };
    setBanners(bForm.id ? banners.map((b) => (b.id === bForm.id ? { ...b, ...data } : b)) : [...banners, data]);
    showToast(bForm.id ? 'Banner updated' : 'Banner added');
    setBForm(emptyBanner);
  };
  const moveBanner = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= banners.length) return;
    const next = [...banners];
    [next[i], next[j]] = [next[j], next[i]];
    setBanners(next.map((b, idx) => ({ ...b, sort: idx })));
  };

  // ---------- PLACE ORDER ----------
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (placing) return;
    setCheckoutError('');
    if (cart.length === 0) return;
    if (!isValidBDPhone(checkout.phone)) {
      setCheckoutError(t('Enter a valid Bangladeshi mobile number (e.g. 017xxxxxxxx)', 'সঠিক মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)'));
      return;
    }
    if (activePay?.type === 'mobile' && checkout.trxId.trim().length < 6) {
      setCheckoutError(t('Please enter the Transaction ID after sending money', 'টাকা পাঠানোর পর ট্রানজেকশন আইডি দিন'));
      return;
    }
    for (const item of cart) {
      if (item.qty > stockOf(item.id)) {
        setCheckoutError(t(`"${item.titleEn}" is no longer available in that quantity`, `"${item.titleBn}" এই পরিমাণে আর স্টকে নেই`));
        return;
      }
    }
    const id = `NX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id, customerName: checkout.name.trim(), phone: checkout.phone.trim(), address: checkout.address.trim(),
      zone: checkout.zone, subtotal: cartSubtotal, discount, delivery: deliveryCharge, totalAmount: cartTotal,
      paymentMethod: activePay?.name || 'COD', trxId: activePay?.type === 'mobile' ? checkout.trxId.trim() : '',
      paymentStatus: activePay?.type === 'mobile' ? 'Paid (Verification Pending)' : 'Pending',
      orderStatus: 'Pending', date: new Date().toLocaleString('en-GB'), createdAt: Date.now(), stockDeducted: false,
      items: cart.map((i) => ({ id: i.id, title: i.titleEn, size: i.size, color: i.color, qty: i.qty, price: i.price, ...(i.sellerId ? { sellerId: i.sellerId, storeName: i.storeName } : {}) })),
      parts: Array.from(new Map(cart.filter((i) => i.sellerId).map((i) => [i.sellerId as string, { sid: i.sellerId as string, storeName: i.storeName || 'Seller', status: 'Pending' as OrderStatus }])).values())
    };
    setPlacing(true);
    try {
      await placeOrderRemote(newOrder);
    } catch (err: any) {
      setPlacing(false);
      setCheckoutError(
        err?.message === 'signin'
          ? (backend.auth ? t('Please sign in first (Account tab), then place your order.', 'আগে সাইন ইন করুন (অ্যাকাউন্ট ট্যাব), তারপর অর্ডার দিন।') : t('Please sign in to claude.ai to place an order in this preview.', 'এই প্রিভিউতে অর্ডার করতে claude.ai-তে সাইন ইন করুন।'))
          : t('Could not place the order. Check your connection and try again.', 'অর্ডার করা যায়নি। ইন্টারনেট চেক করে আবার চেষ্টা করুন।')
      );
      return;
    }
    setPlacing(false);
    if (saveDetails && backend.db && uid) saveCustomerProfile({ name: newOrder.customerName, phone: newOrder.phone, address: newOrder.address, zone: newOrder.zone });
    setSuccessOrder(newOrder);
    setCart([]);
    setCouponApplied(false);
    setCouponInput('');
    setCheckout({ name: '', phone: '', address: '', zone: 'inside_dhaka', paymentMethod: 'COD', trxId: '' });
    setIsCheckoutOpen(false);
  };

  // ---------- TRACKING ----------
  const doTrack = async (idArg?: string) => {
    const val = (idArg ?? trackId).trim().toUpperCase();
    setTrackedOrder(null);
    setTrackError(false);
    if (!/^[A-Z0-9-]{3,20}$/.test(val)) { setTrackError(true); return; }
    if (backend.db) {
      try {
        const snap = await backend.db.doc(`tracking/${val}`).get();
        if (snap.exists) setTrackedOrder(fromTracking(snap.data()) as Order);
        else setTrackError(true);
      } catch {
        setTrackError(true);
      }
      return;
    }
    const found = orders.find((o) => o.id.toUpperCase() === val);
    setTrackedOrder(found || null);
    setTrackError(!found);
  };

  // ---------- ADMIN ----------
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim().toLowerCase() === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setAdminLoggedIn(true);
      setLoginError('');
      setLoginPass('');
    } else {
      setLoginError('Incorrect email or password');
    }
  };

  const changeOrderStatus = (order: Order, status: OrderStatus) => {
    // stock is taken when staff confirm the order (anything past Pending) and returned on cancel
    const want = status !== 'Pending' && status !== 'Cancelled';
    const had = !!order.stockDeducted;
    if (want && !had) {
      const short = order.items.find((it) => !it.sellerId && stockOf(it.id) < it.qty);
      if (short) { showToast(`Not enough stock for "${short.title}"`); return; }
    }
    if (want !== had) {
      const sign = want ? -1 : 1;
      setProducts(products.map((p) => {
        const qty = order.items.filter((i) => !i.sellerId && i.id === p.id).reduce((a, b) => a + b.qty, 0);
        return qty ? { ...p, stock: Math.max(0, p.stock + sign * qty) } : p;
      }));
    }
    const paymentStatus = status === 'Delivered' && order.paymentStatus === 'Pending' ? 'Paid' : order.paymentStatus;
    const updated: Order = { ...order, orderStatus: status, paymentStatus, stockDeducted: want };
    setOrders(orders.map((o) => (o.id === order.id ? updated : o)));
    syncTracking(updated);
    // sellers receive their part of the order once the store confirms it, and lose it again if it is cancelled
    const sellerIds = Array.from(new Set(order.items.filter((i) => i.sellerId).map((i) => i.sellerId as string)));
    if (backend.db && sellerIds.length) {
      (async () => {
        for (const sid of sellerIds) {
          const items = order.items.filter((i) => i.sellerId === sid);
          const ref = backend.db.doc(`sellerInbox/${sid}/orders/${order.id}`);
          const cur = await ref.get();
          if (status === 'Cancelled') {
            if (!cur.exists) continue;
            const d = cur.data() as any;
            if (d.stockDeducted) {
              for (const it of items) {
                const p = (sellerItems[sid] || []).find((x) => x.id === it.id);
                if (!p) continue;
                const { sellerId: _a, storeName: _b, ...rest } = p;
                await backend.db.doc(`sellerProducts/${sid}/items/${p.id}`).set(clean({ ...rest, stock: p.stock + it.qty }));
              }
            }
            await ref.set(clean({ ...d, status: 'Cancelled', stockDeducted: false }));
          } else if (status !== 'Pending' && !cur.exists) {
            await ref.set(clean({
              id: order.id, items, customerName: order.customerName, phone: order.phone, address: order.address, zone: order.zone,
              paymentMethod: order.paymentMethod, paymentStatus: updated.paymentStatus, status: 'Pending', stockDeducted: false,
              createdAt: order.createdAt || Date.now(), date: order.date, total: items.reduce((a, i) => a + i.price * i.qty, 0)
            }));
          }
        }
      })().catch(() => showToast('Could not update the sellers about this order'));
    }
  };

  const openProductForm = (p?: Product) => {
    if (p) {
      setEditingId(p.id);
      setPForm({
        titleEn: p.titleEn, titleBn: p.titleBn, categoryId: p.categoryId, subCategoryId: p.subCategoryId,
        price: String(p.price), regularPrice: String(p.regularPrice), stock: String(p.stock), badge: p.badge,
        sizes: p.sizes.join(', '), colors: p.colors.join(', '), fabric: p.fabric, description: p.description,
        images: [...p.images]
      });
    } else {
      setEditingId(null);
      setPForm(emptyForm(categories[0]?.id || ''));
    }
    setProductFormOpen(true);
  };

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(pForm.price);
    const regular = Number(pForm.regularPrice) || price;
    const existing = products.find((p) => p.id === editingId);
    const data: Product = {
      id: editingId || `p-${Date.now()}`,
      titleEn: pForm.titleEn.trim(),
      titleBn: pForm.titleBn.trim() || pForm.titleEn.trim(),
      categoryId: pForm.categoryId,
      subCategoryId: pForm.subCategoryId,
      price, regularPrice: regular < price ? price : regular,
      stock: Math.max(0, Number(pForm.stock) || 0),
      badge: pForm.badge.trim(),
      rating: existing?.rating ?? 5.0,
      reviews: existing?.reviews ?? 0,
      sizes: splitList(pForm.sizes).length ? splitList(pForm.sizes) : ['Free Size'],
      colors: splitList(pForm.colors).length ? splitList(pForm.colors) : ['Standard'],
      fabric: pForm.fabric.trim(),
      description: pForm.description.trim() || pForm.fabric.trim(),
      images: pForm.images.length ? pForm.images : [FALLBACK_IMG],
      hidden: existing?.hidden || false
    };
    setProducts(editingId ? products.map((p) => (p.id === editingId ? data : p)) : [data, ...products]);
    setProductFormOpen(false);
    showToast(editingId ? 'Product updated' : 'Product published');
  };

  const deleteProduct = (p: Product) =>
    askConfirm(`Delete "${p.titleEn}"? This cannot be undone.`, () => {
      setProducts(products.filter((x) => x.id !== p.id));
      setCart(cart.filter((c) => c.id !== p.id));
      setWishlist(wishlist.filter((w) => w !== p.id));
    });

  const resetDemoData = () =>
    askConfirm('Restore the sample products, categories and banners? Anything you added will be removed.', () => {
      setProducts(SEED_PRODUCTS); setCategories(INITIAL_CATEGORIES); setBanners(INITIAL_BANNERS); setStaffList(INITIAL_STAFF);
      if (!backend.db) setOrders(INITIAL_ORDERS);
      showToast('Sample data restored');
    });

  const wishlistProducts = catalogProducts.filter((p) => wishlist.includes(p.id));
  const revenue = orders.filter((o) => o.orderStatus !== 'Cancelled').reduce((a, o) => a + o.totalAmount, 0);
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_LIMIT);
  const shownOrders = orders.filter((o) => orderFilter === 'All' || o.orderStatus === orderFilter);
  const catName = (id: string) => categories.find((c) => c.id === id)?.nameEn || '—';

  const adminTabs: { key: AdminSection; label: string }[] = [
    { key: 'overview', label: 'Overview' }, { key: 'people', label: `Sellers & Customers${sellerProfiles.filter((p) => !sellerStatuses[p.id]).length ? ` (${sellerProfiles.filter((p) => !sellerStatuses[p.id]).length})` : ''}` }, { key: 'settings', label: 'Site Settings' }, { key: 'orders', label: 'Orders' }, { key: 'products', label: 'Products' },
    { key: 'categories', label: 'Categories' }, { key: 'banners', label: 'Banners' }, { key: 'staff', label: 'Staff' }
  ];

  // ============================================================
  if (!bReady || (backend.db && remoteSettings === null && settingsWait)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-950 via-rose-800 to-rose-600 bg-clip-text text-transparent">NewXen</span>
        <span className="w-6 h-6 border-2 border-rose-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-rose-900 selection:text-white">
      {/* TOP ANNOUNCEMENT BAR */}
      <div className="bg-rose-950 text-rose-100 text-xs py-2 px-4 text-center font-medium flex justify-between items-center border-b border-rose-900">
        <div className="hidden sm:block">
          📍 {S.announceEn ? t(S.announceEn, S.announceBn || S.announceEn) : t(`Free Home Delivery across Bangladesh on orders over ৳${S.freeDeliveryOver.toLocaleString()}!`, `৳${S.freeDeliveryOver.toLocaleString('bn-BD')} টাকার বেশি অর্ডারে সারা বাংলাদেশে ফ্রী হোম ডেলিভারি!`)}
        </div>
        <div className="w-full sm:w-auto text-center sm:text-right flex items-center justify-center gap-4">
          <span>✨ {t('Use Code:', 'কুপন কোড:')} <strong className="text-amber-300">{S.couponCode}</strong> {t(`for ${S.couponPercent}% OFF`, `ব্যবহার করলে ${S.couponPercent}% ছাড়`)}</span>
          <button onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} className="flex items-center gap-1 bg-rose-900 hover:bg-rose-800 text-white px-2 py-0.5 rounded text-[11px] transition">
            <Globe className="w-3 h-3" />
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            <div onClick={() => { setActiveTab('shop'); pickCategory('all'); }} className="cursor-pointer flex flex-col items-start select-none">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-950 via-rose-800 to-rose-600 bg-clip-text text-transparent">{S.brandName}</span>
                <span className="text-xs bg-rose-100 text-rose-900 font-bold px-1.5 py-0.5 rounded border border-rose-200">{S.brandBn}</span>
              </div>
              <span className="text-[10px] tracking-widest uppercase text-slate-500 font-medium">
                {t(S.taglineEn, S.taglineBn)}
              </span>
            </div>

            <div className="hidden md:flex flex-1 max-w-md relative">
              <input
                type="text" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveTab('shop'); }}
                placeholder={t('Search Three-Piece, Sarees, Abaya, Hijab, Jewelry...', 'থ্রি-পিস, শাড়ি, আবায়া, হিজাব বা জুয়েলারি খুঁজুন...')}
                className="w-full pl-10 pr-8 py-2 bg-slate-100 focus:bg-white text-sm rounded-full border border-slate-200 focus:border-rose-900 focus:ring-2 focus:ring-rose-950/20 outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setActiveTab('tracking')} className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${activeTab === 'tracking' ? 'bg-rose-950 text-white border-rose-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">{t('Track Order', 'অর্ডার ট্র্যাকিং')}</span>
              </button>
              <button onClick={() => setActiveTab('account')} aria-label="My account" className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${activeTab === 'account' ? 'bg-rose-950 text-white border-rose-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{t('My Account', 'আমার অ্যাকাউন্ট')}</span>
              </button>
              <button onClick={() => setActiveTab('seller')} aria-label="Sell on this site" className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${activeTab === 'seller' ? 'bg-rose-950 text-white border-rose-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                <Store className="w-4 h-4" />
                <span className="hidden lg:inline">{t('Sell With Us', 'বিক্রি করুন')}</span>
              </button>
              <button onClick={() => setActiveTab(activeTab === 'admin' ? 'shop' : 'admin')} className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition ${activeTab === 'admin' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'}`}>
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="hidden sm:inline">{t('Admin Panel', 'এডমিন প্যানেল')}</span>
              </button>
              <button onClick={() => setIsWishlistOpen(true)} aria-label="Wishlist" className="relative text-slate-700 hover:text-rose-900 p-2 transition">
                <Heart className="w-6 h-6" />
                {wishlist.length > 0 && <span className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{wishlist.length}</span>}
              </button>
              <button onClick={() => setIsCartOpen(true)} aria-label="Cart" className="relative bg-rose-950 text-white p-2.5 rounded-full hover:bg-rose-900 transition flex items-center justify-center shadow-md hover:shadow-rose-900/20">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-amber-400 text-rose-950 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">{cartCount}</span>}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="md:hidden pb-2 relative">
            <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setActiveTab('shop'); }}
              placeholder={t('Search products...', 'পণ্য খুঁজুন...')}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 focus:bg-white text-sm rounded-full border border-slate-200 focus:border-rose-900 outline-none transition" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          {activeTab === 'shop' && (
            <div ref={menuRef} className="relative flex items-center gap-2 py-2.5 border-t border-slate-100">
              <button
                onClick={() => setMenuOpen((o) => !o)} aria-haspopup="true" aria-expanded={menuOpen}
                className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${menuOpen || selectedCategory === 'all' ? 'bg-rose-950 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                ✨ {t('All Collections', 'সকল কালেকশন')}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0">
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => pickCategory(cat.id)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${selectedCategory === cat.id ? 'bg-rose-950 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                    <CatIcon icon={cat.icon} /><span>{t(cat.nameEn, cat.nameBn)}</span>
                  </button>
                ))}
              </div>

              {menuOpen && (
                <div role="menu" className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 sm:p-5 max-h-[70vh] overflow-y-auto">
                  <button role="menuitem" onClick={() => { pickCategory('all'); setMenuOpen(false); setTimeout(scrollToProducts, 60); }} className="w-full text-left text-xs font-bold text-rose-950 bg-rose-50 hover:bg-rose-100 rounded-xl px-3 py-2 mb-4 flex items-center justify-between">
                    <span>✨ {t('View all products', 'সব পণ্য দেখুন')}</span><span className="text-rose-700">{catalogProducts.length}</span>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {categories.map((cat) => {
                      const subs = subCategories.filter((x) => x.categoryId === cat.id);
                      return (
                        <div key={cat.id} className="min-w-0">
                          <button role="menuitem" onClick={() => { pickCategory(cat.id); setMenuOpen(false); setTimeout(scrollToProducts, 60); }} className="w-full text-left flex items-center justify-between gap-2 font-bold text-sm text-slate-900 hover:text-rose-900 pb-1.5 border-b border-slate-100">
                            <span className="truncate"><CatIcon icon={cat.icon} /> {t(cat.nameEn, cat.nameBn)}</span>
                            <span className="text-[11px] font-semibold text-slate-400">{catalogProducts.filter((p) => p.categoryId === cat.id).length}</span>
                          </button>
                          <ul className="mt-1.5 space-y-0.5">
                            {subs.length === 0 && <li className="text-[11px] text-slate-400 px-2 py-1">{t('No sub-categories', 'কোনো সাব-ক্যাটাগরি নেই')}</li>}
                            {subs.map((sub) => (
                              <li key={sub.id}>
                                <button role="menuitem" onClick={() => pickSub(cat.id, sub.id)} className="w-full text-left flex items-center justify-between gap-2 text-xs text-slate-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg px-2 py-1.5 transition">
                                  <span className="truncate">{t(sub.nameEn, sub.nameBn)}</span>
                                  <span className="text-[10px] text-slate-400">{catalogProducts.filter((p) => p.subCategoryId === sub.id).length}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ======================= SHOP ======================= */}
      {activeTab === 'shop' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
          {/* HERO */}
          {banners.length > 0 && (
            <section className="relative rounded-3xl overflow-hidden shadow-xl min-h-[340px] sm:min-h-[420px] flex items-center">
              {banners.map((slide, idx) => (
                <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  {slide.image && <img src={slide.image} alt={slide.titleEn} className="absolute inset-0 w-full h-full object-cover object-center" />}
                  {slide.image ? <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" /> : <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} opacity-90`} />}
                  <div className="relative z-20 w-full flex items-center justify-between gap-6 px-8 sm:px-16">
                  <div className="max-w-2xl min-w-0 text-white space-y-4">
                    <span className="inline-block bg-amber-400 text-rose-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t('Special Festival Offer', 'উৎসব বিশেষ অফার')}</span>
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">{t(slide.titleEn, slide.titleBn)}</h1>
                    <p className="text-slate-200 text-sm sm:text-base font-light">{t(slide.subtitleEn, slide.subtitleBn)}</p>
                    <div className="pt-2">
                      {slide.link?.startsWith('url:') && safeUrl(slide.link.slice(4)) ? (
                        <a href={safeUrl(slide.link.slice(4))} target="_blank" rel="noopener noreferrer" className="bg-white text-rose-950 hover:bg-rose-50 px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 group">
                        {t(slide.ctaEn, slide.ctaBn)}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </a>
                      ) : (
                        <button onClick={() => (slide.link && slide.link !== 'shop' ? goLink(slide.link) : scrollToProducts())} className="bg-white text-rose-950 hover:bg-rose-50 px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2 group">
                        {t(slide.ctaEn, slide.ctaBn)}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                      </button>
                      )}
                    </div>
                  </div>
                  {slide.squareImage && (
                    <div className="hidden sm:block shrink-0 w-48 md:w-60 lg:w-72 aspect-square rounded-3xl overflow-hidden border-4 border-white/80 shadow-2xl bg-white/10 sm:mr-8">
                      <img src={slide.squareImage} alt={slide.titleEn} className="w-full h-full object-cover" />
                    </div>
                  )}
                  </div>
                </div>
              ))}
              <button aria-label="Previous" onClick={() => setCurrentSlide((p) => (p === 0 ? banners.length - 1 : p - 1))} className="absolute left-4 z-30 p-2 rounded-full bg-black/30 text-white hover:bg-black/60 transition"><ChevronLeft className="w-5 h-5" /></button>
              <button aria-label="Next" onClick={() => setCurrentSlide((p) => (p + 1) % banners.length)} className="absolute right-4 z-30 p-2 rounded-full bg-black/30 text-white hover:bg-black/60 transition"><ChevronRight className="w-5 h-5" /></button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {banners.map((_, i) => (
                  <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setCurrentSlide(i)} className={`h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-amber-400 w-8' : 'bg-white/50 w-2.5'}`} />
                ))}
              </div>
            </section>
          )}

          {/* TRUST STRIP */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Truck className="w-5 h-5" />, en: 'Nationwide Delivery', bn: 'সারা দেশে ডেলিভারি', sub: t('Inside Dhaka 1-2 days', 'ঢাকায় ১-২ দিন') },
              { icon: <ShieldCheck className="w-5 h-5" />, en: '100% Authentic', bn: '১০০% অরিজিনাল', sub: t('Quality guaranteed', 'মানের নিশ্চয়তা') },
              { icon: <RotateCcw className="w-5 h-5" />, en: 'Easy Returns', bn: 'সহজ রিটার্ন', sub: t(S.returnShortEn, S.returnShortBn) },
              { icon: <Phone className="w-5 h-5" />, en: 'Cash on Delivery', bn: 'ক্যাশ অন ডেলিভারি', sub: t('bKash & Nagad too', 'বিকাশ ও নগদও চলে') }
            ].map((x, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-950 flex items-center justify-center shrink-0">{x.icon}</div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{t(x.en, x.bn)}</div>
                  <div className="text-[11px] text-slate-500">{x.sub}</div>
                </div>
              </div>
            ))}
          </section>

          {/* CATEGORY TILES */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{t('Explore Categories', 'ক্যাটাগরি সমূহ')}</h2>
              <p className="text-xs text-slate-500">{t('Handpicked premium collections for modern women', 'আধুনিক নারীদের জন্য বাছাইকৃত কালেকশন')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <div key={cat.id} onClick={() => { pickCategory(cat.id); scrollToProducts(); }}
                  className={`group relative overflow-hidden rounded-2xl p-4 border text-center cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedCategory === cat.id ? 'border-rose-900 bg-rose-50/50 shadow-md ring-2 ring-rose-900/20' : 'border-slate-200 bg-white hover:border-rose-300'}`}>
                  <div className="text-4xl mb-2 transform group-hover:scale-110 transition duration-300 flex justify-center"><CatIcon icon={cat.icon} className="w-12 h-12 text-4xl" /></div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-rose-950 transition">{t(cat.nameEn, cat.nameBn)}</h3>
                  <span className="text-[11px] text-slate-400">{catalogProducts.filter((p) => p.categoryId === cat.id).length} {t('Items', 'টি পণ্য')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* PRODUCTS */}
          <section ref={productsRef} className="space-y-6 scroll-mt-40">
            {storeFilter && (() => {
              const sp = sellerProfiles.find((x) => x.id === storeFilter);
              return sp ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  {sp.logo ? <img src={sp.logo} alt="" className="w-16 h-16 rounded-2xl object-cover bg-slate-100" /> : <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-950 flex items-center justify-center"><Store className="w-7 h-7" /></div>}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">{sp.storeName}</h2>
                    <p className="text-xs text-slate-500">{sp.city}{sp.city && sp.phone ? ' · ' : ''}{sp.phone}</p>
                    {sp.bio && <p className="text-xs text-slate-600 mt-1">{sp.bio}</p>}
                  </div>
                  <button onClick={() => setStoreFilter(null)} className="text-xs font-bold text-rose-900 border border-rose-200 hover:bg-rose-50 rounded-full px-4 py-2">{t('Show all products', 'সব পণ্য দেখুন')}</button>
                </div>
              ) : null;
            })()}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <SlidersHorizontal className="w-4 h-4 text-rose-900" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('Filter & Sort Products', 'ফিল্টার ও সর্টিং')}</span>
                <span className="text-xs text-slate-400">({filteredProducts.length} {t('found', 'টি পাওয়া গেছে')})</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>{t('Max Price:', 'সর্বোচ্চ দাম:')} ৳{priceFilter.toLocaleString()}</span>
                  <input type="range" min={500} max={10000} step={250} value={priceFilter} onChange={(e) => setPriceFilter(Number(e.target.value))} className="accent-rose-900 cursor-pointer" />
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-rose-900">
                  <option value="default">{t('Sort by: Featured', 'সর্টিং: ফিচার্ড')}</option>
                  <option value="low-high">{t('Price: Low to High', 'দাম: কম থেকে বেশি')}</option>
                  <option value="high-low">{t('Price: High to Low', 'দাম: বেশি থেকে কম')}</option>
                  <option value="rating">{t('Highest Rated', 'সর্বোচ্চ রেটিং')}</option>
                </select>
              </div>
            </div>

            {selectedCategory !== 'all' && visibleSubs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedSub('all')} className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${selectedSub === 'all' ? 'bg-amber-400 border-amber-400 text-rose-950' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{t('All', 'সব')}</button>
                {visibleSubs.map((s) => (
                  <button key={s.id} onClick={() => setSelectedSub(s.id)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${selectedSub === s.id ? 'bg-amber-400 border-amber-400 text-rose-950' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{t(s.nameEn, s.nameBn)}</button>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700">{t('No Products Found', 'কোনো পণ্য পাওয়া যায়নি')}</h3>
                <p className="text-xs text-slate-400 mt-1">{t('Try adjusting your search or filter settings', 'আপনার ফিল্টার অথবা সার্চ কি-ওয়ার্ড পরিবর্তন করে দেখুন')}</p>
                <button onClick={() => { setSelectedCategory('all'); setSelectedSub('all'); setSearchQuery(''); setPriceFilter(10000); }} className="mt-4 bg-rose-950 text-white text-xs px-4 py-2 rounded-full font-semibold hover:bg-rose-900 transition">{t('Reset Filters', 'ফিল্টার রিসেট করুন')}</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const out = product.stock <= 0;
                  return (
                    <div key={product.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                      <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => openQuickView(product)}>
                        <img src={product.images[0]} alt={product.titleEn} loading="lazy" className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${out ? 'grayscale opacity-70' : ''}`} />
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          {product.badge && <span className="bg-rose-950 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow">{product.badge}</span>}
                          {product.regularPrice > product.price && <span className="bg-amber-400 text-rose-950 text-[10px] font-bold px-2 py-0.5 rounded shadow">-{Math.round(((product.regularPrice - product.price) / product.regularPrice) * 100)}%</span>}
                        </div>
                        {out && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-slate-900/85 text-white text-xs font-bold px-3 py-1.5 rounded-full">{t('Out of Stock', 'স্টক শেষ')}</span></div>}
                        {!out && product.stock <= LOW_STOCK_LIMIT && <span className="absolute bottom-2.5 left-2.5 bg-white/95 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded shadow">{t(`Only ${product.stock} left`, `মাত্র ${product.stock}টি বাকি`)}</span>}
                        <div className="absolute top-2.5 right-2.5 flex flex-col gap-2">
                          <button aria-label="Wishlist" onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }} className="bg-white/90 backdrop-blur hover:bg-white text-slate-700 hover:text-rose-900 p-2 rounded-full shadow transition">
                            <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                          </button>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex justify-center">
                          <button onClick={(e) => { e.stopPropagation(); openQuickView(product); }} className="bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow"><Eye className="w-3.5 h-3.5" />{t('Quick View', 'একনজরে দেখুন')}</button>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center gap-1 text-amber-500 text-xs mb-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {product.reviews > 0 ? (<><span className="font-bold text-slate-700">{product.rating.toFixed(1)}</span><span className="text-slate-400 text-[10px]">({product.reviews})</span></>) : <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wide">{t('New', 'নতুন')}</span>}
                          </div>
                          <h3 onClick={() => openQuickView(product)} className="font-bold text-slate-900 text-sm line-clamp-1 hover:text-rose-900 cursor-pointer transition">{t(product.titleEn, product.titleBn)}</h3>
                          {product.storeName && <button onClick={() => { setStoreFilter(product.sellerId || null); setSelectedCategory('all'); setSelectedSub('all'); scrollToProducts(); }} className="text-[10px] font-semibold text-rose-900 hover:underline">{t('by', 'বিক্রেতা:')} {product.storeName}</button>}
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{product.fabric}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-rose-950 font-black text-base">৳{product.price.toLocaleString()}</div>
                            {product.regularPrice > product.price && <div className="text-slate-400 text-xs line-through">৳{product.regularPrice.toLocaleString()}</div>}
                          </div>
                          <button disabled={out} onClick={() => addToCart(product)} className="bg-rose-950 hover:bg-rose-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow transition">
                            <ShoppingBag className="w-3.5 h-3.5" />{t('Add', 'কার্ট')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ======================= TRACKING ======================= */}
      {activeTab === 'account' && (
        <main className="max-w-3xl mx-auto px-4 py-10">
          <AccountPage backend={backend} t={t} profile={myProfile} orders={myOrders} onSave={saveCustomerProfile}
            onTrack={(id) => { setActiveTab('tracking'); setTrackId(id); doTrack(id); }} notify={showToast} />
        </main>
      )}

      {activeTab === 'seller' && (
        <main className="max-w-5xl mx-auto px-4 py-10">
          <SellerHub backend={backend} t={t} brand={S.brandName} profile={uid ? sellerProfiles.find((p) => p.id === uid) : undefined}
            status={uid ? sellerStatuses[uid] : undefined} categories={categories} subCategories={subCategories} myProducts={uid ? sellerItems[uid] || [] : []} inbox={inbox}
            onSaveProfile={saveSellerProfile} onSaveProduct={saveSellerProduct} onDeleteProduct={deleteSellerProduct}
            onInboxStatus={inboxStatus} askConfirm={askConfirm} notify={showToast} />
        </main>
      )}

      {activeTab === 'tracking' && (
        <main className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="w-6 h-6 text-rose-900" />{t('Track Your Order', 'আপনার অর্ডার ট্র্যাক করুন')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('Enter your Order ID (e.g. NX-9821) to check live status', 'আপনার অর্ডার আইডি দিয়ে বর্তমান অবস্থা জানুন')}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); doTrack(); }} className="flex gap-2">
              <input type="text" value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="Order ID (e.g. NX-9821)" className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-900 uppercase font-mono" />
              <button type="submit" className="bg-rose-950 hover:bg-rose-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition">{t('Search', 'অনুসন্ধান')}</button>
            </form>
            {trackError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl px-4 py-3">{t('Order not found! Please check the ID.', 'অর্ডার আইডিটি পাওয়া যায়নি! আবার চেক করুন।')}</div>}

            {trackedOrder ? (
              <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold">{t('Order Reference:', 'অর্ডার রেফারেন্স:')}</span>
                    <h3 className="text-xl font-black text-rose-950">{trackedOrder.id}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold">{t('Order Date:', 'তারিখ:')}</span>
                    <div className="text-xs text-slate-700 font-medium">{trackedOrder.date}</div>
                  </div>
                </div>

                {trackedOrder.orderStatus === 'Cancelled' ? (
                  <div className="bg-white border border-rose-200 text-rose-800 rounded-xl p-4 text-sm font-bold flex items-center gap-2"><X className="w-5 h-5" />{t('This order has been cancelled.', 'এই অর্ডারটি বাতিল করা হয়েছে।')}</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = STATUS_STEPS.indexOf(trackedOrder.orderStatus);
                      const isPassed = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;
                      return (
                        <div key={step} className="flex flex-col items-center space-y-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition ${isCurrent ? 'bg-rose-950 text-white ring-4 ring-rose-200 shadow-md' : isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {isPassed && !isCurrent ? <Check className="w-5 h-5" /> : idx + 1}
                          </div>
                          <span className={`text-xs font-semibold ${isCurrent ? 'text-rose-950 font-bold' : 'text-slate-600'}`}>{t(step, STATUS_BN[step])}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-white rounded-xl p-4 border border-rose-100 space-y-2 text-xs">
                  {trackedOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-slate-600"><span>{it.title} ({it.size}, {it.color}) × {it.qty}</span><strong className="text-slate-900">৳{(it.price * it.qty).toLocaleString()}</strong></div>
                  ))}
                  {trackedOrder.parts && trackedOrder.parts.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {trackedOrder.parts.map((p) => <div key={p.sid} className="flex justify-between text-slate-600"><span>{t('Seller', 'বিক্রেতা')}: {p.storeName}</span><strong className="text-slate-900">{t(p.status, STATUS_BN[p.status])}</strong></div>)}
                    </div>
                  )}
                  {trackedOrder.address && <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100"><span>{t('Delivery Address:', 'ডেলিভারি ঠিকানা:')}</span><strong className="text-slate-900 text-right max-w-[60%]">{trackedOrder.address}</strong></div>}
                  <div className="flex justify-between text-slate-600"><span>{t('Payment Method:', 'পেমেন্ট মেথড:')}</span><strong className="text-slate-900">{trackedOrder.paymentMethod} ({trackedOrder.paymentStatus})</strong></div>
                  <div className="flex justify-between text-slate-600"><span>{t('Delivery Charge:', 'ডেলিভারি চার্জ:')}</span><strong className="text-slate-900">{trackedOrder.delivery === 0 ? t('Free', 'ফ্রী') : `৳${trackedOrder.delivery}`}</strong></div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-100"><span>{t('Total Amount:', 'মোট টাকা:')}</span><span className="text-rose-950">৳{trackedOrder.totalAmount.toLocaleString()}</span></div>
                </div>
              </div>
            ) : (
              !trackError && <div className="text-center py-10 text-slate-400 text-xs">{t('Enter your order ID above to track delivery timeline', 'উপরের বক্সে অর্ডার আইডি দিয়ে ট্র্যাকিং রিপোর্ট দেখুন')}</div>
            )}
          </div>
        </main>
      )}

      {/* ======================= ADMIN ======================= */}
      {activeTab === 'admin' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {backend.db && !backend.isAdmin ? (
            backend.auth && !backend.uid ? (
              <AuthCard backend={backend} t={t} title="Admin sign in" text="Sign in with the store owner account." />
            ) : (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-4 text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-950 rounded-full flex items-center justify-center mx-auto"><Lock className="w-6 h-6" /></div>
              <h2 className="text-xl font-black text-slate-900">Store owner access only</h2>
              {backend.auth && <SignOutBar backend={backend} t={t} />}
              <p className="text-xs text-slate-500">{backend.auth ? 'This account is not an admin. Add its user id to the admins table in Supabase (see the setup guide).' : 'The admin panel opens for the page owner and invited editors. Sign in to claude.ai with the owner account, or ask the owner to give you Editor access from the Share menu.'}</p>
            </div>
            )
          ) : (backend.db ? false : !adminLoggedIn) ? (
            <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-rose-100 text-rose-950 rounded-full flex items-center justify-center mx-auto"><Lock className="w-6 h-6" /></div>
                <h2 className="text-2xl font-black text-slate-900">NewXen Admin Access</h2>
                <p className="text-xs text-slate-500">Restricted staff authentication portal</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email</label>
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@newxen.com" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                  <input type="password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-900" />
                </div>
                {loginError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl px-3 py-2">{loginError}</div>}
                <button type="submit" className="w-full bg-rose-950 hover:bg-rose-900 text-white font-bold py-3 rounded-xl shadow-lg transition">Log In to Dashboard</button>
              </form>
              <div className="text-[11px] text-center text-slate-400">🔒 Public customer registration disabled for Admin panel.</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded">SUPER ADMIN</span>
                    <h2 className="text-xl font-bold">NewXen Control Portal</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Manage catalog, orders, categories & system banners</p>
                </div>
                <button hidden={!!backend.db} onClick={() => setAdminLoggedIn(false)} className="bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-700 transition"><LogOut className="w-4 h-4" />Logout Staff</button>
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {adminTabs.map((tab) => (
                  <button key={tab.key} onClick={() => setAdminSection(tab.key)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition ${adminSection === tab.key ? 'bg-rose-950 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>{tab.label}</button>
                ))}
              </div>

              {/* OVERVIEW */}
              {adminSection === 'people' && (
                <AdminPeople sellers={sellerProfiles} statuses={sellerStatuses} customers={customers} notify={showToast} onSetStatus={setSellerStatus}
                  productCount={Object.fromEntries(Object.entries(sellerItems).map(([k, v]) => [k, v.length]))} />
              )}

              {adminSection === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 mb-2"><span className="text-xs font-bold uppercase">Total Revenue</span><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                      <div className="text-2xl font-black text-slate-900">৳{revenue.toLocaleString()}</div>
                      <span className="text-[10px] text-slate-400">Excluding cancelled</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 mb-2"><span className="text-xs font-bold uppercase">Total Orders</span><Package className="w-5 h-5 text-rose-900" /></div>
                      <div className="text-2xl font-black text-slate-900">{orders.length}</div>
                      <span className="text-[10px] text-slate-400">Lifetime orders</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 mb-2"><span className="text-xs font-bold uppercase">Active Products</span><ShoppingBag className="w-5 h-5 text-amber-600" /></div>
                      <div className="text-2xl font-black text-slate-900">{products.length}</div>
                      <span className="text-[10px] text-amber-600 font-bold">{products.filter((p) => p.stock > 0).length} in stock</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 mb-2"><span className="text-xs font-bold uppercase">Pending Orders</span><Clock className="w-5 h-5 text-amber-500" /></div>
                      <div className="text-2xl font-black text-amber-600">{orders.filter((o) => o.orderStatus === 'Pending').length}</div>
                      <span className="text-[10px] text-rose-600 font-bold">Requires action</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" />Low Stock Alerts</h3>
                    {lowStock.length === 0 ? <p className="text-xs text-slate-400">All products are well stocked.</p> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lowStock.map((p) => (
                          <div key={p.id} className="flex justify-between items-center text-xs p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="font-bold text-slate-800 truncate pr-2">{p.titleEn}</span>
                            <span className={`font-black ${p.stock === 0 ? 'text-rose-700' : 'text-amber-700'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={resetDemoData} className="text-xs text-slate-500 hover:text-rose-700 underline">Reset to demo data</button>
                </div>
              )}

              {/* ORDERS */}
              {adminSection === 'orders' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Package className="w-5 h-5 text-rose-900" />Customer Orders Management</h3>
                    <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value as 'All' | OrderStatus)} className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-rose-900">
                      <option value="All">All statuses</option>
                      {(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-2">Order ID</th><th className="py-3 px-2">Customer</th><th className="py-3 px-2">Amount</th><th className="py-3 px-2">Payment</th><th className="py-3 px-2">Status</th><th className="py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-medium">
                        {shownOrders.map((ord) => (
                          <React.Fragment key={ord.id}>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/80">
                              <td className="py-3 px-2 align-top">
                                <button onClick={() => setExpandedOrder(expandedOrder === ord.id ? null : ord.id)} className="font-bold font-mono text-rose-950 hover:underline">{ord.id}</button>
                                <div className="mt-1 space-y-0.5">
                                  {ord.items.map((it, i) => (
                                    <button key={i} onClick={() => goToProduct(it.id)} title="Open this product" className="block max-w-[11rem] truncate text-left text-[10px] font-semibold text-slate-500 hover:text-rose-900 hover:underline">
                                      → {it.title} × {it.qty}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-2"><div className="font-bold text-slate-800">{ord.customerName}</div><div className="text-[10px] text-slate-400">{ord.phone}</div></td>
                              <td className="py-3 px-2 font-bold text-slate-900">৳{ord.totalAmount.toLocaleString()}</td>
                              <td className="py-3 px-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{ord.paymentMethod}</span></td>
                              <td className="py-3 px-2">
                                <select value={ord.orderStatus} onChange={(e) => changeOrderStatus(ord, e.target.value as OrderStatus)}
                                  className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border transition ${ord.orderStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ord.orderStatus === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-300' : ord.orderStatus === 'Cancelled' ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-rose-100 text-rose-900 border-rose-300'}`}>
                                  {(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="py-3 px-2 align-top whitespace-nowrap">
                                <button onClick={() => setBillOrder(ord)} className="bg-rose-950 hover:bg-rose-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg mr-2">Bill</button>
                                <button onClick={() => setExpandedOrder(expandedOrder === ord.id ? null : ord.id)} className="text-rose-900 hover:underline text-[11px] font-bold">{expandedOrder === ord.id ? 'Hide' : 'Details'}</button>
                              </td>
                            </tr>
                            {expandedOrder === ord.id && (
                              <tr className="bg-slate-50">
                                <td colSpan={6} className="p-4 text-xs space-y-1.5">
                                  <div><strong>Address:</strong> {ord.address} ({ord.zone === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</div>
                                  <div><strong>Date:</strong> {ord.date}</div>
                                  <div><strong>Payment:</strong> {ord.paymentMethod} – {ord.paymentStatus}{ord.trxId && <> | TrxID: <span className="font-mono">{ord.trxId}</span></>}</div>
                                  <div className="pt-1"><strong>Items:</strong></div>
                                  {ord.items.map((it, i) => (
                                    <div key={i} className="pl-3 flex flex-wrap items-center gap-x-2">
                                      <span>•</span>
                                      <button onClick={() => goToProduct(it.id)} className="font-bold text-rose-900 hover:underline text-left">{it.title}</button>
                                      <span>({it.size}, {it.color}) × {it.qty} = ৳{(it.price * it.qty).toLocaleString()}{it.storeName ? ` — seller: ${it.storeName}` : ''}</span>
                                      {!it.sellerId && <button onClick={() => editProductFromOrder(it.id)} className="text-[10px] font-bold text-slate-500 border border-slate-300 hover:border-rose-900 hover:text-rose-900 rounded px-1.5 py-0.5">Edit product</button>}
                                    </div>
                                  ))}
                                  <div className="pt-1">Subtotal ৳{ord.subtotal.toLocaleString()} − Discount ৳{ord.discount.toLocaleString()} + Delivery ৳{ord.delivery} = <strong>৳{ord.totalAmount.toLocaleString()}</strong></div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                    {shownOrders.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No orders found.</p>}
                  </div>
                </div>
              )}

              {/* PRODUCTS */}
              {adminSection === 'products' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-rose-900" />Product Inventory Catalog</h3>
                    <button onClick={() => openProductForm()} className="bg-rose-950 hover:bg-rose-900 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"><Plus className="w-4 h-4" />Add Product</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((p) => (
                      <div key={p.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 items-center">
                        <img src={p.images[0]} alt={p.titleEn} className="w-16 h-16 object-cover rounded-xl bg-white" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{p.titleEn}</h4>
                          <div className="text-[10px] text-slate-500">{catName(p.categoryId)}</div>
                          <div className="text-xs font-black text-rose-950">৳{p.price.toLocaleString()}</div>
                          <div className={`text-[10px] font-bold ${p.stock <= LOW_STOCK_LIMIT ? 'text-rose-600' : 'text-slate-500'}`}>Stock: {p.stock} pcs</div>
                        </div>
                        <button onClick={() => { setProducts(products.map((x) => (x.id === p.id ? { ...x, hidden: !x.hidden } : x))); showToast(p.hidden ? 'Product is now Live' : 'Product hidden from the shop'); }}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border ${p.hidden ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {p.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{p.hidden ? 'Hidden' : 'Live'}
                        </button>
                        <button aria-label="Edit" onClick={() => openProductForm(p)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition"><Edit className="w-4 h-4" /></button>
                        <button aria-label="Delete" onClick={() => deleteProduct(p)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CATEGORIES */}
              {adminSection === 'categories' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Tag className="w-5 h-5 text-rose-900" />Categories and sub-categories</h3>
                  <p className="text-[11px] text-slate-400">These also fill the “All Collections” dropdown on the shop.</p>
                  <div className="space-y-3">
                    {categories.map((c) => {
                      const count = products.filter((p) => p.categoryId === c.id).length;
                      const subs = subCategories.filter((x) => x.categoryId === c.id);
                      return (
                        <div key={c.id} className="text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><IconPicker label="Change icon" value={c.icon} backend={backend} onChange={(v) => { setCategories(categories.map((x) => (x.id === c.id ? { ...x, icon: v } : x))); showToast('Icon changed'); }} /><strong>{c.nameEn}</strong> <span className="text-slate-400">/ {c.nameBn}</span></div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">{count} items</span>
                              <button aria-label="Delete category" disabled={count > 0} title={count > 0 ? 'Move or delete its products first' : 'Delete category and its sub-categories'} onClick={() => { setCategories(categories.filter((x) => x.id !== c.id)); setSubCategories(subCategories.filter((x) => x.categoryId !== c.id)); }} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {subs.length === 0 && <span className="text-slate-400">No sub-categories yet.</span>}
                            {subs.map((sc) => {
                              const n = products.filter((p) => p.subCategoryId === sc.id).length;
                              return (
                                <span key={sc.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1">
                                  {sc.nameEn}<span className="text-slate-400">/ {sc.nameBn}</span><span className="text-slate-400">({n})</span>
                                  <button aria-label={`Remove ${sc.nameEn}`} disabled={n > 0} title={n > 0 ? 'Move its products to another sub-category first' : 'Remove'} onClick={() => setSubCategories(subCategories.filter((x) => x.id !== sc.id))} className="p-1 text-rose-600 hover:bg-rose-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"><X className="w-3 h-3" /></button>
                                </span>
                              );
                            })}
                          </div>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const f = e.currentTarget;
                            const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
                            const nameEn = get('subEn');
                            if (!nameEn) return;
                            setSubCategories([...subCategories, { id: `sub-${Date.now()}`, categoryId: c.id, nameEn, nameBn: get('subBn') || nameEn }]);
                            f.reset();
                            showToast('Sub-category added');
                          }} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                            <input name="subEn" aria-label={`New sub-category for ${c.nameEn} (English)`} placeholder="New sub-category (English)" className={inputCls} />
                            <input name="subBn" aria-label={`New sub-category for ${c.nameEn} (Bangla)`} placeholder="সাব-ক্যাটাগরি (বাংলা)" className={inputCls} />
                            <button type="submit" className="bg-rose-950 text-white font-bold rounded-xl px-4 py-2 hover:bg-rose-900 transition flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" />Add</button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
                    const nameEn = get('nameEn');
                    setCategories([...categories, { id: `cat-${Date.now()}`, nameEn, nameBn: get('nameBn') || nameEn, slug: nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'), icon: get('icon') || '🛍️' }]);
                    f.reset();
                    showToast('Category added');
                  }} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-3 border-t border-slate-100">
                    <input name="nameEn" required aria-label="New category (English)" placeholder="New category (English)" className={inputCls} />
                    <input name="nameBn" aria-label="New category (Bangla)" placeholder="নাম (বাংলা)" className={inputCls} />
                    <input name="icon" aria-label="Emoji" placeholder="Emoji e.g. 👜" className={inputCls} />
                    <button type="submit" className="bg-rose-950 text-white font-bold rounded-xl py-2 hover:bg-rose-900 transition">Add Category</button>
                  </form>
                </div>
              )}

              {/* BANNERS */}
              {adminSection === 'banners' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <h3 className="font-bold text-slate-900 text-lg">Hero banners</h3>
                  <p className="text-[11px] text-slate-400">Banners rotate on the shop front page in the order shown here. Use the arrows to change the order.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {banners.length === 0 && <p className="text-xs text-slate-400 sm:col-span-2 py-6 text-center">No banners yet. The shop shows no hero section until you add one.</p>}
                    {banners.map((b, i) => (
                      <div key={b.id} className={`rounded-2xl overflow-hidden border ${bForm.id === b.id ? 'border-rose-900 ring-2 ring-rose-900/20' : 'border-slate-200'}`}>
                        <div className="relative h-32">
                          {b.image && <img src={b.image} alt={b.titleEn} className="absolute inset-0 w-full h-full object-cover" />}
                          {b.image ? <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" /> : <div className={`absolute inset-0 bg-gradient-to-r ${b.bgGradient} opacity-90`} />}
                          <div className="relative p-3 text-white">
                            <div className="text-sm font-bold line-clamp-1">{b.titleEn}</div>
                            <div className="text-[11px] text-white/80 line-clamp-2">{b.subtitleEn}</div>
                          </div>
                          <span className="absolute top-2 right-2 bg-white/90 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">#{i + 1}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 text-xs">
                          <span className="text-slate-500 truncate">{b.image ? 'Photo banner' : 'Colour banner'} · {b.link && b.link !== 'shop' ? (b.link.startsWith('cat:') ? 'Category link' : b.link.startsWith('url:') ? 'Website link' : 'Tracking link') : 'Shop link'}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button aria-label="Move earlier" disabled={i === 0} onClick={() => moveBanner(i, -1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button aria-label="Move later" disabled={i === banners.length - 1} onClick={() => moveBanner(i, 1)} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                            <button aria-label="Edit banner" onClick={() => { setBForm({ ...emptyBanner, ...b, link: b.link || 'shop' } as typeof emptyBanner); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }} className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200"><Edit className="w-3.5 h-3.5" /></button>
                            <button aria-label="Delete banner" onClick={() => askConfirm(`Delete the banner "${b.titleEn}"?`, () => { setBanners(banners.filter((x) => x.id !== b.id)); if (bForm.id === b.id) setBForm(emptyBanner); })} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-base">{bForm.id ? 'Edit banner' : 'Add a banner'}</h4>
                      {bForm.id && <button onClick={() => setBForm(emptyBanner)} className="text-slate-500 hover:text-rose-900 font-bold">Cancel editing</button>}
                    </div>

                    <div className="relative h-36 rounded-2xl overflow-hidden border border-slate-200">
                      {bForm.image && <img src={bForm.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                      {bForm.image ? <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" /> : <div className={`absolute inset-0 bg-gradient-to-r ${bForm.bgGradient} opacity-90`} />}
                      <div className="relative p-4 text-white max-w-md">
                        <div className="text-lg font-extrabold leading-tight">{bForm.titleEn || 'Banner title'}</div>
                        <div className="text-[11px] text-white/80 mt-1">{bForm.subtitleEn || 'Banner subtitle'}</div>
                        <span className="inline-block mt-2 bg-white text-rose-950 font-bold px-3 py-1 rounded-full text-[11px]">{bForm.ctaEn || 'Shop Now'}</span>
                      </div>
                      {bForm.squareImage && <img src={bForm.squareImage} alt="" className="absolute right-3 top-1/2 -translate-y-1/2 h-24 w-24 object-cover rounded-xl border-2 border-white/80" />}
                      <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">Preview</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input aria-label="Title (English)" value={bForm.titleEn} onChange={(e) => setBForm({ ...bForm, titleEn: e.target.value })} placeholder="Title (English) *" className={inputCls} />
                      <input aria-label="Title (Bangla)" value={bForm.titleBn} onChange={(e) => setBForm({ ...bForm, titleBn: e.target.value })} placeholder="শিরোনাম (বাংলা)" className={inputCls} />
                      <input aria-label="Subtitle (English)" value={bForm.subtitleEn} onChange={(e) => setBForm({ ...bForm, subtitleEn: e.target.value })} placeholder="Subtitle (English)" className={inputCls} />
                      <input aria-label="Subtitle (Bangla)" value={bForm.subtitleBn} onChange={(e) => setBForm({ ...bForm, subtitleBn: e.target.value })} placeholder="সাবটাইটেল (বাংলা)" className={inputCls} />
                      <input aria-label="Button text (English)" value={bForm.ctaEn} onChange={(e) => setBForm({ ...bForm, ctaEn: e.target.value })} placeholder="Button text (English)" className={inputCls} />
                      <input aria-label="Button text (Bangla)" value={bForm.ctaBn} onChange={(e) => setBForm({ ...bForm, ctaBn: e.target.value })} placeholder="বাটনের লেখা (বাংলা)" className={inputCls} />
                      <div className="space-y-1.5 min-w-0">
                        <label className="font-bold text-slate-700 block">Button goes to</label>
                        <select aria-label="Button goes to" value={bForm.link.startsWith('url:') ? 'url:' : bForm.link} onChange={(e) => setBForm({ ...bForm, link: e.target.value === 'url:' ? 'url:https://' : e.target.value })} className={inputCls}>
                          <option value="shop">Products on the shop page</option>
                          <option value="tracking">Order tracking page</option>
                          {categories.map((c) => <option key={c.id} value={`cat:${c.id}`}>Category: {c.nameEn}</option>)}
                          <option value="url:">A website link…</option>
                        </select>
                        {bForm.link.startsWith('url:') && <input aria-label="Website link" value={bForm.link.slice(4)} onChange={(e) => setBForm({ ...bForm, link: 'url:' + e.target.value })} placeholder="https://..." className={inputCls} />}
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1.5">Colour theme (used when there is no photo)</label>
                        <select aria-label="Colour theme" value={bForm.bgGradient} onChange={(e) => setBForm({ ...bForm, bgGradient: e.target.value })} className={inputCls}>
                          {GRADIENTS.map((g, i) => <option key={g} value={g}>Colour theme {i + 1}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Banner photo</label>
                      <ImagePicker images={bForm.image ? [bForm.image] : []} onChange={(a) => setBForm((f) => ({ ...f, image: a[0] || '' }))} backend={backend} max={1} maxDim={1600}
                        hint="Best with a wide photo (about 1600 × 600). Keep the left side simple, the text sits there." />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Square photo (1:1, shown on the right side of the hero)</label>
                      <ImagePicker images={bForm.squareImage ? [bForm.squareImage] : []} onChange={(a) => setBForm((f) => ({ ...f, squareImage: a[0] || '' }))} backend={backend} max={1} maxDim={900}
                        hint="Optional. Use a square photo that matches this banner's title, e.g. the product or model. It is cropped to a square." />
                    </div>

                    <button onClick={saveBanner} className="w-full bg-rose-950 text-white font-bold rounded-xl py-2.5 hover:bg-rose-900 transition">{bForm.id ? 'Save banner' : 'Add banner'}</button>
                  </div>
                </div>
              )}

              {/* STAFF */}
              {/* SITE SETTINGS */}
              {adminSection === 'settings' && (() => {
                const d: Settings = sDraft ?? settings;
                const upd = (patch: Partial<Settings>) => setSDraft({ ...d, ...patch });
                const num = (v: string) => Math.max(0, Number(v) || 0);
                const card = 'bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs';
                const h = 'font-bold text-slate-900 text-base';
                const save = async () => {
                  setSavingSettings(true);
                  const ok = await saveSettings(d);
                  setSavingSettings(false);
                  if (ok) { setSDraft(null); showToast('Settings saved. The website is updated.'); }
                  else showToast('Could not save. Check you are signed in as the owner, then try again.');
                };
                const setLink = (id: string, patch: Partial<QuickLink>) => upd({ quickLinks: d.quickLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
                const setPay = (id: string, patch: Partial<PayMethod>) => upd({ payments: d.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
                return (
                  <div className="space-y-6 max-w-4xl">
                    <div className={card}>
                      <h3 className={h}>Store identity</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Store name (English)" value={d.brandName} onChange={(v) => upd({ brandName: v })} />
                        <Field label="Store name (Bangla)" value={d.brandBn} onChange={(v) => upd({ brandBn: v })} />
                        <Field label="Tagline (English)" value={d.taglineEn} onChange={(v) => upd({ taglineEn: v })} />
                        <Field label="Tagline (Bangla)" value={d.taglineBn} onChange={(v) => upd({ taglineBn: v })} />
                      </div>
                    </div>

                    <div className={card}>
                      <h3 className={h}>Top bar, coupon and delivery</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Top bar message (English)" value={d.announceEn} onChange={(v) => upd({ announceEn: v })} hint="Leave empty to show the automatic free-delivery message." />
                        <Field label="Top bar message (Bangla)" value={d.announceBn} onChange={(v) => upd({ announceBn: v })} />
                        <Field label="Coupon code" value={d.couponCode} onChange={(v) => upd({ couponCode: v.toUpperCase().replace(/\s/g, '') })} />
                        <Field label="Coupon discount (%)" type="number" value={d.couponPercent} onChange={(v) => upd({ couponPercent: Math.min(90, num(v)) })} />
                        <Field label="Free delivery above (৳)" type="number" value={d.freeDeliveryOver} onChange={(v) => upd({ freeDeliveryOver: num(v) })} />
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Inside Dhaka (৳)" type="number" value={d.deliveryInside} onChange={(v) => upd({ deliveryInside: num(v) })} />
                          <Field label="Outside Dhaka (৳)" type="number" value={d.deliveryOutside} onChange={(v) => upd({ deliveryOutside: num(v) })} />
                        </div>
                      </div>
                    </div>

                    <div className={card}>
                      <h3 className={h}>Customer support</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Phone number" value={d.phone} onChange={(v) => upd({ phone: v })} placeholder="+880 1XXX-XXXXXX" />
                        <Field label="WhatsApp number" value={d.whatsapp} onChange={(v) => upd({ whatsapp: v })} placeholder="01XXXXXXXXX" hint="Powers the green chat button. Leave empty to hide it." />
                        <Field label="Email" value={d.email} onChange={(v) => upd({ email: v })} placeholder="support@yourshop.com" />
                        <Field label="Shop address" value={d.address} onChange={(v) => upd({ address: v })} />
                        <Field label="Facebook page link" value={d.facebook} onChange={(v) => upd({ facebook: v })} placeholder="https://facebook.com/..." />
                        <Field label="Instagram link" value={d.instagram} onChange={(v) => upd({ instagram: v })} placeholder="https://instagram.com/..." />
                        <Field label="Delivery note (English)" value={d.deliveryNoteEn} onChange={(v) => upd({ deliveryNoteEn: v })} />
                        <Field label="Delivery note (Bangla)" value={d.deliveryNoteBn} onChange={(v) => upd({ deliveryNoteBn: v })} />
                      </div>
                    </div>

                    <div className={card}>
                      <h3 className={h}>Footer text and return policy</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="About text (English)" rows={3} value={d.footerEn} onChange={(v) => upd({ footerEn: v })} />
                        <Field label="About text (Bangla)" rows={3} value={d.footerBn} onChange={(v) => upd({ footerBn: v })} />
                        <Field label="Return policy line (English)" value={d.returnEn} onChange={(v) => upd({ returnEn: v })} />
                        <Field label="Return policy line (Bangla)" value={d.returnBn} onChange={(v) => upd({ returnBn: v })} />
                        <Field label="Short return label (English)" value={d.returnShortEn} onChange={(v) => upd({ returnShortEn: v })} hint="Shown in the trust strip under the banner." />
                        <Field label="Short return label (Bangla)" value={d.returnShortBn} onChange={(v) => upd({ returnShortBn: v })} />
                      </div>
                    </div>

                    <div className={card}>
                      <div className="flex items-center justify-between">
                        <h3 className={h}>Quick links (footer)</h3>
                        <button onClick={() => upd({ quickLinks: [...d.quickLinks, { id: `ql-${Date.now()}`, labelEn: 'New link', labelBn: '', target: 'shop' }] })} className="bg-rose-950 hover:bg-rose-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add link</button>
                      </div>
                      <div className="space-y-2">
                        {d.quickLinks.length === 0 && <p className="text-slate-400">No quick links. Add one above.</p>}
                        {d.quickLinks.map((l) => (
                          <div key={l.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.2fr_auto] gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl items-start">
                            <input value={l.labelEn} onChange={(e) => setLink(l.id, { labelEn: e.target.value })} placeholder="Label (English)" className={inputCls} />
                            <input value={l.labelBn} onChange={(e) => setLink(l.id, { labelBn: e.target.value })} placeholder="লেবেল (বাংলা)" className={inputCls} />
                            <div className="space-y-1.5 min-w-0">
                              <select value={l.target.startsWith('url:') ? 'url:' : l.target} onChange={(e) => setLink(l.id, { target: e.target.value === 'url:' ? 'url:https://' : e.target.value })} className={inputCls}>
                                <option value="shop">Shop (all products)</option>
                                <option value="tracking">Order tracking page</option>
                                {categories.map((c) => <option key={c.id} value={`cat:${c.id}`}>Category: {c.nameEn}</option>)}
                                <option value="url:">Website link…</option>
                              </select>
                              {l.target.startsWith('url:') && <input value={l.target.slice(4)} onChange={(e) => setLink(l.id, { target: 'url:' + e.target.value })} placeholder="https://..." className={inputCls} />}
                            </div>
                            <button aria-label="Remove link" onClick={() => upd({ quickLinks: d.quickLinks.filter((x) => x.id !== l.id) })} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg justify-self-end"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={card}>
                      <div className="flex items-center justify-between">
                        <h3 className={h}>Payment options</h3>
                        <button onClick={() => upd({ payments: [...d.payments, { id: `pay-${Date.now()}`, name: 'Rocket', type: 'mobile', enabled: true, number: '', note: '' }] })} className="bg-rose-950 hover:bg-rose-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add option</button>
                      </div>
                      <p className="text-[11px] text-slate-400">“Cash on delivery” options need no number. “Mobile banking” options ask the customer for the sender number’s Transaction ID.</p>
                      <div className="space-y-2">
                        {d.payments.map((p) => (
                          <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                              <input value={p.name} onChange={(e) => setPay(p.id, { name: e.target.value })} placeholder="Name (e.g. bKash)" className={inputCls} />
                              <select value={p.type} onChange={(e) => setPay(p.id, { type: e.target.value as 'cod' | 'mobile' })} className={inputCls}>
                                <option value="cod">Cash on delivery</option>
                                <option value="mobile">Mobile banking (bKash, Nagad…)</option>
                              </select>
                              <label className="flex items-center gap-1.5 font-bold text-slate-700 whitespace-nowrap"><input type="checkbox" checked={p.enabled} onChange={(e) => setPay(p.id, { enabled: e.target.checked })} className="accent-rose-900" />Show to customers</label>
                              <button aria-label="Remove option" onClick={() => upd({ payments: d.payments.filter((x) => x.id !== p.id) })} className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg justify-self-end"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {p.type === 'mobile' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input value={p.number} onChange={(e) => setPay(p.id, { number: e.target.value })} placeholder="Number customers send money to" className={inputCls} />
                                <input value={p.note} onChange={(e) => setPay(p.id, { note: e.target.value })} placeholder="Extra instruction (optional)" className={inputCls} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-3 z-20 bg-slate-900 text-white rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xl">
                      <span className="text-xs text-slate-300">{sDraft ? 'You have unsaved changes.' : 'All changes are saved.'}</span>
                      <div className="flex gap-2">
                        <button disabled={!sDraft || savingSettings} onClick={() => setSDraft(null)} className="px-4 py-2 rounded-xl border border-slate-600 text-xs font-bold disabled:opacity-40">Discard</button>
                        <button disabled={!sDraft || savingSettings} onClick={save} className="px-4 py-2 rounded-xl bg-amber-400 text-slate-900 text-xs font-black disabled:opacity-40">{savingSettings ? 'Saving…' : 'Save changes'}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {adminSection === 'staff' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 max-w-2xl">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-600" />Admin Staff Authorization</h3>
                  <p className="text-[11px] text-slate-400">{backend.db ? 'Who can open this panel is set in the Share menu: give a teammate Editor access there.' : 'Create & restrict internal management accounts'}</p>
                  <div className="space-y-2">
                    {staffList.map((st) => (
                      <div key={st.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div><div className="font-bold text-slate-800">{st.name}</div><div className="text-[10px] text-slate-400">{st.email}</div></div>
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">{st.role}</span>
                          {st.role !== 'Super Admin' && <button aria-label="Remove" onClick={() => setStaffList(staffList.filter((x) => x.id !== st.id))} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.currentTarget;
                    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
                    setStaffList([...staffList, { id: `st-${Date.now()}`, name: get('name'), email: get('email'), role: get('role') }]);
                    f.reset();
                  }} className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-100">
                    <input name="name" required placeholder="Name" className={inputCls} />
                    <input name="email" type="email" required placeholder="Email" className={inputCls} />
                    <select name="role" className={inputCls}><option>Sub-Admin</option><option>Order Manager</option><option>Content Editor</option></select>
                    <button type="submit" className="bg-rose-950 text-white font-bold rounded-xl py-2 hover:bg-rose-900 transition">Add Staff</button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ======================= PRODUCT FORM MODAL (ADMIN) ======================= */}
      {productFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={saveProduct} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button type="button" onClick={() => setProductFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="font-bold text-slate-700 block mb-1">Title (English) *</label><input required value={pForm.titleEn} onChange={(e) => setPForm({ ...pForm, titleEn: e.target.value })} className={inputCls} /></div>
              <div><label className="font-bold text-slate-700 block mb-1">Title (Bangla)</label><input value={pForm.titleBn} onChange={(e) => setPForm({ ...pForm, titleBn: e.target.value })} className={inputCls} /></div>
              <div><label className="font-bold text-slate-700 block mb-1">Selling Price (৳) *</label><input required type="number" min={1} value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} className={inputCls} /></div>
              <div><label className="font-bold text-slate-700 block mb-1">Regular Price (৳)</label><input type="number" min={0} value={pForm.regularPrice} onChange={(e) => setPForm({ ...pForm, regularPrice: e.target.value })} className={inputCls} /></div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category</label>
                <select value={pForm.categoryId} onChange={(e) => setPForm({ ...pForm, categoryId: e.target.value, subCategoryId: '' })} className={inputCls}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sub-category</label>
                <select value={pForm.subCategoryId} onChange={(e) => setPForm({ ...pForm, subCategoryId: e.target.value })} className={inputCls}>
                  <option value="">— None —</option>
                  {subCategories.filter((s) => s.categoryId === pForm.categoryId).map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
                </select>
              </div>
              <div><label className="font-bold text-slate-700 block mb-1">Stock Qty</label><input type="number" min={0} value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} className={inputCls} /></div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Badge</label>
                <select value={pForm.badge} onChange={(e) => setPForm({ ...pForm, badge: e.target.value })} className={inputCls}>
                  {['', 'NEW', 'HOT', 'SALE', 'TRENDING', 'POPULAR'].map((b) => <option key={b} value={b}>{b || 'None'}</option>)}
                </select>
              </div>
              <div><label className="font-bold text-slate-700 block mb-1">Sizes (comma separated)</label><input value={pForm.sizes} onChange={(e) => setPForm({ ...pForm, sizes: e.target.value })} placeholder="S, M, L, XL" className={inputCls} /></div>
              <div><label className="font-bold text-slate-700 block mb-1">Colors (comma separated)</label><input value={pForm.colors} onChange={(e) => setPForm({ ...pForm, colors: e.target.value })} placeholder="Rose Pink, Navy" className={inputCls} /></div>
            </div>
            <div><label className="font-bold text-slate-700 block mb-1">Fabric & Specs</label><input value={pForm.fabric} onChange={(e) => setPForm({ ...pForm, fabric: e.target.value })} className={inputCls} /></div>
            <div><label className="font-bold text-slate-700 block mb-1">Description</label><textarea rows={3} value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} className={inputCls} /></div>
            <div><label className="font-bold text-slate-700 block mb-1">Product photos</label><ImagePicker images={pForm.images} onChange={(images) => setPForm((f) => ({ ...f, images }))} backend={backend} max={6} /></div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setProductFormOpen(false)} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" className="flex-1 bg-rose-950 text-white font-bold py-2.5 rounded-xl hover:bg-rose-900 transition">{editingId ? 'Save Changes' : 'Publish Product'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ======================= QUICK VIEW ======================= */}
      {quickView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQuickView(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative grid grid-cols-1 md:grid-cols-2 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setQuickView(null)} aria-label="Close" className="absolute top-4 right-4 z-10 bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-full transition"><X className="w-5 h-5" /></button>
            <div className="bg-slate-100 relative">
              <img src={quickView.images[qvImg] || quickView.images[0]} alt={quickView.titleEn} className="w-full h-full object-cover aspect-square md:aspect-auto md:min-h-[420px]" />
              {quickView.images.length > 1 && (
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {quickView.images.map((img, i) => (
                    <button key={i} onClick={() => setQvImg(i)} className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${i === qvImg ? 'border-amber-400' : 'border-white/70'}`}><img src={img} alt="" className="w-full h-full object-cover" /></button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-bold text-rose-950 uppercase tracking-wider bg-rose-100 px-2.5 py-1 rounded-md">{quickView.badge || 'EXCLUSIVE'}</span>
                <h2 className="text-2xl font-bold text-slate-900 leading-snug">{t(quickView.titleEn, quickView.titleBn)}</h2>
                {quickView.storeName && <button onClick={() => { setStoreFilter(quickView.sellerId || null); setSelectedCategory('all'); setQuickView(null); setTimeout(scrollToProducts, 60); }} className="text-xs font-semibold text-rose-900 hover:underline">{t('Sold by', 'বিক্রেতা:')} {quickView.storeName}</button>}
                <div className="flex items-center gap-1 text-xs"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{quickView.reviews > 0 ? <><b>{quickView.rating.toFixed(1)}</b><span className="text-slate-400">({quickView.reviews} {t('reviews', 'রিভিউ')})</span></> : <b className="text-slate-500">{t('New product', 'নতুন পণ্য')}</b>}</div>
                <div className="text-rose-950 text-2xl font-black">
                  ৳{quickView.price.toLocaleString()}
                  {quickView.regularPrice > quickView.price && <span className="text-sm font-normal text-slate-400 line-through ml-2">৳{quickView.regularPrice.toLocaleString()}</span>}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{quickView.description}</p>
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100"><strong>{t('Fabric Specs:', 'ফ্যাব্রিক বিবরণ:')}</strong> {quickView.fabric}</div>

                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">{t('Size', 'সাইজ')}</div>
                  <div className="flex flex-wrap gap-2">
                    {quickView.sizes.map((s) => <button key={s} onClick={() => setQvSize(s)} className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${qvSize === s ? 'bg-rose-950 text-white border-rose-950' : 'bg-white text-slate-700 border-slate-300 hover:border-rose-900'}`}>{s}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">{t('Color', 'রঙ')}</div>
                  <div className="flex flex-wrap gap-2">
                    {quickView.colors.map((c) => <button key={c} onClick={() => setQvColor(c)} className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${qvColor === c ? 'bg-rose-950 text-white border-rose-950' : 'bg-white text-slate-700 border-slate-300 hover:border-rose-900'}`}>{c}</button>)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-slate-700">{t('Quantity', 'পরিমাণ')}</div>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button onClick={() => setQvQty(Math.max(1, qvQty - 1))} className="px-2.5 py-1 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                    <span className="px-3 text-xs font-bold">{qvQty}</span>
                    <button onClick={() => setQvQty(Math.min(quickView.stock, qvQty + 1))} className="px-2.5 py-1 hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className={`text-[11px] font-semibold ${quickView.stock <= LOW_STOCK_LIMIT ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {quickView.stock <= 0 ? t('Out of stock', 'স্টক শেষ') : t(`${quickView.stock} in stock`, `${quickView.stock}টি স্টকে আছে`)}
                  </span>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <button disabled={quickView.stock <= 0} onClick={() => { addToCart(quickView, qvSize, qvColor, qvQty); setQuickView(null); }} className="w-full bg-rose-950 hover:bg-rose-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" />{t('Add to Shopping Cart', 'শপিং কার্টে যোগ করুন')}
                </button>
                <button onClick={() => toggleWishlist(quickView.id)} className="w-full border border-slate-200 text-slate-700 hover:bg-slate-50 py-2.5 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2">
                  <Heart className={`w-4 h-4 ${wishlist.includes(quickView.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                  {wishlist.includes(quickView.id) ? t('Saved to Wishlist', 'উইশলিস্টে আছে') : t('Save to Wishlist', 'উইশলিস্টে রাখুন')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= WISHLIST DRAWER ======================= */}
      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setIsWishlistOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><Heart className="w-5 h-5 text-rose-900" />{t('My Wishlist', 'আমার উইশলিস্ট')} ({wishlistProducts.length})</h3>
              <button onClick={() => setIsWishlistOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {wishlistProducts.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3"><Heart className="w-12 h-12 mx-auto stroke-1" /><p className="text-sm font-medium">{t('No saved items yet', 'এখনো কিছু সেভ করা হয়নি')}</p></div>
              ) : wishlistProducts.map((p) => (
                <div key={p.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <img src={p.images[0]} alt={p.titleEn} className="w-16 h-20 object-cover rounded-xl bg-white" />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{t(p.titleEn, p.titleBn)}</h4>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-rose-950 text-sm">৳{p.price.toLocaleString()}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setIsWishlistOpen(false); openQuickView(p); }} className="bg-rose-950 hover:bg-rose-900 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg">{t('View', 'দেখুন')}</button>
                        <button aria-label="Remove" onClick={() => toggleWishlist(p.id)} className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================= CART DRAWER ======================= */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setIsCartOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-rose-900" /><h3 className="font-bold text-slate-900 text-lg">{t('Your Shopping Bag', 'আপনার শপিং ব্যাগ')} ({cartCount})</h3></div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>

            {cart.length > 0 && (
              <div className="px-5 pt-4">
                <div className="text-[11px] text-slate-600 mb-1.5">
                  {freeDelivery ? <span className="text-emerald-700 font-bold">🎉 {t('You got FREE delivery!', 'আপনি ফ্রী ডেলিভারি পাচ্ছেন!')}</span>
                    : <>{t('Add', 'আরও')} <b className="text-rose-950">৳{(S.freeDeliveryOver + 1 - cartSubtotal).toLocaleString()}</b> {t('more for FREE delivery', 'কিনলে ফ্রী ডেলিভারি')}</>}
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (cartSubtotal / S.freeDeliveryOver) * 100)}%` }} /></div>
              </div>
            )}

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-3"><ShoppingBag className="w-12 h-12 mx-auto stroke-1" /><p className="text-sm font-medium">{t('Your cart is empty', 'আপনার কার্ট খালি রয়েছে')}</p></div>
              ) : cart.map((item, index) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <img src={item.images[0]} alt={item.titleEn} className="w-16 h-20 object-cover rounded-xl bg-white" />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{t(item.titleEn, item.titleBn)}</h4>
                        <div className="text-[10px] text-slate-500 mt-0.5">{t('Size', 'সাইজ')}: {item.size} | {t('Color', 'রঙ')}: {item.color}</div>
                      </div>
                      <button aria-label="Remove" onClick={() => removeFromCart(index)} className="text-slate-400 hover:text-rose-600 self-start"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-rose-950 text-sm">৳{(item.price * item.qty).toLocaleString()}</span>
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                        <button onClick={() => updateCartQty(index, -1)} className="px-2 py-0.5 text-xs hover:bg-slate-100 font-bold">-</button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.qty}</span>
                        <button onClick={() => updateCartQty(index, 1)} className="px-2 py-0.5 text-xs hover:bg-slate-100 font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex gap-2">
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t('Coupon code', 'কুপন কোড')} className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-900 uppercase" />
                  <button onClick={applyCoupon} className="bg-amber-400 hover:bg-amber-300 text-rose-950 text-xs font-bold px-4 rounded-xl transition">{t('Apply', 'প্রয়োগ')}</button>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex justify-between"><span>{t('Subtotal:', 'পণ্য মূল্য:')}</span><span className="font-bold text-slate-900">৳{cartSubtotal.toLocaleString()}</span></div>
                  {couponApplied && <div className="flex justify-between text-emerald-700 text-xs"><span>{t('Coupon discount', 'কুপন ছাড়')} ({S.couponPercent}%)</span><span>-৳{discount.toLocaleString()}</span></div>}
                  <div className="text-[11px] text-slate-400">{t('Delivery charge calculated at checkout', 'ডেলিভারি চার্জ চেকআউটে যোগ হবে')}</div>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); setCheckoutError(''); }} className="w-full bg-rose-950 hover:bg-rose-900 text-white font-bold py-3.5 rounded-2xl shadow-lg transition flex items-center justify-center gap-2">
                  {t('Proceed to Checkout', 'অর্ডার সম্পন্ন করুন')}<ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= CHECKOUT ======================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{t('Checkout Order', 'অর্ডার চেকআউট')}</h3>
                <p className="text-xs text-slate-500">{t('Fill in delivery details to complete order', 'অর্ডার সম্পন্ন করতে বিবরণ প্রদান করুন')}</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('Full Name *', 'পূর্ণ নাম *')}</label>
                  <input required placeholder="e.g. Nusrat Jahan" value={checkout.name} onChange={(e) => setCheckout({ ...checkout, name: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-rose-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('Phone Number *', 'মোবাইল নম্বর *')}</label>
                  <input required type="tel" inputMode="numeric" placeholder="017xxxxxxxx" value={checkout.phone} onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-rose-900" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('Full Address *', 'সম্পূর্ণ ঠিকানা *')}</label>
                <textarea required rows={2} placeholder={t('House/Road no, Area, District', 'বাড়ি/রোড নং, এলাকা, জেলা')} value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-rose-900" />
              </div>

              {backend.db && uid && (
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={saveDetails} onChange={(e) => setSaveDetails(e.target.checked)} className="accent-rose-900" />{t('Save these details to my account', 'এই তথ্য আমার অ্যাকাউন্টে সেভ করুন')}</label>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('Delivery Zone', 'ডেলিভারি এলাকা')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {([['inside_dhaka', 'Inside Dhaka', 'ঢাকার ভেতরে', S.deliveryInside], ['outside_dhaka', 'Outside Dhaka', 'ঢাকার বাইরে', S.deliveryOutside]] as const).map(([val, en, bn, fee]) => (
                    <label key={val} className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer text-xs ${checkout.zone === val ? 'border-rose-900 bg-rose-50/50 font-bold' : 'border-slate-200'}`}>
                      <input type="radio" name="zone" checked={checkout.zone === val} onChange={() => setCheckout({ ...checkout, zone: val })} className="accent-rose-900" />
                      <span>{t(en, bn)}</span>
                      <span className="text-rose-950 font-bold">{freeDelivery ? t('Free', 'ফ্রী') : `৳${fee}`}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('Payment Method', 'পেমেন্ট মেথড')}</label>
                <div className={`grid gap-2 ${payOptions.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {payOptions.map((pm) => (
                    <button key={pm.id} type="button" onClick={() => setCheckout({ ...checkout, paymentMethod: pm.name, trxId: '' })} className={`p-2.5 rounded-xl border text-xs font-bold transition ${activePay?.id === pm.id ? 'border-rose-900 bg-rose-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
                      {pm.type === 'cod' ? t('Cash on Delivery', 'ক্যাশ অন ডেলিভারি') : pm.name}
                    </button>
                  ))}
                </div>
                {payOptions.length === 0 && <p className="mt-2 text-xs text-slate-500">{t('Payment will be confirmed by phone after you place the order.', 'অর্ডারের পর ফোনে পেমেন্ট নিশ্চিত করা হবে।')}</p>}
                {activePay && activePay.type === 'mobile' && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-xs">
                    <p className="text-amber-900">
                      {t(`Send ৳${cartTotal.toLocaleString()} via ${activePay.name} (Send Money) to`, `${activePay.name} (Send Money) করে ৳${cartTotal.toLocaleString()} পাঠান এই নম্বরে:`)} <b className="font-mono">{activePay.number}</b>
                    </p>
                    {activePay.note && <p className="text-amber-800">{activePay.note}</p>}
                    <input value={checkout.trxId} onChange={(e) => setCheckout({ ...checkout, trxId: e.target.value })} placeholder={t('Transaction ID (e.g. 9K3L2M1N0P)', 'ট্রানজেকশন আইডি (যেমন: 9K3L2M1N0P)')} className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 outline-none focus:border-rose-900 font-mono uppercase" />
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600"><span>{t('Subtotal', 'সাবটোটাল')}</span><span>৳{cartSubtotal.toLocaleString()}</span></div>
                {couponApplied && <div className="flex justify-between text-emerald-700"><span>{t('Coupon discount', 'কুপন ছাড়')}</span><span>-৳{discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-slate-600"><span>{t('Delivery Charge', 'ডেলিভারি চার্জ')}</span><span>{deliveryCharge === 0 ? t('Free', 'ফ্রী') : `৳${deliveryCharge}`}</span></div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200"><span>{t('Total Payable Amount', 'সর্বমোট প্রদেয় টাকা')}</span><span className="text-rose-950">৳{cartTotal.toLocaleString()}</span></div>
              </div>

              {checkoutError && <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl px-3 py-2">{checkoutError}</div>}

              <button type="submit" disabled={placing} className="w-full bg-rose-950 hover:bg-rose-900 disabled:opacity-60 disabled:cursor-wait text-white font-bold py-3.5 rounded-2xl shadow-lg transition text-sm">
                {placing ? t('Placing order…', 'অর্ডার হচ্ছে…') : <>{t('Confirm Order', 'অর্ডার নিশ্চিত করুন')} (৳{cartTotal.toLocaleString()})</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= ORDER SUCCESS ======================= */}
      {successOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto"><Check className="w-8 h-8" /></div>
            <h3 className="text-2xl font-black text-slate-900">{t('Order Placed!', 'অর্ডার সফল হয়েছে!')}</h3>
            <p className="text-xs text-slate-500">{t('Thank you for shopping with NewXen. We will call you shortly to confirm.', 'নিউজেনের সাথে কেনাকাটার জন্য ধন্যবাদ। কনফার্ম করতে শীঘ্রই আপনাকে কল করা হবে।')}</p>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <div className="text-[11px] text-slate-500">{t('Your Order ID', 'আপনার অর্ডার আইডি')}</div>
              <div className="text-2xl font-black font-mono text-rose-950">{successOrder.id}</div>
              <div className="text-xs text-slate-600 mt-1">{t('Total', 'মোট')}: ৳{successOrder.totalAmount.toLocaleString()} · {successOrder.paymentMethod}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSuccessOrder(null)} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 text-sm">{t('Continue Shopping', 'কেনাকাটা চালিয়ে যান')}</button>
              <button onClick={() => { const id = successOrder.id; setSuccessOrder(null); setActiveTab('tracking'); setTrackId(id); doTrack(id); }} className="flex-1 bg-rose-950 hover:bg-rose-900 text-white font-bold py-2.5 rounded-xl text-sm">{t('Track Order', 'ট্র্যাক করুন')}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDlg && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <p className="text-sm font-semibold text-slate-800">{confirmDlg.msg}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDlg(null)} className="flex-1 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 text-sm">Cancel</button>
              <button onClick={() => { const fn = confirmDlg.onYes; setConfirmDlg(null); fn(); }} className="flex-1 bg-rose-950 hover:bg-rose-900 text-white font-bold py-2.5 rounded-xl text-sm">Yes, continue</button>
            </div>
          </div>
        </div>
      )}

      {backend.auth?.recovery && <RecoveryModal backend={backend} t={t} />}
      {billOrder && (
      <BillModal order={billOrder} shop={{ brandName: S.brandName, brandBn: S.brandBn, phone: S.phone, email: S.email, address: S.address }}
          onClose={() => setBillOrder(null)} onProduct={goToProduct} notify={showToast} />
      )}

      {/* TOAST */}
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl">{toast}</div>}

      {/* FLOATING WHATSAPP */}
      {S.whatsapp && (
        <a href={`https://wa.me/${waDigits(S.whatsapp)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="fixed bottom-5 right-5 z-30 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-xl transition">
          <MessageCircle className="w-6 h-6" />
        </a>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-300 pt-12 pb-8 border-t border-slate-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><span className="text-2xl font-extrabold text-white">{S.brandName}</span><span className="text-xs bg-rose-900 text-rose-100 px-1.5 py-0.5 rounded font-bold">{S.brandBn}</span></div>
            <p className="text-xs text-slate-400 leading-relaxed">{t(S.footerEn, S.footerBn || S.footerEn)}</p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">{t('Quick Links', 'গুরুত্বপূর্ণ লিঙ্ক')}</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {S.quickLinks.map((l) =>
                l.target.startsWith('url:') ? (
                  safeUrl(l.target.slice(4)) ? <li key={l.id}><a href={safeUrl(l.target.slice(4))} target="_blank" rel="noopener noreferrer" className="hover:text-rose-400 transition">{t(l.labelEn, l.labelBn || l.labelEn)}</a></li> : null
                ) : (
                  <li key={l.id}><button onClick={() => goLink(l.target)} className="hover:text-rose-400 transition text-left">{t(l.labelEn, l.labelBn || l.labelEn)}</button></li>
                )
              )}
              <li><button onClick={() => { setActiveTab('seller'); window.scrollTo({ top: 0 }); }} className="hover:text-rose-400 transition text-left">{t('Become a seller', 'সেলার হিসেবে যুক্ত হোন')}</button></li>
              {S.returnEn && <li className="text-slate-500">{t(S.returnEn, S.returnBn || S.returnEn)}</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">{t('Customer Support', 'কাস্টমার সাপোর্ট')}</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {S.phone && <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />{S.phone}</li>}
              {S.whatsapp && <li className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />WhatsApp: {S.whatsapp}</li>}
              {S.email && <li className="flex items-center gap-2 break-all"><span className="w-3.5 text-center text-rose-500 shrink-0">@</span>{S.email}</li>}
              {S.address && <li className="flex items-start gap-2"><Globe className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />{S.address}</li>}
              {S.deliveryNoteEn && <li className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-rose-500 shrink-0" />{t(S.deliveryNoteEn, S.deliveryNoteBn || S.deliveryNoteEn)}</li>}
              {(safeUrl(S.facebook) || safeUrl(S.instagram)) && (
                <li className="flex gap-3 pt-1">
                  {safeUrl(S.facebook) && <a href={safeUrl(S.facebook)} target="_blank" rel="noopener noreferrer" className="hover:text-rose-400 transition font-semibold">Facebook</a>}
                  {safeUrl(S.instagram) && <a href={safeUrl(S.instagram)} target="_blank" rel="noopener noreferrer" className="hover:text-rose-400 transition font-semibold">Instagram</a>}
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-3">{t('Accepted Payments', 'পেমেন্ট মেথড সমূহ')}</h4>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-800">
              {payOptions.map((p) => <span key={p.id} className="bg-white px-2.5 py-1 rounded shadow">{p.name}</span>)}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 pt-8 mt-8 border-t border-slate-900">
          © {new Date().getFullYear()} {S.brandName} Bangladesh ({S.brandBn}). All rights reserved.
        </div>
      </footer>
    </div>
  );
}
