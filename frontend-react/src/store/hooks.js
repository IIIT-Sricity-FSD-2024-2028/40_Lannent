/**
 * Small hooks over the Redux store that many pages share.
 *
 *   const user = useCurrentUser();                 // the session (userId, role, name …)
 *   const { userById, taskById, milestonesByTask } = useLookups();
 *
 * The lookups are memoized functions over the store's entity maps, so pages
 * can call them inside loops and render functions.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from './slices/authSlice';
import { selectUserEntities } from './slices/usersSlice';
import { selectTaskEntities } from './slices/tasksSlice';
import { milestonesOf, selectMilestoneEntities, selectMilestonesGroupedByTask } from './slices/milestonesSlice';

export function useCurrentUser() {
  return useSelector(selectCurrentUser);
}

export function useLookups() {
  const users = useSelector(selectUserEntities);
  const tasks = useSelector(selectTaskEntities);
  const milestones = useSelector(selectMilestoneEntities);
  const grouped = useSelector(selectMilestonesGroupedByTask);
  return useMemo(() => ({
    userById: id => (id && users[id]) || null,
    taskById: id => (id && tasks[id]) || null,
    milestoneById: id => (id && milestones[id]) || null,
    milestonesByTask: taskId => milestonesOf(grouped, taskId),
  }), [users, tasks, milestones, grouped]);
}
