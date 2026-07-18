'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import styles from './home.module.css';

export default function Testimonials({ reviews }: { reviews: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % reviews.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);

  if (reviews.length === 0) return null;

  return (
    <section className={styles.section} style={{ padding: '6rem 1.5rem', overflow: 'hidden' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', marginBottom: '1rem' }}>
            Loved by NSUers
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Don&apos;t just take our word for it. Here&apos;s what students have to say about their experience on NSUOne.
          </p>
        </div>

        <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
          {/* Quote Icon Background */}
          <div style={{ position: 'absolute', top: '-40px', left: '-20px', color: 'rgba(79, 70, 229, 0.05)', zIndex: 0 }}>
            <Quote size={120} />
          </div>
          
          <div style={{ 
            background: 'white', 
            borderRadius: '24px', 
            padding: '3rem', 
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.06)',
            position: 'relative',
            zIndex: 1,
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', color: '#fbbf24', marginBottom: '2rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ fontSize: '1.5rem' }}>
                  {i < reviews[currentIndex].rating ? '★' : '☆'}
                </span>
              ))}
            </div>
            
            <p style={{ fontSize: '1.25rem', lineHeight: 1.8, color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '2rem' }}>
              &quot;{reviews[currentIndex].comment}&quot;
            </p>
            
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                {reviews[currentIndex].name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Course: {reviews[currentIndex].course}
              </div>
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              onClick={prev}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={next}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
