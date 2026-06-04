import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://leapfi-preview.netlify.app",
  ),
  title: "LeapFi | RGB++ Asset Manager",
  description: "Manage your RGB++ assets across CKB and Bitcoin networks",
  applicationName: "LeapFi",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "LeapFi",
    url: "/",
    title: "LeapFi | RGB++ Asset Manager",
    description:
      "Non-custodial RGB++ asset manager. Leap UDT & Spore assets across Bitcoin and CKB.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "LeapFi — RGB++ Asset Manager" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeapFi | RGB++ Asset Manager",
    description: "Non-custodial RGB++ asset manager. Leap assets across Bitcoin and CKB.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#05070B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} bg-background`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
