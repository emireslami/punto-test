import type { Metadata } from "next";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "پونتو",
  description: "پونتو، پلتفرم بازار کار آنلاین معماری و فریلنسرهای صنعت ساختمان و ابزار هوش مصنوعی رندر معماری",
  openGraph: {
    title: "پونتو",
    description: "پونتو، پلتفرم بازار کار آنلاین معماری و فریلنسرهای صنعت ساختمان و ابزار هوش مصنوعی رندر معماری",
    siteName: "پونتو",
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "پونتو",
    description: "پونتو، پلتفرم بازار کار آنلاین معماری و فریلنسرهای صنعت ساختمان و ابزار هوش مصنوعی رندر معماری",
  },
  icons: {
    icon: "/favicon.svg?v=3",
    shortcut: "/favicon.svg?v=3",
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
