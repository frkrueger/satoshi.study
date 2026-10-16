#!/usr/bin/env bash
# Renders the deck through Keynote itself (the real target), one PNG per slide,
# into renders/, plus a contact sheet renders/_overview.jpg.
set -euo pipefail
cd "$(dirname "$0")/.."
DECK="$PWD/${1:-who-was-satoshi.pptx}"
OUTDIR="$PWD/renders"
rm -rf "$OUTDIR" && mkdir -p "$OUTDIR"
osascript <<OSA
tell application "Keynote"
  set d to open POSIX file "$DECK"
  delay 1
  export d to POSIX file "$OUTDIR" as slide images with properties {image format:PNG, skipped slides:false}
  close d saving no
end tell
OSA
ls "$OUTDIR" | head -3
montage "$OUTDIR"/*.png -tile 4x -geometry 640x360+6+6 -background "#1c1c1e" "$OUTDIR/_overview.jpg"
echo "rendered $(ls "$OUTDIR"/*.png | wc -l | tr -d ' ') slides"
