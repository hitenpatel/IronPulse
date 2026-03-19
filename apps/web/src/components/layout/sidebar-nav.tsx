"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  BarChart3,
  Plus,
  Search,
  User,
  CalendarDays,
  UserSearch,
  Dumbbell,
  Activity,
  MessageSquare,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "./global-search";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Dumbbell, label: "Workouts", href: "/workouts" },
  { icon: ClipboardList, label: "Templates", href: "/templates" },
  { icon: BookOpen, label: "My Program", href: "/program" },
  { icon: CalendarDays, label: "Calendar", href: "/calendar" },
  { icon: Activity, label: "Feed", href: "/feed" },
  { icon: MessageSquare, label: "Messages", href: "/messages" },
  { icon: BarChart3, label: "Stats", href: "/stats" },
  { icon: Search, label: "Exercises", href: "/exercises" },
  { icon: UserSearch, label: "Find a Coach", href: "/coaches" },
  { icon: User, label: "Profile", href: "/profile" },
];

interface SidebarNavProps {
  onNewSession: () => void;
}

export function SidebarNav({ onNewSession }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col items-center border-r border-border bg-card py-4 lg:flex">
      <div className="mb-6 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        IP
      </div>

      <nav aria-label="Main navigation" className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          );
        })}

        <button
          onClick={onNewSession}
          className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
          aria-label="New session"
        >
          <Plus className="h-5 w-5" />
        </button>
      </nav>

      <GlobalSearch />
      <ThemeToggle />
    </aside>
  );
}
