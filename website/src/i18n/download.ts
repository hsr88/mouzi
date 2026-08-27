import { site } from '../config/site';
import type { Locale } from './index';

type ArtifactCopy = { label: string; note: string };

const copy: Record<Locale, {
  download: string;
  recommended: string;
  signingPending: string;
  signingApproved: string;
  artifacts: Record<string, ArtifactCopy>;
}> = {
  en: {
    download: 'Download',
    recommended: 'Recommended',
    signingPending: 'Code signing approval in progress with SignPath Foundation.',
    signingApproved: 'Cryptographically signed releases.',
    artifacts: {
      'Installer (NSIS)': { label: 'Installer (NSIS)', note: 'Recommended for most users.' },
      'MSI package': { label: 'MSI package', note: 'For managed and enterprise deployments.' },
      Portable: { label: 'Portable', note: 'No installation. Run from any folder or USB drive.' },
      AppImage: { label: 'AppImage', note: 'Works on most distributions without installation.' },
      'DEB package': { label: 'DEB package', note: 'Debian, Ubuntu, Mint and derivatives.' },
      'RPM package': { label: 'RPM package', note: 'Fedora, openSUSE, RHEL and derivatives.' },
    },
  },
  es: {
    download: 'Descargar',
    recommended: 'Recomendado',
    signingPending: 'La aprobación de la firma de código mediante SignPath Foundation está en curso.',
    signingApproved: 'Versiones firmadas criptográficamente.',
    artifacts: {
      'Installer (NSIS)': { label: 'Instalador (NSIS)', note: 'Recomendado para la mayoría de usuarios.' },
      'MSI package': { label: 'Paquete MSI', note: 'Para despliegues administrados y empresariales.' },
      Portable: { label: 'Versión portátil', note: 'Sin instalación. Ejecútala desde cualquier carpeta o unidad USB.' },
      AppImage: { label: 'AppImage', note: 'Funciona en la mayoría de distribuciones sin instalación.' },
      'DEB package': { label: 'Paquete DEB', note: 'Para Debian, Ubuntu, Mint y distribuciones derivadas.' },
      'RPM package': { label: 'Paquete RPM', note: 'Para Fedora, openSUSE, RHEL y distribuciones derivadas.' },
    },
  },
  pl: {
    download: 'Pobierz',
    recommended: 'Polecany',
    signingPending: 'Trwa proces zatwierdzania podpisywania kodu przez SignPath Foundation.',
    signingApproved: 'Wydania są podpisane kryptograficznie.',
    artifacts: {
      'Installer (NSIS)': { label: 'Instalator (NSIS)', note: 'Polecany dla większości użytkowników.' },
      'MSI package': { label: 'Pakiet MSI', note: 'Do wdrożeń zarządzanych i firmowych.' },
      Portable: { label: 'Wersja przenośna', note: 'Bez instalacji. Uruchom z dowolnego folderu lub dysku USB.' },
      AppImage: { label: 'AppImage', note: 'Działa w większości dystrybucji bez instalacji.' },
      'DEB package': { label: 'Pakiet DEB', note: 'Dla Debiana, Ubuntu, Minta i systemów pochodnych.' },
      'RPM package': { label: 'Pakiet RPM', note: 'Dla Fedory, openSUSE, RHEL i systemów pochodnych.' },
    },
  },
  de: {
    download: 'Herunterladen',
    recommended: 'Empfohlen',
    signingPending: 'Die Freigabe der Codesignierung durch die SignPath Foundation läuft.',
    signingApproved: 'Kryptografisch signierte Releases.',
    artifacts: {
      'Installer (NSIS)': { label: 'Installer (NSIS)', note: 'Für die meisten Nutzer empfohlen.' },
      'MSI package': { label: 'MSI-Paket', note: 'Für verwaltete Installationen und Unternehmen.' },
      Portable: { label: 'Portable Version', note: 'Keine Installation. Aus jedem Ordner oder von einem USB-Laufwerk starten.' },
      AppImage: { label: 'AppImage', note: 'Läuft auf den meisten Distributionen ohne Installation.' },
      'DEB package': { label: 'DEB-Paket', note: 'Für Debian, Ubuntu, Mint und abgeleitete Distributionen.' },
      'RPM package': { label: 'RPM-Paket', note: 'Für Fedora, openSUSE, RHEL und abgeleitete Distributionen.' },
    },
  },
  fr: {
    download: 'Télécharger',
    recommended: 'Recommandé',
    signingPending: 'L’approbation de la signature du code par la SignPath Foundation est en cours.',
    signingApproved: 'Versions signées cryptographiquement.',
    artifacts: {
      'Installer (NSIS)': { label: 'Programme d’installation (NSIS)', note: 'Recommandé pour la plupart des utilisateurs.' },
      'MSI package': { label: 'Paquet MSI', note: 'Pour les déploiements administrés et en entreprise.' },
      Portable: { label: 'Version portable', note: 'Sans installation. À lancer depuis n’importe quel dossier ou clé USB.' },
      AppImage: { label: 'AppImage', note: 'Fonctionne sur la plupart des distributions sans installation.' },
      'DEB package': { label: 'Paquet DEB', note: 'Pour Debian, Ubuntu, Mint et leurs dérivées.' },
      'RPM package': { label: 'Paquet RPM', note: 'Pour Fedora, openSUSE, RHEL et leurs dérivées.' },
    },
  },
  it: {
    download: 'Scarica',
    recommended: 'Consigliato',
    signingPending: 'L’approvazione della firma del codice tramite SignPath Foundation è in corso.',
    signingApproved: 'Versioni firmate crittograficamente.',
    artifacts: {
      'Installer (NSIS)': { label: 'Programma di installazione (NSIS)', note: 'Consigliato per la maggior parte degli utenti.' },
      'MSI package': { label: 'Pacchetto MSI', note: 'Per distribuzioni gestite e aziendali.' },
      Portable: { label: 'Versione portatile', note: 'Nessuna installazione. Avviala da qualsiasi cartella o unità USB.' },
      AppImage: { label: 'AppImage', note: 'Funziona sulla maggior parte delle distribuzioni senza installazione.' },
      'DEB package': { label: 'Pacchetto DEB', note: 'Per Debian, Ubuntu, Mint e distribuzioni derivate.' },
      'RPM package': { label: 'Pacchetto RPM', note: 'Per Fedora, openSUSE, RHEL e distribuzioni derivate.' },
    },
  },
};

export function downloadCopy(locale: Locale) {
  return copy[locale];
}

export function localizedSigningMessage(locale: Locale): string {
  return site.signingStatus === 'approved' ? copy[locale].signingApproved : copy[locale].signingPending;
}
