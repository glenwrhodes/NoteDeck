// Small status components: a loading indicator, an error message, and a
// confirmation notice.

export function Loading({ label = 'Working' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__blocks" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {label}
    </div>
  );
}

export function Alert({ children, title = 'Warning' }) {
  if (!children) return null;
  return (
    <div className="alert" role="alert">
      <div>
        <div className="alert__title">{title}</div>
        <div className="alert__text">{children}</div>
      </div>
    </div>
  );
}

export function Notice({ children }) {
  if (!children) return null;
  return (
    <div className="notice" role="status">
      {children}
    </div>
  );
}
