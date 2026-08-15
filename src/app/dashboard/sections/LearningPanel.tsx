import Link from "next/link";
import { BookOpen, CheckCircle, MessageSquare, History, Search, PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KPI } from "@/components/ui/KPI";
import StudentRequestList from "@/app/(member)/student/StudentRequestList";

/**
 * Learning panel — async server component (Phase 3).
 *
 * Fetches learning-side data (tutor requests + consultancy count) and streams
 * into the dashboard. Uses the shared <KPI> primitive instead of the legacy
 * <StatCard>.
 */
export default async function LearningPanel({
  userId,
  userBalance,
}: {
  userId: string;
  userBalance: number;
}) {
  const [learningRequests, consultancyCount] = await Promise.all([
    prisma.tutorRequest.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        topic: true,
        facultyName: true,
        preferredMode: true,
        preferredDateTime: true,
        budget: true,
        status: true,
        courseId: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        assignedTutor: {
          select: {
            id: true, name: true, email: true, contact: true, cgpa: true, gender: true,
            department: { select: { name: true } },
          },
        },
        payment: {
          select: {
            id: true, mfsType: true, accountNumber: true, amount: true, transactionId: true,
          },
        },
        refundRequests: {
          select: { id: true, status: true, details: true, amount: true, reviewNote: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.consultancyRequest.count({ where: { studentId: userId } }),
  ]);

  const activeLearningRequests = learningRequests.filter((r) =>
    ["PENDING", "MATCHED", "PAYMENT_PENDING", "ACCEPTED"].includes(r.status),
  ).length;
  const completedLearningSessions = learningRequests.filter(
    (r) => r.status === "COMPLETED",
  ).length;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="mb-0">Learning</h2>
        <Link href="/student/request-tutor" className="btn-primary">
          New Request
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Active Requests"
          value={activeLearningRequests}
          icon={<BookOpen size={14} />}
          tone="primary"
          hint="In-progress tutoring requests"
        />
        <KPI
          label="Completed"
          value={completedLearningSessions}
          icon={<CheckCircle size={14} />}
          tone="success"
          hint="Sessions finished"
        />
        <KPI
          label="Consultancy"
          value={consultancyCount}
          icon={<MessageSquare size={14} />}
          tone="accent"
          hint="Consultancy requests"
        />
        <KPI
          label="Wallet Balance"
          value={`${userBalance.toLocaleString()} TK`}
          icon={<History size={14} />}
          tone="info"
          hint="Available to spend or withdraw"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/find-tutor" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-primary-light text-primary rounded-full">
            <Search size={24} />
          </div>
          <span className="font-semibold">Find a Tutor</span>
        </Link>
        <Link href="/student/request-tutor" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-success-light text-success-hover rounded-full">
            <PlusCircle size={24} />
          </div>
          <span className="font-semibold">Request a Tutor</span>
        </Link>
        <Link href="/consultancy" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-accent-light text-accent-hover rounded-full">
            <MessageSquare size={24} />
          </div>
          <span className="font-semibold">Consultancy</span>
        </Link>
        <Link href="/student/payments" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-info-light text-info-hover rounded-full">
            <History size={24} />
          </div>
          <span className="font-semibold">Payment History</span>
        </Link>
      </div>

      <div>
        <h3 className="mb-3">Recent Requests</h3>
        <StudentRequestList
          initialRequests={learningRequests.slice(0, 5)}
          userBalance={userBalance}
        />
      </div>
    </section>
  );
}
