#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 path/to/application.AppImage" >&2
  exit 2
fi

appimage="$(realpath "$1")"
if [[ ! -f "$appimage" ]]; then
  echo "AppImage not found: $appimage" >&2
  exit 1
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

extract_appimage() {
  local source="$1"
  local destination="$2"

  mkdir -p "$destination"
  chmod +x "$source"
  (
    cd "$destination"
    "$source" --appimage-extract >/dev/null
  )

  if [[ ! -d "$destination/squashfs-root" ]]; then
    echo "Failed to extract AppImage: $source" >&2
    exit 1
  fi
}

validate_root_symlinks() {
  local appdir="$1"
  local link target resolved

  while IFS= read -r -d '' link; do
    target="$(readlink "$link")"
    if [[ "$target" = /* ]]; then
      echo "Absolute root symlink remains: ${link##*/} -> $target" >&2
      exit 1
    fi

    resolved="$(realpath -m "$(dirname "$link")/$target")"
    case "$resolved" in
      "$appdir"|"$appdir"/*) ;;
      *)
        echo "Root symlink escapes AppDir: ${link##*/} -> $target" >&2
        exit 1
        ;;
    esac

    if [[ ! -e "$resolved" ]]; then
      echo "Broken root symlink: ${link##*/} -> $target" >&2
      exit 1
    fi
  done < <(find "$appdir" -maxdepth 1 -type l -print0)
}

extract_appimage "$appimage" "$work_dir/original"
appdir="$work_dir/original/squashfs-root"
fixed_links=0

while IFS= read -r -d '' link; do
  target="$(readlink "$link")"
  if [[ "$target" != /* ]]; then
    continue
  fi

  case "$target" in
    *.AppDir/*)
      relative_target="${target#*.AppDir/}"
      ;;
    *)
      echo "Cannot safely rewrite external symlink: ${link##*/} -> $target" >&2
      exit 1
      ;;
  esac

  if [[ ! -e "$appdir/$relative_target" && ! -L "$appdir/$relative_target" ]]; then
    echo "AppDir target does not exist: $relative_target" >&2
    exit 1
  fi

  ln -sfn "$relative_target" "$link"
  echo "Rewrote ${link##*/} -> $relative_target"
  fixed_links=$((fixed_links + 1))
done < <(find "$appdir" -maxdepth 1 -type l -print0)

validate_root_symlinks "$appdir"
echo "Rewritten absolute root symlinks: $fixed_links"

appimagetool="${APPIMAGETOOL_PATH:-$work_dir/appimagetool-x86_64.AppImage}"
if [[ ! -x "$appimagetool" ]]; then
  curl -fsSL \
    https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage \
    -o "$appimagetool"
  chmod +x "$appimagetool"
fi

fixed_appimage="$work_dir/fixed.AppImage"
ARCH=x86_64 "$appimagetool" --appimage-extract-and-run "$appdir" "$fixed_appimage"
chmod +x "$fixed_appimage"

extract_appimage "$fixed_appimage" "$work_dir/verification"
validate_root_symlinks "$work_dir/verification/squashfs-root"

mv "$fixed_appimage" "$appimage"
echo "Validated repaired AppImage: $appimage"
