import { useEffect } from 'react';

/**
 * Scroll reveal — ported from initScrollReveal() in front-end/js/main.js.
 * Adds the "visible" class to every ".reveal" element once it scrolls into view.
 */
export default function useScrollReveal() {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
