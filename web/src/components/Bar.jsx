// A horizontal bar made of coloured segments, with an optional rounded end cap
// and optional text segments that sit in the gaps. Purely decorative.
//
// <Bar segments={[{ color: 'amber', grow: 2 }, { text: 'Label', color: 'peach' },
//                 { color: 'sky', width: 60, cap: true }]} />
export default function Bar({ segments }) {
  return (
    <div className="bar" aria-hidden="true">
      {segments.map((seg, i) =>
        seg.text ? (
          <span key={i} className={`bar__text c-${seg.color}`}>
            {seg.text}
          </span>
        ) : (
          <span
            key={i}
            className={`bar__seg c-${seg.color}${seg.cap ? ' bar__seg--cap' : ''}`}
            style={seg.grow ? { flexGrow: seg.grow } : { width: seg.width }}
          />
        ),
      )}
    </div>
  );
}
