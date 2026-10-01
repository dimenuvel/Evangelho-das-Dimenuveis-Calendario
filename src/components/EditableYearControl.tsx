/**
 * @file src/components/EditableYearControl.tsx
 * Reusable editable year control allowing direct keyboard input of any year (e.g. 6050)
 * in addition to backward/forward stepping buttons.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface EditableYearControlProps {
  year: number;
  onChange: (nextYear: number) => void;
  label?: string;
  suffix?: string;
  minYear?: number;
  maxYear?: number;
  defaultYear?: number;
  variant?: 'stepper' | 'inline';
  size?: 'sm' | 'md';
  isPt?: boolean;
  className?: string;
}

export const EditableYearControl: React.FC<EditableYearControlProps> = ({
  year,
  onChange,
  label,
  suffix,
  minYear = 1,
  maxYear = 9999,
  defaultYear,
  variant = 'stepper',
  size = 'md',
  isPt = true,
  className = '',
}) => {
  const [draft, setDraft] = useState<string>(String(year));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(year));
    }
  }, [year, isFocused]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const clampYear = (val: number): number => {
    return Math.max(minYear, Math.min(maxYear, Math.round(val)));
  };

  const commitDraft = (raw: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const parsed = parseInt(raw.trim(), 10);
    if (!Number.isNaN(parsed)) {
      const clamped = clampYear(parsed);
      setDraft(String(clamped));
      if (clamped !== year) {
        onChange(clamped);
      }
    } else {
      setDraft(String(year));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9-]/g, '');
    setDraft(cleaned);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const parsed = parseInt(cleaned, 10);
    if (!Number.isNaN(parsed) && parsed >= minYear && parsed <= maxYear) {
      // If user typed a full 4-digit year, apply immediately; otherwise debounce slightly so mid-typing is smooth
      if (cleaned.replace('-', '').length >= 4) {
        onChange(parsed);
      } else {
        debounceRef.current = window.setTimeout(() => {
          onChange(parsed);
        }, 320);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft(draft);
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setDraft(String(year));
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = clampYear(year + 1);
      setDraft(String(next));
      onChange(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prev = clampYear(year - 1);
      setDraft(String(prev));
      onChange(prev);
    }
  };

  const stepYear = (delta: number) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = clampYear(year + delta);
    setDraft(String(next));
    onChange(next);
  };

  const dynamicCharWidth = Math.max(4, draft.length);

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        {label && <span>{label}</span>}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onFocus={(e) => {
            setIsFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setIsFocused(false);
            commitDraft(draft);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label={
            label
              ? `${label} (${isPt ? 'Editar ano' : 'Edit year'})`
              : isPt
              ? 'Editar ano'
              : 'Edit year'
          }
          title={
            isPt
              ? 'Clique para digitar qualquer ano diretamente'
              : 'Click to type any year directly'
          }
          style={{ width: `${dynamicCharWidth + 1.8}ch` }}
          className="box-content min-w-[4.75ch] bg-transparent border-b border-dashed border-amber-400/70 focus:border-solid focus:border-amber-400 text-center font-serif font-bold text-amber-400 tabular-nums focus:outline-none focus:bg-slate-900/60 px-1.5 py-0.5 transition-colors"
        />
        {suffix && <span>{suffix}</span>}
      </span>
    );
  }

  const isPaddingSm = size === 'sm';

  return (
    <div
      className={`inline-flex items-center border border-slate-700 bg-slate-950 divide-x divide-slate-700 font-serif text-xs whitespace-nowrap shrink-0 ${className}`}
    >
      <button
        type="button"
        onClick={() => stepYear(-1)}
        className={`${
          isPaddingSm ? 'p-1.5' : 'p-2'
        } hover:bg-slate-900 text-slate-200 transition-colors cursor-pointer`}
        title={isPt ? 'Ano Anterior (-1)' : 'Previous Year (-1)'}
        aria-label={isPt ? 'Ano Anterior' : 'Previous Year'}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <label
        className={`inline-flex items-center gap-1.5 ${
          isPaddingSm ? 'px-2.5 py-1' : 'px-3 py-1.5'
        } bg-slate-950 hover:bg-slate-900/60 transition-colors cursor-text`}
        title={
          isPt
            ? 'Digite qualquer ano diretamente (ex: 6050) ou use as setas'
            : 'Type any year directly (e.g. 6050) or use the arrows'
        }
      >
        {label && (
          <span className="font-semibold text-amber-400 select-none">
            {label}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onFocus={(e) => {
            setIsFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setIsFocused(false);
            commitDraft(draft);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label={
            label
              ? `${label} (${isPt ? 'Editar ano' : 'Edit year'})`
              : isPt
              ? 'Editar ano'
              : 'Edit year'
          }
          style={{ width: `${dynamicCharWidth + 2.2}ch` }}
          className="box-content min-w-[5.25ch] px-2 py-0.5 bg-slate-900 border border-slate-700 focus:border-amber-400 text-center font-serif font-bold text-amber-300 tabular-nums leading-tight focus:outline-none transition-colors"
        />
        {suffix && (
          <span className="font-semibold text-amber-400 select-none">
            {suffix}
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => stepYear(1)}
        className={`${
          isPaddingSm ? 'p-1.5' : 'p-2'
        } hover:bg-slate-900 text-slate-200 transition-colors cursor-pointer`}
        title={isPt ? 'Próximo Ano (+1)' : 'Next Year (+1)'}
        aria-label={isPt ? 'Próximo Ano' : 'Next Year'}
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {defaultYear !== undefined && year !== defaultYear && (
        <button
          type="button"
          onClick={() => {
            setDraft(String(defaultYear));
            onChange(defaultYear);
          }}
          className={`${
            isPaddingSm ? 'p-1.5' : 'p-2'
          } hover:bg-slate-900 text-amber-400 transition-colors cursor-pointer`}
          title={
            isPt
              ? `Voltar ao Ano Atual (${defaultYear})`
              : `Reset to Current Year (${defaultYear})`
          }
          aria-label={
            isPt
              ? `Voltar ao Ano Atual (${defaultYear})`
              : `Reset to Current Year (${defaultYear})`
          }
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
