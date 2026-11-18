// The menu down the left side. Each item is a coloured block with its label
// in the bottom-right corner and a number code on the left.
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';

const ITEMS = [
  {
    to: '/notes',
    label: 'Notes',
    code: '01',
    color: 'sky',
    // "Notes" stays highlighted while reading or editing a note
    isActive: (path) => path === '/notes' || /^\/notes\/\d+/.test(path),
  },
  { to: '/notes/new', label: 'New note', code: '02', color: 'peach', isActive: (p) => p === '/notes/new' },
  { to: '/status', label: 'Status', code: '03', color: 'violet', isActive: (p) => p === '/status' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <nav className="sidebar" aria-label="Main menu">
      <ul className="nav">
        {ITEMS.map((item) => {
          const active = item.isActive(pathname);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav__item c-${item.color}${active ? ' is-active' : ''}${user ? '' : ' is-locked'}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="nav__code" aria-hidden="true">
                  {user ? item.code : 'LCK'}
                </span>
                <span className="nav__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="sidebar__fill c-lilac" aria-hidden="true">
        <span>04-{user ? 'ONLINE' : 'STANDBY'}</span>
      </div>
      <div className="sidebar__block c-apricot" aria-hidden="true" />
    </nav>
  );
}
