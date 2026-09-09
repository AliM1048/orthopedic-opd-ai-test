import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enLogin from './locales/en/login.json';
import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arLogin from './locales/ar/login.json';

// Each page/feature gets its own namespace file under locales/<lang>/<namespace>.json
// so translation work on different screens never touches the same file. Keys are
// looked up as "namespace.key" (see useLanguage's t()). Add new namespaces here as
// screens are translated.
export const translations = {
  en: {
    common: enCommon,
    nav: enNav,
    login: enLogin,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    login: arLogin,
  },
};

export const SUPPORTED_LANGUAGES = ['en', 'ar'];
export const DEFAULT_LANGUAGE = 'en';
