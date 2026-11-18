import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';

export default function NotFound() {
  return (
    <>
      <ScreenHeader code="ERR-404 // Unknown location" title="Page not found" />
      <p className="empty__text">There is nothing at this address.</p>
      <Pill to="/notes" color="amber">
        Go to notes
      </Pill>
    </>
  );
}
