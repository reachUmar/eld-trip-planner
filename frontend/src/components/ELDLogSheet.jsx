import { useRef, useEffect, useCallback } from 'react'

const ROW = {
  OFF_DUTY:            0,
  SLEEPER_BERTH:       1,
  DRIVING:             2,
  ON_DUTY_NOT_DRIVING: 3,
}

const ROW_LABELS = [
  '1. Off Duty',
  '2. Sleeper\n   Berth',
  '3. Driving',
  '4. On Duty\n   (Not Driving)',
]

const STATUS_LABELS = {
  OFF_DUTY:            'Off Duty',
  SLEEPER_BERTH:       'Sleeper Berth',
  DRIVING:             'Driving',
  ON_DUTY_NOT_DRIVING: 'On Duty (Not Driving)',
}

const HOUR_LABELS = [
  'Mid-\nnight','1','2','3','4','5','6','7','8','9','10','11',
  'Noon','1','2','3','4','5','6','7','8','9','10','11','Mid-\nnight',
]

// canvas layout
const CW = 940   // canvas width
const CH = 530   // canvas height

const ML = 14    // margin left
const MR = 14    // margin right
const MT = 14    // margin top

// Header
const HDR_H    = 148

// Grid
const LBL_W    = 108   // row-label column width
const TOT_W    = 70    // totals column width
const GLFT     = ML + LBL_W                  // grid left x
const GRGT     = CW - MR - TOT_W             // grid right x
const GW       = GRGT - GLFT                 // grid width
const HLH      = 28                          // hour-label row height
const GTOP     = MT + HDR_H + HLH            // grid top y
const RH       = 48                          // row height
const GBTM     = GTOP + RH * 4              // grid bottom y

// Remarks
const RMK_TOP  = GBTM + 6
const RMK_H    = CH - RMK_TOP - 10

const tx = (h)  => GLFT + (h / 24) * GW          // hour → x
const ry = (r)  => GTOP + r * RH                  // row  → y (top of row)
const rcy = (r) => ry(r) + RH / 2                 // row  → y (centre)

function line(ctx, x1, y1, x2, y2, color = '#000', w = 1) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth   = w
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function rect(ctx, x, y, w, h, fill, stroke, lw = 1) {
  ctx.save()
  if (fill)   { ctx.fillStyle = fill;   ctx.fillRect(x, y, w, h) }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h) }
  ctx.restore()
}

function text(ctx, str, x, y, opts = {}) {
  ctx.save()
  ctx.font         = opts.font         || '11px Arial'
  ctx.fillStyle    = opts.color        || '#000'
  ctx.textAlign    = opts.align        || 'left'
  ctx.textBaseline = opts.baseline     || 'top'
  // handle \n
  const lines = str.split('\n')
  const lh    = opts.lineHeight || 13
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh))
  ctx.restore()
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Main draw function                                             */
/* ═══════════════════════════════════════════════════════════════ */
function drawLog(ctx, logData, locations) {
  /* ── Background ─────────────────────────────────── */
  rect(ctx, 0, 0, CW, CH, '#fff')
  rect(ctx, ML, MT, CW - ML - MR, CH - MT - 6, null, '#000', 1.5)

  /* ── Header section ─────────────────────────────── */
  drawHeader(ctx, logData, locations)

  /* ── Hour labels row ────────────────────────────── */
  drawHourLabels(ctx)

  /* ── Grid ───────────────────────────────────────── */
  drawGrid(ctx)

  /* ── Row labels ─────────────────────────────────── */
  drawRowLabels(ctx)

  /* ── Duty status lines ──────────────────────────── */
  drawEvents(ctx, logData.events)

  /* ── Total hours column ─────────────────────────── */
  drawTotals(ctx, logData.totals)

  /* ── Remarks section ────────────────────────────── */
  drawRemarks(ctx, logData.remarks, logData.events)
}

/* ── Header ─────────────────────────────────────────────────── */
function drawHeader(ctx, logData, locations) {
  const y0 = MT
  const mid = CW / 2

  // Title
  text(ctx, 'Drivers Daily Log', ML + 2, y0 + 2, { font: 'bold 13px Arial' })
  text(ctx, '(24 hours)', ML + 2, y0 + 16, { font: '10px Arial', color: '#444' })

  // Right side — original/duplicate note
  text(ctx, 'Original – File at home terminal.', mid + 10, y0 + 2,
    { font: '9px Arial', color: '#333' })
  text(ctx, 'Duplicate – Driver retains in his/her possession for 8 days.',
    mid + 10, y0 + 13, { font: '9px Arial', color: '#333' })

  // ── Date row ──────────────────────────────────────
  const dateY = y0 + 30
  line(ctx, ML, dateY, CW - MR, dateY, '#999')

  // Month / Day / Year boxes
  const [month, day, year] = (logData.date || '').split('/')
  const parts = [
    { label: '(month)',  val: month || '',  x: ML + 2,   w: 50 },
    { label: '(day)',    val: day   || '',  x: ML + 56,  w: 50 },
    { label: '(year)',   val: year  || '',  x: ML + 110, w: 60 },
  ]
  text(ctx, 'Date:', ML + 2, dateY + 4, { font: '9px Arial', color: '#555' })
  parts.forEach((p) => {
    text(ctx, p.val,   p.x + 2, dateY + 5,  { font: 'bold 12px Arial' })
    text(ctx, p.label, p.x + 2, dateY + 20, { font: '8px Arial', color: '#777' })
    line(ctx, p.x + p.w, dateY, p.x + p.w, dateY + 30, '#ccc')
  })

  // From / To
  const fromX = ML + 180
  text(ctx, 'From:', fromX, dateY + 4, { font: '9px Arial', color: '#555' })
  text(ctx, locations?.current?.name?.split(',')[0] || '', fromX + 30, dateY + 5,
    { font: '10px Arial' })
  text(ctx, 'To:', fromX + 160, dateY + 4, { font: '9px Arial', color: '#555' })
  text(ctx, locations?.dropoff?.name?.split(',')[0] || '', fromX + 178, dateY + 5,
    { font: '10px Arial' })

  // ── Miles row ─────────────────────────────────────
  const milesY = dateY + 32
  line(ctx, ML, milesY, CW - MR, milesY, '#999')

  const mX = ML + 2
  rect(ctx, mX, milesY + 2, 110, 26, null, '#aaa')
  text(ctx, `${logData.total_miles || 0}`, mX + 55, milesY + 5,
    { font: 'bold 13px Arial', align: 'center' })
  text(ctx, 'Total Miles Driving Today', mX + 2, milesY + 20,
    { font: '8px Arial', color: '#555' })

  // Carrier
  const carrX = CW / 2
  text(ctx, 'Name of Carrier or Carriers:', carrX, milesY + 2,
    { font: '9px Arial', color: '#555' })
  text(ctx, 'Owner-Operator / Company Carrier', carrX + 2, milesY + 14,
    { font: '10px Arial' })

  // ── Vehicle / signature row ──────────────────────
  const vehY = milesY + 32
  line(ctx, ML, vehY, CW - MR, vehY, '#999')

  text(ctx, 'Truck/Tractor and Trailer Numbers:', ML + 2, vehY + 4,
    { font: '9px Arial', color: '#555' })
  text(ctx, 'Unit #1', ML + 2, vehY + 16, { font: '10px Arial' })

  text(ctx, 'Main Office Address:', CW / 2, vehY + 4,
    { font: '9px Arial', color: '#555' })
  text(ctx, locations?.current?.name?.split(',').slice(-2).join(',').trim() || '',
    CW / 2 + 2, vehY + 16, { font: '9px Arial' })

  // ── Signature row ─────────────────────────────────
  const sigY = vehY + 32
  line(ctx, ML, sigY, CW - MR, sigY, '#999')

  text(ctx, 'Driver\'s Signature: _________________________',
    ML + 2, sigY + 4, { font: '10px Arial' })
  text(ctx, 'I certify that these entries are true and correct.',
    ML + 2, sigY + 18, { font: '9px italic Arial', color: '#555' })

  text(ctx, 'Home Terminal Address:', CW / 2, sigY + 4,
    { font: '9px Arial', color: '#555' })
}

/* ── Hour labels ────────────────────────────────────────────── */
function drawHourLabels(ctx) {
  const y = MT + HDR_H + 2

  // Separator line above hour labels
  line(ctx, ML, y, CW - MR, y, '#999')

  HOUR_LABELS.forEach((lbl, i) => {
    const x = tx(i)
    const lines = lbl.split('\n')
    if (lines.length > 1) {
      text(ctx, lines[0], x, y + 2,  { font: '8px Arial', align: 'center', color: '#333' })
      text(ctx, lines[1], x, y + 12, { font: '8px Arial', align: 'center', color: '#333' })
    } else {
      text(ctx, lbl, x, y + 7, { font: '9px Arial', align: 'center', color: '#333' })
    }
  })
}

/* ── Grid ───────────────────────────────────────────────────── */
function drawGrid(ctx) {
  // Outer grid rect
  rect(ctx, GLFT, GTOP, GW, RH * 4, null, '#000', 1.2)

  // Horizontal row dividers
  for (let r = 1; r < 4; r++) {
    line(ctx, GLFT, GTOP + r * RH, GRGT, GTOP + r * RH, '#000', 0.8)
  }

  // Vertical hour lines
  for (let h = 0; h <= 24; h++) {
    const x   = tx(h)
    const isM = h === 0 || h === 12 || h === 24
    line(ctx, x, GTOP, x, GBTM, isM ? '#000' : '#ccc', isM ? 1.2 : 0.5)
  }

  // Quarter-hour tick marks at top and bottom of each row
  for (let h = 0; h <= 24; h++) {
    for (let q = 1; q < 4; q++) {
      const x = tx(h + q / 4)
      for (let r = 0; r < 4; r++) {
        const yTop = ry(r)
        const yBot = ry(r) + RH
        line(ctx, x, yTop,       x, yTop + 5,  '#aaa', 0.4)
        line(ctx, x, yBot - 5,   x, yBot,       '#aaa', 0.4)
      }
    }
  }

  // Left-border label area
  rect(ctx, ML, GTOP, LBL_W, RH * 4, '#f8f8f8', '#999', 0.5)

  // Right-border totals area label
  rect(ctx, GRGT, GTOP - HLH, TOT_W, HLH, '#eee', '#999', 0.5)
  text(ctx, 'Total', GRGT + TOT_W / 2, GTOP - HLH + 4,
    { font: 'bold 9px Arial', align: 'center', color: '#333' })
  text(ctx, 'Hours', GRGT + TOT_W / 2, GTOP - HLH + 15,
    { font: 'bold 9px Arial', align: 'center', color: '#333' })
}

/* ── Row labels ─────────────────────────────────────────────── */
function drawRowLabels(ctx) {
  ROW_LABELS.forEach((lbl, i) => {
    const y  = ry(i)
    const cy = y + RH / 2
    lbl.split('\n').forEach((line_, j) => {
      text(ctx, line_.trim(), ML + 4, cy - 8 + j * 12,
        { font: j === 0 ? 'bold 9.5px Arial' : '9px Arial', color: '#222' })
    })
  })
}

/* ── Events — the actual log lines ─────────────────────────── */
function drawEvents(ctx, events) {
  if (!events || events.length === 0) return

  ctx.save()

  // Build full 24-hour event list, filling gaps with OFF_DUTY
  const filled = fillGaps(events)

  // Draw horizontal lines + vertical connectors
  for (let i = 0; i < filled.length; i++) {
    const ev   = filled[i]
    const row  = ROW[ev.status] ?? 0
    const y    = rcy(row)
    const x1   = tx(ev.start_hour)
    const x2   = tx(ev.end_hour)

    // Horizontal status line
    ctx.beginPath()
    ctx.strokeStyle = '#000'
    ctx.lineWidth   = 2.5
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()

    // Vertical connector to next event
    if (i < filled.length - 1) {
      const nextRow = ROW[filled[i + 1].status] ?? 0
      if (nextRow !== row) {
        const nextY = rcy(nextRow)
        ctx.beginPath()
        ctx.lineWidth = 2.5
        ctx.moveTo(x2, y)
        ctx.lineTo(x2, nextY)
        ctx.stroke()
      }
    }
  }

  ctx.restore()
}

function fillGaps(events) {
  const sorted = [...events].sort((a, b) => a.start_hour - b.start_hour)
  const filled = []

  if (sorted[0]?.start_hour > 0.001) {
    filled.push({ status: 'OFF_DUTY', start_hour: 0, end_hour: sorted[0].start_hour })
  }

  sorted.forEach((ev, i) => {
    filled.push(ev)
    if (i < sorted.length - 1) {
      const gap = sorted[i + 1].start_hour - ev.end_hour
      if (gap > 0.01) {
        filled.push({ status: 'OFF_DUTY', start_hour: ev.end_hour, end_hour: sorted[i + 1].start_hour })
      }
    }
  })

  const last = filled[filled.length - 1]
  if (last && last.end_hour < 23.999) {
    filled.push({ status: 'OFF_DUTY', start_hour: last.end_hour, end_hour: 24 })
  }

  return filled
}

/* ── Totals column ──────────────────────────────────────────── */
function drawTotals(ctx, totals) {
  const keys = ['OFF_DUTY', 'SLEEPER_BERTH', 'DRIVING', 'ON_DUTY_NOT_DRIVING']
  keys.forEach((k, i) => {
    const y   = ry(i)
    const val = (totals?.[k] ?? 0).toFixed(2)
    rect(ctx, GRGT, y, TOT_W, RH, '#f9f9f9', '#aaa', 0.5)
    text(ctx, val, GRGT + TOT_W / 2, y + RH / 2 - 6,
      { font: 'bold 12px Arial', align: 'center', color: '#111' })
  })

  // Sum
  const sum = Object.values(totals ?? {}).reduce((a, b) => a + b, 0)
  rect(ctx, GRGT, GBTM, TOT_W, 20, '#eee', '#aaa', 0.5)
  text(ctx, `= ${sum.toFixed(2)}`, GRGT + TOT_W / 2, GBTM + 4,
    { font: 'bold 10px Arial', align: 'center', color: sum > 24.1 || sum < 23.9 ? '#c00' : '#000' })
}

/* ── Remarks section ────────────────────────────────────────── */
function drawRemarks(ctx, remarks, events) {
  line(ctx, ML, RMK_TOP, CW - MR, RMK_TOP, '#999')
  rect(ctx, ML, RMK_TOP, LBL_W, RMK_H, '#f8f8f8', '#aaa', 0.5)
  text(ctx, 'Remarks:', ML + 4, RMK_TOP + 4, { font: 'bold 9px Arial' })

  // Draw the remarks timeline at the same x-scale as the grid
  line(ctx, GLFT, RMK_TOP, GRGT, RMK_TOP, '#ccc')

  // Small tick marks at hour positions
  for (let h = 0; h <= 24; h += 2) {
    const x = tx(h)
    line(ctx, x, RMK_TOP, x, RMK_TOP + 4, '#bbb')
  }

  // Remark entries
  const seen = new Set()
  let lineIdx = 0
  ;(remarks || []).forEach((r) => {
    if (seen.has(r.location)) return
    seen.add(r.location)
    const x = tx(r.time)
    line(ctx, x, RMK_TOP, x, RMK_TOP + 8, '#555', 1)

    // Rotate text
    const label = r.location.split(',')[0]?.slice(0, 24) || ''
    const ly    = RMK_TOP + 14 + (lineIdx % 3) * 22
    ctx.save()
    ctx.translate(Math.min(x + 2, GRGT - 60), ly)
    ctx.rotate(-Math.PI / 6)
    text(ctx, `${hhmm(r.time)} ${label}`, 0, 0,
      { font: '8px Arial', color: '#222' })
    ctx.restore()
    lineIdx++
  })

  // Horizontal line at bottom of remarks
  line(ctx, ML, RMK_TOP + RMK_H, CW - MR, RMK_TOP + RMK_H, '#999')
}

function hhmm(decHour) {
  const h  = Math.floor(decHour)
  const m  = Math.round((decHour - h) * 60)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh  = ((h % 12) || 12)
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

/* ═══════════════════════════════════════════════════════════════ */
/*  React component                                               */
/* ═══════════════════════════════════════════════════════════════ */
export default function ELDLogSheet({ logData, locations }) {
  const canvasRef = useRef(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = CW
    canvas.height = CH
    const ctx = canvas.getContext('2d')
    drawLog(ctx, logData, locations)
  }, [logData, locations])

  useEffect(() => { draw() }, [draw])

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>ELD Log — Day ${logData.day_number}</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}
      img{max-width:100%;}</style></head>
      <body><img src="${img}" /></body></html>
    `)
    win.document.close()
    win.print()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a    = document.createElement('a')
    a.download = `eld-log-day-${logData.day_number}.png`
    a.href     = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="eld-log-card">
      {/* Log sheet actions bar */}
      <div className="eld-log-bar">
        <div className="eld-log-label">
          <strong>Day {logData.day_number}</strong>
          <span>{logData.date}</span>
          <span className="badge badge-miles">{logData.total_miles} mi driven</span>
        </div>
        <div className="eld-status-pills">
          {Object.entries(logData.totals || {}).map(([k, v]) =>
            v > 0 ? (
              <span key={k} className={`status-pill pill-${k.toLowerCase()}`}>
                {STATUS_LABELS[k]}: <strong>{v.toFixed(2)} hr</strong>
              </span>
            ) : null
          )}
        </div>
        <div className="eld-actions">
          <button onClick={handlePrint}    className="action-btn">🖨️ Print</button>
          <button onClick={handleDownload} className="action-btn">⬇️ Save PNG</button>
        </div>
      </div>

      {/* The canvas */}
      <div className="canvas-scroll">
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
      </div>
    </div>
  )
}
