import { Suspense } from 'react';
import StudentSignInForm from './StudentSignInForm';

export default function StudentSignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentSignInForm />
    </Suspense>
  );
}
