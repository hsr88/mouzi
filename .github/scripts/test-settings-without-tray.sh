#!/usr/bin/env bash
set -euo pipefail
appimage="$(realpath "$1")"
evidence="$(realpath -m "$2")"
mkdir -p "$evidence"
test_root="$(mktemp -d)"
export XDG_RUNTIME_DIR="$test_root/runtime"
mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"
weston_pid=""
app_pid=""
cleanup() {
  if [[ -n "$app_pid" ]]; then kill "$app_pid" 2>/dev/null || true; fi
  if [[ -n "$weston_pid" ]]; then kill "$weston_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
# Reject lazy AppIndicator loads to simulate a system without that library.
cat > "$test_root/no-indicator.c" <<'C'
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
void *dlopen(const char *name, int flags) {
  if (name && strstr(name, "appindicator")) {
    fprintf(stderr, "TEST_BLOCKED_APPINDICATOR: %s\n", name);
    return NULL;
  }
  void *(*next)(const char *, int) = dlsym(RTLD_NEXT, "dlopen");
  return next(name, flags);
}
C
gcc -shared -fPIC "$test_root/no-indicator.c" -o "$test_root/no-indicator.so" -ldl
readelf -d src-tauri/target/release/mouzi-cosmic-test > "$evidence/elf-dependencies.txt"
if grep -i 'NEEDED.*appindicator' "$evidence/elf-dependencies.txt"; then
  echo 'AppIndicator is still a mandatory load-time dependency' >&2
  exit 1
fi
weston --backend=x11-backend.so --use-pixman --socket=wayland-mouzi --xwayland --width=1280 --height=900 --idle-time=0 >"$evidence/weston.log" 2>&1 &
weston_pid=$!
for attempt in $(seq 1 100); do
  [[ -S "$XDG_RUNTIME_DIR/wayland-mouzi" ]] && break
  sleep .2
done
test -S "$XDG_RUNTIME_DIR/wayland-mouzi"
for backend in wayland x11; do
  export XDG_CONFIG_HOME="$test_root/$backend/config"
  export XDG_DATA_HOME="$test_root/$backend/data"
  mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME"
  app_display="$DISPLAY"
  if [[ "$backend" == x11 ]]; then
    app_display="$(sed -n 's/.*xserver listening on display \(:[0-9]*\).*/\1/p' "$evidence/weston.log" | tail -1)"
    test -n "$app_display"
  fi
  env DISPLAY="$app_display" WAYLAND_DISPLAY=wayland-mouzi GDK_BACKEND="$backend" LIBGL_ALWAYS_SOFTWARE=1 LD_PRELOAD="$test_root/no-indicator.so" "$appimage" --settings >"$evidence/$backend.log" 2>&1 &
  app_pid=$!
  passed=false
  for attempt in $(seq 1 40); do
    sleep 1
    kill -0 "$app_pid"
    import -window root "$evidence/$backend.png"
    tesseract "$evidence/$backend.png" "$evidence/$backend" 2>/dev/null
    if grep -Eiq 'Watched Folders|Review queue|General' "$evidence/$backend.txt"; then passed=true; break; fi
  done
  test "$passed" = true
  timeout 15 env DISPLAY="$app_display" WAYLAND_DISPLAY=wayland-mouzi GDK_BACKEND="$backend" LIBGL_ALWAYS_SOFTWARE=1 LD_PRELOAD="$test_root/no-indicator.so" "$appimage" --settings >>"$evidence/$backend.log" 2>&1
  kill -0 "$app_pid"
  if grep -q TEST_BLOCKED_APPINDICATOR "$evidence/$backend.log"; then
    echo 'Settings attempted to load AppIndicator' >&2
    exit 1
  fi
  python3 - <<'PY'
import os, pathlib, sqlite3
root = pathlib.Path(os.environ['XDG_DATA_HOME'])
db = sqlite3.connect((root / 'mouzi-cosmic-test/mouzi.db').as_uri() + '?mode=ro', uri=True)
assert db.execute('SELECT count(*) FROM watched_folders').fetchone()[0] == 0
assert db.execute('SELECT autostart,auto_update_enabled FROM settings').fetchone() == (0,0)
assert not (root / 'mouzi').exists()
assert not list(pathlib.Path(os.environ['XDG_CONFIG_HOME']).glob('autostart/*'))
print('PASS: isolated profile, empty watch list, autostart and updater disabled')
PY
  echo "PASS: Settings rendered under $backend without AppIndicator; second --settings invocation succeeded"
  kill "$app_pid"
  wait "$app_pid" || true
  app_pid=""
done
