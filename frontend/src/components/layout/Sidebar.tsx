"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Clock,
  ScanFace,
  BarChart3,
  Settings,
  LogOut,
  Coffee,
  ShoppingCart,
  Radio,
  Utensils
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isOwner = user?.role === "OWNER";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(!isOwner ? [{ name: "🔴 Live", href: "/live", icon: Radio }] : []),
    ...(!isOwner ? [{ name: "Mini POS", href: "/pos", icon: ShoppingCart }] : []),
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Visits", href: "/visits", icon: Clock },
    { name: "Recognition Logs", href: "/recognition-logs", icon: ScanFace },
    ...(isOwner ? [{ name: "Menus", href: "/menus", icon: Utensils }] : []),
    ...(isOwner ? [{ name: "Analytics", href: "/analytics", icon: BarChart3 }] : []),
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary text-xl">
          <Coffee className="h-6 w-6" />
          <span>Cafe CRM</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-4 px-3 text-sm">
          <p className="font-medium text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
