import { useState } from 'react'
import TripForm from './components/TripForm'
import MapView from './components/MapView'
import ELDLogSheet from './components/ELDLogSheet'
import TripSummary from './components/TripSummary'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    setTripData(null)

    try {
      const res = await fetch(`${API_URL}/api/trip/plan/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Server error')
      setTripData(json)
      // Scroll to results
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="header-icon">🚛</span>
            <div>
              <h1>ELD Trip Planner</h1>
              <p>FMCSA-Compliant Hours of Service Route Planning</p>
            </div>
          </div>
          <div className="header-badge">
            <span>70 HR / 8-DAY</span>
            <span>Property Carrier</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* ── Input Form ──────────────────────────────────── */}
        <TripForm onSubmit={handleSubmit} loading={loading} />

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────── */}
        {loading && (
          <div className="loading-box">
            <div className="spinner" />
            <p>Calculating route &amp; generating HOS-compliant schedule…</p>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────── */}
        {tripData && (
          <div id="results" className="results-section">
            <TripSummary
              summary={tripData.trip_summary}
              route={tripData.route}
              stops={tripData.stops}
            />

            <div className="map-and-stops">
              <MapView
                locations={tripData.locations}
                geometry={tripData.route.geometry}
                stops={tripData.stops}
              />
              <StopsList stops={tripData.stops} />
            </div>

            <div className="eld-section">
              <div className="eld-header">
                <h2>📋 ELD Daily Log Sheets</h2>
                <p>
                  Generated per FMCSA §395.8 — {tripData.daily_logs.length} day
                  {tripData.daily_logs.length !== 1 ? 's' : ''} of logs
                </p>
              </div>
              {tripData.daily_logs.map((log) => (
                <ELDLogSheet
                  key={log.day_number}
                  logData={log}
                  locations={tripData.locations}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>For planning purposes only — always verify with your carrier's ELD system.</p>
      </footer>
    </div>
  )
}

function StopsList({ stops }) {
  if (!stops || stops.length === 0) return null
  const icon = {
    Pickup: '📦', Dropoff: '🏁', Fueling: '⛽',
    '30-minute rest break': '☕',
    'Required 10-hour rest': '🛏️',
    '14-hour window limit — 10-hour rest required': '🛏️',
    '34-hour cycle restart': '🔄',
  }
  return (
    <div className="stops-list">
      <h3>Trip Stops</h3>
      <div className="stops-scroll">
        {stops.map((s, i) => (
          <div key={i} className={`stop-card stop-${s.status?.toLowerCase().replace(/_/g, '-')}`}>
            <div className="stop-icon">{icon[s.type] || '📍'}</div>
            <div className="stop-info">
              <strong>{s.type}</strong>
              <span>{s.location?.split(',')[0]}</span>
              <span className="stop-dur">{s.duration_hours.toFixed(1)} hr</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
