#!/usr/bin/env bash
# Extracts the photos from the original flattened slides (source/media) and gives
# them one consistent treatment, writing to assets/.
#   panel  — black & white, lifted contrast, edges feathered into black (JPG)
#   circle — black & white, lifted contrast, circular cut-out with alpha (PNG)
# Geometry is the photo's rectangle inside the 1600x900 slide image.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=source/media
OUT=assets
mkdir -p "$OUT"

# DIM=<percent> maps white down to that grey: paper scans otherwise glare against black.
grade() { echo "-colorspace Gray -sigmoidal-contrast ${CONTRAST:-2.5},50% +level 0%,${DIM:-100}%"; }

# panel <src> <crop WxH+X+Y> <out-name> [feather-percent]
panel() {
  local src=$1 geo=$2 name=$3 fpct=${4:-9}
  local tmp; tmp=$(mktemp -t satoshi).png
  magick "$SRC/$src" -crop "$geo" +repage $(grade) -resize 200% -filter Lanczos "$tmp"
  local w h f
  w=$(magick identify -format %w "$tmp"); h=$(magick identify -format %h "$tmp")
  f=$(( (w < h ? w : h) * fpct / 100 ))
  magick "$tmp" \
    \( -size "${w}x${h}" xc:black -fill white -draw "rectangle $f,$f $((w-f)),$((h-f))" -blur 0x$((f*6/10)) \) \
    -compose Multiply -composite \
    -attenuate 0.25 +noise Gaussian -colorspace Gray \
    -quality 90 "$OUT/$name.jpg"
  rm -f "$tmp"
}

# circle <src> <square crop SxS+X+Y> <out-name>
circle() {
  local src=$1 geo=$2 name=$3
  magick "$SRC/$src" -crop "$geo" +repage $(grade) -filter Lanczos -resize 720x720 \
    -attenuate 0.3 +noise Gaussian -colorspace Gray \
    \( -size 720x720 xc:black -fill white -draw "circle 360,360 360,2" \) \
    -alpha off -compose CopyOpacity -composite "$OUT/$name.png"
}

"$@"
