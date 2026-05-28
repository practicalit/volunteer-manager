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
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo / Org name */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <UsersRound className="h-5 w-5 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="truncate text-sm font-semibold text-gray-900">{orgName}</p>
          <p className="text-xs text-gray-500">Volunteer Portal</p>
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
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
      <div className="border-t border-gray-200 p-4">
        <div className="mb-2 text-xs font-medium text-gray-500 uppercase">{userName}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
