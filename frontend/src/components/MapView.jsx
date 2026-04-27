import { useEffect, useRef } from 'react'

// We load Leaflet dynamically to avoid SSR issues and fix default icon paths
let L = null

const ICON_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images'

const MARKER_COLORS = {
  current: '#2563eb',
  pickup:  '#16a34a',
  dropoff: '#dc2626',
  rest:    '#9333ea',
  fuel:    '#ea580c',
}

export default function MapView({ locations, geometry, stops }) {
  const mapRef     = useRef(null)
  const mapObjRef  = useRef(null)
  const layersRef  = useRef([])

  useEffect(() => {
    if (mapObjRef.current) return

    const initMap = async () => {
      // Dynamic import to avoid SSR
      const leaflet = await import('leaflet')
      await import('leaflet/dist/leaflet.css')
      L = leaflet.default

      // Fix default icons
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
        iconUrl:       `${ICON_BASE}/marker-icon.png`,
        shadowUrl:     `${ICON_BASE}/marker-shadow.png`,
      })

      if (!mapRef.current) return

      mapObjRef.current = L.map(mapRef.current, {
        center:          [39.5, -98.35],
        zoom:            4,
        zoomControl:     true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapObjRef.current)
    }

    initMap()
  }, [])

  useEffect(() => {
    if (!mapObjRef.current || !L) return
    if (!geometry || geometry.length === 0) return

    // Clear old layers
    layersRef.current.forEach((l) => l.remove())
    layersRef.current = []

    // Route polyline
    const poly = L.polyline(geometry, {
      color:     '#2563eb',
      weight:    5,
      opacity:   0.8,
      lineJoin:  'round',
    }).addTo(mapObjRef.current)
    layersRef.current.push(poly)

    // Helper to create colored circle markers
    const addMarker = (lat, lng, color, label, popup) => {
      const icon = L.divIcon({
        html: `<div style="
          background:${color};border:3px solid white;border-radius:50%;
          width:18px;height:18px;display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,.4);font-size:10px;color:white;font-weight:700
        ">${label}</div>`,
        className: '',
        iconSize:  [24, 24],
        iconAnchor:[12, 12],
      })
      const m = L.marker([lat, lng], { icon })
        .addTo(mapObjRef.current)
        .bindPopup(popup)
      layersRef.current.push(m)
    }

    // Main markers
    const { current, pickup, dropoff } = locations
    addMarker(current.lat, current.lng, MARKER_COLORS.current,
      'S', `<b>📍 Start</b><br>${current.name.split(',').slice(0, 2).join(',')}`)
    addMarker(pickup.lat,  pickup.lng,  MARKER_COLORS.pickup,
      'P', `<b>📦 Pickup</b><br>${pickup.name.split(',').slice(0, 2).join(',')}`)
    addMarker(dropoff.lat, dropoff.lng, MARKER_COLORS.dropoff,
      'D', `<b>🏁 Dropoff</b><br>${dropoff.name.split(',').slice(0, 2).join(',')}`)

    // Fit bounds
    mapObjRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] })

  }, [geometry, locations, stops])

  return (
    <div className="map-wrapper">
      <div className="map-title">
        <h3>Route Map</h3>
        <div className="map-legend">
          <span><span className="dot" style={{background: MARKER_COLORS.current}} /> Start</span>
          <span><span className="dot" style={{background: MARKER_COLORS.pickup}}  /> Pickup</span>
          <span><span className="dot" style={{background: MARKER_COLORS.dropoff}} /> Dropoff</span>
        </div>
      </div>
      <div ref={mapRef} className="leaflet-map" />
    </div>
  )
}
