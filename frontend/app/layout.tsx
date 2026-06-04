import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Plum OPD Claims Portal — AI-Powered Claim Adjudication",
  description:
    "Submit and manage OPD insurance claims with AI-powered document processing and automated adjudication decisions.",
  keywords: "OPD, insurance, claims, adjudication, Plum, health insurance, AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex antialiased">
        <Sidebar />
        <main className="flex-1 ml-[260px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
