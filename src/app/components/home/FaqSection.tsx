'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './home.module.css';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I request a tutor?',
      a: 'Simply click on "Find a Tutor" and either browse our verified tutors or submit a custom tutor request with your specific course, budget, and time requirements.'
    },
    {
      q: 'How does payment work?',
      a: 'Payments are processed securely through bKash, Nagad, or Rocket. You pay the platform to lock in your session, and we release the funds to the tutor once the session is successfully completed.'
    },
    {
      q: 'Can I become a tutor?',
      a: 'Yes! Having a perfect CGPA or grade is not mandatory. If you understand a course well, you can register as a tutor, set your own fees, and start earning.'
    },
    {
      q: 'Is consultancy free?',
      a: 'Your first consultancy session is completely free! We believe peer-to-peer guidance is essential. For subsequent sessions, a minimal fee might be charged to support our senior consultants.'
    },
    {
      q: 'When is One Shop launching?',
      a: 'One Shop is currently in development and will launch next semester. It will be the ultimate marketplace for NSUers to buy and sell campus essentials.'
    }
  ];

  return (
    <section className={styles.sectionAlt} style={{ padding: '6rem 1.5rem' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-main)'
                }}
              >
                {faq.q}
                <ChevronDown 
                  size={20} 
                  style={{ 
                    color: 'var(--text-muted)', 
                    transform: openIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease'
                  }} 
                />
              </button>
              
              <div style={{
                maxHeight: openIndex === idx ? '200px' : '0',
                opacity: openIndex === idx ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                padding: openIndex === idx ? '0 1.5rem 1.5rem 1.5rem' : '0 1.5rem'
              }}>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
