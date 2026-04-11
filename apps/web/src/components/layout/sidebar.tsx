"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Home,
  Dumbbell,
  Activity,
  Calendar,
  Library,
  Copy,
  CalendarCheck,
  BarChart3,
  Ruler,
  Rss,
  MessageCircle,
  Calculator,
  CircleDot,
  Sun,
  Moon,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Nav structure
// ---------------------------------------------------------------------------

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Training",
    items: [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
      { icon: Dumbbell, label: "Workouts", href: "/workouts" },
      { icon: Activity, label: "Cardio", href: "/cardio" },
      { icon: Calendar, label: "Calendar", href: "/calendar" },
      { icon: Library, label: "Exercises", href: "/exercises" },
      { icon: Copy, label: "Templates", href: "/templates" },
      { icon: CalendarCheck, label: "My Program", href: "/program" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { icon: BarChart3, label: "Stats", href: "/stats" },
      { icon: Ruler, label: "Body Metrics", href: "/stats/body" },
    ],
  },
  {
    title: "Social",
    items: [
      { icon: Rss, label: "Feed", href: "/feed" },
      { icon: MessageCircle, label: "Messages", href: "/messages" },
    ],
  },
  {
    title: "Tools",
    items: [
      { icon: Calculator, label: "1RM Calculator", href: "/tools/1rm" },
      { icon: CircleDot, label: "Plate Calculator", href: "/tools/plates" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ item, isActive, collapsed }: NavLinkProps) {
  const testId = `nav-${item.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  return (
    <a
      href={item.href}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        document.location = item.href;
      }}
      data-testid={testId}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-2 transition-colors",
        collapsed ? "justify-center w-10 mx-auto" : "w-full",
        isActive
          ? "border-l-2 border-primary bg-primary-light text-primary"
          : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />

      {!collapsed && (
        <span className="truncate text-sm font-medium">{item.label}</span>
      )}

      {/* Unread badge */}
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground",
            collapsed ? "absolute -right-1 -top-1" : "ml-auto"
          )}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface SidebarProps {
  /** Unread message count for the Messages badge */
  unreadMessages?: number;
  /** Controlled collapsed state. When provided, the component is controlled. */
  collapsed?: boolean;
  /** Called when the user toggles the collapse button in controlled mode. */
  onCollapsedChange?: (value: boolean) => void;
  /** Initial collapsed state when uncontrolled. Defaults to false. */
  defaultCollapsed?: boolean;
}

export function Sidebar({
  unreadMessages = 0,
  collapsed: collapsedProp,
  onCollapsedChange,
  defaultCollapsed = false,
}: SidebarProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(defaultCollapsed);
  const isControlled = collapsedProp !== undefined;
  const collapsed = isControlled ? collapsedProp : collapsedInternal;

  function setCollapsed(value: boolean) {
    if (isControlled) {
      onCollapsedChange?.(value);
    } else {
      setCollapsedInternal(value);
    }
  }

  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  const userName = session?.user?.name ?? null;
  const userImage = session?.user?.image ?? undefined;

  // Inject unread badge into Messages item
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/messages" ? { ...item, badge: unreadMessages } : item
    ),
  }));

  function isItemActive(item: NavItem): boolean {
    if (item.href === "/tools/1rm" || item.href === "/tools/plates") {
      return pathname.startsWith("/tools");
    }
    if (item.href === "/stats/body") {
      return pathname === "/stats/body";
    }
    if (item.href === "/stats") {
      return pathname === "/stats";
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 flex h-full flex-col bg-[#0A0F1A] transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border-subtle px-4",
          collapsed ? "justify-center px-0" : "gap-3"
        )}
      >
        {/* Logo mark */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          IP
        </div>

        {!collapsed && (
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            IronPulse
          </span>
        )}
      </div>

      {/* Scrollable nav area */}
      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-6 overflow-y-auto py-4 px-2"
      >
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            {collapsed && (
              <div className="mb-1 h-px w-full bg-border-subtle" />
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    isActive={isItemActive(item)}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border-subtle px-2 py-3">
        {/* Theme toggle + Settings row */}
        <div
          className={cn(
            "mb-3 flex items-center gap-1",
            collapsed ? "justify-center flex-col" : "px-1"
          )}
        >
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            data-testid="theme-toggle"
            aria-label="Toggle theme"
            title={collapsed ? "Toggle theme" : undefined}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <Link
            href="/settings"
            aria-label="Settings"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              pathname.startsWith("/settings") && "text-primary"
            )}
          >
            <Settings className="h-5 w-5" />
          </Link>

          {/* Collapse toggle — only visible in expanded mode here */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              data-testid="sidebar-collapse"
              aria-label="Collapse sidebar"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="mb-3 flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              data-testid="sidebar-collapse"
              aria-label="Expand sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* User row */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              title={collapsed ? (userName ?? "User") : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {userImage && (
                  <AvatarImage src={userImage} alt={userName ?? "User"} />
                )}
                <AvatarFallback className="bg-muted text-xs">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {userName ?? "Athlete"}
                    </p>
                    <p className="text-xs text-muted-foreground">Athlete</p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align={collapsed ? "center" : "end"}
            className="w-52"
          >
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
