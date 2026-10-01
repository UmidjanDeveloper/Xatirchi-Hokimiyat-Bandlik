#!/usr/bin/env bash
# ============================================================
#  ZAXIRADAN TIKLASH SINOVI (alohida muhitda)
#
#  Nima qiladi:
#    1. MANBA bazadan bir xil (REPEATABLE READ) suratda nusxa oladi (pg_dump)
#    2. Nusxani ALOHIDA, bo'sh bazaga tiklaydi (pg_restore)
#    3. HAR BIR jadval uchun: qatorlar soni va tarkib nazorat yig'indisi
#       (md5) manba surati va tiklangan baza o'rtasida solishtiriladi
#    4. Vaqtni o'lchaydi (tiklash sekundlari) - RTO uchun haqiqiy raqam
#
#  Nima QILMAYDI:
#    · manba bazaga hech narsa YOZMAYDI (faqat o'qiydi)
#    · tiklash bazasi nomi `_tiklash_sinov` bilan tugamasa ISHLAMAYDI:
#      production bazasini tasodifan ustiga yozib yuborib bo'lmaydi
#    · ulanish satrini (parol) ekranga CHIQARMAYDI
#
#  Ishlatish:
#    MANBA_URL='postgresql://...'  TIKLASH_URL='postgresql://.../bandlik_tiklash_sinov' \
#      scripts/zaxira-tiklash.sh
#
#    TOZALASH=1  - tiklash bazasidagi eski sinov ma'lumotini avval o'chiradi
#                  (faqat `_tiklash_sinov` bazasida ruxsat etiladi)
#
#  Eslatma: pg_dump versiyasi MANBA server versiyasidan past bo'lmasligi kerak.
#  Chiqish kodi: 0 - hamma jadval mos; 1 - farq yoki xato; 2 - noto'g'ri sozlama.
# ============================================================
set -uo pipefail

# `${VAR:?}` bash'da kod 1 beradi; hujjatlashtirilgan kod 2 uchun aniq tekshiruv
if [ -z "${MANBA_URL:-}" ]; then
  echo "XATO: MANBA_URL kerak (nusxa olinadigan baza)." >&2; exit 2
fi
if [ -z "${TIKLASH_URL:-}" ]; then
  echo "XATO: TIKLASH_URL kerak (alohida bo'sh baza; nomi _tiklash_sinov bilan tugasin)." >&2; exit 2
fi

# Ulanish satridan faqat host/baza nomini ko'rsatamiz (parolsiz)
korinish() { echo "$1" | sed -E 's#^[a-z]+://([^@/]*@)?##; s#\?.*$##'; }
baza_nomi() { echo "$1" | sed -E 's#\?.*$##; s#.*/##'; }

MANBA_KO="$(korinish "$MANBA_URL")"
TIKLASH_KO="$(korinish "$TIKLASH_URL")"
TIKLASH_NOMI="$(baza_nomi "$TIKLASH_URL")"

if [ "$MANBA_URL" = "$TIKLASH_URL" ] || [ "$MANBA_KO" = "$TIKLASH_KO" ]; then
  echo "XATO: manba va tiklash bazasi bir xil. To'xtatildi." >&2; exit 2
fi
if [[ ! "$TIKLASH_NOMI" =~ _tiklash_sinov$ ]]; then
  echo "XATO: tiklash bazasining nomi '_tiklash_sinov' bilan tugashi shart (hozir: '$TIKLASH_NOMI')." >&2
  echo "      Bu himoya production bazasini tasodifan ustiga yozishdan saqlaydi." >&2
  exit 2
fi
for k in psql pg_dump pg_restore; do
  command -v "$k" >/dev/null || { echo "XATO: '$k' topilmadi (postgresql-client o'rnating)." >&2; exit 2; }
done

IS="$(mktemp -d)"; trap 'rm -rf "$IS"; [ -n "${COPROC_PID:-}" ] && kill "$COPROC_PID" 2>/dev/null' EXIT
NUSXA="$IS/nusxa.dump"

echo "Manba:   $MANBA_KO"
echo "Tiklash: $TIKLASH_KO"
echo

# --- tiklash bazasi bo'sh bo'lishi kerak ---
BOSHMI="$(psql "$TIKLASH_URL" -qAt -c "select count(*) from information_schema.tables where table_schema='public'" 2>&1)" || { echo "XATO: tiklash bazasiga ulanib bo'lmadi: $BOSHMI" >&2; exit 1; }
if [ "$BOSHMI" != "0" ]; then
  if [ "${TOZALASH:-0}" = "1" ]; then
    echo "Tiklash bazasi to'la: TOZALASH=1 - public sxemasi qayta yaratiladi (faqat _tiklash_sinov bazasi)."
    psql "$TIKLASH_URL" -q -v ON_ERROR_STOP=1 -c "drop schema public cascade; create schema public;" >/dev/null || exit 1
  else
    echo "XATO: tiklash bazasi bo'sh emas ($BOSHMI jadval). Eski sinovni o'chirish uchun TOZALASH=1 bering." >&2; exit 2
  fi
fi

# --- 1. Bitta surat (snapshot): nusxa ham, hisob ham SHU suratdan ---
coproc PSQL { psql "$MANBA_URL" -qAt -v ON_ERROR_STOP=1 2>&1; }
COPROC_PID=$PSQL_PID
echo "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;" >&"${PSQL[1]}"
echo "SELECT 'SNAP:' || pg_export_snapshot();" >&"${PSQL[1]}"
SNAP=""
for _ in 1 2 3 4 5; do
  read -r -t 20 QATOR <&"${PSQL[0]}" || break
  case "$QATOR" in SNAP:*) SNAP="${QATOR#SNAP:}"; break;; esac
done
[ -n "$SNAP" ] || { echo "XATO: manba suratini olib bo'lmadi." >&2; exit 1; }

T0=$(date +%s)
echo "1/4 Nusxa olinmoqda (pg_dump)…"
pg_dump "$MANBA_URL" --snapshot="$SNAP" -Fc --no-owner --no-privileges -f "$NUSXA" || { echo "XATO: pg_dump yiqildi." >&2; exit 1; }
T1=$(date +%s)
RAZMER="$(du -h "$NUSXA" | cut -f1)"
echo "    tayyor: $RAZMER, $((T1 - T0)) soniya"

# --- 2. Tiklash ---
echo "2/4 Alohida bazaga tiklanmoqda (pg_restore)…"
pg_restore --no-owner --no-privileges --exit-on-error -d "$TIKLASH_URL" "$NUSXA" || { echo "XATO: pg_restore yiqildi." >&2; exit 1; }
T2=$(date +%s)
echo "    tayyor: $((T2 - T1)) soniya"

# --- 3. Jadvallar ro'yxati va nazorat yig'indilari ---
echo "3/4 Jadvallar solishtirilmoqda (qatorlar soni + tarkib md5)…"
JADVALLAR="$(psql "$TIKLASH_URL" -qAt -c "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")"
[ -n "$JADVALLAR" ] || { echo "XATO: tiklangan bazada jadval yo'q." >&2; exit 1; }

NAZORAT_SQL() {
  # qatorlar soni va har bir qator matnining md5 laridan tartiblangan yig'indi md5
  echo "select count(*) || '|' || coalesce(md5(string_agg(h, '' order by h)), '-') from (select md5(t::text) as h from \"$1\" t) s;"
}

FARQ=0; JAMI=0
printf '%-32s %12s %12s  %s\n' "JADVAL" "MANBA" "TIKLANGAN" "NATIJA"
while IFS= read -r J; do
  [ -z "$J" ] && continue
  JAMI=$((JAMI + 1))
  NAZORAT_SQL "$J" >&"${PSQL[1]}"
  read -r -t 120 M <&"${PSQL[0]}" || { echo "XATO: manba o'qilmadi ($J)." >&2; exit 1; }
  Q="$(psql "$TIKLASH_URL" -qAt -c "$(NAZORAT_SQL "$J")" 2>&1)"
  MS="${M%%|*}"; QS="${Q%%|*}"
  if [ "$M" = "$Q" ]; then N="mos"; else N="FARQ"; FARQ=$((FARQ + 1)); fi
  printf '%-32s %12s %12s  %s\n' "$J" "$MS" "$QS" "$N"
done <<< "$JADVALLAR"

echo "COMMIT;" >&"${PSQL[1]}"
T3=$(date +%s)

# --- 4. Xulosa ---
echo
echo "4/4 Xulosa"
echo "    jadvallar: $JAMI, farq: $FARQ"
echo "    nusxa hajmi: $RAZMER; nusxa olish: $((T1 - T0)) s; tiklash: $((T2 - T1)) s; solishtirish: $((T3 - T2)) s"
if [ "$FARQ" -eq 0 ]; then
  echo "TIKLASH SINOVI: MUVAFFAQIYATLI"
  echo "Natijani 'Tizim holati' sahifasida qayd eting (qaysi nusxa, qayerga tiklandi)."
  exit 0
fi
echo "TIKLASH SINOVI: MUVAFFAQIYATSIZ ($FARQ ta jadvalda farq)"
exit 1
