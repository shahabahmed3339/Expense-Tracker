export default function PrivacyPage() {
  return (
    <article className="motion-page prose prose-invert max-w-3xl space-y-4 text-sm text-[var(--fg)]">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p>Last updated: June 2026</p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Data we collect</h2>
        <p>
          Account information (name, email), financial records you enter (expenses, budgets, loans),
          and technical logs required to operate the service.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cookies & sessions</h2>
        <p>
          We use session cookies via NextAuth to keep you signed in. No third-party advertising
          cookies are used.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Third parties</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Google OAuth (optional sign-in)</li>
          <li>Resend (transactional email)</li>
          <li>Sentry (error monitoring, if enabled)</li>
          <li>Vercel (hosting) and Neon (database)</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your rights</h2>
        <p>
          You may export or delete your data at any time from the Reports and Profile pages.
          Account deletion is immediate and irreversible.
        </p>
      </section>
    </article>
  );
}
