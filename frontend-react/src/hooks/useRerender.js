import { useReducer } from 'react';

/**
 * Returns a function that re-renders the component.
 *
 * Pages read their data straight from the Store cache while rendering (as the
 * original pages did). After a Store mutation the cache has changed but React
 * does not know, so the page calls rerender() — this replaces the old
 * "rebuild innerHTML" render() functions.
 */
export default function useRerender() {
  const [, rerender] = useReducer(n => n + 1, 0);
  return rerender;
}
