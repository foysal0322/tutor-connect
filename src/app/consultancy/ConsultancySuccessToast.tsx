'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

/**
 * Listens for the `?success=true` flag set by the consultancy server action
 * after a successful submission and surfaces it as a toast instead of a
 * full-page success card. Clears the query param so the toast does not
 * refire on subsequent back/forward navigations.
 */
export default function ConsultancySuccessToast() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (searchParams.get('success') !== 'true') return;

    firedRef.current = true;
    toast.success("Request received — we'll contact you soon!");
    // Strip the param so a refresh or return-visit doesn't refire.
    router.replace('/consultancy');
  }, [searchParams, toast, router]);

  return null;
}
