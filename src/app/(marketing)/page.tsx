import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/Container";

const SERVICES = [
  {
    title: "Personal Training",
    summary:
      "One-on-one sessions, in person or virtual, built around your body, your schedule, and where you're trying to go.",
    href: "/services#personal-training",
  },
  {
    title: "Online Coaching",
    summary:
      "A weekly program delivered to your phone, with check-ins, form reviews, and adjustments as you progress.",
    href: "/services#online-coaching",
  },
  {
    title: "Nutrition Coaching",
    summary:
      "Macro guidance and habits that work with your real life — no fad diets, no obsessive tracking.",
    href: "/services#nutrition",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(231,211,165,0.18),transparent_60%)]" />
        <Container className="py-20 md:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Fitness &amp; Nutrition Coaching
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Train with intent.
            <span className="block text-gold-500">Live with strength.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-zinc-300 sm:text-lg">
            Personal training and online coaching that adapts to how you
            actually live — built around your goals, your schedule, and your
            body.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
            >
              Start Coaching
            </Link>
            <Link
              href="/services"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              See Services
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-20 md:py-28">
        <Container>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Coaching, three ways.
            </h2>
            <p className="mt-4 text-zinc-400">
              Whether you train with me in the gym, follow a program from your
              phone, or want help dialing in nutrition — there's a path that
              fits.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SERVICES.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-8 transition-colors hover:border-gold-400 hover:bg-zinc-900"
              >
                <h3 className="text-xl font-semibold text-white group-hover:text-gold-400">
                  {s.title}
                </h3>
                <p className="mt-3 flex-1 text-sm text-zinc-400">{s.summary}</p>
                <span className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Learn more &rarr;
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-zinc-900 py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              Proof of work
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              I tested it on myself first.
            </h2>
            <p className="mt-4 text-zinc-400">
              17 months between these two photos. Same body, same job, same
              life — different choices, made consistently. The same coaching is
              what you'll get.
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

      <section className="border-t border-zinc-900 py-20 md:py-28">
        <Container className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              The Approach
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for the long haul, not the highlight reel.
            </h2>
            <p className="mt-6 text-zinc-300">
              The best program is the one you can keep doing — through busy
              weeks, vacations, injuries, and slow months. Every session and
              every meal plan I write is designed around that truth.
            </p>
            <p className="mt-4 text-zinc-400">
              You'll get clear weekly workouts, honest feedback, and a plan that
              evolves as you do. No gimmicks, no shame, just steady work that
              compounds.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-flex items-center text-sm font-semibold uppercase tracking-[0.25em] text-gold-400 hover:text-gold-300"
            >
              About me &rarr;
            </Link>
          </div>
          <ul className="grid gap-4">
            {[
              ["Custom programming", "Each block written for your goals, equipment, and schedule."],
              ["Mobile-first tracking", "Log sets, reps, and weights from your phone — no spreadsheets."],
              ["Real accountability", "Weekly check-ins, form reviews, and adjustments that keep momentum."],
              ["Nutrition that fits", "Practical macro guidance — no all-or-nothing diet plans."],
            ].map(([title, body]) => (
              <li
                key={title}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-400">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-zinc-300">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-t border-zinc-900">
        <Container className="py-20 md:py-24">
          <div className="rounded-3xl border border-gold-700/40 bg-gradient-to-br from-zinc-950 to-black p-8 md:p-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to get to work?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-300">
              Tell me about your goals and where you are now — I'll come back
              with a plan that fits.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-gold-500 px-10 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400"
            >
              Start Coaching
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
