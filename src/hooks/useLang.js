import React, { useState, useLayoutEffect, useCallback, createContext, useContext } from "react";
import { TRANSLATIONS } from "../data/initialData";

const ALLOWED_LANGS = ["ar", "fr", "en"];

const getStoredLang = () => {
  try {
    const v = localStorage.getItem("umrah_lang");
    if (v && ALLOWED_LANGS.includes(v)) return v;
  } catch (e) {}
  return "ar";
};

const getDir = (lang) => (lang === "ar" ? "rtl" : "ltr");

const LangContext = createContext({ lang: "ar", t: TRANSLATIONS.ar, dir: "rtl", setLang: () => {}, tr: () => "" });

export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => getStoredLang());
  const dir = getDir(lang);

  // Use layout effect so the document attributes are set before the browser paints.
  useLayoutEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const setLang = useCallback((l) => {
    if (!ALLOWED_LANGS.includes(l)) return;
    setLangState(l);
    try { localStorage.setItem("umrah_lang", l); } catch (e) {}
  }, []);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const tr = (key, vars = {}) => {
    const template = (t && t[key]) || "";
    return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]), template);
  };

  return (
    <LangContext.Provider value={{ lang, dir, t, tr, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export { LangContext };
