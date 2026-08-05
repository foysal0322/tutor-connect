import { redirect } from 'next/navigation';

// The unified member dashboard now lives at /dashboard. This route is retained
// as a permanent redirect so old links/bookmarks keep working.
export default function TutorDashboardRedirect() {
  redirect('/dashboard');
}
