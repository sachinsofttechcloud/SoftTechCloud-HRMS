"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  UserPlusIcon,
  MailIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/app/atoms/icons";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiLogout } from "@/app/lib/api";

export default function Sidebar({ user, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const pathname = usePathname();

  const isHrOrAdmin = ["HR", "ADMIN", "SUPER_ADMIN"].includes(user?.role);

  const navItems = [
    {
      label: "Dashboard",
      href: "/home",
      icon: DashboardIcon,
    },
    {
      label: "Attendance & HRMS",
      href: "/attendance",
      icon: UserPlusIcon,
      // badge: "Modules",
    },
    ...(isHrOrAdmin
      ? [
        {
          label: "HR Onboarding",
          href: "/admin/onboarding",
          icon: UserPlusIcon,
          badge: "Admin",
        },
      ]
      : []),
  ];


  // const initials = user.name
  //   .split(" ")
  //   .map((word) => word[0])
  //   .join("")
  //   .toUpperCase();


  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0b1120] border-r border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "lg:w-22" : "lg:w-74"} w-74`}
      >
        {/* Top Header with Logo & Toggle Button (< / >) */}
        <div>
          <div className="h-20 px-4 lg:mb-4 flex items-center justify-between relative">
            <Link href="/home" className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/20 border border-blue-500/10 flex items-center justify-center font-bold shadow-md text-[14px] xl:text-[16px]">
                {"S"}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <Heading className="!text-[14px] sm:!text-[20px] !font-bold !text-white tracking-tight font-inter block truncate">
                    SoftTechCloud
                  </Heading>
                  <Description className="!text-[10px] sm:!text-[12px] font-medium tracking-wider uppercase block truncate">
                    HRMS Portal
                  </Description>
                </div>
              )}
            </Link>

            {/* Desktop Collapse / Expand Toggle Button (< / >) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-[#1e293b] text-slate-300 hover:text-white hover:bg-blue-500/20  hover:border border-blue-500/10 hover:text-black transition shadow-md z-10"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar Collapse"
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-3 space-y-1.5">
            {!isCollapsed && (
              <Description className="!text-[11px] font-semibold !text-slate-500 uppercase tracking-wider px-3 mb-2 block">
                MAIN MENU
              </Description>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (item.isExternal) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isCollapsed ? item.label : undefined}
                    className={`border-20 flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium text-slate-300 hover:border-blue-500/20 hover:text-white transition group ${isCollapsed ? "justify-center" : "justify-between"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="text-slate-400 group-hover:text-white transition shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`mb-2 focus:outline-none focus:ring-0 focus:border-transparent flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition group ${isCollapsed ? "justify-center" : "justify-between"
                    } ${isActive
                      ? "bg-blue-500/20 border border-blue-500/20 text-white font-semibold shadow-lg shadow-blue-500/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={isActive ? "text-white" : "text-slate-400 group-hover:text-white transition shrink-0"}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span className="text-[10px] bg-blue-500/20 border border-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile Summary & Logout */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                <div className="h-9 w-9 rounded-lg bg-blue-500/20 border border-blue-500/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <Heading className="!text-xs !font-semibold !text-white truncate font-inter">
                    {user?.name || "Employee"}
                  </Heading>
                  <Description className="!text-[11px] !text-white truncate">
                    {user?.role || "EMPLOYEE"}
                  </Description>
                </div>
              </div>

              <button
                onClick={apiLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition"
              >
                <LogOutIcon />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={apiLogout}
              title="Sign Out"
              className="w-full flex items-center justify-center py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition"
            >
              <LogOutIcon />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
