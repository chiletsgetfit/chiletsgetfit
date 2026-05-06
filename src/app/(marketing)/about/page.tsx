import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet the coach behind ChiletsGetFit and the philosophy behind the programming.",
};

export default function AboutPage() {
  return (
    <>
      <section className="py-20 md:py-28">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            About
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Coaching that meets you where you are.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            ChiletsGetFit was founded on a simple idea: real progress comes from
            programs you can stick to in the middle of a busy life — not just
            during the easy weeks.
          </p>
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-16 md:py-20">
        <Container className="grid gap-12 md:grid-cols-[2fr_3fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gold-700/40 bg-zinc-950">
            <Image
              src="/brand/coach-main.jpg"
              alt="Coach mid-race"
              fill
              sizes="(min-width: 768px) 40vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Hi, I'm your coach.
            </h2>
            <p className="mt-6 text-zinc-300">
              I've spent years helping people get stronger, leaner, and more
              capable in their everyday lives. My approach blends evidence-based
              strength training with practical nutrition coaching — so you build
              habits that last well past any single program.
            </p>
            <p className="mt-4 text-zinc-400">
              Whether you're stepping into a gym for the first time or coming
              back after years away, the work is the same: small, consistent
              actions, repeated long enough to change something.
            </p>
            <h3 className="mt-10 text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
              What I believe
            </h3>
            <ul className="mt-5 space-y-3 text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" />
                Progress is built on consistency, not intensity.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" />
                Nutrition should fit your life — not the other way around.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" />
                Every program should be honest about what it can and can't do.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-500" />
                Accountability beats motivation, every time.
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-16 md:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              The receipt
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              17 months. Same person. Different decisions.
            </h2>
            <p className="mt-4 text-zinc-400">
              I won't ask you to do anything I haven't done myself. This is
              what consistent training and honest nutrition looked like for me.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-10">
            <figure className="flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                <Image
                  src="/brand/coach-2023.jpg"
                  alt="Coach in December 2023, before training transformation"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                  December 2023
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-600">
                  Where I started
                </span>
              </figcaption>
            </figure>
            <figure className="flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gold-700/50 bg-zinc-950">
                <Image
                  src="/brand/coach-finish.jpg"
                  alt="Coach finishing his first triathlon, May 3, 2025"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  quality={95}
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                  May 3, 2025
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-zinc-600">
                  First triathlon, finished
                </span>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-16 md:py-20">
        <Container className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Let's get to work.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Pick the path that fits you, or send a message and I'll point you in
            the right direction.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/services"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
            >
              See Services
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-8 text-sm font-semibold uppercase tracking-[0.2em] transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              Get in Touch
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
