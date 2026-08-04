import { redirect } from 'next/navigation';

// Unified profile now lives at /profile. Retained as a permanent redirect.
export default function StudentProfileRedirect() {
  redirect('/profile');
}
