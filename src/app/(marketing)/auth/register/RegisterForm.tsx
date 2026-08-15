"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registerUser } from "../actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Eye, EyeOff, Lock, GraduationCap, User, UserPlus } from "lucide-react";
import { useZodForm } from "@/hooks/useZodForm";
import { registerUserSchema } from "@/lib/validation";
import { bdPhoneFieldProps, onBdPhoneChange } from "@/lib/phone";
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  toggleClass,
  footerLinkClass,
  consentClass,
  consentCheckboxClass,
  consentLabelClass,
  consentErrorClass,
  consentInvalidClass,
} from "@/components/forms";

export default function RegisterForm({ departments }: { departments: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const form = useZodForm(registerUserSchema);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      setAgreeError("You must agree to the Privacy Policy to create an account.");
      return;
    }
    setAgreeError("");
    const formData = new FormData(e.currentTarget);
    if (!form.validateAll(formData)) return;
    setLoading(true);
    setError("");
    try {
      // New accounts are always created as STUDENT. The member can start
      // teaching at any time by adding an expertise — no second registration.
      const res = await registerUser(formData, "STUDENT");
      if (res?.error) {
        setError(res.error);
      } else if (res?.token) {
        router.push(`/auth/verify?token=${res.token}`);
      } else {
        router.push("/auth/signin");
      }
    } catch {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  }

  return (
    <FormPage>
      <FormCard
        icon={<UserPlus size={28} />}
        title="Create your campus account"
        subtitle="One account to find tutors and teach courses."
        footer={
          <>
            <span>Already have an account?</span>
            <Link
              href={`/auth/signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className={footerLinkClass}
            >
              Sign in
            </Link>
          </>
        }
      >
        {error && <FormAlert>{error}</FormAlert>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Section: Personal */}
          <FormSection label="Personal Details" icon={<User size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="name"
              type="text"
              label="Full Name"
              placeholder="Rakib Hasan"
              required
              error={form.errors.name}
              onChange={form.onChange("name")}
              onBlur={form.onBlur("name")}
            />
            <Input
              containerClassName={fieldClass}
              name="nsuId"
              type="text"
              label="NSU ID"
              placeholder="2211458642"
              required
              error={form.errors.nsuId}
              onChange={form.onChange("nsuId")}
              onBlur={form.onBlur("nsuId")}
            />
            <Input
              containerClassName={fieldClass}
              name="email"
              type="email"
              label="Email"
              placeholder="you@northsouth.edu"
              hint="Any email works, but a verified @northsouth.edu email helps you get matched with tutors or students more quickly."
              required
              error={form.errors.email}
              onChange={form.onChange("email")}
              onBlur={form.onBlur("email")}
            />
            <Input
              containerClassName={fieldClass}
              name="contact"
              {...bdPhoneFieldProps}
              label="Contact Number"
              hint="11-digit BD mobile"
              required
              error={form.errors.contact}
              onChange={onBdPhoneChange(form.onChange("contact"))}
              onBlur={form.onBlur("contact")}
            />
            <Select
              containerClassName={fieldClass}
              name="gender"
              label="Gender"
              required
              placeholderOption="Select gender"
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
              ]}
              error={form.errors.gender}
            />
          </FormSection>

          {/* Section: Academic */}
          <FormSection
            label="Academic Details"
            icon={<GraduationCap size={14} />}
            columns={1}
          >
            <Select
              containerClassName={fieldClass}
              name="departmentId"
              label="Department"
              searchable
              required
              placeholderOption="Select department"
              options={departments.map((dept) => ({
                value: dept.id,
                label: dept.name,
              }))}
              error={form.errors.departmentId}
            />
          </FormSection>

          {/* Section: Security */}
          <FormSection label="Security" icon={<Lock size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="........"
              hint="At least 8 characters"
              required
              error={form.errors.password}
              onChange={form.onChange("password")}
              onBlur={form.onBlur("password")}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className={toggleClass}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              }
            />
            <Input
              containerClassName={fieldClass}
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              label="Confirm Password"
              placeholder="........"
              required
              error={form.errors.confirmPassword}
              onChange={form.onChange("confirmPassword")}
              onBlur={form.onBlur("confirmPassword")}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className={toggleClass}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              }
            />
          </FormSection>

          {/* Consent */}
          <div className={`${consentClass} ${agreeError ? consentInvalidClass : ""}`}>
            <input
              id="agreeToPolicy"
              name="agreeToPolicy"
              type="checkbox"
              className={consentCheckboxClass}
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setAgreeError("");
              }}
            />
            <div>
              <label htmlFor="agreeToPolicy" className={consentLabelClass}>
                I agree to the nsuOne{" "}
                <Link href="/privacy-policy" className={footerLinkClass} target="_blank">
                  Privacy Policy
                </Link>{" "}
                and Terms of Service.
              </label>
              {agreeError && <span className={consentErrorClass}>{agreeError}</span>}
            </div>
          </div>

          <FormSubmit
            loading={loading}
            loadingText="Registering..."
            icon={<GraduationCap size={18} />}
          >
            Create Campus Account
          </FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
