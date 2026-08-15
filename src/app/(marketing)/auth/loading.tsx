import FormLoading from '@/components/ui/FormLoading';

// Auth pages fetch the session (and sometimes reference data) before they can
// render, and /auth/tutor-register is an instant redirect to /auth/register.
// Without this boundary that window shows a blank content area, which reads
// as "something broke". A visible "working on it" state covers all auth routes.
export default function AuthLoading() {
  return (
    <div
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FormLoading
        variant='inline'
        title='One moment…'
        message='Preparing the form for you.'
      />
    </div>
  );
}
