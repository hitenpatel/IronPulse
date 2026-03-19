"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Dumbbell, User, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length > 0,
      placeholderData: (prev) => prev,
    }
  );

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      setOpen(false);
    },
    [router]
  );

  const hasResults =
    data &&
    (data.exercises.length > 0 ||
      data.users.length > 0 ||
      data.workouts.length > 0);

  return (
    <>
      {/* Trigger button shown in sidebar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open global search (Cmd+K)"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Global Search</DialogTitle>

          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises, users, workouts..."
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {isFetching && (
              <span className="ml-2 text-xs text-muted-foreground">
                Searching...
              </span>
            )}
          </div>

          {/* Results */}
          {debouncedQuery.length > 0 && (
            <div className="max-h-96 overflow-y-auto p-2">
              {!hasResults && !isFetching && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </p>
              )}

              {/* Exercises */}
              {data && data.exercises.length > 0 && (
                <section className="mb-2">
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Exercises
                  </p>
                  {data.exercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => navigate(`/exercises/${ex.id}`)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{ex.name}</span>
                        {ex.category && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {ex.category}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Users */}
              {data && data.users.length > 0 && (
                <section className="mb-2">
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Users
                  </p>
                  {data.users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => navigate(`/social/${user.id}`)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-medium">{user.name}</span>
                    </button>
                  ))}
                </section>
              )}

              {/* Workouts */}
              {data && data.workouts.length > 0 && (
                <section className="mb-2">
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Workouts
                  </p>
                  {data.workouts.map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => navigate(`/workouts/${workout.id}`)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{workout.name}</span>
                        {workout.startedAt && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(workout.startedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}

          {/* Empty state / hint */}
          {debouncedQuery.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Type to search exercises, users, and workouts
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
