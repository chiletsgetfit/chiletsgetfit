"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "./Container";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <Container className="flex h-20 items-center justify-between md:h-24">
        <Link href="/" onClick={close} className="flex items-center" aria-label="ChiletsGetFit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-12 w-auto md:h-14" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-gold-400"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-gold-400"
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center rounded-full bg-gold-500 px-5 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="border-b border-zinc-900 px-6 py-4 text-base text-zinc-100 hover:bg-zinc-900 hover:text-gold-400"
              >
                {item.label}
              </Link>
            ))}
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
