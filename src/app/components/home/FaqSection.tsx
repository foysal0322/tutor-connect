'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './home.module.css';

const faqs = [
  {
    q: 'How do I request a tutor?',
    a: 'Click "Find a Tutor" and either browse our verified tutors or submit a custom tutor request with your specific course, budget, and time requirements.',
  },
  {
    q: 'How does payment work?',
    a: 'Payments are processed securely through bKash, Nagad, or Rocket. You pay the platform to lock in your session, and we release the funds to the tutor once the session is successfully completed.',
  },
  {
    q: 'Can I become a tutor?',
    a: 'Yes! A perfect CGPA isn\'t required. If you understand a course well, you can register as a tutor, set your own fees, and start earning.',
  },
  {
    q: 'Is consultancy free?',
    a: 'Your first consultancy session is completely free. We believe peer-to-peer guidance is essential. For subsequent sessions, a minimal fee may be charged to support our senior consultants.',
  },
  {
    q: 'When is One Shop launching?',
    a: 'One Shop is currently in development and will launch next semester as the ultimate marketplace for NSUers to buy and sell campus essentials.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={styles.sectionAlt + ' ' + styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>FAQ</span>
          <h2 className={styles.title}>Frequently asked questions</h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const panelId = `faq-panel-${idx}`;
            const buttonId = `faq-button-${idx}`;
            return (
              <div
                key={idx}
                className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
              >
                <h3 style={{ margin: 0 }}>
                  <button
                    type="button"
                    id={buttonId}
                    className={styles.faqButton}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                  >
                    {faq.q}
                    <ChevronDown
                      size={20}
                      className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`${styles.faqPanel} ${isOpen ? styles.faqPanelOpen : ''}`}
                >
                  <div className={styles.faqPanelInner}>
                    <p className={styles.faqAnswer}>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
