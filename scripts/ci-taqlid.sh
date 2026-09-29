#!/usr/bin/env bash
# ============================================================
#  CI NI MAHALLIY TAQLID QILISH
#
#  Ishga tushirish:  bash scripts/ci-taqlid.sh
#
#  ── Nega kerak ──
#
#  `npm run sinov` ni shu papkada yurgizish YETARLI EMAS.
#  Ikki marta shu sababdan CI qizil turgan, men esa «hammasi
#  o'tdi» deb hisobot berganman:
#
#    1. Sinovlar bazada rahbar hisoblari BOR deb o'ylardi —
#       ular mening qo'lim bilan yaratilgan edi, toza CI
#       bazasida esa yo'q;
#
#    2. Bitta sinov `/tmp/reyestr-sinov.xlsx` ni o'qirdi —
#       qo'lda yasab qoldirilgan fayl. CI ning toza
#       mashinasida u yo'q va sinov ENOENT bilan yiqilardi.
#
#  Ikkovi ham bir xil xato: sinov ATROF-MUHITGA tayangan.
#  Bunday sinov hech narsani qo'riqlamaydi.
#
#  ── Bu skript nima qiladi ──
#
#  CI dagi uchta shartni takrorlaydi:
#
#    · TOZA PAPKA — faqat git kuzatadigan fayllar. Papkada
#      yotib qolgan vaqtinchalik fayl ko'rinmaydi;
#    · TOZA BAZA — har safar yangidan yaratiladi, migratsiya
#      va seed dan boshqa hech narsa yo'q;
#    · TOZA MUHIT — `TZ=UTC`, o'sha `SESSION_SECRET`.
#
#  `node_modules` esa bog'lanadi (symlink): u paketlar
#  ro'yxatidan aniq hosil bo'ladi va uni qayta o'rnatish
#  besh daqiqa vaqt olardi.
# ============================================================
set -euo pipefail

ILDIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JOY="${CI_TAQLID_JOY:-/tmp/ci-klon}"
BAZA="${CI_TAQLID_BAZA:-ci_taqlid}"
PG="${CI_TAQLID_PG:-postgresql://postgres@127.0.0.1:5433}"

echo "▸ Toza papka: $JOY"
rm -rf "$JOY"
mkdir -p "$JOY"
cd "$ILDIZ"
git ls-files -z | tar -c --null -T - -f - | tar -x -C "$JOY"
ln -s "$ILDIZ/node_modules" "$JOY/node_modules"

echo "▸ Toza baza: $BAZA"
psql "$PG/postgres" -qtAc "DROP DATABASE IF EXISTS \"$BAZA\";" >/dev/null
psql "$PG/postgres" -qtAc "CREATE DATABASE \"$BAZA\";" >/dev/null

cd "$JOY"
export DATABASE_URL="$PG/$BAZA"
export DIRECT_URL="$PG/$BAZA"
export TZ=UTC
export SESSION_SECRET="${SESSION_SECRET:-ci-uchun-soxta-kalit-kamida-32-belgi-bolsin}"

echo "▸ Prisma mijozi"
npx prisma generate >/dev/null
echo "▸ Migratsiya"
npx prisma migrate deploy >/dev/null
echo "▸ Boshlang'ich ma'lumot"
npx prisma db seed >/dev/null
echo "▸ Tiplar"
npx tsc --noEmit -p tsconfig.json
echo "▸ Sinovlar"
npm run sinov
