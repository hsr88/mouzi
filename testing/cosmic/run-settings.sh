#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$(readlink -f -- "$0")")"
chmod +x ./Mouzi-COSMIC-Test-0.2.1-beta.cosmic.1-x86_64.AppImage
exec ./Mouzi-COSMIC-Test-0.2.1-beta.cosmic.1-x86_64.AppImage --settings "$@"
