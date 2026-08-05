'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/app/actions/user';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Eye, EyeOff, GraduationCap, Lock, Mail, User, UserCircle } from 'lucide-react';
import { bdPhoneFieldProps, onBdPhoneChange } from '@/lib/phone';
import {
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  toggleClass,
  gridFullClass,
} from '@/components/forms';

export default function ProfileForm({
  user,
  departments = [],
  isAdmin = false,
  customAction,
  hidePassword = false,
}: {
  user: any;
  departments?: any[];
  isAdmin?: boolean;
  customAction?: (formData: FormData) => Promise<any>;
  /** Hide the password-change section (admin self-profile context). */
  hidePassword?: boolean;
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const actionToRun = customAction || updateUserProfile;
      const res = await actionToRun(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile.');
    }
    setLoading(false);
  }

  const showCgpa = user.role !== 'ADMIN' || (isAdmin && user.role !== 'ADMIN');

  return (
    <FormCard
      surface="embedded"
      icon={<UserCircle size={28} />}
      title="Profile"
      subtitle="Update your personal, academic, and security details."
    >
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone="success">Profile updated successfully!</FormAlert>}

      <form action={handleSubmit} noValidate>
        <FormSection label="Personal Information" icon={<User size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="name"
            label="Full Name"
            defaultValue={user.name}
            required
          />
          <Input
            containerClassName={fieldClass}
            name="nsuId"
            label="NSU ID"
            defaultValue={user.nsuId}
            required
          />
        </FormSection>

        <FormSection label="Contact & Department" icon={<Mail size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="email"
            type="email"
            label="Email Address"
            defaultValue={user.email}
            required
          />
          <Input
            containerClassName={fieldClass}
            name="contact"
            {...bdPhoneFieldProps}
            label="Contact Number"
            defaultValue={user.contact}
            required
            onChange={onBdPhoneChange()}
          />
          <Select
            containerClassName={fieldClass}
            name="gender"
            label="Gender"
            defaultValue={user.gender || ''}
            placeholderOption="Select Gender"
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Select
            containerClassName={fieldClass}
            name="departmentId"
            label="Department"
            searchable
            defaultValue={user.departmentId || ''}
            placeholderOption="Select Department"
            options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
          />
        </FormSection>

        {showCgpa && (
          <FormSection label="Academic" icon={<GraduationCap size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="cgpa"
              type="number"
              step="any"
              min="0"
              max="4.0"
              label="CGPA"
              defaultValue={user.cgpa || ''}
            />
            <div className={gridFullClass}>
              <label
                className="flex items-start gap-2 cursor-pointer text-sm hover:text-main transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <input
                  type="checkbox"
                  name="hideCgpa"
                  defaultChecked={user.hideCgpa}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-color text-primary focus:ring-primary cursor-pointer"
                />
                <span>Hide my CGPA from students</span>
              </label>
            </div>
          </FormSection>
        )}

        {!hidePassword && (
        <FormSection label="Change Password (Optional)" icon={<Lock size={14} />}>
          <Input
            containerClassName={fieldClass}
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="New Password"
            trailingIcon={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className={toggleClass}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            }
          />
          <Input
            containerClassName={fieldClass}
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            label="Confirm New Password"
            trailingIcon={
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className={toggleClass}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            }
          />
        </FormSection>
        )}

        <FormSubmit loading={loading} loadingText="Updating..." icon={<UserCircle size={18} />}>
          Update Profile
        </FormSubmit>
      </form>
    </FormCard>
  );
}
