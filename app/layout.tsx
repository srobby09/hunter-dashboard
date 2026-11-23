import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

// Self-hosted at build time, so the iPad never refetches it from Google.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export async function generateMetadata(): Promise<Metadata> {
  // On an iPhone the app has a light background, so the status bar needs dark text ("default").
  // On the wall iPad the khaki background runs under a translucent status bar.
  const ua = (await headers()).get("user-agent") ?? "";
  const phone = /iPhone|iPod/.test(ua);
  return {
    title: "Hunter Family Dashboard",
    applicationName: "Hunter Family",
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: "Hunter Family", statusBarStyle: phone ? "default" : "black-translucent" },
    icons: { icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [{ media: "(max-width: 599px)", color: "#FBFAF5" }, { color: "#C2BCA0" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        {/* Sent with the login cookie, so the install info loads even while Vercel's login protection is on */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body>{children}</body>
    </html>
  );
}
