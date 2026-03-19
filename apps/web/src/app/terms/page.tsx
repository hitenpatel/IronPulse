import Link from "next/link";

export const metadata = {
  title: "Terms of Service — IronPulse",
  description: "Terms governing your use of the IronPulse fitness tracking platform.",
};

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: 19 March 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By creating an account or using IronPulse (&ldquo;the Service&rdquo;), you agree to be
              bound by these Terms of Service. If you do not agree, do not use the Service. These terms
              form a binding agreement between you and IronPulse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree to use IronPulse only for lawful purposes. You must not:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Upload content that is illegal, harmful, abusive, or infringes third-party rights.</li>
              <li>Attempt to gain unauthorised access to other users&rsquo; accounts or data.</li>
              <li>Use the Service to send spam or unsolicited messages.</li>
              <li>Reverse-engineer, decompile, or otherwise attempt to extract source code (beyond what is
                  already publicly available under the open-source licence).</li>
              <li>Use automated tools to scrape or overload the Service.</li>
              <li>Misrepresent yourself or impersonate another person.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Your Account</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your login credentials and for
              all activity that occurs under your account. Notify us immediately at{" "}
              <a href="mailto:support@ironpulse.app" className="text-primary hover:underline">
                support@ironpulse.app
              </a>{" "}
              if you suspect unauthorised access. You must be at least 16 years old (or the age of
              digital consent in your jurisdiction) to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Ownership</h2>
            <p className="text-muted-foreground">
              You retain full ownership of the fitness data, photos, and other content you upload to
              IronPulse. By using the Service, you grant us a limited, non-exclusive licence to store,
              process, and display your content solely to provide the Service to you. We will not use
              your content for any other purpose without your explicit consent.
            </p>
            <p className="mt-3 text-muted-foreground">
              You may export or delete your data at any time. See our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Coach Responsibilities</h2>
            <p className="text-muted-foreground">
              If you use IronPulse as a coach, you are responsible for ensuring that any training
              programmes you create are appropriate for your clients&rsquo; fitness levels and health
              conditions. IronPulse does not verify coaching qualifications. You agree to comply with
              all applicable professional standards and regulations in your jurisdiction. You must not
              share clients&rsquo; personal data with unauthorised third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Subscriptions &amp; Billing</h2>
            <p className="text-muted-foreground">
              Paid plans are billed monthly or annually in advance. Subscriptions automatically renew
              unless cancelled before the renewal date. Refunds are provided at our discretion in
              accordance with applicable consumer law. We reserve the right to change pricing with
              30 days&rsquo; notice. Self-hosted deployments are free and not subject to this section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Health Disclaimer</h2>
            <p className="text-muted-foreground">
              IronPulse is a fitness tracking tool and is not a medical device or healthcare provider.
              Information provided by the Service is for informational purposes only and is not a
              substitute for professional medical advice, diagnosis, or treatment. Always consult a
              qualified healthcare professional before starting any exercise programme, particularly if
              you have a pre-existing medical condition.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the fullest extent permitted by law, IronPulse shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of, or
              inability to use, the Service. Our total liability to you for any claim shall not exceed
              the amount you paid us in the 12 months preceding the claim. Nothing in these terms limits
              liability for fraud, death, or personal injury caused by negligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
            <p className="text-muted-foreground">
              We aim to provide a reliable service but do not guarantee 100% uptime. We may suspend or
              discontinue the Service with reasonable notice. We will make reasonable efforts to preserve
              your data and provide an export opportunity before any discontinuation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p className="text-muted-foreground">
              You may delete your account at any time. We may suspend or terminate your account if you
              breach these Terms. Upon termination, your right to use the Service ceases immediately and
              we will delete your data in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of England and Wales. Any disputes shall be subject
              to the exclusive jurisdiction of the courts of England and Wales, unless otherwise required
              by mandatory consumer protection law in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. We will notify you of material changes at
              least 30 days in advance via email or in-app notice. Continued use of the Service after
              the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@ironpulse.app" className="text-primary hover:underline">
                legal@ironpulse.app
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
