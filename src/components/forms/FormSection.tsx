import React from 'react';
import s from './form-theme.module.css';

/**
 * A group of fields inside a form. When `label` is provided, renders the
 * icon + uppercase label + gradient rule divider above the field body; when
 * omitted, renders just the fields (no title bar) — useful where the section
 * headings would be redundant or confusing.
 *
 * Pass children that are <Input>/<Select>/<Textarea> each carrying
 * containerClassName={fieldClass} (imported from the forms barrel). Use
 * <span className={gridFullClass}>... or gridFullClass on a field to span
 * both columns (e.g. a wide textarea).
 */
interface FormSectionProps {
  label?: string;
  /** Small Lucide icon node (e.g. size 14). Shown only when `label` is set. */
  icon?: React.ReactNode;
  /** 2 = two-column grid on >=768px (default); 1 = single-column stack. */
  columns?: 1 | 2;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({ label, icon, columns = 2, className, children }: FormSectionProps) {
  return (
    <section className={className ? `${s.section} ${className}` : s.section}>
      {label && (
        <div className={s.sectionLabel}>
          {icon && <span className={s.sectionIcon}>{icon}</span>}
          <span className={s.sectionText}>{label}</span>
          <span className={s.sectionRule} />
        </div>
      )}
      <div className={columns === 1 ? s.stack : s.grid}>{children}</div>
    </section>
  );
}
