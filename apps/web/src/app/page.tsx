import Link from "next/link";
import {
  Dumbbell,
  MapPin,
  BarChart3,
  Wifi,
  WifiOff,
  Server,
  Check,
} from "lucide-react";

const features = [
  {
    icon: Dumbbell,
    title: "Strength Training",
    description:
      "Log exercises, sets, reps, and RPE. Auto-detect personal records. Build and reuse workout templates.",
  },
  {
    icon: MapPin,
    title: "GPS Cardio Tracking",
    description:
      "Track runs, rides, and hikes with live GPS. Import GPX files. View routes on interactive maps.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Progress",
    description:
      "Weekly volume charts, PR history, body weight trends, and training frequency insights.",
  },
  {
    icon: WifiOff,
    title: "Offline-First",
    description:
      "Works without internet. All data syncs automatically when you're back online.",
  },
  {
    icon: Server,
    title: "Self-Hostable",
    description:
      "Run on your own server with Docker Compose. Your data, your rules. Free forever.",
  },
  {
    icon: Wifi,
    title: "Cross-Platform Sync",
    description:
      "Seamless sync across web and mobile. Start a workout on your phone, review it on your laptop.",
  },
];

const plans = [
  {
    name: "Self-Hosted",
    price: "Free",
    period: "forever",
    description: "All features. Your server.",
    features: [
      "All features included",
      "Unlimited data",
      "Docker Compose deploy",
      "Community support",
    ],
    cta: "Get Started",
    href: "https://github.com/ironpulse/ironpulse",
    highlighted: false,
  },
  {
    name: "Athlete",
    price: "\u00a315",
    period: "/month",
    annual: "\u00a3144/yr (save 20%)",
    description: "For individual gym-goers, runners, and serious athletes.",
    features: [
      "All features included",
      "Cloud sync & hosting",
      "14-day free trial",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Coach",
    price: "\u00a330",
    period: "/month",
    annual: "\u00a3288/yr (save 20%)",
    description: "For personal trainers managing up to 25 clients.",
    features: [
      "Everything in Athlete",
      "Up to 25 clients",
      "Client management dashboard",
      "Program builder",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/ironpulse-logo-light.svg"
              alt="IronPulse"
              className="h-8 w-auto block dark:hidden"
            />
            <img
              src="/ironpulse-logo-dark.svg"
              alt=""
              aria-hidden="true"
              className="h-8 w-auto hidden dark:block"
            />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">Iron</span>Pulse
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(0,119,255,0.08)_0%,_transparent_60%)]" />
        <h1 className="font-display font-bold text-6xl tracking-tight">
          Strength + Cardio.
          <br />
          <span className="text-primary">One Tracker.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          The open-source fitness tracker that unifies strength training and
          cardio in a single platform. Self-host for free or let us handle the
          infrastructure.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start Free Trial
          </Link>
          <Link
            href="#features"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-center mb-12">
          Everything you need to train smarter
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <feature.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-center mb-4">
          Simple, honest pricing
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          No free cloud tier. Self-host for free, or pay for convenience.
        </p>
        <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-2 border-primary bg-card"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="rounded-pill bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.description}
              </p>
              <div className="mt-4 mb-6">
                <span className="font-display font-bold text-4xl">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
                {plan.annual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.annual}
                  </p>
                )}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>IronPulse</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span>Open-source fitness tracking</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
