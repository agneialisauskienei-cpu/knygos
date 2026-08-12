import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knygų prekybos apskaita",
  description: "Knygų prekybos, supirkimų, ieškančių žmonių ir užduočių valdymo programa.",
  manifest: "/manifest.webmanifest",
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
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}



