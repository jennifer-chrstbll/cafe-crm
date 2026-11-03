import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Kafe CRM", template: "%s · Kafe CRM" },
  description: "Layanan pelanggan kafe: kasir, pelanggan, dan analitik",
};

export const viewport: Viewport = {
  themeColor: "#70422A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
      </body>
    </html>
  );
}
