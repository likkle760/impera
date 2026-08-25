import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/products";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} | Trading Education, Mentorship & Tools`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "IMPERA provides structured trading education, mentorship and professional trading tools designed to help traders build knowledge, discipline and a repeatable process.",
  openGraph: {
    title: `${BRAND.name} | Trading Education, Mentorship & Tools`,
    description: "Structured trading education, mentorship and professional tools.",
    url: BRAND.url,
    siteName: BRAND.name,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: "Trade with purpose. Build real skill.", images: ["/og.png"] },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#050505", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <Nav />
        <main className="min-h-screen pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
