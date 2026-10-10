/**
 * LANNENT — React entry point
 * Loads the global stylesheet (copied unchanged from front-end/css/styles.css)
 * and mounts <App />.
 *
 * StrictMode is intentionally not used: the Store fills its cache with
 * blocking requests (as the original store.js did), and StrictMode's double
 * rendering would fire every one of them twice.
 */
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/styles.css';

createRoot(document.getElementById('root')).render(<App />);
