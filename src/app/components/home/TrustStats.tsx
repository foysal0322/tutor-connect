'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './home.module.css';

export default function TrustStats() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.stats} ref={sectionRef}>
      <div className={styles.statsInner}>
        <Stat value={isVisible ? <AnimatedCounter end={1200} /> : '0'} suffix="+" label="Registered students" />
        <Stat value={isVisible ? <AnimatedCounter end={350} /> : '0'} suffix="+" label="Verified tutors" />
        <Stat value={isVisible ? <AnimatedCounter end={5000} /> : '0'} suffix="+" label="Sessions booked" />
        <Stat value={isVisible ? <AnimatedCounter end={99} /> : '0'} suffix="%" label="Satisfaction rate" />
      </div>
    </div>
  );
}

function Stat({ value, suffix, label }: { value: React.ReactNode; suffix: string; label: string }) {
  return (
    <div className={styles.statItem}>
      <div className={styles.statValue}>
        {value}
        {suffix}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function AnimatedCounter({ end, duration = 1800 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let frame: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      }
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}
