import { Suspense } from 'react';
import TutorSignInForm from './TutorSignInForm';

export default function TutorSignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TutorSignInForm />
    </Suspense>
  );
}
