import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Wallet } from 'lucide-react';

export default function RequestedCoursesPreview({ requests }: { requests: any[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="container" style={{ padding: '5rem 1.5rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
            Latest Student Requests
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Students looking for tutors right now.</p>
        </div>
        <Link href="/auth/tutor-register" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Become a Tutor to Apply <ArrowRight size={18} />
        </Link>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {requests.map((req) => (
          <div key={req.id} style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{req.course.name}</h3>
                <span style={{ 
                  background: 'rgba(79, 70, 229, 0.1)', 
                  color: 'var(--primary)', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '9999px', 
                  fontSize: '0.8rem', 
                  fontWeight: 600 
                }}>
                  {req.course.department?.name || 'General'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                <strong>Topic:</strong> {req.topic}
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                <Wallet size={16} style={{ color: 'var(--text-muted)' }} />
                <span><strong>{req.budget} BDT</strong> / Session</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{req.preferredMode}</span>
              </div>
              {req.preferredDateTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>{new Date(req.preferredDateTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Requested {new Date(req.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
