"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, BarChart3, Plus, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: BarChart3, label: "Stats", href: "/stats" },
  { icon: null, label: "", href: "" }, // FAB placeholder
  { icon: Search, label: "Exercises", href: "/exercises" },
  { icon: User, label: "Profile", href: "/profile" },
];

interface BottomNavProps {
  onFabClick: () => void;
}

export function BottomNav({ onFabClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item, i) => {
          if (i === 2) {
            return (
              <button
                key="fab"
                onClick={onFabClick}
                aria-label="New session"
                className="flex h-12 w-12 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </button>
            );
          }

          const Icon = item.icon!;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
