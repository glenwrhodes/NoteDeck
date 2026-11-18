// The rounded "pill" button used everywhere. Renders a router <Link> when it
// has a `to` prop, otherwise a <button>. Extra props (onClick, type, disabled...)
// are passed straight through.
import { Link } from 'react-router';

export default function Pill({ to, color = 'amber', size, className = '', children, ...rest }) {
  const classes = ['pill', `c-${color}`, size && `pill--${size}`, className].filter(Boolean).join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
