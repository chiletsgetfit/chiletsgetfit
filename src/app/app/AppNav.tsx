"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Six items plus the 72px logo need ~720px, so the inline row starts at md (768px).
// Below that, phones get a compact menu that drops down under the header.
const linkClass =
  "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-gold-400";
const menuItemClass =
  "block border-b border-zinc-900 px-5 py-4 text-base text-zinc-100 hover:bg-zinc-900 hover:text-gold-400";

type Item = { href: string; label: string; external?: boolean };

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items: Item[] = [
    { href: "/app/food", label: "Food" },
    { href: "/app/progress", label: "Progress" },
    { href: "/app/history", label: "History" },
    { href: "/resources/index.html", label: "Resources", external: true },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  const signOut = (className: string) => (
    <form action="/auth/signout" method="POST">
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );

  return (
    <>
      {/* Inline links from md up */}
      <nav className="hidden items-center gap-4 md:flex">
        {items.map((item) =>
          item.external ? (
            <a key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          )
        )}
        {signOut(linkClass)}
      </nav>

      {/* Phone menu */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="app-menu"
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-200 hover:text-gold-400 md:hidden"
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

      {open && (
        <div
          id="app-menu"
          className="absolute inset-x-0 top-full border-b border-zinc-900 bg-black shadow-2xl md:hidden"
        >
          <nav className="flex flex-col">
            <Link href="/app" className={menuItemClass}>
              Today
            </Link>
            {items.map((item) =>
              item.external ? (
                <a key={item.href} href={item.href} className={menuItemClass}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={menuItemClass}>
                  {item.label}
                </Link>
              )
            )}
            {signOut(`${menuItemClass} w-full text-left`)}
          </nav>
        </div>
      )}
    </>
  );
}
