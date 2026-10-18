import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Suspense } from "react";
import { PageContextProvider } from "@/context/PageContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { MainLayoutWrapper } from "@/components/MainLayoutWrapper";
import { PulseAssistant } from "@/components/assistant/PulseAssistant";

export const metadata: Metadata = {
  title: "Social Pulse — Tata STRIVE Social Intelligence",
  description:
    "AI-powered social listening and conversation-to-campaign dashboard for Tata STRIVE skilling, employability, and youth development.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans antialiased bg-[#f5faff] text-[#001e2d] min-h-screen selection:bg-[#dfec42] selection:text-[#001e2d]">
        <PageContextProvider>
          <SidebarProvider>
            <Suspense fallback={<aside className="fixed left-0 top-0 h-full w-20 md:w-64 bg-[#0099f2]" />}>
              <Sidebar />
            </Suspense>
            <MainLayoutWrapper>
              {children}
            </MainLayoutWrapper>
            <PulseAssistant />
          </SidebarProvider>
        </PageContextProvider>
      </body>
    </html>
  );
}

