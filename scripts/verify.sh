#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Python syntax"
python3 -m py_compile python/*.py

echo "JavaScript syntax"
node --check assets/js/core.js
node --input-type=module --check < assets/js/scene.js

echo "Required files"
required=(
  preview.html
  index.html
  .nojekyll
  Makefile
  assets/css/site.css
  assets/js/core.js
  assets/js/scene.js
  assets/img/banner.svg
  assets/img/hand-landmarks.svg
  assets/img/architecture.svg
  assets/img/favicon.svg
  assets/img/social-preview.png
  assets/media/demo.gif
  assets/screenshots/hero.webp
  assets/screenshots/lab.webp
  assets/screenshots/game.webp
  assets/screenshots/quiz.webp
  assets/screenshots/roi.webp
  assets/screenshots/mobile.webp
  python/README.md
  python/basic_tracking.py
  python/full_tracking_demo.py
  python/ble_device.py
  python/scan_ble_sensor.py
  tests/test_repo_links.py
  requirements.txt
  README.md
  LICENSE
)

for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

echo "Local path hygiene"
if grep -RInI --exclude-dir=.git --exclude-dir=__pycache__ --exclude=verify.sh -E 'file:///home/|localhost:8765' .; then
  echo "Found a local absolute path or development URL in a tracked file." >&2
  exit 1
fi

echo "Repository tests"
python3 -m unittest discover -s tests -v

echo "All checks passed."
