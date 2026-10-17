import type { Locale } from './index';

type StorePrivacy = { app: string; title: string; paragraphs: string[]; updated: string };
export const storePrivacy: Record<Exclude<Locale, 'en'>, StorePrivacy> = {
  pl: {
    app: 'Mouzi przetwarza pliki na Twoim urządzeniu. Nie wymaga konta, nie wysyła telemetrii ani nazw, ścieżek czy treści plików. Reguły, ustawienia i historia są przechowywane lokalnie. W wersji pobieranej bezpośrednio opcjonalne sprawdzanie aktualizacji korzysta z publicznego kanału GitHuba i można je wyłączyć.',
    title: 'Edycja Microsoft Store',
    paragraphs: [
      'Ta edycja otrzymuje aktualizacje przez Microsoft Store i nie sprawdza ich na GitHubie. Microsoft przetwarza informacje o instalacji i aktualizacjach zgodnie ze swoją polityką prywatności. Interfejs aplikacji wyświetla Microsoft Edge WebView2 Runtime, aktualizowany osobno przez Microsoft. Jeśli go brakuje, Mouzi proponuje otwarcie strony pobierania Microsoftu.',
      'Reguły, ustawienia i historia operacji edycji sklepowej pozostają w osobnym lokalnym profilu. Aplikacja nie wysyła nazw, ścieżek ani treści plików do Mouzi i nie wymaga konta. Linki do pomocy, projektu i wsparcia finansowego otwierają się tylko na Twoje żądanie. Strony docelowe mają własne polityki prywatności.'
    ],
    updated: 'Pytania o politykę kieruj mailem. Ostatnia aktualizacja: 17 października 2026.'
  },
  de: {
    app: 'Mouzi verarbeitet Dateien auf deinem Gerät. Es gibt kein Konto, keine Telemetrie und keine Übertragung von Dateinamen, Pfaden oder Inhalten. Regeln, Einstellungen und Verlauf bleiben lokal. Die direkt heruntergeladene Version kann optional den öffentlichen GitHub-Release-Feed auf Updates prüfen; diese Prüfung lässt sich ausschalten.',
    title: 'Microsoft Store-Version',
    paragraphs: [
      'Diese Version erhält Updates über Microsoft Store und prüft GitHub nicht auf Updates. Microsoft verarbeitet Installations- und Updateinformationen nach seiner eigenen Datenschutzerklärung. Microsoft Edge WebView2 Runtime zeigt die lokale Benutzeroberfläche an und wird separat von Microsoft aktualisiert. Fehlt die Runtime, bietet Mouzi an, die Downloadseite von Microsoft zu öffnen.',
      'Regeln, Einstellungen und Dateiverlauf der Store-Version liegen in einem eigenen lokalen Profil, getrennt von der direkt heruntergeladenen Version. Mouzi erhält keine Dateinamen, Pfade oder Inhalte; ein Konto ist nicht erforderlich. Externe Links zu Hilfe, Projekt und Spenden werden nur auf deinen Wunsch geöffnet. Für die Zielseiten gelten deren eigene Datenschutzregeln.'
    ],
    updated: 'Fragen per E-Mail. Aktualisiert am 17. Oktober 2026.'
  },
  es: {
    app: 'Mouzi procesa los archivos en tu dispositivo. No requiere cuenta ni envía telemetría, nombres, rutas o contenido de archivos. Las reglas, los ajustes y el historial son locales. La edición de descarga directa puede consultar el canal público de versiones de GitHub para buscar actualizaciones; esta comprobación es opcional y se puede desactivar.',
    title: 'Edición de Microsoft Store',
    paragraphs: [
      'Esta edición recibe actualizaciones a través de Microsoft Store y no las busca en GitHub. Microsoft procesa la información de instalación y actualización conforme a su propia declaración de privacidad. Microsoft Edge WebView2 Runtime muestra la interfaz local y Microsoft lo actualiza por separado. Si falta, Mouzi ofrece abrir la página de descarga de Microsoft.',
      'Las reglas, los ajustes y el historial de operaciones de la edición de Store se guardan en un perfil local separado del de la descarga directa. No se envían nombres, rutas ni contenidos de archivos a Mouzi ni se requiere una cuenta. Los enlaces externos de ayuda, proyecto y donaciones solo se abren cuando tú lo solicitas; cada sitio de destino tiene su propia política de privacidad.'
    ],
    updated: 'Preguntas por correo. Actualizado: 17 de octubre de 2026.'
  },
  fr: {
    app: 'Mouzi traite les fichiers sur votre appareil. Aucun compte, aucune télémétrie et aucun envoi de noms, chemins ou contenus de fichiers. Les règles, réglages et historiques restent locaux. La version en téléchargement direct peut consulter le flux public des versions GitHub pour les mises à jour ; cette vérification facultative peut être désactivée.',
    title: 'Édition Microsoft Store',
    paragraphs: [
      'Cette édition reçoit ses mises à jour via Microsoft Store et ne les recherche pas sur GitHub. Microsoft traite les informations d’installation et de mise à jour selon sa propre déclaration de confidentialité. Microsoft Edge WebView2 Runtime affiche l’interface locale et est mis à jour séparément par Microsoft. S’il est absent, Mouzi propose d’ouvrir la page de téléchargement de Microsoft.',
      'Les règles, réglages et historiques de l’édition Store sont conservés dans un profil local distinct de celui de la version en téléchargement direct. Aucun nom, chemin ou contenu de fichier n’est envoyé à Mouzi et aucun compte n’est nécessaire. Les liens externes d’aide, du projet et de dons ne s’ouvrent qu’à votre demande ; les sites de destination ont leur propre politique de confidentialité.'
    ],
    updated: 'Questions par e-mail. Mise à jour : 17 octobre 2026.'
  },
  it: {
    app: 'Mouzi elabora i file sul tuo dispositivo. Non richiede un account e non invia telemetria, nomi, percorsi o contenuti dei file. Regole, impostazioni e cronologia restano locali. L’edizione scaricata direttamente può consultare il feed pubblico delle versioni GitHub per gli aggiornamenti; questo controllo è facoltativo e può essere disattivato.',
    title: 'Edizione Microsoft Store',
    paragraphs: [
      'Questa edizione riceve gli aggiornamenti tramite Microsoft Store e non li cerca su GitHub. Microsoft elabora le informazioni di installazione e aggiornamento secondo la propria informativa sulla privacy. Microsoft Edge WebView2 Runtime mostra l’interfaccia locale e viene aggiornato separatamente da Microsoft. Se manca, Mouzi propone di aprire la pagina di download di Microsoft.',
      'Regole, impostazioni e cronologia delle operazioni dell’edizione Store rimangono in un profilo locale separato da quello dell’edizione scaricata direttamente. Mouzi non riceve nomi, percorsi o contenuti dei file e non richiede un account. I link esterni per assistenza, progetto e donazioni si aprono solo su tua richiesta; i siti di destinazione hanno le proprie informative sulla privacy.'
    ],
    updated: 'Domande via e-mail. Aggiornato il 17 ottobre 2026.'
  }
};
