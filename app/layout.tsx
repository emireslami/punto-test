import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mnml.ai Render Panel",
  description: "A compact interface for mnml.ai v4.4 Fast and Ultra renders.",
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
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
