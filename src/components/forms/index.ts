// Shared form-theme building blocks. See form-theme.module.css for the
// "forms only" scope contract (violet accent stays inside form surfaces).
import s from './form-theme.module.css';

/** Hook class: pass to <Input>/<Select>/<Textarea containerClassName={fieldClass}>. */
export const fieldClass = s.field;
/** Solid embedded card surface (for forms that already have an external heading). */
export const cardEmbeddedClass = s.cardEmbedded;
/** Apply to a field to span it across all grid columns. */
export const gridFullClass = s.gridFull;
/** Password visibility toggle button (used inside <Input trailingIcon>). */
export const toggleClass = s.toggle;
/** Violet link style used inside <FormCard footer>. */
export const footerLinkClass = s.footerLink;
/** Consent checkbox row (e.g. privacy policy agreement). */
export const consentClass = s.consent;
export const consentCheckboxClass = s.consentCheckbox;
export const consentLabelClass = s.consentLabel;
export const consentErrorClass = s.consentError;
export const consentInvalidClass = s.consentInvalid;
/** Gradient pill link for a primary post-form action (e.g. success "Sign In Now"). */
export const homeLinkClass = s.homeLink;

export { FormPage } from './FormPage';
export { FormCard } from './FormCard';
export { FormSection } from './FormSection';
export { FormSubmit } from './FormSubmit';
export { FormAlert } from './FormAlert';
export { FormSuccess } from './FormSuccess';
