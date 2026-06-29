export default function ContactPage() {
  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>Contact Us</h1>
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Have any questions? We're here to help!
        </p>

        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name</label>
            <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
            <input type="email" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Message</label>
            <textarea rows={4} className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}></textarea>
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: '1rem' }}>Send Message</button>
        </form>
      </div>
    </div>
  );
}
