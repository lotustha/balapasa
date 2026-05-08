"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice, discountPercent } from "@/lib/utils";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  BadgeCheck,
  Heart,
  Star,
  Truck,
  ChevronRight,
  Zap,
} from "lucide-react";

const BASE_DELIVERY = 150;
const VAT_RATE = 0.13; // 13% — Nepal standard VAT; all prices are VAT-inclusive

// Mock "you might also like"
const SUGGESTED = [
  {
    id: "s1",
    name: "Vitamin C Serum 30ml",
    slug: "vitamin-c-serum",
    price: 1800,
    salePrice: null,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=220&h=220&fit=crop",
  },
  {
    id: "s2",
    name: "USB-C Fast Charger 65W",
    slug: "usb-c-charger-65w",
    price: 1500,
    salePrice: 1200,
    rating: 4.3,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=220&h=220&fit=crop",
  },
  {
    id: "s3",
    name: "RGB Mechanical Keyboard",
    slug: "rgb-keyboard",
    price: 4500,
    salePrice: 3800,
    rating: 4.4,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=220&h=220&fit=crop",
  },
  {
    id: "s4",
    name: "Smart Watch Series X",
    slug: "smart-watch-x",
    price: 12000,
    salePrice: null,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=220&h=220&fit=crop",
  },
];

export default function CartPage() {
  const { items, subtotal, removeItem, updateQty, clearCart } = useCart();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [freeThreshold, setFreeThreshold] = useState(5000);

  useEffect(() => {
    fetch('/api/store-config').then(r => r.json())
      .then(d => setFreeThreshold(d.FREE_DELIVERY_THRESHOLD ?? 5000))
      .catch(() => {})
  }, [])

  const toFreeDelivery = Math.max(0, freeThreshold - subtotal);
  const deliveryPct = Math.min(100, (subtotal / freeThreshold) * 100);
  const totalSavings = items.reduce(
    (s, i) => (i.salePrice ? s + (i.price - i.salePrice) * i.quantity : s),
    0,
  );
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div
        className="min-h-[80vh] relative overflow-hidden flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 40%, #FFF0F9 70%, #F0FDF4 100%)",
        }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="blob absolute -top-16 -left-16 w-72 h-72 animate-blob-morph animate-blob-float-a"
            style={{ background: "#8B5CF6", opacity: 0.2 }}
          />
          <div
            className="blob absolute bottom-0 right-0 w-64 h-64 animate-blob-morph animate-blob-float-b"
            style={{
              background: "#EC4899",
              opacity: 0.18,
              animationDelay: "2s",
            }}
          />
        </div>
        <div className="relative text-center animate-fade-in-up glass-panel p-12 max-w-sm w-full mx-4">
          <div className="w-20 h-20 rounded-3xl bg-primary-bg flex items-center justify-center mx-auto mb-5">
            <ShoppingBag size={36} className="text-primary" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-slate-500 mb-6 leading-relaxed">
            Looks like you haven't added anything yet. Explore our collection!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-colors cursor-pointer shadow-lg shadow-primary/20"
          >
            Browse Products <ArrowRight size={17} />
          </Link>
          <div className="flex justify-center gap-4 mt-6">
            {["Electronics", "Gadgets", "Beauty"].map((c) => (
              <Link
                key={c}
                href={`/products?category=${c.toLowerCase()}`}
                className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 relative"
      style={{
        background:
          "linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 40%, #FFF0F9 70%, #F0FDF4 100%)",
      }}
    >
      {/* Blobs */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="blob absolute -top-20 -left-20 w-96 h-96 animate-blob-morph animate-blob-float-a"
          style={{ background: "#8B5CF6", opacity: 0.22 }}
        />
        <div
          className="blob absolute top-1/3 -right-10 w-72 h-72 animate-blob-morph animate-blob-float-b"
          style={{ background: "#06B6D4", opacity: 0.18, animationDelay: "2s" }}
        />
        <div
          className="blob absolute bottom-20 left-1/3 w-80 h-80 animate-blob-morph animate-blob-float-c"
          style={{ background: "#EC4899", opacity: 0.16, animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-0.5">
              Review
            </p>
            <h1 className="font-heading font-extrabold text-3xl text-slate-900">
              Shopping Cart
              <span className="ml-2 text-primary text-xl font-bold">
                ({totalItems} {totalItems === 1 ? "item" : "items"})
              </span>
            </h1>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-red-400 hover:text-red-600 cursor-pointer transition-colors flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <Trash2 size={13} /> Clear all
          </button>
        </div>
        {/* Free delivery progress bar */}
        {toFreeDelivery > 0 && (
          <div className="glass-panel p-4 mb-6 animate-fade-in-up">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-primary" />
                <span className="font-semibold text-slate-700">
                  Add{" "}
                  <span className="text-primary font-bold">
                    {formatPrice(toFreeDelivery)}
                  </span>{" "}
                  more for FREE delivery!
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {Math.round(deliveryPct)}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(0,0,0,0.07)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${deliveryPct}%`,
                  background: "linear-gradient(90deg, #16A34A, #06B6D4)",
                }}
              />
            </div>
          </div>
        )}
        {deliveryFee === 0 && (
          <div className="glass-panel p-3 mb-6 animate-fade-in-up flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
              <Truck size={15} className="text-primary" />
            </div>
            <p className="text-sm font-bold text-primary">
              Free delivery unlocked!
            </p>
            <span className="text-xs text-slate-400 ml-auto">
              Orders over {formatPrice(freeThreshold)}
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-7">
          {/* ── Cart items ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, idx) => {
              const ep = item.salePrice ?? item.price;
              const saving = item.salePrice
                ? (item.price - item.salePrice) * item.quantity
                : 0;
              const isSaved = saved.has(item.id);
              return (
                <div
                  key={item.id}
                  className="glass-panel p-5 flex gap-4 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  {/* Product image */}
                  <Link
                    href={`/products/${item.slug}`}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-heading font-bold text-slate-900 text-sm leading-snug hover:text-primary transition-colors cursor-pointer line-clamp-2 flex-1"
                      >
                        {item.name}
                      </Link>
                      {/* Save + Remove */}
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const s = new Set(saved);
                            s.has(item.id) ? s.delete(item.id) : s.add(item.id);
                            setSaved(s);
                          }}
                          title="Save for later"
                          className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all ${isSaved ? "text-pink-500" : "text-slate-300 hover:text-pink-400"}`}
                          style={{ background: "rgba(255,255,255,0.55)" }}
                        >
                          <Heart
                            size={13}
                            className={isSaved ? "fill-pink-500" : ""}
                          />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          title="Remove"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 cursor-pointer transition-colors"
                          style={{ background: "rgba(255,255,255,0.55)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-bold text-primary">
                        {formatPrice(ep)}
                      </span>
                      {item.salePrice && (
                        <>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.price)}
                          </span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-lg">
                            -{discountPercent(item.price, item.salePrice)}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Qty + line total */}
                    <div className="flex items-center justify-between mt-3">
                      <div
                        className="flex items-center gap-2 rounded-2xl p-1"
                        style={{ background: "rgba(255,255,255,0.50)" }}
                      >
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer text-slate-600"
                          style={{ background: "rgba(255,255,255,0.65)" }}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center font-bold text-sm text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/80 transition-colors cursor-pointer text-slate-600"
                          style={{ background: "rgba(255,255,255,0.65)" }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-extrabold text-slate-900 text-sm">
                          {formatPrice(ep * item.quantity)}
                        </p>
                        {saving > 0 && (
                          <p className="text-[10px] text-green-600 font-semibold">
                            Save {formatPrice(saving)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* ── Order Summary ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="glass-panel p-6 sticky top-24 animate-fade-in-up">
              <h2 className="font-heading font-bold text-slate-900 mb-5">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>
                    Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"}
                    )
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span className="text-xs font-semibold text-slate-400 italic">
                    Calculated at checkout
                  </span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-600 font-semibold">
                      Total Savings
                    </span>
                    <span className="font-bold text-green-600">
                      -{formatPrice(totalSavings)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-xs pt-1">
                  <span>VAT ({Math.round(VAT_RATE * 100)}%) incl.</span>
                  <span>{formatPrice(Math.round(subtotal - subtotal / (1 + VAT_RATE)))}</span>
                </div>
              </div>

              {/* Total */}
              <div
                className="border-t mt-4 pt-4 flex justify-between"
                style={{ borderColor: "rgba(0,0,0,0.07)" }}
              >
                <span className="font-heading font-bold text-slate-900">
                  Total
                </span>
                <span className="font-heading font-extrabold text-xl text-primary">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {/* Savings highlight */}
              {totalSavings > 0 && (
                <div className="mt-3 px-3 py-2.5 rounded-2xl flex items-center gap-2 bg-green-50 border border-green-100">
                  <Zap size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-bold">
                    You&apos;re saving {formatPrice(totalSavings)} on this
                    order!
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2 w-full mt-5 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors cursor-pointer shadow-lg shadow-primary/20"
              >
                Proceed to Checkout <ArrowRight size={17} />
              </Link>
              <Link
                href="/products"
                className="flex items-center justify-center gap-1 w-full mt-3 py-3 text-sm text-slate-500 hover:text-primary font-semibold cursor-pointer transition-colors"
              >
                <ChevronRight size={14} className="rotate-180" /> Continue
                Shopping
              </Link>

              {/* Trust badges */}
              <div
                className="flex justify-between mt-5 pt-4"
                style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
              >
                {[
                  { icon: ShieldCheck, label: "Secure" },
                  { icon: BadgeCheck, label: "Authentic" },
                  { icon: RotateCcw, label: "7-day return" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <Icon size={16} className="text-primary" />
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── You might also like ───────────────────────────────────────── */}
        <div className="mt-12 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-slate-900 text-xl">
              You Might Also Like
            </h2>
            <Link
              href="/products"
              className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div
            className="flex gap-4 overflow-x-auto pb-3"
            style={{ scrollbarWidth: "none" }}
          >
            {SUGGESTED.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="glass-panel p-4 shrink-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                style={{ width: 180 }}
              >
                <div className="relative h-32 rounded-xl overflow-hidden mb-3">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                  {p.salePrice && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent text-white text-[10px] font-bold rounded-lg">
                      -{discountPercent(p.price, p.salePrice)}%
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-800 text-xs line-clamp-2 leading-snug">
                  {p.name}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Star
                    size={10}
                    className="fill-gold-bright text-gold-bright"
                  />
                  <span className="text-[10px] text-slate-600 font-semibold">
                    {p.rating}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-bold text-slate-900 text-sm">
                    {formatPrice(p.salePrice ?? p.price)}
                  </span>
                  {p.salePrice && (
                    <span className="text-[10px] text-slate-400 line-through">
                      {formatPrice(p.price)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
