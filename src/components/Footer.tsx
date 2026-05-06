import Link from "next/link";
import { Container } from "./Container";

const SOCIALS: { label: string; href: string }[] = [
  { label: "Instagram", href: "https://instagram.com/" },
  { label: "Facebook", href: "https://facebook.com/" },
  { label: "YouTube", href: "https://youtube.com/" },
  { label: "LinkedIn", href: "https://linkedin.com/" },
];

const SITE_LINKS = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Client sign in" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-zinc-900 bg-black">
      <Container className="grid gap-10 py-14 md:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ChiletsGetFit" className="h-14 w-auto md:h-16" />
          <p className="mt-5 max-w-sm text-sm text-zinc-400">
            Fitness &amp; Nutrition Coaching, built around how you actually live.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            Site
          </h3>
          <ul className="mt-5 space-y-3 text-sm text-zinc-300">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold-400 transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            Connect
          </h3>
          <ul className="mt-5 space-y-3 text-sm text-zinc-300">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gold-400 transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-zinc-900">
        <Container className="flex flex-col items-start gap-2 py-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {year} ChiletsGetFit. All rights reserved.</span>
          <span className="uppercase tracking-[0.25em]">Train with intent</span>
        </Container>
      </div>
    </footer>
  );
}
