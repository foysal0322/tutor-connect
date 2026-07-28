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

  return (
    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', maxWidth: '600px', margin: '0 auto' }}>
      {success ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <h3 style={{ color: 'var(--success-hover)', marginBottom: '1rem', fontSize: '1.5rem' }}>Thank you!</h3>
          <p style={{ color: 'var(--text-muted)' }}>We have received your message and will review it shortly.</p>
          <button 
            onClick={() => setSuccess(false)}
            style={{ marginTop: '1.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            Submit Another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ background: 'var(--danger-light)', color: 'var(--danger-hover)', padding: '1rem', borderRadius: '8px' }}>{error}</div>}
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Name</label>
              <input type="text" name="name" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} placeholder="Your Name" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Email</label>
              <input type="email" name="email" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} placeholder="Your Email" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Contact Number</label>
              <input type="tel" name="contact" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} placeholder="Your Phone Number" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>What can we help you with?</label>
              <select name="type" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                <option value="">Select an option</option>
                <option value="REFUND">Request a Refund</option>
                <option value="COMPLAINT">Submit a Complaint</option>
                <option value="SUGGESTION">Give a Suggestion</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Message</label>
            <textarea name="message" required rows={4} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', resize: 'vertical' }} placeholder="Please provide details..."></textarea>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '1rem', fontSize: '1rem', marginTop: '0.5rem' }}>
            {loading ? 'Submitting...' : 'Submit Message'}
          </button>
        </form>
      )}
    </div>
  );
}
