import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import "./material-symbols.css";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CD Voting",
  description: "ระบบเลือกตั้งโรงเรียนจิตรลดา",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head />
      <body
        className={`${spaceMono.variable} antialiased bg-background-light text-slate-900 font-display selection:bg-primary/30`}
      >
        {children}
      </body>
    </html>
  );
}
