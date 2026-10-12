import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The HIVE · Harvest Insurance",
  description: "Join the HIVE founding partner waitlist. A better connection for Florida partners and their clients.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
