/**
 * LANNENT — useScrollReveal  (src/hooks/useScrollReveal.js)
 *
 * IntersectionObserver hook that mirrors the vanilla initScrollReveal() in main.js.
 * Adds `.visible` to any element with the `.reveal` class when it enters the viewport.
 *
 * Usage — attach to the container that holds the .reveal elements:
 *
 *   import { useScrollReveal } from '../hooks/useScrollReveal';
 *
 *   export default function MyPage() {
 *     const containerRef = useScrollReveal();
 *     return <div ref={containerRef}> ... </div>;
 *   }
 *
 * The matching CSS (already in styles.css) is:
 *   .reveal          { opacity: 0; transform: translateY(24px); transition: ... }
 *   .reveal.visible  { opacity: 1; transform: translateY(0); }
 */

import { useEffect, useRef } from 'react';

/**
 * @param {IntersectionObserverInit} [options]
 * @returns {React.RefObject<HTMLElement>}
 */
export function useScrollReveal(options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll('.reveal');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // fire once only
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
        ...options,
      }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}
