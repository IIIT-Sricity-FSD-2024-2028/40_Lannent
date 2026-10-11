import { useEffect } from 'react';

/**
 * Landing-page behaviours ported from front-end/js/main.js:
 *  - initSmoothScroll(): anchor links (href="#...") scroll smoothly, offset by the navbar
 *  - initNavbarScroll(): the floating navbar (#homeNav) gets a deeper shadow once scrolled
 *  - initStepsConnector(): shows the "How it works" connector line on wide screens
 */
export default function useSmoothScroll() {
  useEffect(() => {
    // Smooth scroll for anchor links
    const links = Array.from(document.querySelectorAll('a[href^="#"]'));
    const onLinkClick = (e) => {
      const link = e.currentTarget;
      let target = null;
      try { target = document.querySelector(link.getAttribute('href')); } catch (err) { target = null; }
      if (target) {
        e.preventDefault();
        const navHeight = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    };
    links.forEach(link => link.addEventListener('click', onLinkClick));

    // Navbar scroll shadow
    const nav = document.getElementById('homeNav');
    const onScroll = () => {
      const inner = nav && nav.querySelector('.home-nav-inner');
      if (!inner) return;
      inner.style.boxShadow = window.scrollY > 10
        ? '0 10px 40px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.5)'
        : '0 10px 40px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)';
    };
    if (nav) window.addEventListener('scroll', onScroll);

    // Steps connector (How It Works section)
    const connector = document.getElementById('stepsConnector');
    if (connector && window.innerWidth >= 768) connector.style.display = 'block';

    return () => {
      links.forEach(link => link.removeEventListener('click', onLinkClick));
      if (nav) window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
