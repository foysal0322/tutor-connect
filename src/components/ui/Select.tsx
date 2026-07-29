'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import s from './Select.module.css';

/**
 * Themed, accessible dropdown primitive.
 *
 * Two modes share one panel design (white card, indigo active highlight,
 * bold selected row, soft shadow) — the look first introduced by
 * SearchableCourseSelect, now used everywhere:
 *   - default: a <button> trigger opening a WAI-ARIA listbox (small lists).
 *   - searchable: a text <input> combobox that filters as you type (large lists).
 *
 * Supports controlled (value + onChange) and uncontrolled (defaultValue +
 * name) usage. When `name` is set, a hidden input carries the selected value
 * so it submits with the form — exactly like a native <select>.
 *
 * a11y: trigger keeps focus; options are reached via aria-activedescendant.
 * (We deliberately do NOT use useFocusTrap here — it locks page scroll, which
 * is right for a modal but wrong for a listbox.)
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];

  /** Controlled value. */
  value?: string;
  /** Uncontrolled initial value (ignored when `value` is provided). */
  defaultValue?: string;
  /** Called with the new value (and its option) on every selection. */
  onChange?: (value: string, option: SelectOption) => void;
  /** When set, a hidden input with this name submits the selected value. */
  name?: string;

  /** Render the searchable combobox variant. */
  searchable?: boolean;
  /** Label for the blank "no selection" option (value ''). */
  placeholderOption?: string;
  /** Empty-state text when a search yields nothing. */
  noOptionsMessage?: string;
  disabled?: boolean;
  /** Forwarded to the searchable input only. */
  autoComplete?: string;

  id?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  /** Render the label off-screen (admin filters, sort, inline rows). */
  hideLabel?: boolean;
  /** Override the default label styling (e.g. toolbar micro-labels). */
  labelClassName?: string;
  /** Wrapper class (call sites pass fieldClass for grid placement). */
  containerClassName?: string;
  /** Extra class appended to the trigger (width/height/active-fill). */
  className?: string;
}

export function Select({
  label,
  options,
  value,
  defaultValue,
  onChange,
  name,
  searchable = false,
  placeholderOption,
  noOptionsMessage = 'No matches',
  disabled = false,
  autoComplete = 'off',
  id: idProp,
  required,
  error = null,
  hint,
  hideLabel = false,
  labelClassName,
  containerClassName,
  className,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = idProp ?? generatedId;
  const labelId = `${triggerId}-label`;
  const listboxId = `${triggerId}-listbox`;
  const hintId = `${triggerId}-hint`;
  const errorId = `${triggerId}-error`;
  const optionId = (index: number) => `${triggerId}-opt-${index}`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const selectedValue = isControlled ? (value as string) : internalValue;

  // The text shown in the searchable input. Seeded from the initial selection
  // and re-synced whenever the controlled value changes externally (e.g. a
  // "Clear all" button resetting the filter).
  const initialSelectedLabel =
    options.find((o) => o.value === (isControlled ? value : defaultValue))?.label ?? '';
  const [query, setQuery] = useState(initialSelectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = options.find((o) => o.value === selectedValue) ?? null;

  // Build the list shown in the panel: optional blank option on top, then the
  // (filtered, when searchable) real options.
  const normalizedQuery = query.trim().toLowerCase();
  const realOptions = searchable
    ? normalizedQuery
      ? options.filter((o) => o.label.toLowerCase().includes(normalizedQuery))
      : options
    : options;
  const blankOption: SelectOption | null = placeholderOption
    ? { value: '', label: placeholderOption }
    : null;
  const listOptions: SelectOption[] = blankOption
    ? [blankOption, ...realOptions]
    : realOptions;

  const selectedIndexInList = listOptions.findIndex((o) => o.value === selectedValue);

  // When the controlled value changes externally (e.g. a "Clear all" button
  // resetting the filter), keep the searchable input's text in sync. Adjusting
  // state during render (rather than in an effect) avoids cascading renders.
  const [prevControlledValue, setPrevControlledValue] = useState(
    isControlled ? (value as string) : '',
  );
  if (searchable && isControlled && value !== prevControlledValue) {
    setPrevControlledValue(value as string);
    const opt = options.find((o) => o.value === value) ?? null;
    setQuery(opt?.label ?? '');
  }

  // Scroll the active option into view while navigating by keyboard.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function selectOption(opt: SelectOption) {
    if (opt.disabled) return;
    if (!isControlled) setInternalValue(opt.value);
    if (searchable) setQuery(opt.label);
    onChange?.(opt.value, opt);
    setActiveIndex(-1);
    setOpen(false);
  }

  function openListbox() {
    setOpen(true);
    if (searchable) {
      setActiveIndex(normalizedQuery ? 0 : -1);
    } else {
      setActiveIndex(selectedIndexInList);
    }
  }

  function clearSelection() {
    if (!isControlled) setInternalValue('');
    setQuery('');
    setActiveIndex(-1);
    onChange?.('', blankOption ?? { value: '', label: '' });
    setOpen(true);
    if (triggerRef.current && 'focus' in triggerRef.current) triggerRef.current.focus();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setQuery(next);
    setOpen(true);
    setActiveIndex(next.trim() ? 0 : -1);
    // Typing away from the chosen label invalidates the selection.
    if (selectedOption && next !== selectedOption.label) {
      if (!isControlled) setInternalValue('');
      onChange?.('', blankOption ?? { value: '', label: '' });
    }
  }

  // Keyboard nav that skips disabled options and wraps around.
  function moveActive(step: number) {
    setOpen(true);
    setActiveIndex((prev) => {
      const n = listOptions.length;
      if (n === 0) return -1;
      // ArrowUp from "none" should start at the last item, ArrowDown at first.
      const start = prev < 0 ? (step > 0 ? -1 : n) : prev;
      let next = start;
      for (let i = 0; i < n; i++) {
        next = (((next + step) % n) + n) % n;
        if (!listOptions[next]?.disabled) return next;
      }
      return prev;
    });
  }

  function jumpActive(toLast: boolean) {
    setOpen(true);
    const target = toLast ? listOptions.length - 1 : 0;
    // Find the first/last non-disabled option from the requested end.
    let idx = target;
    for (let i = 0; i < listOptions.length; i++) {
      if (!listOptions[idx]?.disabled) break;
      idx += toLast ? -1 : 1;
    }
    setActiveIndex(listOptions[idx] && !listOptions[idx].disabled ? idx : -1);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (searchable) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveActive(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveActive(-1);
          break;
        case 'Enter':
          if (open && activeIndex >= 0 && listOptions[activeIndex]) {
            event.preventDefault();
            selectOption(listOptions[activeIndex]);
          }
          break;
        case 'Escape':
          if (open) {
            setOpen(false);
            setQuery(selectedOption?.label ?? '');
          } else if (query) {
            setQuery('');
            if (!isControlled) setInternalValue('');
          }
          break;
        case 'Tab':
          setOpen(false);
          break;
        default:
          break;
      }
      return;
    }

    // Non-searchable (button trigger).
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        jumpActive(false);
        break;
      case 'End':
        event.preventDefault();
        jumpActive(true);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open && activeIndex >= 0 && listOptions[activeIndex]) {
          selectOption(listOptions[activeIndex]);
        } else {
          openListbox();
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const triggerLabel = selectedOption
    ? selectedOption.label
    : placeholderOption || 'Select…';

  const labelClass = hideLabel ? 'sr-only' : labelClassName ?? s.label;

  return (
    <div className={containerClassName} ref={containerRef}>
      <label htmlFor={triggerId} id={labelId} className={labelClass}>
        {label}
        {required && (
          <span aria-label="required" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>

      <div className={s.triggerWrap}>
        {searchable ? (
          <input
            ref={triggerRef as React.RefObject<HTMLInputElement>}
            id={triggerId}
            type="text"
            className={['form-input', className ?? ''].filter(Boolean).join(' ')}
            style={{ paddingRight: '2.5rem' }}
            value={query}
            onChange={handleInputChange}
            onFocus={openListbox}
            onKeyDown={handleKeyDown}
            autoComplete={autoComplete}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            placeholder={placeholderOption || 'Search…'}
            disabled={disabled}
          />
        ) : (
          <button
            ref={triggerRef as React.RefObject<HTMLButtonElement>}
            id={triggerId}
            type="button"
            className={['form-select', s.trigger, className ?? ''].filter(Boolean).join(' ')}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            data-open={open}
            disabled={disabled}
            onClick={() => (open ? setOpen(false) : openListbox())}
            onKeyDown={handleKeyDown}
          >
            <span className={selectedOption ? s.triggerValue : `${s.triggerValue} ${s.placeholder}`}>
              {triggerLabel}
            </span>
            <ChevronDown className={s.chevron} size={18} aria-hidden="true" data-open={open} />
          </button>
        )}

        {searchable && query && (
          <button
            type="button"
            className={s.clearBtn}
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        )}

        {open && (
          <ul id={listboxId} role="listbox" aria-labelledby={labelId} className={s.panel}>
            {listOptions.length === 0 ? (
              <li className={s.empty}>
                {searchable ? `${noOptionsMessage} “${query}”` : noOptionsMessage}
              </li>
            ) : (
              listOptions.map((opt, index) => {
                const isActive = index === activeIndex;
                const isSelected = opt.value === selectedValue && opt.value !== '';
                return (
                  <li
                    key={`${opt.value}-${index}`}
                    id={optionId(index)}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled || undefined}
                    data-active={isActive || undefined}
                    data-selected={isSelected || undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(opt)}
                    className={[s.option, opt.disabled ? s.optionDisabled : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {opt.label}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {hint && !error && (
        <div id={hintId} className="form-hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} role="alert" className="form-error">
          {error}
        </div>
      )}

      {name && <input type="hidden" name={name} value={selectedValue} />}
    </div>
  );
}
