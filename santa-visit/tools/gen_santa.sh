#!/bin/bash
# Generate the Santa pose set with the free image endpoint.
# Free, non-commercial, no account. See docs/asset-provenance.md for the
# licence position — read it before publishing.
cd "$(dirname "$0")/.."
OUT=assets/santa
mkdir -p "$OUT"
gen () {  # name, prompt
  local f="$OUT/$1.png"
  [ -s "$f" ] && { echo "  skip  $1"; return; }
  curl -s -o "$f" -m 90 \
    "https://image.pollinations.ai/p/$2?width=512&height=1024&nologo=true&private=true&model=turbo"
  echo "  $1  $(stat -f%z "$f" 2>/dev/null) bytes"
}
COMMON="photorealistic full body photograph of a cheerful Santa Claus, late sixties, white bushy beard, warm smile, rosy cheeks, red velvet suit with white fur trim, black boots, black belt with gold buckle, red hat with white fur trim, front lit, soft even studio lighting, neutral plain background, sharp focus, photorealistic"
gen stand   "$COMMON%2C%20standing%20upright%2C%20facing%20camera%2C%20arms%20at%20sides%2C%20full%20figure%20head%20to%20toe"
gen walk    "$COMMON%2C%20standing%20upright%2C%20facing%20camera%2C%20mid%20stride%20walking%20step%2C%20right%20leg%20forward%2C%20full%20figure"
gen walk2   "$COMMON%2C%20standing%20upright%2C%20facing%20camera%2C%20mid%20stride%20walking%20step%2C%20left%20leg%20forward%2C%20full%20figure"
gen wave    "$COMMON%2C%20standing%2C%20facing%20camera%2C%20right%20arm%20raised%20waving%2C%20full%20figure"
gen cheer   "$COMMON%2C%20standing%2C%20facing%20camera%2C%20both%20arms%20raised%20in%20celebration%2C%20full%20figure"
gen sit     "$COMMON%2C%20sitting%20on%20an%20invisible%20stool%2C%20facing%20camera%2C%20hands%20on%20lap%2C%20full%20figure"
gen reach   "$COMMON%2C%20sitting%2C%20facing%20camera%2C%20leaning%20forward%2C%20right%20arm%20extended%20out%20to%20the%20side%2C%20full%20figure"
gen eat     "$COMMON%2C%20sitting%2C%20facing%20camera%2C%20holding%20a%20chocolate%20chip%20cookie%20in%20right%20hand%2C%20full%20figure"
gen drink   "$COMMON%2C%20sitting%2C%20facing%20camera%2C%20holding%20a%20glass%20of%20milk%20raised%20to%20his%20mouth%2C%20full%20figure"
echo "done"
