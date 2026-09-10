'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, searchKey } from '@/lib/utils';

interface MultiSelectProps {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  /** Qidiruv maydonini yashirish (variantlar kam bo'lganda) */
  hideSearch?: boolean;
}

/**
 * Ko'p tanlovli ochiluvchi ro'yxat — admin paneldagi filtrlar uchun.
 * Tanlanganlar soni tugma ustida ko'rsatiladi.
 */
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Barchasi',
  searchPlaceholder = 'Qidirish...',
  className,
  hideSearch = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (option: string) => {
    onChange(
      values.includes(option) ? values.filter((v) => v !== option) : [...values, option]
    );
  };

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${values.length} ta tanlandi`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-10 w-full justify-between px-3 text-sm font-normal',
            values.length === 0 && 'text-ink-faint',
            className
          )}
        >
          <span className="truncate">{label}</span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {values.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Tanlovni tozalash"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
                className="rounded-sm p-0.5 text-ink-faint transition-colors hover:bg-surface-strong hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-ink-faint" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0">
        <Command
          filter={(itemValue, search) =>
            searchKey(itemValue).includes(searchKey(search)) ? 1 : 0
          }
        >
          {!hideSearch && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>Topilmadi</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <div
                    className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-line-strong',
                      values.includes(option) &&
                        'border-accent bg-accent-solid text-accent-contrast'
                    )}
                  >
                    {values.includes(option) && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
