"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./find-tutor.module.css";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search,
  Loader2,
  X,
  ArrowRight,
  Star,
  Users,
  MessageSquareQuote,
  Clock,
  BookOpen,
  Telescope,
  HandHeart,
} from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { getMyTaughtCourseIds } from "@/app/actions/user";

/* ------------------------------------------------------------------ */
/* Types — mirror the server-mapped shape from page.tsx               */
/* ------------------------------------------------------------------ */

interface Review {
  id: string;
  rating: number;
  review: string;
  studentName: string;
  courseName: string;
  date: string;
}

interface TutorSummary {
  id: string;
  name: string;
  cgpa: number | null;
  gender: string | null;
  studentsTaught?: number;
  averageRating?: string | null;
  reviews?: Review[];
  department: { name: string } | null;
}

interface Expertise {
  id: string;
  tutorId: string;
  courseId: string;
  semesterCompleted: string;
  facultyName: string;
  courseGrade: string | null;
  availability: string;
  sessionFee: number;
  tutor: TutorSummary;
  course: {
    id: string;
    name: string;
    departmentId: string | null;
  };
}

interface Department {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** First letters of the first and last name words — used for the monogram avatar. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Deterministic fee formatting — avoids SSR/CSR locale mismatches. */
function formatFee(fee: number): string {
  return `BDT ${Math.round(fee)}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function FindTutorClient({
  initialExpertises,
  departments,
}: {
  initialExpertises: Expertise[];
  departments: Department[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [activeReviewsTutor, setActiveReviewsTutor] =
    useState<TutorSummary | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Courses the signed-in viewer teaches — used to disable "request tutoring"
  // on their own courses. The authoritative guard lives in submitTutorRequest;
  // this is the matching UI affordance.
  const [taughtCourseIds, setTaughtCourseIds] = useState<string[]>([]);
  const taughtCourseIdSet = useMemo(
    () => new Set(taughtCourseIds),
    [taughtCourseIds]
  );
  useEffect(() => {
    getMyTaughtCourseIds()
      .then(setTaughtCourseIds)
      .catch(() => {
        /* leave buttons enabled; the server guard still protects */
      });
  }, []);

  // Searching state — true for the brief window between a keystroke and the
  // 300ms debounce settling. Drives the inline "updating" affordance.
  const isSearching =
    searchQuery.trim() !== "" && searchQuery !== debouncedSearch;

  const filteredExpertises = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return initialExpertises.filter((exp) => {
      const matchesSearch =
        !query ||
        exp.tutor.name.toLowerCase().includes(query) ||
        exp.course.name.toLowerCase().includes(query);
      const matchesDept =
        !selectedDept || exp.course.departmentId === selectedDept;
      const matchesGender =
        !selectedGender || exp.tutor.gender === selectedGender;
      return matchesSearch && matchesDept && matchesGender;
    });
  }, [initialExpertises, debouncedSearch, selectedDept, selectedGender]);

  const totalOptions = initialExpertises.length;
  const hasFilters =
    searchQuery.trim() !== "" || selectedDept !== "" || selectedGender !== "";
  const selectedDeptName =
    departments.find((d) => d.id === selectedDept)?.name ?? "";

  function clearAll() {
    setSearchQuery("");
    setSelectedDept("");
    setSelectedGender("");
  }

  const reviewCount = activeReviewsTutor?.reviews?.length ?? 0;

  return (
    <div className={styles.page}>
      {/* ============================================================ */}
      {/* CONTENT                                                      */}
      {/* ============================================================ */}
      <div className={styles.content}>
        {/* ----- Toolbar: result summary + active chips + filters ----- */}
        <div className={styles.toolbar}>
          {hasFilters && (
            <div className={styles.toolbarMain}>
              <div className={styles.chips} aria-label="Active filters">
                {searchQuery && (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>
                      &ldquo;{searchQuery}&rdquo;
                    </span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => setSearchQuery("")}
                      aria-label={`Clear search ${searchQuery}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                )}
                {selectedDept && (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>{selectedDeptName}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => setSelectedDept("")}
                      aria-label={`Clear department filter ${selectedDeptName}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                )}
                {selectedGender && (
                  <span className={styles.chip}>
                    <span className={styles.chipLabel}>{selectedGender}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => setSelectedGender("")}
                      aria-label={`Clear gender filter ${selectedGender}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.toolbarControls}>
            <div className={styles.searchWrap}>
              <div className={styles.searchBox}>
                <Search className={styles.searchIcon} aria-hidden="true" />
                <input
                  id="find-tutor-search"
                  type="text"
                  className={styles.searchInput}
                  placeholder="Course or tutor name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className={styles.searchLive} aria-hidden="true" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.filters}>
              <Select
                containerClassName={`${styles.filterField} ${selectedDept ? styles.filterFieldActive : ""}`}
                label=""
                labelClassName={styles.filterLabel}
                searchable
                value={selectedDept}
                onChange={setSelectedDept}
                placeholderOption="All departments"
                options={departments.map((dept) => ({
                  value: dept.id,
                  label: dept.name,
                }))}
              />

              <Select
                containerClassName={`${styles.filterField} ${selectedGender ? styles.filterFieldActive : ""}`}
                label=""
                labelClassName={styles.filterLabel}
                value={selectedGender}
                onChange={setSelectedGender}
                placeholderOption="Select gender"
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />

              {hasFilters && (
                <button
                  type="button"
                  className={styles.clearAll}
                  onClick={clearAll}
                >
                  <X size={15} aria-hidden="true" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ----- Results ----- */}
        <div className={styles.results}>
          {filteredExpertises.length > 0 ? (
            <div className={styles.grid}>
              {filteredExpertises.map((exp) => {
                const reviews = exp.tutor.reviews ?? [];
                const hasReviews = reviews.length > 0;
                const viewerTeaches = taughtCourseIdSet.has(exp.course.id);
                return (
                  <article key={exp.id} className={styles.card}>
                    {/* Identity */}
                    <div className={styles.cardTop}>
                      <div className={styles.avatar} aria-hidden="true">
                        {getInitials(exp.tutor.name)}
                      </div>
                      <div className={styles.identity}>
                        <h3 className={styles.tutorName}>{exp.tutor.name}</h3>
                        <p className={styles.tutorDept}>
                          {exp.tutor.department?.name ??
                            "North South University"}
                        </p>
                      </div>
                      {exp.tutor.cgpa != null && (
                        <span className={styles.cgpaBadge}>
                          CGPA {exp.tutor.cgpa.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Course expertise */}
                    <div className={styles.courseBlock}>
                      <BookOpen
                        className={styles.courseIcon}
                        aria-hidden="true"
                      />
                      <div className={styles.courseMeta}>
                        <span className={styles.courseLabel}>Teaches</span>
                        <span className={styles.courseName}>
                          {exp.course.name}
                        </span>
                      </div>
                    </div>

                    {/* Academic performance */}
                    <dl className={styles.stats}>
                      {exp.courseGrade && (
                        <div className={styles.statCell}>
                          <dt className={styles.statLabel}>Grade</dt>
                          <dd className={styles.statValue}>
                            {exp.courseGrade}
                          </dd>
                        </div>
                      )}
                      {exp.facultyName && (
                        <div className={styles.statCell}>
                          <dt className={styles.statLabel}>Faculty</dt>
                          <dd className={styles.statValue}>
                            {exp.facultyName}
                          </dd>
                        </div>
                      )}
                      {exp.semesterCompleted && (
                        <div className={styles.statCell}>
                          <dt className={styles.statLabel}>Completed</dt>
                          <dd className={styles.statValue}>
                            {exp.semesterCompleted}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* Trust */}
                    <div className={styles.trustRow}>
                      {exp.tutor.averageRating ? (
                        <span className={styles.rating}>
                          <Star
                            className={styles.starIcon}
                            aria-hidden="true"
                          />
                          {exp.tutor.averageRating}
                        </span>
                      ) : (exp.tutor.studentsTaught ?? 0) > 0 ? (
                        <span className={styles.ratingNew}>No ratings yet</span>
                      ) : (
                        <span className={styles.ratingNew}>
                          New to tutoring
                        </span>
                      )}
                      <span className={styles.trustDot} aria-hidden="true" />
                      <span className={styles.trustMeta}>
                        <Users className={styles.metaIcon} aria-hidden="true" />
                        {exp.tutor.studentsTaught ?? 0} taught
                      </span>
                      {hasReviews && (
                        <>
                          <span
                            className={styles.trustDot}
                            aria-hidden="true"
                          />
                          <span className={styles.trustMeta}>
                            <MessageSquareQuote
                              className={styles.metaIcon}
                              aria-hidden="true"
                            />
                            {reviews.length} review
                            {reviews.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Availability + fee */}
                    <div className={styles.availFee}>
                      <span className={styles.avail} title={exp.availability}>
                        <span className={styles.availDot} aria-hidden="true" />
                        <Clock className={styles.metaIcon} aria-hidden="true" />
                        <span className={styles.availText}>
                          {exp.availability}
                        </span>
                      </span>
                      <span className={styles.fee}>
                        {formatFee(exp.sessionFee)}{" "}
                        <span className={styles.feeUnit}>/ session</span>
                      </span>
                    </div>

                    {/* Footer actions — primary CTA leads, reviews secondary */}
                    <div className={styles.cardFooter}>
                      {hasReviews && (
                        <button
                          type="button"
                          className={styles.reviewsBtn}
                          onClick={() => setActiveReviewsTutor(exp.tutor)}
                        >
                          View {reviews.length} review
                          {reviews.length !== 1 ? "s" : ""}
                        </button>
                      )}
                      {viewerTeaches ? (
                        <span
                          className={styles.ctaDisabled}
                          aria-disabled="true"
                        >
                          You teach this course
                        </span>
                      ) : (
                        <Link
                          href={`/student/request-tutor?courseId=${exp.course.id}&tutorId=${exp.tutor.id}`}
                          className={styles.cta}
                        >
                          Request Tutor for this Course
                          <ArrowRight
                            className={styles.ctaIcon}
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} aria-hidden="true">
                <Telescope />
              </div>
              <h3 className={styles.emptyTitle}>No tutors found</h3>
              <p className={styles.emptyText}>
                We couldn&apos;t find a tutor matching your search. Try a
                different course name, or clear your filters to see everyone.
              </p>
              <div className={styles.emptyActions}>
                {hasFilters && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={clearAll}
                  >
                    Clear all filters
                  </button>
                )}
                <Link href="/student/request-tutor" className="btn-primary">
                  Request a tutor
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ----- Fallback CTA ----- */}
        <section className={styles.fallback}>
          <div className={styles.fallbackIcon} aria-hidden="true">
            <HandHeart />
          </div>
          <div className={styles.fallbackBody}>
            <h2 className={styles.fallbackTitle}>
              Can&apos;t find the right tutor?
            </h2>
            <p className={styles.fallbackText}>
              Tell us which course you need help with and your preferred
              schedule. We&apos;ll match you with a qualified tutor who meets
              your criteria.
            </p>
          </div>
          <div className={styles.fallbackAction}>
            <Link href="/student/request-tutor" className={styles.fallbackBtn}>
              Request a Tutor
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* REVIEWS SHEET                                                 */}
      {/* ============================================================ */}
      <Sheet
        open={!!activeReviewsTutor}
        onClose={() => setActiveReviewsTutor(null)}
        title={activeReviewsTutor?.name ?? "Reviews"}
        side="right"
        size="30rem"
      >
        {activeReviewsTutor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Rating summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              {activeReviewsTutor.averageRating ? (
                <>
                  <Star size={16} fill="currentColor" style={{ color: 'var(--accent)' }} />
                  <strong>{activeReviewsTutor.averageRating}</strong>
                  <span>·</span>
                  <span>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                </>
              ) : (
                <span>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Review list */}
            {reviewCount > 0 ? (
              activeReviewsTutor.reviews!.map((r) => (
                <div key={r.id} className={styles.reviewItem}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewAuthor}>
                      {r.studentName}{' '}
                      <span className={styles.reviewCourse}>· {r.courseName}</span>
                    </span>
                    <span className={styles.reviewStars} aria-label={`Rated ${r.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={`${styles.reviewStar} ${i < r.rating ? '' : styles.reviewStarEmpty}`}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </div>
                  {r.review && r.review.trim() !== '' ? (
                    <p className={styles.reviewText}>&ldquo;{r.review}&rdquo;</p>
                  ) : (
                    <p className={styles.reviewTextEmpty}>No written review provided.</p>
                  )}
                  <span className={styles.reviewDate}>
                    {new Date(r.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.modalEmpty}>
                <p className={styles.modalEmptyTitle}>No reviews yet</p>
                <p>Be the first student to share your experience.</p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
