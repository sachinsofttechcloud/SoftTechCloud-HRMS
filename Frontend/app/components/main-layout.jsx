"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import { apiGetMe } from "@/app/lib/api";

// Routes that do NOT show Topbar and Sidebar (Auth & Public pages)
const AUTH_ROUTES = ["/", "/login-in", "/forgot-password", "/reset-password"];

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  // Check if current route is an auth page
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (isAuthPage) return;

    // Load cached user profile
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }

    // Fetch fresh profile from backend
    apiGetMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem("authUser", JSON.stringify(res.user));
        }
      })
      .catch((err) => {
        console.warn("Could not fetch user profile:", err);
      });
  }, [pathname, isAuthPage]);

  // For Auth & Public pages: Render full-screen layout without Sidebar/Topbar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // For Onboarding page, padding is removed as requested
  const isNoPaddingPage = pathname === "/admin/onboarding";

  // For Dashboard & Application pages: Render Sidebar + Topbar + Content
  return (
    <div className="min-h-screen flex bg-[#020817] text-slate-100 font-inter">
      {/* Left Sidebar */}
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "lg:pl-20" : "lg:pl-74"
          }`}
      >
        {/* Top Header Bar */}
        <Topbar
          user={user}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className={`flex-1 ${isNoPaddingPage ? "" : "p-4 sm:p-6 lg:p-8"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
