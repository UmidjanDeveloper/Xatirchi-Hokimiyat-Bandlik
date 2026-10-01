#!/usr/bin/env bash
# ============================================================
#  BAZA NUSXASINI OLISH (mantiqiy zaxira, pg_dump)
#
#  Ishlatish:
#    NUSXA_MANBA_URL='postgresql://...'  scripts/zaxira-nusxa.sh
#
#  Muhit o'zgaruvchilari:
#    NUSXA_MANBA_URL   (majburiy) nusxa olinadigan baza. DIRECT (5432) manzil
#                      yaxshi; pooler (6543) pg_dump uchun mos emas.
#    NUSXA_PAPKA       nusxalar papkasi (odatiy: ~/bandlik-zaxira). REPO ICHIDA
#                      BO'LISHI MUMKIN EMAS: nusxada fuqarolarning shaxsiy
#                      ma'lumoti bor va git'ga tushib qolmasligi kerak.
#    SAQLASH_KUN       shuncha kundan eski nusxalar o'chiriladi (odatiy: 30).
#                      Eng yangi 3 ta nusxa HECH QACHON o'chirilmaydi.
#
#  Nima qiladi:
#    1. pg_dump -Fc (siqilgan, tiklashga tayyor), manba bazaga FAQAT o'qiydi;
#    2. fayl va papka ruxsati faqat egasiga (600 / 700);
#    3. nusxa BUTUNLIGINI tekshiradi: pg_restore --list ishlaydi, ichida
#       asosiy jadvallar bor (bo'sh yoki kesilgan fayl "muvaffaqiyatli"
#       deb qolmasin);
#    4. SHA-256 yozadi (nusxa ko'chirilganda buzilganini bilish uchun);
#    5. eski nusxalarni aylantiradi (faqat shu papkadagi bandlik-*.dump).
#
#  Nima QILMAYDI: parolni ekranga chiqarmaydi; manba bazaga yozmaydi;
#  nusxani tiklamaydi (tiklash sinovi: scripts/zaxira-tiklash.sh).
#
#  Chiqish kodi: 0 - tayyor va tekshirilgan; 1 - xato; 2 - noto'g'ri sozlama.
# ============================================================
set -uo pipefail

# `${VAR:?}` bash'da kod 1 beradi; hujjatlashtirilgan kod 2 uchun aniq tekshiruv
if [ -z "${NUSXA_MANBA_URL:-}" ]; then
  echo "XATO: NUSXA_MANBA_URL kerak (nusxa olinadigan baza manzili)." >&2; exit 2
fi
PAPKA="${NUSXA_PAPKA:-$HOME/bandlik-zaxira}"
SAQLASH_KUN="${SAQLASH_KUN:-30}"
ENG_YANGI_SAQLASH=3

if ! [[ "$SAQLASH_KUN" =~ ^[0-9]+$ ]] || [ "$SAQLASH_KUN" -lt 1 ]; then
  echo "XATO: SAQLASH_KUN musbat butun son bo'lishi kerak (hozir: '$SAQLASH_KUN')." >&2; exit 2
fi
for k in pg_dump pg_restore sha256sum; do
  command -v "$k" >/dev/null || { echo "XATO: '$k' topilmadi (postgresql-client o'rnating)." >&2; exit 2; }
done

# Parolsiz ko'rinish
korinish() { echo "$1" | sed -E 's#^[a-z]+://([^@/]*@)?##; s#\?.*$##'; }
echo "Manba: $(korinish "$NUSXA_MANBA_URL")"

# --- 1. Papka REPO ICHIDA bo'lmasligi shart ---
mkdir -p "$PAPKA" || { echo "XATO: papka yaratib bo'lmadi: $PAPKA" >&2; exit 2; }
PAPKA_REAL="$(cd "$PAPKA" && pwd -P)"
REPO_ILDIZI="$(git -C "$PAPKA_REAL" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$REPO_ILDIZI" ]; then
  echo "XATO: nusxa papkasi git repozitoriya ichida ($REPO_ILDIZI)." >&2
  echo "      Nusxada fuqarolarning shaxsiy ma'lumoti bor: repo tashqarisiga qo'ying (NUSXA_PAPKA)." >&2
  exit 2
fi
chmod 700 "$PAPKA_REAL" 2>/dev/null || true

# --- 2. Nusxa olish: avval vaqtinchalik nomga, tekshiruvdan keyin asl nomga ---
VAQT="$(date -u +%Y%m%d-%H%M%S)"
YAKUNIY="$PAPKA_REAL/bandlik-$VAQT.dump"
VAQTINCHA="$PAPKA_REAL/.yozilmoqda-$VAQT.tmp"
trap 'rm -f "$VAQTINCHA"' EXIT

umask 077
T0=$(date +%s)
echo "1/4 Nusxa olinmoqda (pg_dump)…"
if ! pg_dump "$NUSXA_MANBA_URL" -Fc --no-owner --no-privileges -f "$VAQTINCHA"; then
  echo "XATO: pg_dump yiqildi (ulanish, ruxsat yoki pg_dump versiyasi server versiyasidan past)." >&2
  exit 1
fi
T1=$(date +%s)

# --- 3. Butunlikni tekshirish ---
echo "2/4 Nusxa tekshirilmoqda…"
RAZMER="$(stat -c %s "$VAQTINCHA" 2>/dev/null || wc -c < "$VAQTINCHA")"
if [ "${RAZMER:-0}" -lt 1024 ]; then
  echo "XATO: nusxa juda kichik ($RAZMER bayt) - bo'sh yoki kesilgan." >&2; exit 1
fi
RO_YXAT="$(pg_restore --list "$VAQTINCHA" 2>/dev/null)" || { echo "XATO: nusxa pg_restore tomonidan o'qilmadi (buzuq)." >&2; exit 1; }
for J in User Household UnemployedPerson Mahalla AuditLog; do
  if ! grep -qE "TABLE DATA public \"?$J\"? " <<<"$RO_YXAT"; then
    echo "XATO: nusxada '$J' jadvali ma'lumoti yo'q - nusxa to'liq emas." >&2; exit 1
  fi
done

# --- 4. Yakuniy nom, ruxsat, SHA-256 ---
mv "$VAQTINCHA" "$YAKUNIY" && chmod 600 "$YAKUNIY"
( cd "$PAPKA_REAL" && sha256sum "bandlik-$VAQT.dump" > "bandlik-$VAQT.dump.sha256" && chmod 600 "bandlik-$VAQT.dump.sha256" )
echo "3/4 Tayyor: $YAKUNIY ($(du -h "$YAKUNIY" | cut -f1), $((T1 - T0)) soniya)"

# --- 5. Aylanma saqlash: faqat shu papkadagi bandlik-*.dump, eng yangi 3 tasi qoladi ---
echo "4/4 Eski nusxalar ($SAQLASH_KUN kundan eski, eng yangi $ENG_YANGI_SAQLASH tadan tashqari)…"
O_CHIRILDI=0
# Eng yangidan eskisiga; birinchi 3 tasi tegilmaydi
mapfile -t HAMMASI < <(find "$PAPKA_REAL" -maxdepth 1 -type f -name 'bandlik-*.dump' -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for i in "${!HAMMASI[@]}"; do
  [ "$i" -lt "$ENG_YANGI_SAQLASH" ] && continue
  F="${HAMMASI[$i]}"
  if [ -n "$(find "$F" -maxdepth 0 -type f -mtime +"$SAQLASH_KUN" 2>/dev/null)" ]; then
    rm -f -- "$F" "$F.sha256" && O_CHIRILDI=$((O_CHIRILDI + 1))
  fi
done
echo "    o'chirildi: $O_CHIRILDI; qoldi: $(find "$PAPKA_REAL" -maxdepth 1 -type f -name 'bandlik-*.dump' | wc -l)"

echo
echo "ZAXIRA NUSXASI: TAYYOR VA TEKSHIRILGAN"
echo "Eslatma: bu nusxa shaxsiy ma'lumotni o'z ichiga oladi. Uni shifrlanmagan holda"
echo "boshqa kompyuter, pochta yoki bulutga yubormang. Tiklash sinovi:"
echo "  MANBA_URL=... TIKLASH_URL=.../bandlik_tiklash_sinov scripts/zaxira-tiklash.sh"
exit 0
