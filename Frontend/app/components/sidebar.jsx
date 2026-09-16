"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  UserPlusIcon,
  LogOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ManageUsersIcon,
  ShieldIcon,
  ExamIcon,
} from "@/app/atoms/icons";
import Heading from "@/app/atoms/heading";
import Description from "@/app/atoms/description";
import { apiLogout } from "@/app/lib/api";

function hasModule(user, key) {
  if (!user) return false;
  if (user.hasFullModuleAccess || ["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return true;
  }
  return Array.isArray(user.allowedModules) && user.allowedModules.includes(key);
}

export default function Sidebar({ user, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const pathname = usePathname();
  const [showManageMenu, setShowManageMenu] = useState(false);

  useEffect(() => {
    setShowManageMenu(false);
  }, [pathname]);

  const navItems = [
    hasModule(user, "dashboard") && {
      label: "Dashboard",
      href: "/home",
      icon: DashboardIcon,
    },
    hasModule(user, "attendance") && {
      label: "Attendance & HRMS",
      href: "/attendance",
      icon: UserPlusIcon,
    },
    hasModule(user, "onboarding") && {
      label: "HR Onboarding",
      href: "/admin/onboarding",
      icon: UserPlusIcon,
      badge: "Admin",
    },
    hasModule(user, "manage_users") && {
      label: "Manage Users",
      href: "/manage-users",
      icon: ManageUsersIcon,
      children: [
        {
          label: "Manage Users",
          href: "/manage-users",
          icon: ManageUsersIcon,
        },
        {
          label: "Roles & Permissions",
          href: "/manage-users/roles",
          icon: ShieldIcon,
        },
      ],
    },
    hasModule(user, "exam") && {
      label: "Exam",
      href: "/exam",
      icon: ExamIcon,
    },
  ].filter(Boolean);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0b1120] border-r border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-22" : "lg:w-74"} w-74`}
      >
        <div>
          <div className="h-20 px-4 lg:mb-4 flex items-center justify-between relative">
            <Link href="/home" className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-500/20 border border-blue-500/10 flex items-center justify-center font-bold shadow-md text-[14px] xl:text-[16px]">
                S
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

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-[#1e293b] text-slate-300 hover:text-white hover:bg-blue-500/20 hover:border border-blue-500/10 transition shadow-md z-10"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar Collapse"
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            {!isCollapsed && (
              <Description className="!text-[11px] font-semibold !text-slate-500 uppercase tracking-wider px-3 mb-2 block">
                MAIN MENU
              </Description>
            )}

            {navItems.length === 0 ? (
              !isCollapsed && (
                <div className="px-3 py-4 text-[11px] text-slate-500 italic">
                  No modules assigned yet. Ask Admin for access after onboarding.
                </div>
              )
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/home" && pathname.startsWith(item.href));

                if (item.children) {
                  return (
                    <div key={item.href} className="relative mb-2">
                      <button
                        type="button"
                        onClick={() => setShowManageMenu((open) => !open)}
                        title={isCollapsed ? item.label : undefined}
                        aria-expanded={showManageMenu}
                        aria-haspopup="menu"
                        className={`w-full focus:outline-none focus:ring-0 flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition group ${
                          isCollapsed ? "justify-center" : "justify-between"
                        } ${
                          isActive
                            ? "bg-blue-500/20 border border-blue-500/20 text-white font-semibold shadow-lg shadow-blue-500/20"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={
                              isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-white transition shrink-0"
                            }
                          />
                          {!isCollapsed && <span className="text-[12px] sm:text-[14px] font-medium tracking-wider">{item.label}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronRightIcon
                            className={`transition-transform ${showManageMenu ? "rotate-90" : ""}`}
                          />
                        )}
                      </button>

                      {showManageMenu && (
                        <div
                          role="menu"
                          className="absolute left-full top-0 ml-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b1120] p-1.5 text-slate-800 shadow-2xl z-[70]"
                        >
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive =
                              pathname === child.href ||
                              (child.href !== "/manage-users" &&
                                pathname.startsWith(child.href));
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                role="menuitem"
                                onClick={() => {
                                  setShowManageMenu(false);
                                  setIsOpen(false);
                                }}
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                                  childActive
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-700 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <ChildIcon className="text-slate-400 group-hover:text-white transition shrink-0" />
                                <span className="text-[10px] sm:text-[12px] font-medium tracking-wider text-slate-300 ">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`mb-2 focus:outline-none focus:ring-0 focus:border-transparent flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition group ${
                      isCollapsed ? "justify-center" : "justify-between"
                    } ${
                      isActive
                        ? "bg-blue-500/20 border border-blue-500/20 text-white font-semibold shadow-lg shadow-blue-500/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-white transition shrink-0"
                        }
                      />
                      {!isCollapsed && <span className="text-[12px] sm:text-[14px] font-medium tracking-wider">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="text-[10px] bg-blue-500/20 border border-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

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
