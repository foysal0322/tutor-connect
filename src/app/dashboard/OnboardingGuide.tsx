import Link from 'next/link';
import {
  Search,
  PlusCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import styles from './dashboard.module.css';

/**
 * Fresh-member onboarding guide.
 *
 * Shown on the dashboard when a member has no learning activity, no
 * consultancy requests, and no teaching. nsuOne is a unified marketplace where
 * every member can both learn and teach — a new member may have joined
 * primarily to teach — so the guide presents BOTH paths as equal first steps
 * rather than a single learning-first sequence.
 *
 * Rendered server-side in page.tsx and passed to DashboardContent as a node.
 */

type LaneTone = 'primary' | 'accent';

interface LaneAction {
  label: string;
  href: string;
  primary: boolean;
  icon?: LucideIcon;
}

interface OnboardingLane {
  icon: LucideIcon;
  tone: LaneTone;
  heading: string;
  text: string;
  actions: LaneAction[];
}

const LANES: OnboardingLane[] = [
  {
    icon: BookOpen,
    tone: 'primary',
    heading: 'I want to learn',
    text: 'Get help with any course from peers who have aced it.',
    actions: [
      { label: 'Find a tutor', href: '/find-tutor', primary: true, icon: Search },
      { label: 'Post a request', href: '/student/request-tutor', primary: false },
    ],
  },
  {
    icon: GraduationCap,
    tone: 'accent',
    heading: 'I want to teach',
    text: 'Offer courses you have aced and earn from students who need help.',
    actions: [
      { label: 'Add an expertise', href: '/tutor/expertise', primary: true, icon: PlusCircle },
      { label: 'Complete your profile', href: '/profile', primary: false },
    ],
  },
];

const LANE_ICON_TONE: Record<LaneTone, string> = {
  primary: styles.onboardLaneIconPrimary,
  accent: styles.onboardLaneIconAccent,
};

export default function OnboardingGuide({ firstName }: { firstName: string }) {
  return (
    <section className={styles.onboard} aria-labelledby="onboard-title">
      {/* -------- Hero -------- */}
      <div className={styles.onboardHero}>
        <span className={styles.onboardEyebrow}>
          <Sparkles size={14} aria-hidden="true" />
          Getting started
        </span>
        <h2 id="onboard-title" className={styles.onboardTitle}>
          Welcome to nsuOne, {firstName}.
        </h2>
        <p className={styles.onboardLede}>
          nsuOne is a peer tutoring marketplace. Request help with any course,
          earn by teaching what you know, or do both. Pick a path below to get
          started.
        </p>
      </div>

      {/* -------- Two equal paths: learn and teach -------- */}
      <div className={styles.onboardLanes}>
        {LANES.map((lane) => {
          const Icon = lane.icon;
          return (
            <div key={lane.heading} className={styles.onboardLane}>
              <div className={styles.onboardLaneHead}>
                <span
                  className={`${styles.onboardLaneIcon} ${LANE_ICON_TONE[lane.tone]}`}
                >
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className={styles.onboardLaneTitle}>{lane.heading}</h3>
              </div>
              <p className={styles.onboardLaneText}>{lane.text}</p>
              <div className={styles.onboardLaneActions}>
                {lane.actions.map((action) =>
                  action.primary ? (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      {action.icon && <action.icon size={16} aria-hidden="true" />}
                      {action.label}
                    </Link>
                  ) : (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={styles.onboardLaneSecondary}
                    >
                      {action.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
