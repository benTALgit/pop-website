#!/bin/sh
# Builds the claude.ai preview of popny.org/pay into OUT (default: ./preview-build).
# Rewrites site-absolute paths so the pages work as one artifact, adds the
# "Edit text" mode to the campaign page, and starts edits.json empty.
# After someone saves edits in the preview: read edits.json from the artifact and run
#   python3 tools/preview_edits.py apply pay/index.html edits-only.json
set -e
cd "$(dirname "$0")/../.."
OUT=${1:-preview-build}
mkdir -p "$OUT/dec2assets/logos" "$OUT/assets" "$OUT/toolkit" "$OUT/endorse"
cp dec2/assets/rally.jpg dec2/assets/shirley.jpg "$OUT/dec2assets/"
cp dec2/assets/logos/*.png "$OUT/dec2assets/logos/"
cp -R pay/assets/. "$OUT/assets/"
cp pay/pay.css pay/zips.json "$OUT/"
cp -R pay/toolkit/. "$OUT/toolkit/"
cp tools/pay-preview/editor.js "$OUT/editor.js"
fix() {
  sed -e "s#\(\.\./\)*dec2/assets/#$2dec2assets/#g" \
      -e 's#href="\(\.\./\)*dec2/"#href="https://popny.org/dec2/"#g' \
      -e 's#href="toolkit/"#href="toolkit/index.html"#g' \
      -e 's#href="endorse/"#href="endorse/index.html"#g' \
      -e 's#href="\.\./toolkit/"#href="../toolkit/index.html"#g' \
      -e 's#href="\.\./\##href="../index.html\##g' \
      -e 's#href="\.\./"#href="../index.html"#g' \
      -e 's#href="\./"#href="index.html"#g' "$1"
}
fix pay/index.html "" | sed 's#</body>#<script src="editor.js"></script>\n</body>#' > "$OUT/index.html"
fix pay/toolkit/index.html "../" > "$OUT/toolkit/index.html"
fix pay/endorse/index.html "../" > "$OUT/endorse/index.html"
fix pay/toolkit/onepagers/onepager.css "../../" > "$OUT/toolkit/onepagers/onepager.css"
for f in legislators providers parents; do fix "pay/toolkit/onepagers/$f.html" "../../" > "$OUT/toolkit/onepagers/$f.html"; done
printf '{"savedAt": null, "edits": {}}\n' > "$OUT/edits.json"
echo "built $OUT"
