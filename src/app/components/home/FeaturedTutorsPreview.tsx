import Link from 'next/link';
import { BadgeCheck, ArrowRight } from 'lucide-react';
import styles from './home.module.css';

export default function FeaturedTutorsPreview({ tutors }: { tutors: any[] }) {
  if (tutors.length === 0) return null;

  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
              Meet Our Top Tutors
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Expert NSUers ready to help you ace your exams.</p>
          </div>
          <Link href="/find-tutor" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            View All Tutors <ArrowRight size={18} />
          </Link>
        </div>
        
        {/* Horizontal Carousel */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          overflowX: 'auto',
          paddingBottom: '2rem',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}>
          {tutors.map((tutor) => (
            <div key={tutor.id} style={{
              minWidth: '320px',
              maxWidth: '350px',
              scrollSnapAlign: 'center',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(236, 72, 153, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--primary)'
                }}>
                  {tutor.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {tutor.name}
                    <BadgeCheck size={18} color="#10b981" />
                  </h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    CGPA: <strong style={{ color: 'var(--text-main)' }}>{tutor.cgpa}</strong>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem', flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Expertise:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tutor.expertises.slice(0, 3).map((e: any, i: number) => (
                    <span key={i} style={{
                      background: '#f1f5f9',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      color: 'var(--text-main)',
                      fontWeight: 500
                    }}>
                      {e.course.name.split(':')[0]}
                    </span>
                  ))}
                  {tutor.expertises.length > 3 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      +{tutor.expertises.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Starting from</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>
                    {tutor.expertises[0]?.sessionFee || 'Negotiable'} BDT
                  </div>
                </div>
                <Link href="/find-tutor" className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
