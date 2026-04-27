export default function TripSummary({ summary, route }) {
  const completion = summary?.estimated_completion
    ? new Date(summary.estimated_completion).toLocaleString('en-US', {
        weekday: 'short',
        month:   'short',
        day:     'numeric',
        hour:    'numeric',
        minute:  '2-digit',
      })
    : '—'

  const cycleLeft = Math.max(0, 70 - (summary?.cycle_hours_used || 0))

  const cards = [
    { icon: '🗺️', label: 'Total Distance',    value: `${route?.total_miles?.toLocaleString() ?? '—'} mi` },
    { icon: '📅', label: 'Days on Road',       value: `${summary?.total_days ?? '—'}` },
    { icon: '⛽', label: 'Fuel Stops',         value: `${Math.max(0, Math.floor((route?.total_miles ?? 0) / 1000))}` },
    { icon: '⏱️', label: 'Cycle Hours Used',   value: `${summary?.cycle_hours_used ?? '—'} / 70` },
    { icon: '✅', label: 'Cycle Hours Left',   value: `${cycleLeft.toFixed(1)} hrs` },
    { icon: '🏁', label: 'Est. Completion',    value: completion },
  ]

  return (
    <div className="summary-section">
      <h2>Trip Summary</h2>
      <div className="summary-cards">
        {cards.map((c) => (
          <div key={c.label} className="summary-card">
            <span className="summary-icon">{c.icon}</span>
            <div className="summary-text">
              <span className="summary-value">{c.value}</span>
              <span className="summary-label">{c.label}</span>
            </div>
          </div>
        ))}
      </div>
      {summary?.cycle_hours_used > 60 && (
        <div className="cycle-warning">
          ⚠️ Driver has {cycleLeft.toFixed(1)} hours remaining in the 70-hr/8-day cycle.
          {cycleLeft < 5
            ? ' A 34-hour restart may be required before or during this trip.'
            : ''}
        </div>
      )}
    </div>
  )
}
