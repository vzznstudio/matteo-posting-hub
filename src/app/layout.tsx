import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const editorial = localFont({
  variable: "--font-editorial",
  display: "swap",
  src: [
    { path: "./fonts/EditorialToday-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/EditorialToday-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/EditorialToday-SemiBold.ttf", weight: "600", style: "normal" },
  ],
});

const xenon = localFont({
  variable: "--font-xenon",
  display: "swap",
  src: [
    { path: "./fonts/XenonNue-Regular.woff2", weight: "400" },
    { path: "./fonts/XenonNue-Medium.woff2", weight: "500" },
    { path: "./fonts/XenonNue-SemiBold.woff2", weight: "600" },
    { path: "./fonts/XenonNue-Bold.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Matteo's Posting Hub",
  description: "Post once, publish everywhere.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${editorial.variable} ${xenon.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
