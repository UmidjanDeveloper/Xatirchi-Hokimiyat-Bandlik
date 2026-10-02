import type { Rol } from '@prisma/client';

/**
 * Hudhud (AI agent) umumiy turlari.
 *
 * Agent HECH QACHON bazaga to'g'ridan-to'g'ri yozmaydi va xom so'rov bermaydi:
 * u faqat shu yerdagi `Asbob` lar orqali ishlaydi, har bir asbob esa mavjud,
 * rolga bog'langan kutubxona funksiyasini chaqiradi.
 */

export type Alifbo = 'kir' | 'lot';

export interface AgentKontekst {
  userId: string;
  rol: Rol;
  fullName: string;
  mahallaId: string | null;
  alifbo: Alifbo;
  hozir: Date;
}

/** Javob qaysi manbadan olingani — xodimga ko'rinadi */
export interface Manba {
  /** Kirillda yoziladi, ko'rsatishda alifboga o'tkaziladi */
  nom: string;
  /** ISO vaqt */
  vaqt: string;
}

/** Brauzerda bajariladigan yoki xodim tasdiqlaydigan amal */
export type Amal =
  | { tur: 'ochish'; url: string; nomi: string }
  /** Hisobot tugmalari turgan sahifani ochib, PDF yoki Excel yuklashni boshlaydi (brauzerda yaratiladi) */
  | { tur: 'hisobot'; format: 'pdf' | 'excel'; url: string; nomi: string }
  | { tur: 'tasdiq'; id: string; sarlavha: string; muddat: string };

export interface AsbobNatijasi {
  /** Modelga beriladigan ma'lumot: faqat jamlama, shaxsiy ma'lumotsiz */
  malumot: Record<string, unknown>;
  manbalar: Manba[];
  amallar?: Amal[];
}

export interface Asbob {
  nomi: string;
  /** Modelga: asbob qachon chaqirilishi kerak */
  tavsif: string;
  /** JSON Schema (OpenAI function calling) */
  parametrlar: Record<string, unknown>;
  rollar: readonly Rol[];
  bajar(ctx: AgentKontekst, args: unknown): Promise<AsbobNatijasi>;
}

/** Suhbat tarixi: faqat matn, rol ikkita — tizim va asbob xabarlarini mijoz yubora olmaydi */
export interface TarixXabari {
  r: 'f' | 'a';
  m: string;
}
