'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { Maskot } from './maskot';

/**
 * Koala (ovozli yordamchi) yuklovchi tugmasi.
 *
 * Har sahifada turadi, shuning uchun JUDA yengil: faqat maskot va tugma.
 * Suhbat oynasi (ovoz, tasdiq, fetch mantig'i) faqat birinchi bosilganda
 * yoki tugma ustiga kelinganda yuklanadi — zaif qurilmada sahifa
 * ochilish tezligi o'zgarmaydi (hajm byudjeti shuni tekshiradi).
 */
const Oyna = dynamic(() => import('./agent-oynasi'), { ssr: false, loading: () => null });

export function AgentTugmasi({ ism, rol }: { ism: string; rol: string }) {
  const { t } = useAlifbo();
  const [ochiq, setOchiq] = useState(false);
  const [yuklangan, setYuklangan] = useState(false);
  const tugma = useRef<HTMLButtonElement>(null);

  const isit = () => void import('./agent-oynasi');

  return (
    <>
      {!ochiq && (
        <button
          ref={tugma}
          type="button"
          data-agent-tugmasi="ha"
          onClick={() => {
            setYuklangan(true);
            setOchiq(true);
          }}
          onMouseEnter={isit}
          onFocus={isit}
          aria-label={t('Коала — овозли ёрдамчини очиш')}
          title={t('Коала — овозли ёрдамчи')}
          className="chop-etilmasin fixed bottom-4 right-4 z-40 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Maskot olcham={72} />
        </button>
      )}
      {yuklangan && (
        <Oyna
          ochiq={ochiq}
          yopish={() => {
            setOchiq(false);
            setTimeout(() => tugma.current?.focus(), 0);
          }}
          ism={ism}
          rol={rol}
        />
      )}
    </>
  );
}
