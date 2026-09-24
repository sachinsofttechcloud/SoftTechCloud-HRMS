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
  LeadIcon,
  CandidateRecordIcon,
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
    hasModule(user, "leads") && {
      label: "Lead Management",
      href: "/leads",
      icon: LeadIcon,
    },
    hasModule(user, "Candidate Record") && {
      label: "Candidate Record",
      href: "/candidate-record",
      icon: CandidateRecordIcon,
    }
  ].filter(Boolean);

  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsCollapsed(true);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0b1120] border-r border-white/10 flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "lg:w-22" : "lg:w-74"} w-74`}
      >
        <div className="overflow-hidden">
          {/* Logo & App Title Header */}
          <div className="h-20 px-4 lg:mb-4 flex items-center justify-between relative overflow-hidden">
            <Link href="/home" className="flex items-center gap-3 overflow-hidden">
              <div className="h-10 w-10 shrink-0 flex items-center justify-center font-bold shadow-md text-[14px]">
                <img src="/login/Logo-2.png" alt="logo" className="w-full h-full" />
              </div>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isCollapsed ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-[200px]"
                  }`}
              >
                <Heading className="!text-[14px] sm:!text-[20px] !font-bold !text-white tracking-tight font-inter block truncate">
                  SoftTech Cloud
                </Heading>
              </div>
            </Link>

            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Main Navigation Menu */}
          <div className="p-3 space-y-1.5 overflow-hidden">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap px-3 ${isCollapsed ? "lg:opacity-0 lg:max-w-0 lg:mb-0 lg:h-0" : "opacity-100 max-w-full mb-2 h-auto"
                }`}
            >
              <Description className="!text-[11px] font-semibold !text-slate-500 uppercase tracking-wider block">
                MAIN MENU
              </Description>
            </div>

            {navItems.length === 0 ? (
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden px-3 py-4 text-[11px] text-slate-500 italic ${isCollapsed ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-full"
                  }`}
              >
                No modules assigned yet. Ask Admin for access after onboarding.
              </div>
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
                        className={`w-full focus:outline-none focus:ring-0 flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all duration-300 group overflow-hidden ${isActive
                            ? "bg-blue-500/20 border border-blue-500/20 text-white font-semibold shadow-lg shadow-blue-500/20"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Icon
                            className={
                              isActive
                                ? "text-white shrink-0"
                                : "text-slate-400 group-hover:text-white transition shrink-0"
                            }
                          />
                          <span
                            className={`text-[12px] sm:text-[14px] font-medium tracking-wider whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-[200px]"
                              }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <ChevronRightIcon
                          className={`transition-all duration-300 shrink-0 ${showManageMenu ? "rotate-90" : ""
                            } ${isCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100 w-4"}`}
                        />
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
                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${childActive
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-700 hover:bg-white/5 hover:text-white"
                                  }`}
                              >
                                <ChildIcon className="text-slate-400 group-hover:text-white transition shrink-0" />
                                <span className="text-[10px] sm:text-[12px] font-medium tracking-wider text-slate-300">
                                  {child.label}
                                </span>
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
                    className={`mb-2 focus:outline-none focus:ring-0 focus:border-transparent flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all duration-300 group overflow-hidden ${isActive
                        ? "bg-blue-500/20 border border-blue-500/20 text-white font-semibold shadow-lg shadow-blue-500/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Icon
                        className={
                          isActive
                            ? "text-white shrink-0"
                            : "text-slate-400 group-hover:text-white transition shrink-0"
                        }
                      />
                      <span
                        className={`text-[12px] sm:text-[14px] font-medium tracking-wider whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-[200px]"
                          }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] bg-blue-500/20 border border-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed
                            ? "lg:opacity-0 lg:max-w-0 lg:p-0 lg:border-0"
                            : "opacity-100 max-w-[80px]"
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom User Info Section */}
        <div className="p-3 border-t border-white/10 bg-black/20 overflow-hidden">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-blue-500/20 border border-blue-500/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div
              className={`flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${isCollapsed ? "lg:opacity-0 lg:max-w-0" : "opacity-100 max-w-[180px]"
                }`}
            >
              <Heading className="!text-xs !font-semibold !text-white truncate font-inter">
                {user?.name || "Employee"}
              </Heading>
              <Description className="!text-[11px] !text-white truncate">
                {user?.role || "EMPLOYEE"}
              </Description>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
