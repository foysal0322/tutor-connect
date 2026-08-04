"use client";

import { useState, useEffect } from "react";
import { addTutorExpertise, updateTutorExpertise } from "../actions";
import SearchableCourseSelect from "@/components/SearchableCourseSelect";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BookOpen, Clock, GraduationCap, Save, ArrowRight } from "lucide-react";
import {
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  gridFullClass,
} from "@/components/forms";

export default function AddExpertiseForm({
  courses,
  initialData,
  onSuccess,
  onCancel,
}: {
  courses: any[];
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [selectedGrade, setSelectedGrade] = useState(
    initialData?.courseGrade || ""
  );
  const grades = [
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "C-",
    "D+",
    "D",
    "F",
    "I",
    "W",
  ];

  const [semesterCompleted, setSemesterCompleted] = useState(
    initialData?.semesterCompleted || ""
  );
  const [facultyName, setFacultyName] = useState(
    initialData?.facultyName || ""
  );
  const [sessionFee, setSessionFee] = useState(
    initialData?.sessionFee?.toString() || ""
  );

  function parseDays(str: string) {
    if (!str) return [];
    return str.split(" (")[0].split(", ").filter(Boolean);
  }
  function parseStartTime(str: string) {
    if (!str) return "";
    const timeStr = str.split(" (")[1]?.replace(")", "");
    return timeStr === "All Day" ? "" : timeStr?.split("-")[0] || "";
  }
  function parseEndTime(str: string) {
    if (!str) return "";
    const timeStr = str.split(" (")[1]?.replace(")", "");
    return timeStr === "All Day" ? "" : timeStr?.split("-")[1] || "";
  }

  // Availability State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (initialData?.availability) {
      const isAll = initialData.availability === "Everyday";
      setIsAllDay(isAll);
      if (isAll) {
        setSelectedDays([]);
        setStartTime("");
        setEndTime("");
      } else {
        setSelectedDays(parseDays(initialData.availability));
        setStartTime(parseStartTime(initialData.availability));
        setEndTime(parseEndTime(initialData.availability));
      }
    } else {
      setSelectedDays([]);
      setIsAllDay(false);
      setStartTime("");
      setEndTime("");
    }
  }, [initialData]);

  const daysOfWeek = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  const toggleDay = (day: string) => {
    if (isAllDay) return;
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setSelectedDays([]);
      setStartTime("");
      setEndTime("");
    }
  };

  async function handleSubmit(formData: FormData) {
    if (!formData.get("courseId")) {
      setError("Please select a valid course from the list.");
      return;
    }
    if (!isAllDay && selectedDays.length === 0) {
      setError("Please select at least one available day.");
      return;
    }
    if (!isAllDay && (!startTime || !endTime)) {
      setError("Please specify a time range.");
      return;
    }
    if (!selectedGrade) {
      setError("Please select a course grade.");
      return;
    }

    const availabilityString = isAllDay
      ? "Everyday"
      : `${selectedDays.join(", ")} (${startTime}-${endTime})`;
    formData.set("availability", availabilityString);
    formData.set("semesterCompleted", semesterCompleted);
    formData.set("facultyName", facultyName);
    formData.set("sessionFee", sessionFee);
    formData.set("courseGrade", selectedGrade);

    if (initialData) {
      formData.set("id", initialData.id);
    }

    setLoading(true);
    setError("");
    try {
      const res = initialData
        ? await updateTutorExpertise(formData)
        : await addTutorExpertise(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        toast.success(initialData ? "Expertise updated." : "Expertise added.");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/tutor/expertise");
        }
      }
    } catch {
      setError("An error occurred while saving expertise.");
      toast.error("An error occurred while saving expertise.");
    }
    setLoading(false);
  }

  return (
    <div className="w-full">
      {error && <FormAlert>{error}</FormAlert>}

      <form action={handleSubmit} noValidate>
        <FormSection label="Course Details" icon={<BookOpen size={14} />}>
          <div className={`${fieldClass} ${gridFullClass}`}>
            <SearchableCourseSelect
              courses={courses}
              defaultValue={initialData?.courseId}
            />
          </div>

          <Input
            containerClassName={`${fieldClass} ${gridFullClass}`}
            name="semesterCompleted"
            type="text"
            required
            label="When did you take this course?"
            hint="The semester you completed this course, shown to students so they can see how recent your knowledge is."
            placeholder="e.g. Spring 2023"
            value={semesterCompleted}
            onChange={(e) => setSemesterCompleted(e.target.value)}
          />

          <Input
            containerClassName={fieldClass}
            name="facultyName"
            type="text"
            required
            label="Faculty Name"
            placeholder="Who taught you?"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
          />

          <Input
            containerClassName={fieldClass}
            name="sessionFee"
            type="number"
            min="100"
            step="any"
            required
            label="Session Fee (BDT)"
            placeholder="e.g. 500.50"
            value={sessionFee}
            onChange={(e) => setSessionFee(e.target.value)}
          />
        </FormSection>

        <FormSection label="Grade" icon={<GraduationCap size={14} />}>
          <Select
            containerClassName={fieldClass}
            name="courseGrade"
            label="Course Grade"
            required
            placeholderOption="Select Grade"
            value={selectedGrade}
            onChange={(v) => setSelectedGrade(v)}
            options={grades.map((g) => ({ value: g, label: g }))}
          />
          <div className={gridFullClass}>
            <label
              className="flex items-start gap-2 cursor-pointer text-sm hover:text-main transition-colors w-fit"
              style={{ color: "var(--text-muted)" }}
            >
              <input
                type="checkbox"
                name="hideGrade"
                defaultChecked={initialData?.hideGrade}
                value="true"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-color text-primary focus:ring-primary cursor-pointer"
              />
              <span>Hide my acquired grade for this course from students</span>
            </label>
          </div>
        </FormSection>

        <FormSection
          label="Availability"
          icon={<Clock size={14} />}
          columns={1}
        >
          <p
            className="text-sm text-muted"
            style={{ marginTop: "-0.25rem", marginBottom: "0.75rem" }}
          >
            Pick the days you can teach, then set the time range students can
            book you within.
          </p>

          <label
            className="flex items-start gap-2 cursor-pointer text-sm font-semibold text-main w-fit hover:text-primary transition-colors"
            style={{ marginBottom: "0.75rem" }}
          >
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-color text-primary focus:ring-primary cursor-pointer"
            />
            <span>Everyday</span>
          </label>

          <div
            className="flex gap-2 flex-wrap"
            style={{ marginBottom: "1rem" }}
          >
            {daysOfWeek.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={isAllDay}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedDays.includes(day)
                    ? "bg-primary border-primary text-white shadow-md"
                    : "border-color text-main hover:border-primary/50"
                } ${isAllDay ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {day}
              </button>
            ))}
          </div>

          {!isAllDay && (
            <div
              className={`bg-gray-50 p-4 rounded-md border border-color ${fieldClass}`}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: "0.375rem" }}
              >
                <span className="flex-1 text-xs font-semibold text-muted">
                  From
                </span>
                <span style={{ width: 16 }} />
                <span className="flex-1 text-xs font-semibold text-muted">
                  To
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-input flex-1"
                  style={{ minWidth: 0 }}
                />
                <ArrowRight size={16} className="text-muted shrink-0" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="form-input flex-1"
                  style={{ minWidth: 0 }}
                />
              </div>
            </div>
          )}
        </FormSection>

        <div className="flex gap-4">
          <FormSubmit
            fullWidth={false}
            className="flex-1 justify-center"
            loading={loading}
            loadingText="Saving..."
            icon={<Save size={18} />}
          >
            {initialData ? "Save Changes" : "Add Expertise"}
          </FormSubmit>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline flex-1 justify-center"
              disabled={loading}
              style={{ padding: "16px", fontSize: "16px", fontWeight: 600 }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
