import { prisma } from '@/lib/prisma';
import HeroSection from './components/home/HeroSection';
import TrustStats from './components/home/TrustStats';
import CoreFeatures from './components/home/CoreFeatures';
import HowItWorks from './components/home/HowItWorks';
import RequestedCoursesPreview from './components/home/RequestedCoursesPreview';
import FeaturedTutorsPreview from './components/home/FeaturedTutorsPreview';
import Testimonials from './components/home/Testimonials';
import FaqSection from './components/home/FaqSection';
import FinalCta from './components/home/FinalCta';
import SupportForm from './components/SupportForm';
import styles from './components/home/home.module.css';

// Cache homepage data for 5 minutes — stats don't need to be real-time
export const revalidate = 300;

export default async function Home() {
  // Batch both queries in parallel — only fetch columns we actually render
  const [requests, tutors] = await Promise.all([
    prisma.tutorRequest.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        topic: true,
        preferredMode: true,
        preferredDateTime: true,
        budget: true,
        createdAt: true,
        course: {
          select: {
            name: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.user.findMany({
      where: { role: 'TUTOR' },
      select: {
        id: true,
        name: true,
        cgpa: true,
        expertises: {
          where: { isActive: true },
          select: {
            sessionFee: true,
            course: { select: { name: true } }
          },
          take: 3,
        }
      },
      take: 6,
    }),
  ]);

  // Student reviews shown in the Testimonials carousel
  const reviews = [
    { id: 1, name: 'Alice Rahman', course: 'CSE115', rating: 5, comment: 'NSUOne completely saved me. The tutor explained pointers so clearly that I aced my midterm!' },
    { id: 2, name: 'Tarik Islam', course: 'MAT120', rating: 5, comment: 'Getting free consultancy before advising was a game changer. I finally mapped out a solid plan to pull up my CGPA.' },
    { id: 3, name: 'Sara Khan', course: 'ACT201', rating: 4, comment: 'The platform is so easy to use. Found an amazing senior tutor within 2 hours of posting a request.' },
  ];

  return (
    <div className="animate-fade-in">
      <HeroSection />
      <TrustStats />
      <CoreFeatures />
      <HowItWorks />
      <RequestedCoursesPreview requests={requests} />
      <FeaturedTutorsPreview tutors={tutors} />
      <Testimonials reviews={reviews} />
      <FaqSection />
      <FinalCta />

      {/* Contact / Support — homepage reference block. The navbar Contact link
          routes to the dedicated /contact page; this section stays as an
          on-page way to reach support without leaving the homepage. */}
      <section id="support" className={styles.contact}>
        <div className={styles.contactInner}>
          <span className={styles.eyebrow}>We&apos;re here to help</span>
          <h2 className={styles.contactTitle}>Contact support</h2>
          <p className={styles.contactLede}>
            Have a suggestion, want to file a complaint, or need a refund? Let us know below.
          </p>
          <p className={styles.contactPhone}>
            For any urgent query call:{' '}
            <a href="tel:01711223344" className={styles.contactPhoneLink}>01711223344</a>
          </p>
          <SupportForm />
        </div>
      </section>
    </div>
  );
}
