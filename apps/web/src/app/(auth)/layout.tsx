export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,119,255,0.08)_0%,_transparent_60%)]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img
            src="/ironpulse-logo-light.svg"
            alt="IronPulse"
            className="h-10 w-auto block dark:hidden"
          />
          <img
            src="/ironpulse-logo-dark.svg"
            alt=""
            aria-hidden="true"
            className="h-10 w-auto hidden dark:block"
          />
          <span className="font-display font-bold text-xl tracking-tight">
            IronPulse
          </span>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
