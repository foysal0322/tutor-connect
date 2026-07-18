'use client';

import { useState, useEffect } from 'react';

const IMAGES = [
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1920', // Students studying
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=1920', // Group study
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1920', // Writing/Study
];

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#000',
        zIndex: 0
      }} />
      
      {IMAGES.map((img, index) => (
        <div
          key={img}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url('${img}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: index === currentIndex ? 0.35 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: 0,
          }}
        />
      ))}
      
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)',
        zIndex: 0,
      }} />
    </>
  );
}
