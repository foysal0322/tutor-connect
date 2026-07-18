import { prisma } from '@/lib/prisma';
import HeroSection from './components/home/HeroSection';
import TrustStats from './components/home/TrustStats';
import CoreFeatures from './components/home/CoreFeatures';
import HowItWorks from './components/home/HowItWorks';
import RequestedCoursesPreview from './components/home/RequestedCoursesPreview';
import FeaturedTutorsPreview from './components/home/FeaturedTutorsPreview';
import Testimonials from './components/home/Testimonials';
import OneShopPreview from './components/home/OneShopPreview';
import AcademicSupport from './components/home/AcademicSupport';
import FaqSection from './components/home/FaqSection';
import FinalCta from './components/home/FinalCta';
import SupportForm from './components/SupportForm';
import styles from './page.module.css';

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

  // Mock student reviews
  const reviews = [
    { id: 1, name: 'Alice Rahman', course: 'CSE115', rating: 5, comment: 'NSUOne completely saved me. The tutor explained pointers so clearly that I aced my midterm!' },
    { id: 2, name: 'Tarik Islam', course: 'MAT120', rating: 5, comment: 'Getting free consultancy before advising was a game changer. I finally mapped out a solid plan to pull up my CGPA.' },
    { id: 3, name: 'Sara Khan', course: 'ACT201', rating: 4, comment: 'The platform is so easy to use. Found an amazing senior tutor within 2 hours of posting a request.' },
  ];

  return (
    <div className="animate-fade-in" style={{ backgroundColor: '#ffffff' }}>
      <HeroSection />
      <TrustStats />
      <CoreFeatures />
      <HowItWorks />
      
      <div style={{ background: '#f8fafc' }}>
        <RequestedCoursesPreview requests={requests} />
      </div>
      
      <FeaturedTutorsPreview tutors={tutors} />
      <Testimonials reviews={reviews} />
      <OneShopPreview />
      <AcademicSupport />
      <FaqSection />
      
      {/* Support / Contact Section */}
      <section id="support" className="container" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>Contact Support</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Have a suggestion, want to file a complaint, or need a refund? Let us know below.
          </p>
          <p style={{ textAlign: 'center', color: 'var(--text-main)', fontWeight: 600, marginBottom: '2.5rem' }}>
            For any urgent query call: <a href="tel:01711223344" style={{ color: 'var(--primary)' }}>01711223344</a>
          </p>
          <SupportForm />
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
