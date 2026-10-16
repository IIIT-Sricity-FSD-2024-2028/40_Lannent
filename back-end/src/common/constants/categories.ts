/**
 * The project categories. A task has exactly one; an Expert Reviewer covers
 * any number, and is only ever offered to clients whose project category is
 * one of theirs. Kept in one place so the post form, reviewer settings and
 * matching can never disagree.
 */
export const CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Backend / API',
  'UI/UX Design',
  'AI / Machine Learning',
  'DevOps / Cloud',
  'Security',
] as const;
