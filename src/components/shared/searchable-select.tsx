'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { hududBahosi } from '@/lib/hudud-qidiruv';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Xatolik holatida chegara qizil rangda ko'rsatiladi */
  hasError?: boolean;
  id?: string;
  className?: string;
}

/**
 * Qidiruvli ochiluvchi ro'yxat (combobox).
 *
 * Qidiruv apostrof, defis va bo'shliqqa befarq: "bogishamol" deb yozib
 * "Bog'ishamol" ni, "oqoltin" deb "Oq-oltin" ni topish mumkin.
 *
 * Qiymat FAQAT ro'yxatdan tanlanadi. Ilgari o'quvchi o'zi ham yozishi
 * mumkin edi — natijada bazada 41 ta ro'yxatdan tashqari nom paydo
 * bo'ldi ("navruz", "Sangijumon", "sdfsdfds"), ya'ni bitta mahalla
 * hisobotda bir necha qatorga bo'linib ketardi. Qidiruv fonetik
 * ishlagani uchun endi erkin yozishga ehtiyoj yo'q.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Tanlang',
  searchPlaceholder = 'Qidirish...',
  emptyText = 'Hech narsa topilmadi',
  hasError = false,
  id,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const trimmed = query.trim();

  /**
   * So'rovga mos keladigan variantlar (eng mosi birinchi).
   *
   * Oddiy "ichida bormi?" tekshiruvi yetarli emasligi amalda
   * ko'rindi: "navruz" deb yozgan bola "Navro'z" ni topa olmasdi
   * va yangi mahalla yozib yuborardi.
   */
  const matches = React.useMemo(() => {
    const scored = options
      .map((o) => ({ o, score: hududBahosi(o, trimmed) }))
      .filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score || a.o.localeCompare(b.o));
    return scored.map((x) => x.o);
  }, [options, trimmed]);

  const select = (next: string) => {
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-12 w-full justify-between px-4 text-base font-normal',
            !value && 'text-ink-faint',
            hasError && 'border-danger focus-visible:ring-danger',
            className
          )}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ink-faint" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {/*
          Filtrlashni Command emas, o'zimiz bajaramiz: moslashtirish
          fonetik va so'z bo'yicha ishlaydi, tayyor filtr esa faqat
          "ichida bormi?" ni biladi.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {matches.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}

            <CommandGroup
              heading={
                trimmed && matches.length > 0 ? (
                  <span className="px-2 text-xs text-ink-faint">Shu emasmi?</span>
                ) : undefined
              }
            >
              {matches.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => select(option === value ? '' : option)}
                  className="items-start whitespace-normal"
                >
                  <Check
                    className={cn(
                      'mr-2 mt-0.5 h-4 w-4 shrink-0 text-accent',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="leading-snug">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>

          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
