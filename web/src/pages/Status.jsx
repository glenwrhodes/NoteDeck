// System status: shows the three containers working together.
// The browser loaded this page from "web", which forwarded /api/status to
// "api", which asked "db". Every number here made that round trip.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { stamp, duration } from '../lib/format.js';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Pill from '../components/Pill.jsx';
import { Alert, Loading } from '../components/Feedback.jsx';

function Card({ color, code, title, rows }) {
  return (
    <section className={`card c-${color}`}>
      <h2 className="card__head">
        <span>{title}</span>
        <span className="card__code">{code}</span>
      </h2>
      <dl className="card__body">
        {rows.map(([label, value]) => (
          <div key={label} className="card__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const Online = () => <span className="online">Online</span>;

export default function Status() {
  const [status, setStatus] = useState(null);
  const [roundTrip, setRoundTrip] = useState(null);
  const [error, setError] = useState('');

  const scan = useCallback(async () => {
    setError('');
    const t0 = performance.now();
    try {
      const data = await api.status();
      setRoundTrip(Math.round(performance.now() - t0));
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  return (
    <>
      <ScreenHeader code="ND-03 // Diagnostics" title="System status">
        <Pill color="violet" onClick={scan}>
          Rescan
        </Pill>
      </ScreenHeader>

      <ol className="chain" aria-label="Request path">
        <li className="chain__node c-ice">Browser</li>
        <li className="chain__link">:{window.location.port || 80}</li>
        <li className="chain__node c-sky">web</li>
        <li className="chain__link">:3000</li>
        <li className="chain__node c-amber">api</li>
        <li className="chain__link">:5432</li>
        <li className="chain__node c-lilac">db</li>
      </ol>

      <Alert title="Scan failed">{error}</Alert>
      {!status && !error && <Loading label="Scanning systems" />}

      {status && (
        <div className="cards">
          <Card
            color="sky"
            code="SVC-1"
            title="web"
            rows={[
              ['State', <Online key="o" />],
              ['Server', 'nginx'],
              ['Serves', 'React build (static files)'],
              ['Forwards', '/api/* → api:3000'],
            ]}
          />
          <Card
            color="amber"
            code="SVC-2"
            title="api"
            rows={[
              ['State', <Online key="o" />],
              ['Container', status.api.hostname],
              ['Runtime', `Node ${status.api.node}`],
              ['Uptime', duration(status.api.uptimeSeconds)],
              ['Round trip', `${roundTrip} ms`],
            ]}
          />
          <Card
            color="lilac"
            code="SVC-3"
            title="db"
            rows={[
              ['State', <Online key="o" />],
              ['Host', `${status.db.host}:5432`],
              ['Engine', `PostgreSQL ${status.db.version}`],
              ['Query time', `${status.db.latencyMs} ms`],
            ]}
          />
          <Card
            color="peach"
            code="USR-1"
            title="Operator"
            rows={[
              ['Username', status.user.username],
              ['Joined', stamp(status.user.joined)],
              ['Notes', status.user.noteCount],
            ]}
          />
        </div>
      )}
    </>
  );
}
