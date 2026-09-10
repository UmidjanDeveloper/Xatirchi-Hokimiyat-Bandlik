'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * ============================================================
 *  XATIRCHI TUMANI GERBI
 *
 *  Rasm yuklanmasa ham sahifa buzilmasligi kerak: tuman
 *  internetlari beqaror va logotip yetib kelmasligi mumkin.
 *  Shuning uchun xatolikda soddalashtirilgan SVG ko'rinish
 *  chiziladi - u faylsiz, doim ishlaydi va gerbning uch
 *  belgisini (quyosh, tog', nihol) saqlaydi.
 * ============================================================
 */
export function Gerb({
  olcham = 40,
  className,
}: {
  olcham?: number;
  className?: string;
}) {
  const [xato, setXato] = useState(false);

  if (xato) {
    return (
      <span
        className={className}
        style={{ width: olcham, height: olcham, display: 'inline-block' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" width={olcham} height={olcham}>
          <circle cx="32" cy="32" r="30" fill="#F5B921" />
          <path d="M2 42a30 30 0 0 0 60 0z" fill="#1B5FA8" />
          <path d="M6 40 22 16l14 24z" fill="#2E9B4F" />
          <path
            d="M40 44c0-10 5-16 12-18-2 9-5 14-12 18z"
            fill="#2E9B4F"
            stroke="#fff"
            strokeWidth="2"
          />
          <path d="M40 46V30" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return (
    <Image
      src="/hokimiyat-logo.png"
      alt="Xatirchi tumani gerbi"
      width={olcham}
      height={olcham}
      className={className}
      priority
      onError={() => setXato(true)}
    />
  );
}
