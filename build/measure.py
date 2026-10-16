"""Measures word widths with the real macOS fonts, so build.js can break lines itself.

stdin:  {"faces": {"name": [fontfile, index]}, "words": ["word", ...]}
stdout: {"name": {"word": width_in_em, ...}, ...}   (every word in every face)
"""
import json
import sys

from PIL import ImageFont

req = json.load(sys.stdin)
out = {}
for name, (path, index) in req["faces"].items():
    font = ImageFont.truetype(path, 1000, index=index)
    out[name] = {w: font.getlength(w) / 1000 for w in req["words"]}
json.dump(out, sys.stdout)
