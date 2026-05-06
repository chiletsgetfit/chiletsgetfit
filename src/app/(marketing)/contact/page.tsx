import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with ChiletsGetFit about personal training, online coaching, or nutrition.",
};

export default function ContactPage() {
  return (
    <>
      <section className="py-20 md:py-28">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Contact
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Tell me about your goals.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            A few quick details and I'll get back to you with a recommendation.
            Most replies come within one business day.
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="grid gap-12 md:grid-cols-[3fr_2fr]">
          <form
            className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-10"
            action="mailto:chiletsgetfit@gmail.com?subject=New%20coaching%20inquiry"
            method="POST"
            encType="text/plain"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" name="firstName" required autoComplete="given-name" />
              <Field label="Last name" name="lastName" required autoComplete="family-name" />
            </div>
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
            <SelectField
              label="What are you interested in?"
              name="service"
              options={[
                "Personal Training",
                "Online Coaching",
                "Nutrition Coaching",
                "Not sure yet",
              ]}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Tell me about your goals
              </label>
              <textarea
                name="message"
                rows={5}
                required
                className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
                placeholder="A bit about where you are now and what you're working toward..."
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gold-500 px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-gold-400 sm:w-auto"
            >
              Send message
            </button>
            <p className="text-xs text-zinc-500">
              Sending opens your email app with your message — just hit send.
              I read every message myself.
            </p>
          </form>

          <aside className="space-y-6 text-sm text-zinc-300">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                Direct
              </h3>
              <p className="mt-3">
                <a href="mailto:chiletsgetfit@gmail.com" className="hover:text-gold-400">
                  chiletsgetfit@gmail.com
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                On Social
              </h3>
              <ul className="mt-3 space-y-2">
                <li><a href="https://instagram.com/" className="hover:text-gold-400" target="_blank" rel="noreferrer">Instagram</a></li>
                <li><a href="https://facebook.com/" className="hover:text-gold-400" target="_blank" rel="noreferrer">Facebook</a></li>
                <li><a href="https://youtube.com/" className="hover:text-gold-400" target="_blank" rel="noreferrer">YouTube</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                Response time
              </h3>
              <p className="mt-3 text-zinc-400">
                Typically within one business day, Monday through Friday.
              </p>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white placeholder-zinc-600 outline-none focus:border-gold-500"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        className="mt-2 block w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-base text-white outline-none focus:border-gold-500"
      >
        <option value="" disabled>Choose one</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
