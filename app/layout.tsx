import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "./providers";
import { AppFrame } from "@/components/shell/AppFrame";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "UNILUS Navigator | Your campus, connected", template: "%s | UNILUS Navigator" },
  description: "Find your way around the University of Lusaka. Explore campus spaces, plan your timetable, request rooms and connect with your study circle.",

  applicationName: "UNILUS Navigator",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/images/inilus_logo.jpg", apple: "/images/inilus_logo.jpg" },

  openGraph: {
    title: "UNILUS Navigator",
    description: "Your University of Lusaka campus companion.",
    siteName: "UNILUS Navigator",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "UNILUS Navigator",
    description: "Your University of Lusaka campus companion.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1769c2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${manrope.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <NextTopLoader color="#1769c2" showSpinner={false} />
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
