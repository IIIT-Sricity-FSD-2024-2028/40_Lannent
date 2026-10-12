/**
 * LANNENT — React entry point
 * Loads the global stylesheet (copied unchanged from front-end/css/styles.css)
 * and mounts <App /> inside the context providers:
 *   StoreProvider       → useStore()       (the data store)
 *   AuthProvider        → useAuth()        (session, login, logout, role guards)
 *   ValidationProvider  → useValidation()  (validators, toast, confirm)
 *
 * StrictMode is intentionally not used: the Store fills its cache with
 * blocking requests (as the original store.js did), and StrictMode's double
 * rendering would fire every one of them twice.
 */
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { ValidationProvider } from './context/ValidationContext';
import './styles/styles.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <AuthProvider>
      <ValidationProvider>
        <App />
      </ValidationProvider>
    </AuthProvider>
  </StoreProvider>,
);
