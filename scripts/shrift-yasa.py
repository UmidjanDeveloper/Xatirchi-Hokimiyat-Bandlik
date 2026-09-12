"""
Hisobot shriftini qayta qisqartirish.

Belgilar ro'yxati ATAYLAB keng: ilova ikki alifboda ishlaydi va
hisobotga tushadigan matn ikkalasidan ham keladi. Bitta belgi
tushib qolsa, PDF da o'sha satr UMUMAN chizilmaydi - va buni
faqat hisobotni ochib ko'rganda bilib olasan.
"""
from fontTools import subset
from fontTools.ttLib import TTFont

# ── Kirill: o'zbek kirill alifbosi to'liq + rus harflari ──
KIRILL = (
    'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'
    'ЎўҚқҒғҲҳ'          # o'zbek kirilliga xos
    'ІіЇїЄєЪъ'           # qo'shni yozuvlardan tushib qolishi mumkin
)

# ── Lotin: o'zbek lotin alifbosi ──
LOTIN = (
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    'abcdefghijklmnopqrstuvwxyz'
    'ʻʼ‘’'               # o'zbek tutuq belgisi va o'xshashlari
    'OʻGʻoʻgʻ'
)

RAQAM = '0123456789'

# ── Tinish belgilari ──
#
# Bu ro'yxat eng ko'p muammo keltiradigan qism. Har bir belgi
# nega kerakligi yozilgan, chunki keyinroq "buni kim qo'shdi"
# degan savol chiqadi.
TINISH = (
    ' .,:;!?'            # oddiy tinish
    '()[]{}'             # qavslar
    '«»"\''              # qo'shtirnoqlar - tavsiya sarlavhalarida
    '“”„‟'               # tipografik qo'shtirnoqlar
    '-–—'                # chiziqlar: defis, en, em
    '/\\|'               # ajratgichlar
    '+−=<>'              # matematik
    '%‰'                 # foiz
    '№#*&@'              # raqam belgisi va boshqalar
    '·•◦'                # ajratgich nuqtalar
    '°^~`_$€₽'           # qolganlar
    '↑↓→←'               # yo'nalish ko'rsatkichlari
    '✓✗№'                # belgi
    '…'                  # ko'p nuqta
)

# ── Ko'rinmas, lekin MAJBURIY belgilar ──
#
# Ming ajratgich uzilmaydigan bo'shliq (U+00A0) bilan yoziladi.
# U shriftda bo'lmasa, "1 751" degan son "1" bo'lib qoladi va
# hisobot yolg'on gapiradi. Bir marta shu xato bo'lgan.
KORINMAS = '    ​‑'

BARCHASI = KIRILL + LOTIN + RAQAM + TINISH + KORINMAS

MANBA = {
    'regular': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'bold': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
}

for nom, yol in MANBA.items():
    chiqish = f'public/shrift/hisobot-{nom}.ttf'
    opts = subset.Options()
    opts.layout_features = []      # OpenType xususiyatlari kerak emas
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ['*']
    opts.notdef_outline = True     # yo'q belgi bo'sh kvadrat bo'lib ko'rinsin

    f = subset.load_font(yol, opts)
    s = subset.Subsetter(options=opts)
    s.populate(text=BARCHASI)
    s.subset(f)
    subset.save_font(f, chiqish, opts)

    # Tekshiruv
    t = TTFont(chiqish)
    cmap = t.getBestCmap()
    yoq = [c for c in BARCHASI if ord(c) not in cmap]
    import os
    print(f'{nom}: {len(cmap)} belgi, {os.path.getsize(chiqish) // 1024} KB', end='')
    print(f' — TUSHIB QOLGAN: {yoq!r}' if yoq else ' — hammasi bor')
