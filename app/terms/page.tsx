export default function TermsPage() {
  return (
    <article className="motion-page prose prose-invert max-w-3xl space-y-4 text-sm text-[var(--fg)]">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p>Last updated: June 2026</p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Acceptable use</h2>
        <p>
          You agree not to abuse the service, attempt unauthorized access, or use the platform for
          unlawful purposes.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Service availability</h2>
        <p>
          The service is provided as-is. We strive for high availability but do not guarantee
          uninterrupted access.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Liability</h2>
        <p>
          Expense Tracker is a personal finance tool, not financial advice. You are responsible for
          the accuracy of data you enter and decisions you make based on it.
        </p>
      </section>
    </article>
  );
}
