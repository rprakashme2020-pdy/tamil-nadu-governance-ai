"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section">
      <h1>Evidence is temporarily unavailable</h1>
      <p>The application will not substitute unverified information.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
