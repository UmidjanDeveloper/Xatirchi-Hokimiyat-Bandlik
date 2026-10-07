/** Tanish uchun til/soha konteksti. Sheva talaffuzi noma'lum nomni yaratish uchun asos emas. */
export function uzbekNutqKonteksti(nomlar: string[] = []): string {
  return `Bu o'zbekcha nutq: O'zbekiston, Navoiy viloyati, Xatirchi tumani. Lotin yoki kirilldagi o'zbekcha yozing, boshqa tilga tarjima qilmang. Adabiy til va Xatirchi, Navoiy, Samarqand shevalari: bo'votti, bo'lyapti, qivor, qilib ber, opkel, olib kel, qanaqa, nechta, mahallamiz. O', g', q, x, h tovushlarini farqlang. Atamalar: mahalla, xatlov, ishsiz, bandlik, murojaat, hokim, xonadon, Excel hisobot, tuman, tasdiqlayman. ${nomlar.length ? `Rasmiy mahalla nomlari: ${nomlar.join(', ')}.` : ''}`;
}
