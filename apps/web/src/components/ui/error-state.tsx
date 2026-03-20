import { AlertTriangle, WifiOff, SearchX } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  variant?: "error" | "offline" | "not-found";
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const VARIANTS = {
  error: {
    icon: AlertTriangle,
    title: "Something went wrong",
    description: "Please try again. If the problem persists, contact support.",
    action: "Try Again",
  },
  offline: {
    icon: WifiOff,
    title: "No internet connection",
    description: "Your data is saved locally and will sync when you're back online.",
    action: "Retry",
  },
  "not-found": {
    icon: SearchX,
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
    action: "Go Home",
  },
};

export function ErrorState({ variant = "error", title, description, onRetry }: ErrorStateProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Icon className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="font-display font-semibold text-xl text-foreground mb-2">
        {title || config.title}
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
        {description || config.description}
      </p>
      {variant === "not-found" ? (
        <Button asChild>
          <a href="/dashboard">{config.action}</a>
        </Button>
      ) : (
        <Button variant="outline" onClick={onRetry}>
          {config.action}
        </Button>
      )}
    </div>
  );
}
