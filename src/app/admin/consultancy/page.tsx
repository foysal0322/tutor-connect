import { prisma } from '@/lib/prisma';
import ConsultancyManager from './ConsultancyManager';

export const revalidate = 0;

// The five legacy free-text topics that existed before ConsultancyTopic.
// Auto-seeded on first visit so the public page never renders empty.
const LEGACY_TOPICS = [
  'Course Selection Advice',
  'Semester Planning',
  'Internship Guidance',
  'Career Advice',
  'Study Strategy',
];

async function ensureSeedTopics() {
  const count = await prisma.consultancyTopic.count();
  if (count > 0) return;
  await prisma.consultancyTopic.createMany({
    data: LEGACY_TOPICS.map((title) => ({
      title,
      price: 0, // free — preserves the original 2-free-quota UX
      isActive: true,
    })),
  });
}

export default async function AdminConsultancyPage() {
  await ensureSeedTopics();

  const [topics, requests] = await Promise.all([
    prisma.consultancyTopic.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.consultancyRequest.findMany({
      include: {
        student: { select: { id: true, name: true, nsuId: true, email: true } },
        consultancyTopic: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const serializedTopics = topics.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const serializedRequests = requests.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Consultancy</h1>
      <p className="text-muted mb-6">
        Curate consultancy topics (free or paid) and triage incoming student requests.
      </p>
      <ConsultancyManager topics={serializedTopics} requests={serializedRequests} />
    </div>
  );
}
