'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { z } from 'zod';

/**
 * Lightweight client-side validation hook built on the same Zod schemas the
 * server actions use (see src/lib/validation.ts).
 *
 * UX contract (per plan.md Step 4 / FRONTEND_AUDIT.md G1):
 *   - Errors stay hidden until the user has had a chance to type (validate on blur).
 *   - Once an error is showing for a field, re-validate on every input so the
 *     user gets immediate confirmation when they've fixed it.
 *   - On submit, validate everything and block if any field is invalid.
 *
 * Server remains the source of truth. Always trust the server response over
 * the client when they disagree.
 *
 * Cross-field refines (e.g. password === confirmPassword) work because the
 * whole schema is evaluated on every change; only the *visibility* of errors
 * is gated by the per-field "touched" set.
 */

type AnyZod = z.ZodType<any, any, any>;
type Errors = Record<string, string>;

export function useZodForm(schema: AnyZod) {
  // Latest values, kept in a ref so input handlers don't need to be recreated.
  const valuesRef = useRef<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [allErrors, setAllErrors] = useState<Errors>({});

  const runValidation = useCallback(
    (vals: Record<string, unknown>): Errors => {
      const result = schema.safeParse(vals);
      if (result.success) return {};
      const errs: Errors = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !errs[key]) errs[key] = issue.message;
      }
      return errs;
    },
    [schema],
  );

  /** Show an error only if the field was touched or submit was attempted. */
  const visibleErrors = useMemo(() => {
    if (submitAttempted) return allErrors;
    const visible: Errors = {};
    for (const key of Object.keys(touched)) {
      if (touched[key] && allErrors[key]) visible[key] = allErrors[key];
    }
    return visible;
  }, [allErrors, touched, submitAttempted]);

  /** Wire to a field's onChange. Tracks the value and re-validates if touched. */
  const onChange = useCallback(
    (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value;
      valuesRef.current[name] = val;
      if (touched[name] || submitAttempted) {
        setAllErrors(runValidation(valuesRef.current));
      }
    },
    [touched, submitAttempted, runValidation],
  );

  /** Wire to a field's onBlur. Marks the field touched and reveals any error. */
  const onBlur = useCallback(
    (name: string) => () => {
      setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
      setAllErrors(runValidation(valuesRef.current));
    },
    [runValidation],
  );

  /** Validate everything from a FormData (call on submit). Returns true if valid. */
  const validateAll = useCallback(
    (formData: FormData): boolean => {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of formData.entries()) obj[k] = typeof v === 'string' ? v : '';
      valuesRef.current = obj;
      const errs = runValidation(obj);
      setAllErrors(errs);
      setSubmitAttempted(true);
      return Object.keys(errs).length === 0;
    },
    [runValidation],
  );

  const reset = useCallback(() => {
    valuesRef.current = {};
    setTouched({});
    setSubmitAttempted(false);
    setAllErrors({});
  }, []);

  return { errors: visibleErrors, onChange, onBlur, validateAll, reset };
}
