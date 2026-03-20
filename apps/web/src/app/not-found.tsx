import { ErrorState } from "@/components/ui/error-state";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <ErrorState variant="not-found" />
    </div>
  );
}
