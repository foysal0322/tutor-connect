'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function ForceSignoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Clearing stale session...</p>
    </div>
  );
}
