import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chiletsgetfit.com"),
  title: {
    default: "ChiletsGetFit — Fitness & Nutrition Coaching",
    template: "%s · ChiletsGetFit",
  },
  description:
    "Personal training and online coaching that adapts to how you actually live — with nutrition guidance built in.",
  applicationName: "ChiletsGetFit",
  appleWebApp: {
    capable: true,
    title: "ChiletsGetFit",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "ChiletsGetFit — Fitness & Nutrition Coaching",
    description:
      "Personal training and online coaching that adapts to how you actually live.",
    url: "https://www.chiletsgetfit.com",
    siteName: "ChiletsGetFit",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
