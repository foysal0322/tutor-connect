'use client';

import { useState } from 'react';
import { submitSupportTicket } from '../actions/support';

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

  if (success) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h3 style={{ color: 'var(--success-hover)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-xl)' }}>
          Thank you!
        </h3>
        <p className="text-muted">We&apos;ve received your message and will review it shortly.</p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="btn-secondary btn-sm"
          style={{ marginTop: 'var(--space-4)' }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--danger-light)',
            color: 'var(--danger-hover)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="support-name">Name</label>
          <input
            id="support-name"
            name="name"
            type="text"
            required
            className="form-input"
            placeholder="Your name"
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="support-email">Email</label>
          <input
            id="support-email"
            name="email"
            type="email"
            required
            className="form-input"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="support-contact">Contact number</label>
          <input
            id="support-contact"
            name="contact"
            type="tel"
            required
            className="form-input"
            placeholder="Your phone number"
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" htmlFor="support-type">What can we help with?</label>
          <select id="support-type" name="type" required className="form-select" defaultValue="">
            <option value="" disabled>Select an option</option>
            <option value="REFUND">Request a refund</option>
            <option value="COMPLAINT">Submit a complaint</option>
            <option value="SUGGESTION">Give a suggestion</option>
          </select>
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label" htmlFor="support-message">Message</label>
        <textarea
          id="support-message"
          name="message"
          required
          rows={4}
          className="form-textarea"
          placeholder="Please provide details…"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary" style={{ padding: 'var(--space-3)' }}>
        {loading ? 'Submitting…' : 'Submit message'}
      </button>
    </form>
  );
}
