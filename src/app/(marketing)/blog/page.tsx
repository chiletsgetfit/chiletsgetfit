import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on training, nutrition, and the messy reality of staying consistent.",
};

const POSTS: { slug: string; title: string; date: string; excerpt: string }[] = [];

export default function BlogPage() {
  return (
    <>
      <section className="py-20 md:py-28">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Blog
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Notes from the gym floor.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            Occasional writing on training, nutrition, and what actually moves
            the needle.
          </p>
        </Container>
      </section>

      <section className="border-t border-zinc-900 pb-24">
        <Container className="pt-16">
          {POSTS.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
              <h2 className="text-xl font-semibold">First post coming soon.</h2>
              <p className="mt-3 text-zinc-400">
                Check back shortly — or follow along on social for early reads.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-xs font-semibold uppercase tracking-[0.2em] hover:border-gold-400 hover:text-gold-400"
              >
                Stay in Touch
              </Link>
            </div>
          ) : (
            <ul className="grid gap-8 md:grid-cols-2">
              {POSTS.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group block rounded-2xl border border-zinc-800 bg-zinc-950 p-8 transition-colors hover:border-gold-400"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{p.date}</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight group-hover:text-gold-400">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-zinc-400">{p.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    </>
  );
}
