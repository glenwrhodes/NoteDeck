// The heading at the top of each page: a small code line, a big title,
// and optional action buttons (passed as children) on the right.
import { useEffect } from 'react';

export default function ScreenHeader({ code, title, children }) {
  // Keep the browser tab title in sync with the page.
  useEffect(() => {
    document.title = `${title} · NoteDeck`;
  }, [title]);

  return (
    <div className="screen-head">
      <div className="screen-head__text">
        <div className="screen-head__code">{code}</div>
        <h1 className="screen-head__title">{title}</h1>
      </div>
      {children && <div className="screen-head__actions">{children}</div>}
    </div>
  );
}
