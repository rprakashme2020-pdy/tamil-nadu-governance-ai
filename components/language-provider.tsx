"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/types";
const Context = createContext<{
  language: Language;
  setLanguage: (l: Language) => void;
}>({ language: "en", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return <Context value={{ language, setLanguage }}>{children}</Context>;
}
export function useLanguage() {
  return useContext(Context);
}
