/**
 * LANNENT — React entry point
 * Loads the global stylesheet and mounts <App /> inside:
 *   <Provider store>    → the Redux store (all app data and the session; see src/store)
 *   ValidationProvider  → useValidation()  (validators, toast, confirm — UI helpers, not data)
 *
 * StrictMode stays off as before: every navigation re-reads the API, and
 * StrictMode's double effects would fire every one of those requests twice.
 */
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.jsx';
import { store } from './store';
import { installFileLinkInterceptor } from './store/api';
import { ValidationProvider } from './context/ValidationContext';
import './styles/styles.css';

// File links (<a href="/api/files/...">) need credentials; download them through fetch.
installFileLinkInterceptor();

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <ValidationProvider>
      <App />
    </ValidationProvider>
  </Provider>,
);
