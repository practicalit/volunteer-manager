"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Tag,
  UsersRound,
  ClipboardList,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  UserCog,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/enums";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/volunteers", label: "Volunteers", icon: Users },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/assignments", label: "Assignments", icon: CheckSquare },
  { href: "/sms-log", label: "SMS Log", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userRole: Role;
  orgName: string;
  userName: string;
}

export function Sidebar({ userRole, orgName, userName }: SidebarProps) {
  const pathname = usePathname();

  const items = [
    ...navItems,
    ...(userRole === Role.ADMIN
      ? [{ href: "/users", label: "Users", icon: UserCog }]
      : []),
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-primary-active bg-primary">
      {/* Logo / Org name */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-17 w-17 items-center justify-center">
          <img src="/hbky-logo.png" alt="VolunteerHub Logo" />
        </div>
        <div className="overflow-hidden">
          <p className="truncate text-sm font-semibold text-white">{orgName}</p>
          <p className="text-xs text-white/60">HBKY Volunteer</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-primary-active"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-4">
        <div className="mb-2 text-xs font-medium text-white/50 uppercase">{userName}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
