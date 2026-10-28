/**
 * POSTs to the API without the session headers — for the routes used by
 * someone who is not signed in (forgot / reset password). Resolves to the
 * response's `data`, or throws an Error carrying the server's message.
 */
import { LANNENT_API } from '../context/StoreContext';

export async function postPublic(path, body) {
  let res;
  try {
    res = await fetch(`${LANNENT_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('The server could not be reached. Please try again.');
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* no body */ }
  if (res.status === 429) throw new Error('Too many attempts. Wait a minute and try again.');
  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Something went wrong (${res.status}).`);
  }
  return json && json.data !== undefined ? json.data : json;
}
