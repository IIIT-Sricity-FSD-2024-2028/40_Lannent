import { useState, useCallback } from 'react';
import { useValidation } from '../context/ValidationContext';

// The red border + glow that Validate.showError() used to put on an invalid field.
const ERROR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' };

/**
 * Form error state — the React replacement for Validate.showError(),
 * Validate.clearError(), Validate.clearAllErrors() and Validate.form().
 *
 * The original helpers inserted a <p> after the input by hand. Here each
 * field's message lives in state and is rendered with <FieldError />, at the
 * same spot, with the same markup.
 *
 * Usage:
 *   const { errors, showError, clearError, validateForm, errorStyle } = useFieldErrors();
 *   <input id="loginEmail" style={errorStyle('loginEmail')} onChange={() => clearError('loginEmail')} />
 *   <FieldError id="loginEmail" message={errors.loginEmail} />
 */
export default function useFieldErrors() {
  const Validate = useValidation();
  const [errors, setErrors] = useState({});

  const showError = useCallback((fieldId, message) => {
    setErrors(prev => ({ ...prev, [fieldId]: message }));
  }, []);

  const clearError = useCallback((fieldId) => {
    setErrors(prev => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  /**
   * Clears every error. Like the original Validate.clearAllErrors(), it also
   * resets the inline border-color / box-shadow of every element with an id
   * (in `formId`, or the whole page) — e.g. a toast still on screen loses
   * its shadow, exactly as before.
   */
  const clearAllErrors = useCallback((formId) => {
    setErrors({});
    const scope = formId ? document.getElementById(formId) : document;
    if (!scope) return;
    scope.querySelectorAll('[id]').forEach(el => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    });
  }, []);

  /** Same contract as Validate.form(rules): returns { valid, errors } and shows them. */
  const validateForm = useCallback((rules) => {
    const result = Validate.form(rules);
    setErrors(prev => {
      const next = { ...prev };
      rules.forEach(r => { delete next[r.fieldId]; });
      return { ...next, ...result.errors };
    });
    return result;
  }, []);

  /** Inline style for a field: its own style plus the error border when invalid. */
  const errorStyle = useCallback((fieldId, baseStyle) => {
    return errors[fieldId] ? { ...(baseStyle || {}), ...ERROR_STYLE } : baseStyle;
  }, [errors]);

  return { errors, showError, clearError, clearAllErrors, validateForm, errorStyle };
}
