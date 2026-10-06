"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "./Container";

// `external` items are static files in /public, not app routes — use a plain <a>.
// `shortLabel` shows between 768–1023px, where the full bar is tight on space.
const NAV = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/resources/tdee-calculator.html", label: "TDEE Calculator", shortLabel: "Calculator", external: true },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

type NavItem = (typeof NAV)[number];

// Five links + sign-in + CTA need ~900px at full size. Between md (768px) and
// lg (1024px) the bar runs compact instead of collapsing into the drawer:
// smaller logo, tighter gaps and tracking, short label, icon-only sign-in.
const NAV_LINK =
  "text-xs uppercase tracking-[0.15em] text-zinc-300 transition-colors hover:text-gold-400 lg:tracking-[0.2em]";

function NavLabel({ item }: { item: NavItem }) {
  if (!item.shortLabel) return <>{item.label}</>;
  return (
    <>
      <span className="lg:hidden">{item.shortLabel}</span>
      <span className="hidden lg:inline">{item.label}</span>
    </>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <Container className="flex h-20 items-center justify-between md:h-24">
        <Link href="/" onClick={close} className="flex items-center" aria-label="ChiletsGetFit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-12 w-auto lg:h-14" />
        </Link>

        <nav className="hidden md:flex items-center gap-3 lg:gap-8">
          {NAV.map((item) =>
            item.external ? (
              <a key={item.href} href={item.href} className={NAV_LINK}>
                <NavLabel item={item} />
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={NAV_LINK}>
                <NavLabel item={item} />
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3 lg:gap-5">
          <Link
            href="/login"
            aria-label="Sign in"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-gold-400"
          >
            <span className="hidden lg:inline">Sign in</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 lg:hidden"
              aria-hidden="true"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-full bg-gold-500 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 lg:px-5"
          >
            Start Coaching
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
          className="md:hidden -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-200 hover:text-gold-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            {open ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <div id="mobile-nav" className="md:hidden border-t border-zinc-900 bg-black">
          <nav className="flex flex-col">
            {NAV.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="border-b border-zinc-900 px-6 py-4 text-base text-zinc-100 hover:bg-zinc-900 hover:text-gold-400"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="border-b border-zinc-900 px-6 py-4 text-base text-zinc-100 hover:bg-zinc-900 hover:text-gold-400"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/login"
              onClick={close}
              className="border-b border-zinc-900 px-6 py-4 text-base text-zinc-100 hover:bg-zinc-900 hover:text-gold-400"
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              onClick={close}
              className="m-6 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-6 text-sm font-semibold uppercase tracking-[0.2em] text-black hover:bg-gold-400"
            >
              Start Coaching
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
