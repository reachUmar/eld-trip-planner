import { useState } from 'react'

const EXAMPLES = [
  {
    label: 'Chicago → Dallas (long haul)',
    data: {
      current_location:  'Chicago, IL',
      pickup_location:   'Chicago, IL',
      dropoff_location:  'Dallas, TX',
      current_cycle_used: 20,
    },
  },
  {
    label: 'LA → Phoenix (short)',
    data: {
      current_location:  'Los Angeles, CA',
      pickup_location:   'Los Angeles, CA',
      dropoff_location:  'Phoenix, AZ',
      current_cycle_used: 0,
    },
  },
  {
    label: 'New York → Miami (multi-day)',
    data: {
      current_location:  'New York, NY',
      pickup_location:   'Philadelphia, PA',
      dropoff_location:  'Miami, FL',
      current_cycle_used: 10,
    },
  },
]

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location:   '',
    pickup_location:    '',
    dropoff_location:   '',
    current_cycle_used: '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const loadExample = (ex) => setForm(ex.data)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      current_cycle_used: parseFloat(form.current_cycle_used) || 0,
    })
  }

  return (
    <div className="form-card">
      <div className="form-card-header">
        <h2>Plan Your Trip</h2>
        <div className="example-pills">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="pill-btn"
              onClick={() => loadExample(ex)}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="current_location">
              <span className="label-icon">📍</span> Current Location
            </label>
            <input
              id="current_location"
              type="text"
              placeholder="e.g. Chicago, IL"
              value={form.current_location}
              onChange={set('current_location')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="pickup_location">
              <span className="label-icon">📦</span> Pickup Location
            </label>
            <input
              id="pickup_location"
              type="text"
              placeholder="e.g. Gary, IN"
              value={form.pickup_location}
              onChange={set('pickup_location')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dropoff_location">
              <span className="label-icon">🏁</span> Dropoff Location
            </label>
            <input
              id="dropoff_location"
              type="text"
              placeholder="e.g. Dallas, TX"
              value={form.dropoff_location}
              onChange={set('dropoff_location')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="current_cycle_used">
              <span className="label-icon">⏱️</span> Current Cycle Used (hrs)
              <span className="label-hint">0 – 70</span>
            </label>
            <input
              id="current_cycle_used"
              type="number"
              placeholder="e.g. 20"
              min="0"
              max="70"
              step="0.5"
              value={form.current_cycle_used}
              onChange={set('current_cycle_used')}
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="btn-spinner" /> Calculating…
            </>
          ) : (
            <>🗺️ Generate Route &amp; ELD Logs</>
          )}
        </button>
      </form>

      <div className="form-disclaimer">
        <strong>Assumptions:</strong> Property-carrying driver · 70 hr/8-day cycle · No adverse
        conditions · Fueling every 1,000 miles · 1 hr for pickup &amp; dropoff
      </div>
    </div>
  )
}
