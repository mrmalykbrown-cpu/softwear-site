export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-display text-3xl text-ink">Tallie</h1>
      <p className="mt-4 text-muted">
        Setup only: tokens, fonts and the money helper. The hero and the tally tape land next.
      </p>
      <p className="mt-4 text-muted">
        <a className="text-pine underline underline-offset-4" href="/tokens">
          Token specimen
        </a>{" "}
        (development only).
      </p>
    </main>
  );
}
