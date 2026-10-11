/**
 * LANNENT — SuperuserExpertApplications
 * Converted from front-end/pages/superuser-expert-applications.html.
 *
 * The super user's view of the Expert Reviewer application queue — the
 * shared <ExpertApplicationsReview> component, without the documents rows.
 */
import ExpertApplicationsReview from '../components/ExpertApplicationsReview';
import PageStyle from '../components/PageStyle';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserExpertApplications.css?raw';

export default function SuperuserExpertApplications() {
  usePageTitle('Expert Applications — Lannent Admin');
  return (
    <>
      <PageStyle css={pageCss} />
      <ExpertApplicationsReview role="superuser" activePath="/superuser-expert-applications" showDocuments={false} />
    </>
  );
}
