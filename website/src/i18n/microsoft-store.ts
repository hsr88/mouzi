import type { Locale } from './index';

export const microsoftStoreCopy: Record<Locale, {
  support: string;
  certification: string;
  button: string;
  free: string;
}> = {
  en: {
    support: 'Buying Mouzi in the Microsoft Store supports its development.',
    certification: 'The Store edition has passed Microsoft Store certification and is digitally signed by Microsoft.',
    button: 'Buy in Microsoft Store',
    free: 'You can still download Mouzi for free from GitHub.',
  },
  pl: {
    support: 'Kupując Mouzi w Microsoft Store, wspierasz jego rozwój.',
    certification: 'Wersja sklepowa przeszła certyfikację Microsoft Store i jest podpisana cyfrowo przez Microsoft.',
    button: 'Kup w Microsoft Store',
    free: 'Mouzi nadal można pobrać za darmo z GitHuba.',
  },
  es: {
    support: 'Comprar Mouzi en Microsoft Store ayuda a financiar su desarrollo.',
    certification: 'La edición de la tienda ha superado la certificación de Microsoft Store y está firmada digitalmente por Microsoft.',
    button: 'Comprar en Microsoft Store',
    free: 'Puedes seguir descargando Mouzi gratis desde GitHub.',
  },
  de: {
    support: 'Mit dem Kauf von Mouzi im Microsoft Store unterstützt du die Entwicklung.',
    certification: 'Die Store-Version hat die Microsoft-Store-Zertifizierung bestanden und ist von Microsoft digital signiert.',
    button: 'Im Microsoft Store kaufen',
    free: 'Mouzi kannst du weiterhin kostenlos von GitHub herunterladen.',
  },
  fr: {
    support: 'Acheter Mouzi sur le Microsoft Store soutient son développement.',
    certification: 'La version du Store a passé la certification du Microsoft Store et est signée numériquement par Microsoft.',
    button: 'Acheter sur le Microsoft Store',
    free: 'Mouzi reste disponible gratuitement sur GitHub.',
  },
  it: {
    support: 'Acquistando Mouzi sul Microsoft Store, sostieni il suo sviluppo.',
    certification: 'La versione dello Store ha superato la certificazione del Microsoft Store ed è firmata digitalmente da Microsoft.',
    button: 'Acquista sul Microsoft Store',
    free: 'Puoi continuare a scaricare Mouzi gratuitamente da GitHub.',
  },
};
