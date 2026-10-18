"use client";

import React from "react";
import { useSidebar } from "@/context/SidebarContext";

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const collapsed = mounted ? isCollapsed : false;

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#f5faff] transition-[padding-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        collapsed ? "md:pl-20 pl-0" : "md:pl-64 pl-0"
      }`}
    >
      {children}
    </div>
  );
}
