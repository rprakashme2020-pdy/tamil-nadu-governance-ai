import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Tamil Nadu Governance AI | தமிழ்நாடு ஆட்சி தகவல் AI",
    template: "%s | Tamil Nadu Governance AI",
  },
  description:
    "Explore the documented 2021–2026 government term led by M.K. Stalin. Bilingual answers grounded in verified sources.",
  openGraph: {
    title: "Tamil Nadu Governance AI",
    description: "Governance information with inspectable evidence.",
  },
  alternates: { canonical: "/" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
