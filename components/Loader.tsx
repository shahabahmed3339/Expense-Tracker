export function Loader() {
  return (
    <div className="loader-shell py-8 text-[var(--muted)]" aria-busy="true" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
