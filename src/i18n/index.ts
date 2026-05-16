import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pl from './locales/pl.json';
import it from './locales/it.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  pl: { translation: pl },
  it: { translation: it },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
};

export type SupportedLang = 'en' | 'pl' | 'it' | 'de' | 'fr' | 'ru';

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
