import type { Locale } from './index';

export const storeWelcomeCopy: Record<Locale, {
  recommendation: string;
  title: string;
  updates: string;
  close: string;
}> = {
  en: {
    recommendation: 'Our recommended download for Windows',
    title: 'Mouzi is in the Microsoft Store.',
    updates: 'Install and update directly through the Store.',
    close: 'Close announcement',
  },
  pl: {
    recommendation: 'Polecane przez nas pobieranie dla Windows',
    title: 'Mouzi jest w Microsoft Store.',
    updates: 'Instaluj i aktualizuj bezpośrednio przez sklep.',
    close: 'Zamknij ogłoszenie',
  },
  es: {
    recommendation: 'Nuestra descarga recomendada para Windows',
    title: 'Mouzi está en Microsoft Store.',
    updates: 'Instala y actualiza directamente desde la tienda.',
    close: 'Cerrar anuncio',
  },
  de: {
    recommendation: 'Unsere Download-Empfehlung für Windows',
    title: 'Mouzi gibt es im Microsoft Store.',
    updates: 'Direkt über den Store installieren und aktualisieren.',
    close: 'Hinweis schließen',
  },
  fr: {
    recommendation: 'Le téléchargement que nous recommandons pour Windows',
    title: 'Mouzi est sur le Microsoft Store.',
    updates: 'Installez et mettez à jour Mouzi directement depuis le Store.',
    close: 'Fermer l’annonce',
  },
  it: {
    recommendation: 'Il download che consigliamo per Windows',
    title: 'Mouzi è sul Microsoft Store.',
    updates: 'Installa e aggiorna direttamente dallo Store.',
    close: 'Chiudi annuncio',
  },
};
