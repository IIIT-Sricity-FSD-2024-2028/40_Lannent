import { useEffect } from 'react';

/**
 * Sets the browser tab title — the React version of each page's <title> tag.
 * @param {string} title - e.g. 'Client Dashboard — Lannent'
 */
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
