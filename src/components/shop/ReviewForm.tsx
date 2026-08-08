'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { FormCard, FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { Textarea } from '@/components/ui/Textarea';
import { leaveReview } from '@/app/(member)/shop/actions';
import styles from './ReviewForm.module.css';

interface Props {
  orderId: string;
  listingTitle: string;
}

export default function ReviewForm({ orderId, listingTitle }: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError('');
    setLoading(true);
    startTransition(async () => {
      formData.set('rating', String(rating));
      const res = await leaveReview(formData);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className={styles.doneCard}>
        <Star size={20} aria-hidden='true' />
        <div>
          <strong>Thanks for your review!</strong>
          <p>Your feedback helps other buyers on NSUOne Shop.</p>
        </div>
      </div>
    );
  }

  return (
    <FormCard
      surface='embedded'
      icon={<Star size={24} />}
      title='Leave a review'
      subtitle={listingTitle}
    >
      {error && <FormAlert>{error}</FormAlert>}
      <form action={handleSubmit} className='flex flex-col gap-4'>
        <input type='hidden' name='orderId' value={orderId} />

        <div className={styles.ratingRow}>
          <span className={styles.ratingLabel}>Your rating</span>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type='button'
                className={styles.starBtn}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={28}
                  aria-hidden='true'
                  fill={
                    (hover ?? rating) >= n ? 'currentColor' : 'none'
                  }
                  className={
                    (hover ?? rating) >= n ? styles.starFilled : styles.starEmpty
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <Textarea
          containerClassName={fieldClass}
          name='body'
          label='Comments (optional)'
          placeholder='How was the item? Would you buy from this seller again?'
          rows={4}
          maxLength={1000}
        />

        <FormSubmit loading={loading} loadingText='Submitting...'>
          Submit review
        </FormSubmit>
      </form>
    </FormCard>
  );
}
