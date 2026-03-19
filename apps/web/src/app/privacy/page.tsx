import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — IronPulse",
  description: "How IronPulse collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-primary">Iron</span>Pulse
          </Link>
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

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: 19 March 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p>
              IronPulse (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting
              your personal data. This Privacy Policy explains what information we collect, how we use it,
              who we share it with, and your rights under applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">Account data</span> — name, email address,
                password hash, and account creation timestamp.
              </li>
              <li>
                <span className="text-foreground font-medium">Workout data</span> — exercises, sets, reps,
                weight, RPE, duration, and personal records from strength training sessions.
              </li>
              <li>
                <span className="text-foreground font-medium">GPS &amp; cardio data</span> — route coordinates,
                distance, elevation, pace, heart rate, and lap data from cardio sessions.
              </li>
              <li>
                <span className="text-foreground font-medium">Body metrics</span> — body weight, body-fat
                percentage, and custom measurements you choose to log.
              </li>
              <li>
                <span className="text-foreground font-medium">Progress photos</span> — images you voluntarily
                upload to track physical progress.
              </li>
              <li>
                <span className="text-foreground font-medium">Health &amp; wearable data</span> — activity
                data imported from Strava, Garmin Connect, Apple HealthKit, or Google Fit when you connect
                those integrations.
              </li>
              <li>
                <span className="text-foreground font-medium">Payment data</span> — billing information
                processed by Stripe. We do not store full card numbers.
              </li>
              <li>
                <span className="text-foreground font-medium">Device &amp; usage data</span> — push
                notification tokens, IP addresses, and basic analytics to operate the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>To provide, maintain, and improve the IronPulse service.</li>
              <li>To authenticate you and keep your account secure.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To sync your data across devices.</li>
              <li>To enable social features you opt into (followers, challenges, activity feed).</li>
              <li>To send transactional emails (password resets, magic links, billing receipts).</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We do not sell your personal data to third parties or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Processors</h2>
            <p className="text-muted-foreground mb-3">
              We engage the following sub-processors to deliver the service. Each is bound by a data
              processing agreement and appropriate safeguards.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-semibold text-foreground">Processor</th>
                    <th className="py-2 pr-4 font-semibold text-foreground">Purpose</th>
                    <th className="py-2 font-semibold text-foreground">Location</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Payment processing &amp; subscription management</td>
                    <td className="py-2">USA / EU</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Amazon Web Services (S3)</td>
                    <td className="py-2 pr-4">File storage (progress photos, route files)</td>
                    <td className="py-2">EU (eu-west-1)</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Strava</td>
                    <td className="py-2 pr-4">Activity import (optional integration)</td>
                    <td className="py-2">USA</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Garmin</td>
                    <td className="py-2 pr-4">Activity import (optional integration)</td>
                    <td className="py-2">USA</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-4">Apple HealthKit</td>
                    <td className="py-2 pr-4">Health data import (optional, on-device)</td>
                    <td className="py-2">On-device</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Google Fit</td>
                    <td className="py-2 pr-4">Activity import (optional integration)</td>
                    <td className="py-2">USA / EU</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. If you request account deletion,
              we will delete your personal data within 30 days, except where we are required by law to
              retain it longer (for example, billing records which may be kept for up to 7 years).
              Aggregated, anonymised data may be retained indefinitely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground mb-3">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><span className="text-foreground font-medium">Access</span> — request a copy of the data we hold about you.</li>
              <li><span className="text-foreground font-medium">Correction</span> — ask us to correct inaccurate data.</li>
              <li><span className="text-foreground font-medium">Deletion</span> — request deletion of your account and associated data.</li>
              <li><span className="text-foreground font-medium">Export / Portability</span> — download your workout data in a machine-readable format.</li>
              <li><span className="text-foreground font-medium">Objection</span> — object to certain types of processing.</li>
              <li><span className="text-foreground font-medium">Withdraw consent</span> — where processing is based on consent, you may withdraw it at any time.</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@ironpulse.app" className="text-primary hover:underline">
                privacy@ironpulse.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard measures including encryption in transit (TLS), hashed passwords
              (bcrypt), and access controls to protect your data. Despite these measures, no system is
              completely secure and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy from time to time. We will notify you of material changes by
              email or by a prominent notice in the app. Continued use of IronPulse after the effective
              date constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy or your data, contact us at{" "}
              <a href="mailto:privacy@ironpulse.app" className="text-primary hover:underline">
                privacy@ironpulse.app
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
