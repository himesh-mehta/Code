import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Social Pulse — Tata STRIVE Social Intelligence",
  description:
    "AI-powered social listening and conversation-to-campaign dashboard for Tata STRIVE skilling, employability, and youth development.",
};

import { PageContextProvider } from "@/context/PageContext";
import { PulseAssistant } from "@/components/assistant/PulseAssistant";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-[#F5F7F9] text-[#252525]`}>
        <PageContextProvider>
          <Suspense fallback={<aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0067A5] border-r border-[#005588]" />}>
            <Sidebar />
          </Suspense>
          <div className="pl-[240px] min-h-screen flex flex-col bg-[#F5F7F9]">
            {children}
          </div>
          <PulseAssistant />
        </PageContextProvider>
      </body>
    </html>
  );
}
