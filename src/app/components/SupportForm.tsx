'use client';

import { useState } from 'react';
import { submitSupportTicket } from '../actions/support';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LifeBuoy, MessageSquare, Phone, Send, User } from 'lucide-react';
import {
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
} from '@/components/forms';

export default function SupportForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(form);
    const res = await submitSupportTicket(formData);

    if (res?.error) {
      setError(res.error);
    } else if (res?.success) {
      setSuccess(true);
      form?.reset();
    }
    setLoading(false);
  }

  return (
    <FormCard
      surface="embedded"
      icon={<LifeBuoy size={28} />}
      title="Send us a message"
      subtitle="We typically respond within one business day."
    >
      {success ? (
        <div style={{ textAlign: 'center' }}>
          <FormAlert tone="success">
            Thank you! We&apos;ve received your message and will review it shortly.
          </FormAlert>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="btn-secondary"
            style={{ marginTop: '0.5rem' }}
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <FormAlert>{error}</FormAlert>}

          <FormSection label="Your Details" icon={<User size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="name"
              type="text"
              label="Name"
              placeholder="Your name"
              required
            />
            <Input
              containerClassName={fieldClass}
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              required
            />
          </FormSection>

          <FormSection label="More Details" icon={<Phone size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="contact"
              type="tel"
              label="Contact number"
              placeholder="Your phone number"
              required
            />
            <Select
              containerClassName={fieldClass}
              name="type"
              label="What can we help with?"
              required
              placeholderOption="Select an option"
              options={[
                { value: 'REFUND', label: 'Request a refund' },
                { value: 'COMPLAINT', label: 'Submit a complaint' },
                { value: 'SUGGESTION', label: 'Give a suggestion' },
              ]}
            />
          </FormSection>

          <FormSection label="Message" icon={<MessageSquare size={14} />} columns={1}>
            <Textarea
              containerClassName={fieldClass}
              name="message"
              label="Message"
              required
              rows={4}
              placeholder="Please provide details..."
            />
          </FormSection>

          <FormSubmit loading={loading} loadingText="Submitting..." icon={<Send size={18} />}>
            Submit message
          </FormSubmit>
        </form>
      )}
    </FormCard>
  );
}
