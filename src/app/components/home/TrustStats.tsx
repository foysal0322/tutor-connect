'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './home.module.css';

export default function TrustStats() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="container" ref={sectionRef}>
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {isVisible ? <AnimatedCounter end={1200} /> : '0'}+
          </div>
          <div className={styles.statLabel}>Registered Students</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {isVisible ? <AnimatedCounter end={350} /> : '0'}+
          </div>
          <div className={styles.statLabel}>Available Tutors</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {isVisible ? <AnimatedCounter end={5000} /> : '0'}+
          </div>
          <div className={styles.statLabel}>Completed Sessions</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>
            {isVisible ? <AnimatedCounter end={99} /> : '0'}%
          </div>
          <div className={styles.statLabel}>Student Satisfaction</div>
        </div>
      </div>
    </div>
  );
}

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}
