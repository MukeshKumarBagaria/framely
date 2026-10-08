import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PinGate from "@/components/pin-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Framely — Photo Personalization",
  description: "Upload photos, see them instantly placed on every matching frame design.",
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
      <head>
        {/*
          Canonical-named Google Fonts for the template render-core (Technical
          Plan §6): the template JSON references font families by these exact
          names ("Inter", "Playfair Display", "Great Vibes"), and the Konva
          canvas needs a matching document.fonts entry to draw them correctly.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Great+Vibes&family=Hurricane&family=Inter:wght@400;500;600;700;800;900&family=Kaushan+Script&family=Lobster+Two:wght@400;700&family=Montserrat:wght@400;700;800;900&family=Ms+Madi&family=Parisienne&family=Pinyon+Script&family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <PinGate>{children}</PinGate>
      </body>
    </html>
  );
}
