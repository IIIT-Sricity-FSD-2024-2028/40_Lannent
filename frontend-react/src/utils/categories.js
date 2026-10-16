/**
 * The project categories — the same list the server validates against
 * (back-end/src/common/constants/categories.ts). A task has one; an Expert
 * Reviewer covers several and is only offered on projects in those.
 */
export const CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Backend / API',
  'UI/UX Design',
  'AI / Machine Learning',
  'DevOps / Cloud',
  'Security',
];

/** Icon and a short hint for each category, for pickers. */
export const CATEGORY_INFO = {
  'Web Development': { icon: 'monitor', sub: 'Websites and web apps' },
  'Mobile Development': { icon: 'smartphone', sub: 'iOS, Android, React Native' },
  'Backend / API': { icon: 'server', sub: 'APIs, services, databases' },
  'UI/UX Design': { icon: 'pen-tool', sub: 'Interfaces and design systems' },
  'AI / Machine Learning': { icon: 'cpu', sub: 'Models and data pipelines' },
  'DevOps / Cloud': { icon: 'cloud', sub: 'CI/CD, infrastructure, cloud' },
  Security: { icon: 'shield', sub: 'Audits, OWASP, hardening' },
};
