/**
 * LANNENT — ValidationContext
 * Ported from front-end/js/validation.js, and shared with the app through React Context.
 * Reusable client-side form validation utilities.
 *
 *   const Validate = useValidation();
 *   Validate.email(value);  Validate.toast('Saved!', 'success');   // same API as before
 *
 * Validators are pure functions that return an error string or null.
 * toast() and confirm() are kept exactly as before: they append their own
 * element to <body>, outside React's tree, so they look and behave the same.
 */
import { createContext, useContext } from 'react';

const Validate = (() => {

  // ─── Validators (return error string or null) ─────────────────────────────
  function required(value, label) {
    if (!value || String(value).trim() === '') return `${label} is required.`;
    return null;
  }

  // Letters from any script, plus the marks, hyphens, apostrophes and periods
  // that real names contain. The old rule was /^[A-Za-z\s]+$/, which rejected
  // "José García", "Anne-Marie O'Brien" and "Marta Kovač" outright, and its
  // 3-character minimum rejected two-character CJK names.
  const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]*$/u;

  function fullName(value) {
    const v = String(value ?? '').trim();
    if (v === '') return 'Full name is required.';
    if (!NAME_PATTERN.test(v)) return 'Name can contain letters, spaces, hyphens and apostrophes.';
    if (v.length < 2) return 'Full name must be at least 2 characters.';
    return null;
  }

  function email(value) {
    if (!value || String(value).trim() === '') return 'Email address is required.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(String(value).trim())) return 'Please enter a valid email address.';
    return null;
  }

  function password(value) {
    if (!value || value.length === 0) return 'Password is required.';
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/\d/.test(value)) return 'Password must include at least one number.';
    if (!/[!@#$%^&*]/.test(value)) return 'Password must include at least one special character (!@#$%^&*).';
    return null;
  }

  /**
   * Returns { label, level } where level is 0–3 (none, weak, medium, strong)
   */
  function passwordStrength(value) {
    if (!value || value.length === 0) return { label: '', level: 0 };
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[!@#$%^&*]/.test(value)) score++;
    if (score <= 2) return { label: 'Weak', level: 1 };
    if (score <= 3) return { label: 'Medium', level: 2 };
    return { label: 'Strong', level: 3 };
  }

  function passwordMatch(p1, p2) {
    if (!p2 || p2.length === 0) return 'Please confirm your password.';
    if (p1 !== p2) return 'Passwords do not match.';
    return null;
  }

  function minLength(value, n, label) {
    if (!value || String(value).trim().length < n) return `${label} must be at least ${n} characters.`;
    return null;
  }

  function positiveNumber(value, label) {
    const num = parseFloat(value);
    if (isNaN(num)) return `${label} must be a valid number.`;
    if (num <= 0) return `${label} must be greater than 0.`;
    return null;
  }

  function futureDate(value, label) {
    if (!value) return `${label} is required.`;
    const date = new Date(value);
    const today = new Date(); today.setHours(0,0,0,0);
    if (date <= today) return `${label} must be a future date.`;
    return null;
  }

  function selected(value, label) {
    if (!value || value === '' || value === 'none') return `Please select a ${label}.`;
    return null;
  }

  function phone(value) {
    if (!value || value.trim() === '') return null; // optional
    const re = /^[\+]?[\d\s\-\(\)]{7,15}$/;
    if (!re.test(value.trim())) return 'Please enter a valid phone number.';
    return null;
  }

  // ─── Phone Country Validation Rules ───────────────────────────────────────
  /**
   * Country-specific phone validation rules.
   * Each entry maps a dial code to { length, pattern, name, flag, placeholder }.
   */
  const phoneCountryRules = {
    '+91': {
      length: 10,
      pattern: /^[6-9]\d{9}$/,
      name: 'India',
      flag: '🇮🇳',
      placeholder: 'e.g. 9876543210'
    },
    '+1': {
      length: 10,
      pattern: /^\d{10}$/,
      name: 'USA',
      flag: '🇺🇸',
      placeholder: 'e.g. 2025551234'
    },
    '+44': {
      length: 10,
      pattern: /^[1-9]\d{9}$/,
      name: 'UK',
      flag: '🇬🇧',
      placeholder: 'e.g. 7911123456'
    },
    '+61': {
      length: 9,
      pattern: /^[2-9]\d{8}$/,
      name: 'Australia',
      flag: '🇦🇺',
      placeholder: 'e.g. 412345678'
    },
    '+49': {
      length: 11,
      pattern: /^\d{10,11}$/,
      name: 'Germany',
      flag: '🇩🇪',
      placeholder: 'e.g. 15123456789'
    }
  };

  /**
   * Returns the validation rule object for a given country code.
   * Falls back to a generic rule if the code is not mapped.
   * @param {string} countryCode – e.g. '+91'
   * @returns {{ length: number, pattern: RegExp, name: string, flag: string, placeholder: string }}
   */
  function getPhoneValidationRule(countryCode) {
    return phoneCountryRules[countryCode] || {
      length: 15,
      pattern: /^\d{7,15}$/,
      name: 'Other',
      flag: '🌐',
      placeholder: 'Enter phone number'
    };
  }

  /**
   * Validates a phone number against the selected country's rules.
   * @param {string} value       – raw phone digits
   * @param {string} countryCode – e.g. '+91'
   * @returns {string|null} error message or null if valid
   */
  function validatePhoneNumber(value, countryCode) {
    if (!value || value.trim() === '') return null; // phone is optional

    const digits = value.replace(/\D/g, '');
    const rule = getPhoneValidationRule(countryCode);

    if (digits.length !== rule.length) {
      return `Phone number must be exactly ${rule.length} digits for ${rule.name} (${countryCode}).`;
    }
    if (!rule.pattern.test(digits)) {
      return `Invalid phone number for ${rule.name} (${countryCode}).`;
    }
    return null;
  }

  /**
   * Returns the list of supported countries for dropdown rendering.
   * @returns {Array<{ code: string, name: string, flag: string }>}
   */
  function getPhoneCountries() {
    return Object.keys(phoneCountryRules).map(code => ({
      code,
      name: phoneCountryRules[code].name,
      flag: phoneCountryRules[code].flag
    }));
  }

  // ─── Validate a set of rules ──────────────────────────────────────────────
  /**
   * rules: [ { fieldId, value, checks: [ fn ] } ]
   * returns { valid: bool, errors: {fieldId: msg} }
   *
   * Pure version of the original Validate.form(): it only computes the errors.
   * Showing them is done in React by useFieldErrors() + <FieldError />
   * (see hooks/useFieldErrors.js), instead of inserting DOM nodes by hand.
   */
  function form(rules) {
    let valid = true;
    const errors = {};
    rules.forEach(({ fieldId, value, checks }) => {
      for (const check of checks) {
        const err = check(value);
        if (err) {
          errors[fieldId] = err;
          valid = false;
          break; // one error per field
        }
      }
    });
    return { valid, errors };
  }

  // ─── Toast notification (shared UI feedback) ─────────────────────────────
  function toast(message, type = 'success', duration = 3500) {
    const existing = document.getElementById('lannent-toast');
    if (existing) existing.remove();

    const colors = {
      success: { bg: '#10b981', icon: '✓' },
      error:   { bg: '#ef4444', icon: '✕' },
      warning: { bg: '#f59e0b', icon: '!' },
      info:    { bg: '#6366f1', icon: 'ℹ' },
    };
    const c = colors[type] || colors.success;

    const el = document.createElement('div');
    el.id = 'lannent-toast';
    el.style.cssText = `
      position:fixed;bottom:28px;right:28px;z-index:99999;
      display:flex;align-items:center;gap:12px;
      background:${c.bg};color:#fff;
      padding:14px 20px;border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,0.18);
      font-size:14px;font-weight:500;font-family:inherit;
      animation:toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      max-width:380px;
    `;
    el.innerHTML = `
      <span style="width:22px;height:22px;background:rgba(255,255,255,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${c.icon}</span>
      <span style="flex:1;" data-msg></span>
    `;
    // Text, never markup: messages carry names, titles and server errors.
    el.querySelector('[data-msg]').textContent = String(message ?? '');

    if (!document.getElementById('toast-keyframes')) {
      const style = document.createElement('style');
      style.id = 'toast-keyframes';
      style.textContent = `@keyframes toastIn{from{opacity:0;transform:translateY(16px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}`;
      document.head.appendChild(style);
    }

    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); } }, duration);
  }

  // ─── Confirm Dialog ───────────────────────────────────────────────────────
  function confirm(message, onConfirm, onCancel) {
    const existing = document.getElementById('lannent-confirm');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lannent-confirm';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:var(--card,#fff);border-radius:20px;padding:28px;max-width:400px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.18);">
        <div style="width:48px;height:48px;background:#fff7ed;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <svg width="24" height="24" fill="none" stroke="#f97316" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <p style="font-size:15px;font-weight:600;margin-bottom:8px;">Confirm Action</p>
        <p style="font-size:14px;color:var(--muted-foreground,#64748b);margin-bottom:24px;line-height:1.5;" data-msg></p>
        <div style="display:flex;gap:10px;">
          <button id="confirmCancel" style="flex:1;padding:10px;border-radius:12px;border:1px solid var(--border,#e2e8f0);background:var(--background,#fff);font-size:14px;font-weight:500;cursor:pointer;">Cancel</button>
          <button id="confirmOk" style="flex:1;padding:10px;border-radius:12px;border:none;background:#ef4444;color:#fff;font-size:14px;font-weight:500;cursor:pointer;">Confirm</button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-msg]').textContent = String(message ?? '');
    document.body.appendChild(overlay);

    document.getElementById('confirmOk').addEventListener('click', () => { overlay.remove(); if (onConfirm) onConfirm(); });
    document.getElementById('confirmCancel').addEventListener('click', () => { overlay.remove(); if (onCancel) onCancel(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); } });
  }

  return { required, fullName, email, password, passwordStrength, passwordMatch, minLength, positiveNumber, futureDate, selected, phone, phoneCountryRules, getPhoneValidationRule, validatePhoneNumber, getPhoneCountries, form, toast, confirm };
})();


const ValidationContext = createContext(Validate);

/** Makes the validators, toast() and confirm() available to every component below it. */
export function ValidationProvider({ children }) {
  return <ValidationContext.Provider value={Validate}>{children}</ValidationContext.Provider>;
}

/** The validation helpers (same API as the original global `Validate`). */
export function useValidation() {
  return useContext(ValidationContext);
}
