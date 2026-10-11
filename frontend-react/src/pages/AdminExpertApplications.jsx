/**
 * LANNENT — AdminExpertApplications
 * Converted from front-end/pages/admin-expert-applications.html.
 *
 * The intake / compliance desks' Expert Reviewer application queue — the
 * shared <ExpertApplicationsReview> component, including the applicant's
 * documents in the details dialog.
 */
import ExpertApplicationsReview from '../components/ExpertApplicationsReview';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './AdminExpertApplications.css?raw';

export default function AdminExpertApplications() {
  const Auth = useAuth();
  usePageTitle('Expert Applications — Lannent Admin');
  return (
    <>
      <PageStyle css={pageCss} />
      <ExpertApplicationsReview role={(Auth.getCurrentUser() || {}).role} activePath="/admin-expert-applications" showDocuments />
    </>
  );
}
