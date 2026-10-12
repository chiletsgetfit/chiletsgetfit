import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { requireStudio } from "@/lib/studio/access";

const serif = Newsreader({
  variable: "--font-studio-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "The studio",
  robots: { index: false, follow: false },
};

// Light page: tint the phone's status bar to match (the site default is black).
export const viewport: Viewport = { themeColor: "#FAFAF8" };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireStudio();

  return (
    <div data-studio className={`${serif.variable} min-h-screen bg-[#FAFAF8] text-[#1a1a1a] [color-scheme:light]`}>
      {children}
      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pb-10 pt-4 text-[11px] uppercase tracking-[0.18em] text-[#1a1a1a66] sm:px-6">
        <Link href="/app" className="hover:text-[#B91C1C]">
          ChiletsGetFit
        </Link>
        <form action="/auth/signout" method="POST">
          <button type="submit" className="uppercase tracking-[0.18em] hover:text-[#B91C1C]">
            Sign out
          </button>
        </form>
      </footer>
    </div>
  );
}
