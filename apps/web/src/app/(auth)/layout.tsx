export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on mobile */}
      <div className="hidden w-[40%] flex-col items-center justify-center bg-gradient-to-br from-[#0d0815] via-[#2d1b4e] to-[#0d0815] lg:flex">
        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-primary text-xl font-extrabold text-primary-foreground">
          IP
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
          IronPulse
        </h1>
        <p className="mt-1.5 text-center text-sm leading-relaxed text-[#a78bcc]">
          Track your strength.
          <br />
          Own your progress.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-sm font-extrabold text-primary-foreground">
            IP
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            IronPulse
          </span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
