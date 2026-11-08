Mouzi COSMIC Test — issue #72
Version 0.2.1-beta.cosmic.1, Linux x86_64, isolated test build.
This is not an official release.

Extract this download, open a terminal in the extracted directory and run:

  bash run-settings.sh

Or run the AppImage directly:

  chmod +x Mouzi-COSMIC-Test-0.2.1-beta.cosmic.1-x86_64.AppImage
  ./Mouzi-COSMIC-Test-0.2.1-beta.cosmic.1-x86_64.AppImage --settings

The --settings argument skips tray initialization and opens Settings. Running
the same command again should bring Settings back on the existing instance.
There is no native COSMIC tray applet in this build. The test app can remain
running after you close Settings; press Ctrl+C in its original terminal to quit.

No installation is needed. This build uses its own application identifier and
database ($XDG_DATA_HOME/mouzi-cosmic-test/mouzi.db, normally under ~/.local/share).
It does not watch any folder by default. Autostart and automatic updates are
disabled. Do not point it at folders that another Mouzi instance is watching.

Please test:
1. Does Settings open on your COSMIC desktop with --settings?
2. After closing the window, does running --settings again reopen it?
3. Are there any AppIndicator, GTK, WebKit or Wayland errors in the terminal?

Please report your distro/version, COSMIC version and terminal output in #72.
We need a real COSMIC test even if the automated Weston/X11 smoke tests pass.

If FUSE is unavailable, try the AppImage's --appimage-extract-and-run option:
  ./Mouzi-COSMIC-Test-0.2.1-beta.cosmic.1-x86_64.AppImage --appimage-extract-and-run --settings

This package still uses GTK/WebKitGTK. Skipping the tray does not remove those
runtime requirements. SHA256SUMS.txt contains the checksum of this exact build.
Source and test logs are linked from the GitHub Actions run for this artifact.
