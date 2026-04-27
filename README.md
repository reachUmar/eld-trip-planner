# 🚛 ELD Trip Planner — Full Stack App

FMCSA-compliant Hours of Service route planner with ELD daily log sheet generation.

**No API keys needed** — uses free OpenStreetMap / OSRM APIs.

---

## What This App Does

- Takes current location, pickup location, dropoff location, and current cycle hours used
- Calculates a compliant driving schedule (11-hr driving limit, 14-hr window, 30-min breaks, 10-hr rests, fuel stops)
- Shows the route on an interactive map
- Generates FMCSA §395.8 ELD daily log sheets (printable canvas drawings)

---

## Deployment — Step by Step

You need two free accounts: **GitHub**, **Render** (backend), **Vercel** (frontend).

---

### STEP 1 — Put the code on GitHub

1. Go to **https://github.com** and create a free account (if you don't have one)
2. Click the **+** button (top right) → **New repository**
3. Name it `eld-trip-planner`, leave everything else default, click **Create repository**
4. On your computer, unzip the downloaded ZIP file
5. Open **Terminal** (Mac) or **Command Prompt** (Windows) inside the unzipped folder
6. Run these commands one by one:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/eld-trip-planner.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username from step 1.

---

### STEP 2 — Deploy the Backend to Render (free)

1. Go to **https://render.com** and sign up with your GitHub account
2. Click **New +** → **Web Service**
3. Click **Connect** next to your `eld-trip-planner` repository
4. Fill in the settings exactly as below:

| Field | Value |
|---|---|
| **Name** | `eld-trip-planner-api` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT` |
| **Instance Type** | `Free` |

5. Scroll down to **Environment Variables**, click **Add Environment Variable**:

| Key | Value |
|---|---|
| `SECRET_KEY` | `mysecretkey-change-this-to-anything-random-abc123xyz` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `*` |

6. Click **Create Web Service**
7. Wait ~3 minutes for it to deploy (you'll see logs)
8. **Copy your backend URL** — it looks like: `https://eld-trip-planner-api.onrender.com`

---

### STEP 3 — Deploy the Frontend to Vercel (free)

1. Go to **https://vercel.com** and sign up with your GitHub account
2. Click **Add New…** → **Project**
3. Find and click **Import** next to your `eld-trip-planner` repository
4. In the **Configure Project** screen:
   - Set **Root Directory** to `frontend`
   - Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://eld-trip-planner-api.onrender.com` |

> ⚠️ Replace the URL above with the actual URL from Render Step 8.

5. Click **Deploy**
6. Wait ~1 minute
7. Vercel gives you a URL like `https://eld-trip-planner.vercel.app` — that's your live app! ✅

---

## Running Locally (Optional)

If you want to test it on your own computer first:

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend runs at http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at http://localhost:3000

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Django + DRF | Robust Python REST API |
| Frontend | React + Vite | Fast, modern UI |
| Map | Leaflet + OpenStreetMap | Free, no API key |
| Routing | OSRM public API | Free, no API key |
| Geocoding | Nominatim | Free, no API key |
| Backend hosting | Render.com | Free tier |
| Frontend hosting | Vercel | Free tier |

---

## HOS Rules Implemented

- ✅ 11-hour maximum driving per shift
- ✅ 14-hour driving window
- ✅ 30-minute break after 8 cumulative driving hours
- ✅ 10 consecutive hours off-duty between shifts
- ✅ 70-hour / 8-day rolling cycle limit
- ✅ 34-hour cycle restart when limit reached
- ✅ Fuel stop every 1,000 miles (30 minutes on-duty)
- ✅ 1 hour on-duty (not driving) for pickup and dropoff

---

## Notes

- The Render free tier **spins down after 15 minutes of inactivity** — first request after idle may take 30–60 seconds. This is normal.
- All routing uses public APIs — no API keys or billing required.
- For production use, set `DEBUG=False` and restrict `CORS_ALLOW_ALL_ORIGINS` to your Vercel domain.
