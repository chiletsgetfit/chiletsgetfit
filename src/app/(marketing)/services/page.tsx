import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Personal training, online coaching, and nutrition coaching — built around your goals and your schedule.",
};

const SERVICES = [
  {
    id: "personal-training",
    eyebrow: "1:1 Training",
    title: "Personal Training",
    summary:
      "Hands-on sessions, in person or over video, with a program written specifically for you.",
    bullets: [
      "Initial movement and goal assessment",
      "Custom program updated every 4–6 weeks",
      "Form coaching and progression tracking",
      "Optional nutrition layer for an additional fee",
    ],
    cta: "Book an intro call",
  },
  {
    id: "online-coaching",
    eyebrow: "Train Anywhere",
    title: "Online Coaching",
    summary:
      "A complete program delivered to your phone, with regular check-ins and adjustments as you progress.",
    bullets: [
      "Weekly programming written to your equipment and schedule",
      "Mobile workout tracking — log sets, reps, and weights as you go",
      "Form video reviews and progression adjustments",
      "Direct line for questions between sessions",
    ],
    cta: "Start online coaching",
  },
  {
    id: "nutrition",
    eyebrow: "Eat for the Goal",
    title: "Nutrition Coaching",
    summary:
      "Practical, sustainable guidance that helps you eat for performance and body composition without obsessing.",
    bullets: [
      "Personalized macro and calorie targets",
      "Meal frameworks, not rigid meal plans",
      "Habit-based progression: one change at a time",
      "Bi-weekly check-ins to keep things moving",
    ],
    cta: "Talk nutrition",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="py-20 md:py-28">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Services
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Three ways to train. One standard.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            Pick the format that fits your life. Every program is built around
            real-world consistency — not perfection.
          </p>
        </Container>
      </section>

      <section className="border-t border-zinc-900 pb-20 md:pb-28">
        <Container className="space-y-16 pt-16 md:pt-20">
          {SERVICES.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="grid scroll-mt-24 gap-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:grid-cols-[1fr_2fr] md:p-12"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
                  {s.eyebrow}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-4 text-zinc-300">{s.summary}</p>
                <Link
                  href="/contact"
                  className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-6 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
                >
                  {s.cta}
                </Link>
              </div>
              <ul className="space-y-3 md:border-l md:border-zinc-800 md:pl-12">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-zinc-200">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-16 md:py-20">
        <Container className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Not sure which one fits?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Send a quick note about your goals and current routine. I'll come
            back with a recommendation — no obligation.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-10 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
          >
            Get in Touch
          </Link>
        </Container>
      </section>
    </>
  );
}
