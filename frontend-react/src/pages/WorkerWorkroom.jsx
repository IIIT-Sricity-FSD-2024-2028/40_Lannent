/**
 * LANNENT — WorkerWorkroom
 * Converted from front-end/pages/worker-workroom.html.
 *
 * The worker's workroom for one project (?id=<taskId>). The page itself is
 * the shared <Workroom> component in its "worker" variant: it lists the
 * milestones in progress and offers "Submit Deliverable".
 */
import PageStyle from '../components/PageStyle';
import Workroom from '../components/Workroom';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerWorkroom.css?raw';

export default function WorkerWorkroom() {
  usePageTitle('Worker Workroom — Lannent');
  return (
    <>
      <PageStyle css={pageCss} />
      <Workroom variant="worker" />
    </>
  );
}
