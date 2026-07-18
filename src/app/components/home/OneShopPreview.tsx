import { ShoppingBag } from 'lucide-react';
import styles from './home.module.css';

export default function OneShopPreview() {
  const items = [
    { title: 'Scientific Calculator', price: '1,200 BDT', image: 'https://images.unsplash.com/photo-1611078716381-807908b983d5?auto=format&fit=crop&q=80&w=400' },
    { title: 'Lab Coat (Medium)', price: '450 BDT', image: 'https://images.unsplash.com/photo-1584824388147-38e53cc0b2d3?auto=format&fit=crop&q=80&w=400' },
    { title: 'Engineering Drawing Kit', price: '850 BDT', image: 'https://images.unsplash.com/photo-1506511306353-066e40d04c45?auto=format&fit=crop&q=80&w=400' },
  ];

  return (
    <section className={styles.sectionAlt} style={{ padding: '6rem 1.5rem' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '0.5rem 1rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <ShoppingBag size={18} />
            Coming Soon
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', marginBottom: '1rem' }}>
            One Shop is on the way.
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            Soon you&apos;ll be able to discover student-friendly products, academic essentials, exclusive deals, and useful campus services—all in one place.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          position: 'relative'
        }}>
          {/* Overlay to prevent clicking and add blur */}
          <div style={{
            position: 'absolute',
            inset: '-1rem',
            background: 'rgba(248, 250, 252, 0.3)',
            backdropFilter: 'blur(3px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '24px'
          }}>
            <div style={{
              background: 'white',
              padding: '1rem 2rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: 'var(--text-main)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              Coming Soon
            </div>
          </div>

          {items.map((item, index) => (
            <div key={index} style={{
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              opacity: 0.8
            }}>
              <div style={{
                height: '200px',
                backgroundImage: `url('${item.image}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'grayscale(20%)'
              }} />
              <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 700 }}>{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
