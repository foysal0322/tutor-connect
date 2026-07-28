'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './home.module.css';

type Review = {
  id: number;
  name: string;
  course: string;
  rating: number;
  comment: string;
};

export default function Testimonials({ reviews }: { reviews: Review[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = reviews.length;

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(next, 7000);
    return () => window.clearInterval(id);
  }, [next, count]);

  if (count === 0) return null;
  const review = reviews[currentIndex];

  return (
    <section className={styles.sectionAlt + ' ' + styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Student voices</span>
          <h2 className={styles.title}>Loved by NSUers</h2>
          <p className={styles.lede + ' ' + styles.ledeCenter}>
            Don&apos;t take our word for it &mdash; here&apos;s what students
            say about their experience on nsuOne.
          </p>
        </div>

        <div className={styles.testimonialWrap}>
          <div className={styles.testimonialCard}>
            <div
              className={styles.testimonialStars}
              role="img"
              aria-label={`Rated ${review.rating} out of 5 stars`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={styles.testimonialStar} aria-hidden="true">
                  {i < review.rating ? '★' : '☆'}
                </span>
              ))}
            </div>

            <blockquote className={styles.testimonialQuote}>
              &ldquo;{review.comment}&rdquo;
            </blockquote>

            <div>
              <div className={styles.testimonialName}>{review.name}</div>
              <div className={styles.testimonialCourse}>Course: {review.course}</div>
            </div>
          </div>

          <div className={styles.testimonialControls}>
            <button
              type="button"
              onClick={prev}
              className={styles.testimonialBtn}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              className={styles.testimonialBtn}
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>

          {count > 1 && (
            <div className={styles.testimonialDots} role="tablist" aria-label="Choose testimonial">
              {reviews.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={i === currentIndex}
                  aria-label={`Go to testimonial ${i + 1}`}
                  onClick={() => setCurrentIndex(i)}
                  className={`${styles.testimonialDot} ${
                    i === currentIndex ? styles.testimonialDotActive : ''
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
