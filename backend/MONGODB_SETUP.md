# MongoDB Setup Guide for Fault Detection Application

This guide will help you set up MongoDB to cache data from the external API for faster load times.

## Option 1: Install MongoDB Locally (Recommended for Development)

### Windows Installation

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download and run the installer

2. **During Installation**
   - Choose "Complete" installation
   - ✅ Check "Install MongoDB as a Service" (this makes it start automatically)
   - ✅ Check "Install MongoDB Compass" (optional GUI tool)

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB** (if not running as a service)
   ```powershell
   # Start MongoDB service
   net start MongoDB
   
   # Or start manually
   mongod --dbpath C:\data\db
   ```

---

## Option 2: Use MongoDB Atlas (Cloud - Free Tier)

MongoDB Atlas offers a free 512MB cluster that's perfect for development.

### Setup Steps

1. **Create Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free

2. **Create a Cluster**
   - Click "Build a Cluster"
   - Choose "FREE" tier (M0 Sandbox)
   - Select a region close to you
   - Click "Create Cluster"

3. **Configure Access**
   - Go to "Database Access" → Add New Database User
   - Create a username and password (save these!)
   - Set privileges to "Read and write to any database"
   
   - Go to "Network Access" → Add IP Address
   - Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP

4. **Get Connection String**
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Select "Python" and copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

5. **Update Your .env File**
   ```
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=fault_detection
   ```

---

## After MongoDB is Running

### 1. Start the Backend Server

```powershell
cd backend/app
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
✅ Connected to MongoDB: fault_detection
📊 Database indexes created
```

### 2. Sync Data from External API to MongoDB

**Option A: Sync today's data**
```
POST http://localhost:8000/sync/today
```

**Option B: Sync last 7 days**
```
POST http://localhost:8000/sync/recent?days=7
```

**Option C: Sync a specific date range**
```
POST http://localhost:8000/sync/range?start_date=2024-12-01&end_date=2024-12-10
```

**Option D: Run background sync (30 days)**
```
POST http://localhost:8000/sync/background?days=30
```

### 3. Check Sync Status

```
GET http://localhost:8000/sync/status
```

This returns:
```json
{
  "status": "connected",
  "machine_count": 2815,
  "available_dates_count": 7,
  "latest_dates": ["2024-12-10", "2024-12-09", ...],
  "sync_metadata": {...}
}
```

### 4. View Available Dates

```
GET http://localhost:8000/sync/dates
```

---

## API Behavior

Once MongoDB has data:

1. **Default behavior**: API tries MongoDB first, falls back to external API if no data found
2. **Force MongoDB only**: Add `?source=db` to requests
3. **Force external API**: Add `?source=api` to requests

The response now includes a `source` field indicating where data came from:
```json
{
  "totalCount": 2815,
  "machines": [...],
  "source": "mongodb"  // or "api"
}
```

---

## Recommended Sync Strategy

For production, set up a scheduled task (cron job) to sync data daily:

**Windows Task Scheduler:**
1. Create a batch file `sync_data.bat`:
   ```batch
   curl -X POST http://localhost:8000/sync/today
   ```
2. Schedule it to run every hour or daily

**Or use the background sync endpoint** from your application to keep data fresh.

---

## Troubleshooting

### "Connection refused" error
- Make sure MongoDB is running
- Check if the port 27017 is not blocked by firewall
- For Atlas, verify your IP is whitelisted

### "Authentication failed"
- Double-check username/password in .env
- Ensure the user has read/write permissions

### Slow first sync
- The external API is slow; this is expected
- Subsequent reads from MongoDB will be much faster

---

## Performance Comparison

| Source | Load Time |
|--------|-----------|
| External API | 5-30 seconds |
| MongoDB | < 500ms |

That's a **10-60x improvement**! 🚀
