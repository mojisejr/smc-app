import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ESP32 Deployment Tool",
  description: "SMC Customer ESP32 Configuration Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-blue-600 text-white p-4">
            <h1 className="text-xl font-bold">ESP32 Deployment Tool</h1>
          </header>
          <main className="container mx-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
