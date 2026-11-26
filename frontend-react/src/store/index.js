/**
 * LANNENT — Redux store.
 *
 * One slice per resource; each slice file defines its own async CRUD thunks
 * (which call the API) and its selectors. Components read with useSelector
 * and act with useDispatch:
 *
 *   const tasks = useSelector(s => selectTasksByClient(s, user.userId));
 *   await dispatch(createTask(data)).unwrap();   // throws the server's message on refusal
 *
 * The router dispatches loadAppData() on every navigation (see App.jsx).
 */
import { configureStore } from '@reduxjs/toolkit';
import app from './slices/appSlice';
import auth from './slices/authSlice';
import users from './slices/usersSlice';
import tasks from './slices/tasksSlice';
import milestones from './slices/milestonesSlice';
import proposals from './slices/proposalsSlice';
import auditRequests from './slices/auditRequestsSlice';
import auditReports from './slices/auditReportsSlice';
import disputes from './slices/disputesSlice';
import transactions from './slices/transactionsSlice';
import expertApplications from './slices/expertApplicationsSlice';
import notifications from './slices/notificationsSlice';
import messages from './slices/messagesSlice';
import fees from './slices/feesSlice';
import revenue from './slices/revenueSlice';
import ledger from './slices/ledgerSlice';
import files from './slices/filesSlice';
import stats from './slices/statsSlice';
import auditLog from './slices/auditLogSlice';

export const store = configureStore({
  reducer: {
    app, auth, users, tasks, milestones, proposals, auditRequests, auditReports,
    disputes, transactions, expertApplications, notifications, messages,
    fees, revenue, ledger, files, stats, auditLog,
  },
});

export { loadAppData, refreshEntities } from './thunks/loadAppData';
