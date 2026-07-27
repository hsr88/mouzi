import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pl from './locales/pl.json';
import it from './locales/it.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import vi from './locales/vi.json';
import es from './locales/es.json';
import uk from './locales/uk.json';

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  it: { translation: it },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
  ja: { translation: ja },
  vi: { translation: vi },
  es: { translation: es },
  uk: { translation: uk },  
};

export type SupportedLang = 'en' | 'pl' | 'it' | 'de' | 'fr' | 'ru' | 'ja' | 'vi' | 'es' | 'uk';

export async function initI18n(lang: SupportedLang) {
  await i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;
