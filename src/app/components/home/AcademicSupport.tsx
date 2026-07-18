'use client';

import { Target, TrendingUp, HelpCircle, FileCheck2 } from 'lucide-react';
import styles from './home.module.css';

export default function AcademicSupport() {
  const supports = [
    {
      title: 'Beat the Probation Curse',
      description: 'Get targeted advice on which courses to take to pull up your CGPA safely.',
      icon: <TrendingUp size={24} />,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)'
    },
    {
      title: 'Faculty & Course Advice',
      description: 'Find out the best faculty combinations before advising day approaches.',
      icon: <HelpCircle size={24} />,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    {
      title: 'Semester Planning',
      description: 'Strategic planning to balance heavy labs with lighter courses.',
      icon: <Target size={24} />,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)'
    },
    {
      title: 'Study Strategies',
      description: 'Proven techniques to ace those notoriously difficult NSU midterms.',
      icon: <FileCheck2 size={24} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    }
  ];

  return (
    <section className={styles.section} style={{ padding: '6rem 1.5rem' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', marginBottom: '1rem' }}>
            More Than Just Tutoring
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            NSUOne supports you throughout your entire university journey with free academic consultancy.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem' 
        }}>
          {supports.map((item, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              transition: 'transform 0.2s',
              cursor: 'default'
            }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: item.bg,
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
