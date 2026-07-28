import Link from 'next/link';
import { Search, GraduationCap, Users, TrendingUp, ArrowRight } from 'lucide-react';
import styles from './home.module.css';

type Feature = {
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  text: string;
  comingSoon?: boolean;
};

const features: Feature[] = [
  {
    href: '/find-tutor',
    icon: <Search size={22} />,
    iconBg: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    iconColor: 'var(--primary)',
    title: 'Find a Tutor',
    text: 'Struggling with a course? Browse verified NSU tutors who already aced it. Filter by department, course, or preferred session mode.',
  },
  {
    href: '/auth/tutor-register',
    icon: <GraduationCap size={22} />,
    iconBg: 'color-mix(in srgb, var(--success) 12%, transparent)',
    iconColor: 'var(--success)',
    title: 'Become a Tutor',
    text: 'Share your knowledge and earn. Set your own schedule and rates, help fellow NSUers, and build a teaching reputation on campus.',
  },
  {
    href: '/consultancy',
    icon: <Users size={22} />,
    iconBg: 'color-mix(in srgb, var(--info) 12%, transparent)',
    iconColor: 'var(--info-hover)',
    title: 'Free Consultancy',
    text: 'Not sure which courses to take? Worried about probation? Connect with experienced seniors for free, one-on-one academic guidance.',
  },
  {
    href: '/consultancy',
    icon: <TrendingUp size={22} />,
    iconBg: 'color-mix(in srgb, var(--accent) 14%, transparent)',
    iconColor: 'var(--accent-hover)',
    title: 'Beat the Probation Curse',
    text: 'Get targeted advice on the safest course mix to pull up your CGPA, plan your semester strategically, and balance labs with lighter loads.',
  },
];

export default function CoreFeatures() {
  return (
    <section className={styles.sectionAlt + ' ' + styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>What you can do</span>
          <h2 className={styles.title}>Everything you need to succeed this semester</h2>
          <p className={styles.lede + ' ' + styles.ledeCenter}>
            One platform, four ways to use it. Get help with a tough course,
            earn by teaching, or map out your degree with seniors who&apos;ve
            been there.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((f) => {
            const content = (
              <>
                <div
                  className={styles.featureIcon}
                  style={{ background: f.iconBg, color: f.iconColor }}
                >
                  {f.icon}
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureText}>{f.text}</p>
                {f.href && (
                  <span className={styles.featureArrow}>
                    Learn more <ArrowRight size={14} aria-hidden="true" />
                  </span>
                )}
              </>
            );

            if (f.href) {
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className={styles.featureCard}
                >
                  {content}
                </Link>
              );
            }
            return (
              <div key={f.title} className={`${styles.featureCard} ${styles.featureCardStatic}`}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
