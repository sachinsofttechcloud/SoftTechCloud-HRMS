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

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, X, User, Clock, Sun, Moon } from "lucide-react";
import { apiGetNotifications, apiMarkAllNotificationsRead, apiMarkNotificationRead } from "@/app/lib/api";
import { getMediaUrl } from "@/app/lib/utils";

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

  const userAvatarUrl = getMediaUrl(user?.passportPhoto || user?.avatar);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [theme, setTheme] = useState("dark");

  const notifContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // Live Date and Time update
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      const day = now.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const date = now.getDate();

      const month = now.toLocaleDateString("en-US", {
        month: "short",
      }).replace("Sep", "Sept");

      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      setCurrentDateTime(`${day}, ${month} ${date} | ${time}`);
    };

    updateDateTime();

    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Theme Sync & Toggle
  // useEffect(() => {
  //   const savedTheme = localStorage.getItem("hrms_theme") || "dark";
  //   setTheme(savedTheme);
  //   if (savedTheme === "white") {
  //     document.documentElement.classList.add("white-theme");
  //     document.documentElement.classList.remove("dark");
  //   } else {
  //     document.documentElement.classList.remove("white-theme");
  //     document.documentElement.classList.add("dark");
  //   }
  // }, []);

  // const toggleTheme = () => {
  //   const nextTheme = theme === "dark" ? "white" : "dark";
  //   setTheme(nextTheme);
  //   localStorage.setItem("hrms_theme", nextTheme);

  //   if (nextTheme === "white") {
  //     document.documentElement.classList.add("white-theme");
  //     document.documentElement.classList.remove("dark");
  //   } else {
  //     document.documentElement.classList.remove("white-theme");
  //     document.documentElement.classList.add("dark");
  //   }
  // };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve page title based on current route
  const getPageTitle = () => {
    if (pathname === "/home") return "Dashboard";
    if (pathname === "/attendance") return "Attendance & HRMS Modules";
    if (pathname === "/admin/onboarding") return "Employee Onboarding";
    if (pathname === "/manage-users") return "Manage Users";
    if (pathname.startsWith("/manage-users/roles")) return "Roles & Permissions";
    if (pathname === "/exam") return "Exam";
    if (pathname === "/leads") return "Leads Management";
    if (pathname === "/candidate-record") return "Candidate Record";
    if (pathname.startsWith("/candidate-record/")) return "Candidate Details";
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
    const interval = setInterval(fetchUserNotifs, 70000); // Poll every 60s (1 minute)
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

  const handleMarkItemRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await apiMarkNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  };

  return (
    <header className="h-20 md:h-25 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30 px-5 sm:px-18 flex items-center justify-between transition-colors duration-300">
      {/* Left side: Hamburger menu + Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white p-2.5 rounded-xl bg-white/5 border border-white/10 transition cursor-pointer topbar-icon-btn"
          aria-label="Open Navigation Menu"
        >
          <MenuIcon />
        </button>

        <div>
          <Heading className="!text-[16px] xl:!text-[24px] !text-white tracking-tight font-inter">
            {getPageTitle()}
          </Heading>
        </div>
      </div>

      {/* Right side: Actions, Date/Time, Notifs, Theme, & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Date, Month, Year & Time display (Before notification icon) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-mono text-slate-300 topbar-datetime">
          <Clock size={15} className="text-blue-400 shrink-0" />
          <span className="whitespace-nowrap font-medium">{currentDateTime || "Loading..."}</span>
        </div>

        {/* Notifications Dropdown Container */}
        <div className="relative" ref={notifContainerRef}>
          <button
            type="button"
            onClick={() => {
              const next = !showNotifMenu;
              setShowNotifMenu(next);
              if (next) {
                setShowProfileMenu(false);
                fetchUserNotifs();
              }
            }}
            className="relative text-slate-300 hover:text-white p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer topbar-icon-btn"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-lg">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl p-4 space-y-3 z-50 animate-fadeIn font-inter topbar-dropdown">
              <div className="flex items-center justify-between border-b border-white/10 topbar-dropdown-hr pb-2.5">
                <span className="text-xs font-bold text-white topbar-dropdown-text flex items-center gap-2">
                  <Bell size={14} className="text-blue-400" /> Notifications ({unreadCount} unread)
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
                  <button onClick={() => setShowNotifMenu(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer topbar-dropdown-text">
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 space-y-2">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 topbar-dropdown-subtext italic">No notifications</div>
                ) : (
                  notifications.map((n) => {
                    const typeMeta = notificationTypeMeta(n.type);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleMarkItemRead(n)}
                        className={`p-2.5 rounded-xl text-xs space-y-1 transition cursor-pointer ${!n.isRead
                          ? "bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25"
                          : "bg-black/20 hover:bg-white/5 opacity-80"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-white topbar-dropdown-text block">{n.title}</span>
                          {typeMeta && (
                            <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${typeMeta.className}`}>
                              {typeMeta.label}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 topbar-dropdown-subtext text-[11px] leading-relaxed">{n.message}</p>
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

        {/* Theme Switcher Button (AFTER notification icon) */}
        {/* <button
          type="button"
          // onClick={toggleTheme}
          className="text-slate-300 hover:text-white p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer flex items-center justify-center topbar-icon-btn"
          title={theme === "dark" ? "Switch to White Theme" : "Switch to Dark Theme"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-blue-500" />
          )}
        </button> */}

        {/* User Profile Container with Popup Dropdown */}
        <div className="relative pl-2 sm:pl-3 border-l border-white/10" ref={profileContainerRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-3 p-0.5 rounded-full hover:opacity-90 transition cursor-pointer focus:outline-none"
            title={user?.name || "Profile"}
          >
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold shadow-md text-[13px] text-white border border-white/20 shrink-0">
              {userAvatarUrl && !avatarError ? (
                <img
                  src={userAvatarUrl}
                  alt={user?.name || "user-profile"}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="font-semibold text-white font-inter">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </button>

          {/* Profile Popup */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl p-4 space-y-3 z-50 animate-fadeIn font-inter topbar-dropdown">
              {/* Name & Email ID */}
              <div className="space-y-0.5 px-1">
                <p className="text-sm font-bold text-white truncate topbar-dropdown-text">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-400 truncate topbar-dropdown-subtext">
                  {user?.email || "No email provided"}
                </p>
              </div>

              {/* Horizontal Divider Line */}
              <hr className="border-white/10 topbar-dropdown-hr" />

              {/* Action Options: View Profile & Sign Out */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer topbar-dropdown-item"
                >
                  <User size={16} className="text-blue-400 shrink-0" />
                  <span>View Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    apiLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer topbar-dropdown-item"
                >
                  <LogOutIcon />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

