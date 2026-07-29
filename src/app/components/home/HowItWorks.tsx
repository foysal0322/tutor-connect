import { FileText, UserCheck, CreditCard, BookOpen } from "lucide-react";
import styles from "./home.module.css";

const steps = [
  {
    icon: <FileText size={20} aria-hidden='true' />,
    title: "Submit a request",
    text: "Tell us which course you need help with, your preferred time, and your budget.",
  },
  {
    icon: <UserCheck size={20} aria-hidden='true' />,
    title: "Get matched",
    text: "Our team reviews your request and connects you with a verified tutor who fits.",
  },
  {
    icon: <CreditCard size={20} aria-hidden='true' />,
    title: "Secure payment",
    text: "Lock in your session via bKash, Nagad, or Rocket. Funds release after the session.",
  },
  {
    icon: <BookOpen size={20} aria-hidden='true' />,
    title: "Start learning",
    text: "Meet online or on campus with your tutor and walk into your exam ready.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>How it works</span>
          <h2 className={styles.title}>From stuck to started in four steps</h2>
          <p className={styles.lede + " " + styles.ledeCenter}>
            Simple, secure, and fast &mdash; most students book a session the
            same day they post a request.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {steps.map((step) => (
            <div key={step.title} className={styles.step}>
              <div className={styles.stepIcon} aria-hidden='true'>
                {step.icon}
              </div>

              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
