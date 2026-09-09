import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../i18n';

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
});

function getInitialLanguage() {
  const stored = localStorage.getItem('language');
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
}

// Looks up "namespace.key" (or "namespace.nested.key") in the active
// language's bundle, falling back to English and then to the raw key itself
// so a missing translation shows readable text instead of breaking the UI.
function lookup(lang, key) {
  const path = key.split('.');
  let node = translations[lang];
  for (const segment of path) {
    if (node == null) break;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) setLanguageState(lang);
  }, []);

  const t = useCallback((key, vars) => {
    const raw = lookup(language, key) ?? lookup(DEFAULT_LANGUAGE, key) ?? key;
    if (!vars) return raw;
    return Object.keys(vars).reduce(
      (str, name) => str.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), vars[name]),
      raw
    );
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
