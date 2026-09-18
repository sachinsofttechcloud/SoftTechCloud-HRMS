"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MenuIcon,
  ExternalLinkIcon,
  ShieldIcon,
  LogOutIcon,
} from "@/app/atoms/icons";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiLogout } from "@/app/lib/api";
import Button from "../atoms/button";


import { useState, useEffect } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { apiGetNotifications, apiMarkAllNotificationsRead } from "@/app/lib/api";

function notificationTypeMeta(type) {
  if (type === "WORK_ANNIVERSARY") {
    return { label: "Work Anniversary", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
  if (type === "EMPLOYEE_BIRTHDAY") {
    return { label: "Birthday", className: "bg-pink-500/15 text-pink-300 border-pink-500/30" };
  }
  return null;
}

function formatNotificationWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Topbar({ user, onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Resolve page title based on current route
  const getPageTitle = () => {
    if (pathname === "/home") return "Dashboard";
    if (pathname === "/attendance") return "Attendance & HRMS Modules";
    if (pathname === "/admin/onboarding") return "Employee Onboarding";
    if (pathname === "/manage-users") return "Manage Users";
    if (pathname.startsWith("/manage-users/roles")) return "Roles & Permissions";
    if (pathname === "/exam") return "Exam";
    if (pathname === "/leads") return "Leads Management";
    return "HRMS Portal";
  };

  const fetchUserNotifs = async () => {
    try {
      const res = await apiGetNotifications().catch(() => null);
      if (res?.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Could not fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchUserNotifs();
    const interval = setInterval(fetchUserNotifs, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiMarkAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenWebmail = () => {
    window.open(
      "https://sh024.webhostingservices.com:2096/cpsess8337035536/3rdparty/roundcube/?_task=mail&_mbox=INBOX",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handClickProfile = () => {
    router.push("/profile");
  };

  return (
    <header className="h-20 md:h-25 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 px-5 sm:px-18 flex items-center justify-between">
      {/* Left side: Hamburger menu + Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white p-2.5 rounded-xl bg-white/5 border border-white/10 transition cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <MenuIcon />
        </button>

        <div>
          <Heading className="!text-[16px] xl:!text-[24px] !text-white tracking-tight font-inter">
            {getPageTitle()}
          </Heading>
          {/* <Description className="!text-[8px] xl:!text-[12px] !text-slate-400 hidden sm:block mt-0.5">
            SoftTechCloud Enterprise HRMS Portal
          </Description> */}
        </div>
      </div>

      {/* Right side: Actions & User Info */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Open Webmail Shortcut */}
        <Button
          onClick={handleOpenWebmail}
          className="hidden sm:inline-flex !text-[12px] xl:!text-[14px] items-center gap-2 !text-blue-300 !bg-blue-600/20 hover:!bg-blue-600/30 !border !border-blue-500/30 !px-3.5 !py-2 transition shadow-sm"
        >
          <ExternalLinkIcon />
          <span>Webmail Inbox</span>
        </Button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const next = !showNotifMenu;
              setShowNotifMenu(next);
              if (next) fetchUserNotifs();
            }}
            className="relative text-slate-300 hover:text-white p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-lg">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl p-4 space-y-3 z-50 animate-fadeIn font-inter">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Bell size={14} className="text-blue-400" /> Notifications ({unreadCount} new)
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck size={12} /> Mark Read
                    </button>
                  )}
                  <button onClick={() => setShowNotifMenu(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 space-y-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">No notifications</div>
                ) : (
                  notifications.map((n) => {
                    const typeMeta = notificationTypeMeta(n.type);
                    return (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs space-y-1 transition ${!n.isRead ? "bg-blue-600/10 border border-blue-500/20" : "bg-black/20"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-white block">{n.title}</span>
                          {typeMeta && (
                            <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${typeMeta.className}`}>
                              {typeMeta.label}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-slate-500 block font-mono">
                          {formatNotificationWhen(n.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div
            className="h-9 w-9 rounded-xl !bg-blue-600/20 hover:!bg-blue-600/30 flex items-center justify-center font-bold shadow-md text-[12px] xl:text-[14px] cursor-pointer text-white"
            onClick={handClickProfile}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>

          <button
            onClick={apiLogout}
            className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition cursor-pointer"
            title="Sign Out"
          >
            <LogOutIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
