// The console frame around every page: three elbows, the top bar with the
// user menu, the sidebar menu, and the footer. The current page is rendered
// where <Outlet /> is.
//
// The frame is pinned to the browser window; only the page area inside it
// scrolls (see .frame and .content__scroll in styles.css).
import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import Bar from './Bar.jsx';
import Sidebar from './Sidebar.jsx';
import UserMenu from './UserMenu.jsx';

// Each bar starts with the colour of the elbow it grows out of, so the elbow
// and the bar read as one continuous shape.
const TOP_BAR = [
  { color: 'amber', grow: 3 },
  { color: 'peach', width: 96 },
  { color: 'red', width: 30 },
  { color: 'lilac', grow: 1, cap: true },
];

const CONTENT_BAR = [
  { color: 'lilac', grow: 2 },
  { text: 'Records console', color: 'peach' },
  { color: 'sky', width: 60 },
  { color: 'amber', grow: 1 },
  { color: 'violet', width: 120, cap: true },
];

const FOOT_BAR = [
  { color: 'violet', grow: 4 },
  { color: 'peach', width: 160 },
  { color: 'amber', grow: 1, cap: true },
];

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="frame">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="elbow elbow--top c-amber" aria-hidden="true">
        <span className="elbow__label">ND 01-08</span>
      </div>
      <header className="topbar">
        <div className="topbar__row">
          <Link to="/" className="brand">
            <span className="brand__name">NoteDeck</span>
            <span className="brand__tag">Personal records console</span>
          </Link>
          <UserMenu />
        </div>
        <Bar segments={TOP_BAR} />
      </header>

      <div className="elbow elbow--mid c-lilac" aria-hidden="true">
        <span className="elbow__label">02-NAV</span>
      </div>
      <Sidebar />

      <main id="main" className="content" tabIndex={-1}>
        <Bar segments={CONTENT_BAR} />
        <div className="content__body">
          <Outlet />
        </div>
      </main>

      <div className="elbow elbow--foot c-violet" aria-hidden="true" />
      <footer className="footbar">
        <p className="footbar__text">
          <span>NoteDeck v1.0</span>
          <span>{user ? 'Session active' : 'No active session'}</span>
          <span>Web &rarr; API &rarr; DB</span>
        </p>
        <Bar segments={FOOT_BAR} />
      </footer>
    </div>
  );
}
