import type { Metadata } from "next";
import { Barlow_Condensed, Russo_One } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

const russoOne = Russo_One({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-russo",
});

export const metadata: Metadata = {
  title: "F1 Reaction Time Tester",
  description: "Test your reaction time like an F1 driver",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${barlowCondensed.variable} ${russoOne.variable}`}>{children}</body>
    </html>
  );
}

