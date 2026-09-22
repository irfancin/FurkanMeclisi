import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Furkan Meclisi — Hatim Takip",
  description: "Günlük cüz okuma takip uygulaması",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Furkan Meclisi',
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className={`${geist.className} min-h-full bg-slate-50 text-slate-800`}>
        {children}
      </body>
    </html>
  );
}
