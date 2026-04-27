"""
FMCSA Hours of Service Engine
Property-carrying driver, 70 hr / 8-day cycle.
Rules implemented:
  - 11-hour driving limit per shift
  - 14-hour driving window
  - 30-minute break after 8 cumulative driving hours
  - 10 consecutive hours off between shifts
  - 70-hour / 8-day rolling cycle limit
  - Fuel stop every 1,000 miles (30 min on-duty)
  - 1 hour on-duty (not driving) for pickup and dropoff
  - 34-hour cycle restart when cycle limit reached
"""

import requests
from datetime import datetime, timedelta

# ── External APIs (no API key needed) ─────────────────────────────
NOMINATIM = "https://nominatim.openstreetmap.org/search"
OSRM      = "http://router.project-osrm.org/route/v1/driving"

# ── HOS Constants ─────────────────────────────────────────────────
MAX_DRIVING  = 11.0   # max driving hours per shift
DRIVE_WINDOW = 14.0   # driving window hours
BREAK_AFTER  = 8.0    # cumulative driving hours before mandatory 30-min break
BREAK_DUR    = 0.5    # 30-minute break duration
MIN_REST     = 10.0   # minimum consecutive off-duty rest hours
CYCLE_LIMIT  = 70.0   # 70-hr / 8-day cycle
FUEL_MILES   = 1000.0 # miles between fueling stops
FUEL_STOP    = 0.5    # fueling stop duration (hours)
STOP_DUR     = 1.0    # pickup / dropoff stop duration (hours)


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _mi(meters: float) -> float:
    return meters / 1609.344


def geocode(loc: str):
    """Return (lat, lon, display_name). Raises ValueError on failure."""
    try:
        r = requests.get(
            NOMINATIM,
            params={"q": loc, "format": "json", "limit": 1},
            headers={"User-Agent": "ELDTripPlanner/1.0 (demo)"},
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            raise ValueError(f"Location not found: '{loc}'. Try a more specific address (city, state).")
        item = data[0]
        return float(item["lat"]), float(item["lon"]), item.get("display_name", loc)
    except requests.RequestException as exc:
        raise ValueError(f"Geocoding request failed: {exc}")


def get_route(start: tuple, end: tuple):
    """
    Return (distance_miles, duration_hours, [[lat,lon],...]).
    Uses OSRM public demo server — no API key required.
    """
    if start == end:
        return 0.0, 0.0, []
    lat1, lon1 = start
    lat2, lon2 = end
    try:
        url = f"{OSRM}/{lon1},{lat1};{lon2},{lat2}"
        r = requests.get(
            url,
            params={"overview": "full", "geometries": "geojson"},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("code") != "Ok":
            raise ValueError(f"OSRM routing error: {data.get('message', 'unknown')}")
        route = data["routes"][0]
        miles = _mi(route["distance"])
        hours = route["duration"] / 3600
        # OSRM gives [lon, lat]; Leaflet expects [lat, lon]
        geom = [[c[1], c[0]] for c in route["geometry"]["coordinates"]]
        return miles, hours, geom
    except requests.RequestException as exc:
        raise ValueError(f"Routing request failed: {exc}")


# ─────────────────────────────────────────────────────────────────
# Main planner
# ─────────────────────────────────────────────────────────────────

def plan_trip(current_location: str, pickup_location: str,
              dropoff_location: str, cycle_hours_used: float) -> dict:
    """
    Compute a complete HOS-compliant trip plan.
    Returns a dict with locations, route geometry, daily ELD logs,
    trip summary, and notable stops.
    """
    # ── Geocode ───────────────────────────────────────────────────
    clat, clon, cname = geocode(current_location)
    plat, plon, pname = geocode(pickup_location)
    dlat, dlon, dname = geocode(dropoff_location)

    # ── Route legs ────────────────────────────────────────────────
    d1, t1, g1 = get_route((clat, clon), (plat, plon))
    d2, t2, g2 = get_route((plat, plon), (dlat, dlon))

    # Average highway speed (mph) for each leg
    spd1 = max(d1 / t1, 10.0) if t1 > 0 else 55.0
    spd2 = max(d2 / t2, 10.0) if t2 > 0 else 55.0

    # ── Simulation state ──────────────────────────────────────────
    start_dt = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
    if start_dt <= datetime.now():
        start_dt += timedelta(days=1)

    st = {
        "now":       start_dt,
        "drv_shift": 0.0,          # driving hours this shift
        "drv_break": 0.0,          # driving hours since last 30-min break
        "win_start": None,          # 14-hr window start (datetime or None)
        "cycle":     float(cycle_hours_used),
        "fuel_mi":   0.0,
        "total_mi":  0.0,
    }

    events: list[dict] = []

    # ── Event helpers ─────────────────────────────────────────────

    def _add(status, s, e, location, reason="", miles=0.0):
        events.append({
            "status":   status,
            "start":    s.isoformat(),
            "end":      e.isoformat(),
            "start_dt": s,
            "end_dt":   e,
            "location": location,
            "reason":   reason,
            "miles":    miles,
        })

    def _win_elapsed() -> float:
        if st["win_start"] is None:
            return 0.0
        return (st["now"] - st["win_start"]).total_seconds() / 3600

    def _take_rest(hours: float, reason: str, loc: str):
        s = st["now"]
        e = s + timedelta(hours=hours)
        _add("OFF_DUTY", s, e, loc, reason)
        st["now"] = e
        if hours >= MIN_REST:
            st["drv_shift"] = 0.0
            st["drv_break"] = 0.0
            st["win_start"] = None
        else:
            # Short break — still counts toward 14-hr window (clock keeps running)
            st["drv_break"] = 0.0
        if hours >= 34:
            st["cycle"] = 0.0

    def _on_duty_stop(hours: float, loc: str, reason: str):
        s = st["now"]
        e = s + timedelta(hours=hours)
        _add("ON_DUTY_NOT_DRIVING", s, e, loc, reason)
        st["now"]    = e
        st["cycle"] += hours
        # On-duty stop advances the 14-hr window
        if st["win_start"] is None:
            st["win_start"] = s

    def _drive(dist_mi: float, speed_mph: float, from_n: str, to_n: str):
        """Drive dist_mi miles at speed_mph, inserting HOS breaks/rests as needed."""
        remaining = dist_mi
        guard = 0

        while remaining > 0.05:
            guard += 1
            if guard > 5000:
                break  # safety

            # ── Enforce mandatory limits ──────────────────────────
            need_rest = False

            if st["drv_shift"] >= MAX_DRIVING - 0.001:
                _take_rest(MIN_REST, "Required 10-hour rest", f"Near {to_n}")
                need_rest = True

            elif st["win_start"] and _win_elapsed() >= DRIVE_WINDOW - 0.001:
                _take_rest(MIN_REST, "14-hour window limit — 10-hour rest required", f"Near {to_n}")
                need_rest = True

            elif st["drv_break"] >= BREAK_AFTER - 0.001:
                _take_rest(BREAK_DUR, "30-minute rest break", f"Near {to_n}")
                need_rest = True

            elif st["cycle"] >= CYCLE_LIMIT - 0.001:
                _take_rest(34.0, "34-hour cycle restart", f"Near {to_n}")
                need_rest = True

            if need_rest:
                continue

            # ── Fuel stop ─────────────────────────────────────────
            if st["fuel_mi"] >= FUEL_MILES - 0.01:
                s = st["now"]
                e = s + timedelta(hours=FUEL_STOP)
                _add("ON_DUTY_NOT_DRIVING", s, e,
                     f"Fuel stop near {to_n}", "Fueling")
                st["now"]    = e
                st["cycle"] += FUEL_STOP
                st["fuel_mi"] = 0.0
                if st["win_start"] is None:
                    st["win_start"] = s
                continue

            # ── Start 14-hr window if not yet started ────────────
            if st["win_start"] is None:
                st["win_start"] = st["now"]

            # ── How far can we drive before hitting any limit? ────
            we = _win_elapsed()
            h_drive  = MAX_DRIVING  - st["drv_shift"]
            h_win    = DRIVE_WINDOW - we
            h_break  = BREAK_AFTER  - st["drv_break"]
            h_fuel   = (FUEL_MILES  - st["fuel_mi"]) / speed_mph
            h_cycle  = CYCLE_LIMIT  - st["cycle"]
            h_remain = remaining / speed_mph

            chunk_h = min(h_drive, h_win, h_break, h_fuel, h_cycle, h_remain)

            if chunk_h < 0.001:
                _take_rest(MIN_REST, "Required rest", f"Near {to_n}")
                continue

            chunk_mi = min(chunk_h * speed_mph, remaining)
            chunk_h  = chunk_mi / speed_mph

            s = st["now"]
            e = s + timedelta(hours=chunk_h)
            _add("DRIVING", s, e, f"{from_n} → {to_n}", "", chunk_mi)

            st["now"]       = e
            st["drv_shift"] += chunk_h
            st["drv_break"] += chunk_h
            st["cycle"]     += chunk_h
            st["fuel_mi"]   += chunk_mi
            st["total_mi"]  += chunk_mi
            remaining       -= chunk_mi

    # ── Execute the trip ──────────────────────────────────────────
    cn = cname.split(",")[0]
    pn = pname.split(",")[0]
    dn = dname.split(",")[0]

    if d1 > 0.1:
        _drive(d1, spd1, cn, pn)
    _on_duty_stop(STOP_DUR, pn, "Pickup")

    if d2 > 0.1:
        _drive(d2, spd2, pn, dn)
    _on_duty_stop(STOP_DUR, dn, "Dropoff")

    # ── Build response ────────────────────────────────────────────
    daily_logs = _make_daily_logs(events, start_dt)

    return {
        "locations": {
            "current": {"lat": clat, "lng": clon, "name": cname},
            "pickup":  {"lat": plat, "lng": plon, "name": pname},
            "dropoff": {"lat": dlat, "lng": dlon, "name": dname},
        },
        "route": {
            "geometry":    g1 + g2,
            "total_miles": round(d1 + d2, 1),
            "leg1_miles":  round(d1, 1),
            "leg2_miles":  round(d2, 1),
        },
        "trip_summary": {
            "total_miles":          round(st["total_mi"], 1),
            "total_days":           len(daily_logs),
            "cycle_hours_used":     round(st["cycle"], 1),
            "estimated_completion": st["now"].isoformat(),
        },
        "daily_logs": daily_logs,
        "stops":      _extract_stops(events),
    }


# ─────────────────────────────────────────────────────────────────
# Daily log generation
# ─────────────────────────────────────────────────────────────────

def _make_daily_logs(events: list, start_dt: datetime) -> list:
    if not events:
        return []

    first_day = events[0]["start_dt"].replace(hour=0, minute=0, second=0, microsecond=0)
    last_end  = events[-1]["end_dt"]
    last_day  = last_end.replace(hour=0, minute=0, second=0, microsecond=0)

    daily_logs = []
    day     = first_day
    day_num = 1

    while day <= last_day:
        next_day = day + timedelta(days=1)

        day_evts: list[dict] = []
        totals = {
            "OFF_DUTY": 0.0,
            "SLEEPER_BERTH": 0.0,
            "DRIVING": 0.0,
            "ON_DUTY_NOT_DRIVING": 0.0,
        }
        day_miles = 0.0
        remarks: list[dict] = []
        prev_loc = None

        for ev in events:
            if ev["end_dt"] <= day or ev["start_dt"] >= next_day:
                continue

            cs  = max(ev["start_dt"], day)
            ce  = min(ev["end_dt"],   next_day)
            sh  = (cs - day).total_seconds() / 3600
            eh  = (ce - day).total_seconds() / 3600
            dur = eh - sh

            if dur < 0.001:
                continue

            day_evts.append({
                "status":     ev["status"],
                "start_hour": round(sh, 4),
                "end_hour":   round(eh, 4),
                "duration":   round(dur, 4),
                "location":   ev["location"],
                "reason":     ev["reason"],
            })

            totals[ev["status"]] = round(totals[ev["status"]] + dur, 4)

            if ev["status"] == "DRIVING":
                full_dur = (ev["end_dt"] - ev["start_dt"]).total_seconds() / 3600
                frac = dur / full_dur if full_dur > 0 else 0
                day_miles += ev.get("miles", 0) * frac

            if ev["location"] and ev["location"] != prev_loc:
                remarks.append({
                    "time":     round(sh, 2),
                    "location": ev["location"],
                    "status":   ev["status"],
                })
                prev_loc = ev["location"]

        if not day_evts:
            day = next_day
            continue

        # Sort events in time order
        day_evts.sort(key=lambda x: x["start_hour"])

        # Fill off-duty gap at start of day
        if day_evts[0]["start_hour"] > 0.001:
            gap = day_evts[0]["start_hour"]
            day_evts.insert(0, {
                "status":     "OFF_DUTY",
                "start_hour": 0.0,
                "end_hour":   gap,
                "duration":   gap,
                "location":   "",
                "reason":     "Off duty",
            })
            totals["OFF_DUTY"] = round(totals["OFF_DUTY"] + gap, 4)

        # Fill off-duty gap at end of day
        last_eh = day_evts[-1]["end_hour"]
        if last_eh < 23.999:
            gap = 24.0 - last_eh
            day_evts.append({
                "status":     "OFF_DUTY",
                "start_hour": last_eh,
                "end_hour":   24.0,
                "duration":   gap,
                "location":   "",
                "reason":     "Off duty",
            })
            totals["OFF_DUTY"] = round(totals["OFF_DUTY"] + gap, 4)

        daily_logs.append({
            "day_number":  day_num,
            "date":        day.strftime("%m/%d/%Y"),
            "events":      day_evts,
            "totals":      {k: round(v, 2) for k, v in totals.items()},
            "total_miles": round(day_miles, 1),
            "remarks":     remarks,
        })

        day = next_day
        day_num += 1

    return daily_logs


def _extract_stops(events: list) -> list:
    stops = []
    for ev in events:
        reason = ev.get("reason", "")
        if not reason:
            continue
        dur_h = (ev["end_dt"] - ev["start_dt"]).total_seconds() / 3600
        stops.append({
            "type":           reason,
            "start":          ev["start"],
            "end":            ev["end"],
            "location":       ev["location"],
            "duration_hours": round(dur_h, 2),
            "status":         ev["status"],
        })
    return stops
