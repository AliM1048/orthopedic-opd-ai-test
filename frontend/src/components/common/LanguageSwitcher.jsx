import { Languages } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

// Compact EN/AR toggle. Kept as a plain two-way switch (not a dropdown)
// since there are only two supported languages — see useLanguage.jsx.
export default function LanguageSwitcher({ className = '', style }) {
  const { language, setLanguage, t } = useLanguage();
  const next = language === 'en' ? 'ar' : 'en';

  return (
    <button
      type="button"
      className={`theme-toggle-btn lang-toggle-btn ${className}`}
      style={style}
      onClick={() => setLanguage(next)}
      title={t(`common.${next === 'ar' ? 'arabic' : 'english'}`)}
    >
      <Languages size={16} />
      <span style={{ marginInlineStart: 4, fontSize: 11, fontWeight: 600 }}>
        {language.toUpperCase()}
      </span>
    </button>
  );
}
