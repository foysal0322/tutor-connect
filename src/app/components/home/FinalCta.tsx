'use client';

import Link from 'next/link';
import styles from './home.module.css';

export default function FinalCta() {
  return (
    <section style={{ 
      padding: '8rem 1.5rem', 
      background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background shapes */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h2 style={{ 
          fontSize: '3rem', 
          fontWeight: 800, 
          color: 'white', 
          letterSpacing: '-1px', 
          marginBottom: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto 1.5rem auto'
        }}>
          Ready to Make Your University Life Easier?
        </h2>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '1.25rem', 
          maxWidth: '600px', 
          margin: '0 auto 3rem auto',
          lineHeight: 1.6 
        }}>
          Join thousands of NSUers who are already using NSUOne to find tutors, offer classes, and navigate their academic journey.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/find-tutor" style={{ 
            background: 'white', 
            color: 'var(--primary)', 
            padding: '1rem 2.5rem', 
            borderRadius: '9999px', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            textDecoration: 'none',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s'
          }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            Find a Tutor
          </Link>
          <Link href="/auth/tutor-register" style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            color: 'white', 
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            padding: '1rem 2.5rem', 
            borderRadius: '9999px', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            textDecoration: 'none',
            transition: 'background 0.2s'
          }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}>
            Become a Tutor
          </Link>
        </div>
      </div>
    </section>
  );
}
