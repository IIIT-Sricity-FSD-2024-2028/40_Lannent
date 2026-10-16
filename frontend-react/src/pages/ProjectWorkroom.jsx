/**
 * LANNENT — ProjectWorkroom (client side)
 * Converted from front-end/pages/project-workroom.html.
 *
 * The client's workroom for one project (?id=<taskId>). The page itself is
 * the shared <Workroom> component in its "client" variant: it lists the
 * milestones submitted for review and offers "Review Deliverable".
 */
import PageStyle from '../components/PageStyle';
import Workroom from '../components/Workroom';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ProjectWorkroom.css?raw';

export default function ProjectWorkroom() {
  usePageTitle('Project Workroom — Lannent');
  return (
    <>
      <PageStyle css={pageCss} />
      <Workroom variant="client" />
    </>
  );
}
