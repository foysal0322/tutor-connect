'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

/**
 * Listens for the `?success=true` or `?error=<slug>` flags set by the
 * consultancy server action after a submission and surfaces them as toasts
 * instead of a full-page card or the global error boundary. Clears the
 * query param so the toast does not refire on back/forward navigation.
 */
export default function ConsultancySuccessToast() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      firedRef.current = true;
      toast.success("Request received — we'll contact you soon!");
    } else if (error === 'insufficient') {
      firedRef.current = true;
      const balance = searchParams.get('balance') ?? '0';
      const price = searchParams.get('price') ?? '0';
      toast.error(
        `Insufficient wallet balance — you need ${price} BDT but have ${balance} BDT. Recharge your wallet first.`,
      );
    } else if (error === 'details') {
      firedRef.current = true;
      toast.error('Please describe what you need help with before submitting.');
    } else if (error === 'topic') {
      firedRef.current = true;
      toast.error('Selected topic no longer exists. Please pick a different topic.');
    } else if (error === 'failed') {
      firedRef.current = true;
      toast.error('Failed to submit consultancy request. Please try again.');
    }

    if (firedRef.current) {
      // Strip the param(s) so a refresh or return-visit doesn't refire.
      router.replace('/consultancy');
    }
  }, [searchParams, toast, router]);

  return null;
}
