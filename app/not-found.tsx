import Link from "next/link";
export default function Missing() {
  return (
    <main className="section">
      <h1>Record not found</h1>
      <p>This record is not currently published in the evidence database.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}
