# Factory Fault Detection Dashboard

A full-stack web application for real-time factory machine monitoring and fault detection. Built with React (frontend) and FastAPI (backend), with MongoDB for fast data caching.

![Dashboard Preview](docs/dashboard-preview.png)

## 🚀 Features

### Dashboard Overview
- **Real-time KPI Cards**: Total machines, normal, satisfactory, alert, and unsatisfactory counts
- **Customer Trends Chart**: Interactive area chart showing machine activity by customer over time
- **Machine Status Trends**: Stacked bar chart with clickable bars to drill down into specific dates/statuses
- **Dynamic Filtering**: Filter by date range, status, and customer

### Machine Inventory
- **Comprehensive Machine Table**: View all machines with details (ID, name, status, type, area, date)
- **Advanced Filtering**: Filter by Area ID, Status, Customer ID, and Date Range
- **Machine Selection**: Select machines to download detailed reports
- **Download Reports**: Generate and download machine reports in text format

### Data Integration
- **MongoDB Caching**: Data is cached locally in MongoDB for fast load times (~300ms vs 15+ seconds from external API)
- **External API Sync**: Sync data from AAMS API to local database
- **Real-time Updates**: Sync today's data or historical date ranges

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Recharts** for interactive charts
- **Lucide React** for icons
- **CSS3** with modern styling

### Backend
- **FastAPI** (Python)
- **Motor** (Async MongoDB driver)
- **HTTPX** for async HTTP requests
- **Uvicorn** ASGI server

### Database
- **MongoDB** for data caching and fast queries

## 📁 Project Structure

```
fault-detection/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # Navigation header
│   │   │   ├── PageContainer.jsx    # Page layout wrapper
│   │   │   ├── DateFilterBar.jsx    # Dashboard filters
│   │   │   ├── MachineFilterBar.jsx # Machine inventory filters
│   │   │   ├── KpiCardsRow.jsx      # KPI statistics cards
│   │   │   ├── ChartsSection.jsx    # Charts (Customer & Status trends)
│   │   │   └── MachinesTable.jsx    # Machine inventory table
│   │   ├── services/
│   │   │   └── api.js               # API service layer
│   │   ├── data/
│   │   │   └── mockData.js          # Default/fallback data
│   │   └── App.jsx                  # Main application component
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry
│   │   ├── database.py              # MongoDB connection
│   │   ├── routers/
│   │   │   ├── machines.py          # Machine endpoints
│   │   │   ├── stats.py             # Statistics endpoints
│   │   │   └── sync.py              # Data sync endpoints
│   │   └── services/
│   │       └── sync_service.py      # Data synchronization service
│   ├── requirements.txt
│   └── .env                         # Environment configuration
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** (v6 or higher) - [Installation Guide](backend/MONGODB_SETUP.md)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/cezzan12/fault-detection.git
cd fault-detection
```

#### 2. Setup Backend

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your MongoDB URI if needed
```

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install
```

### Running the Application

#### 1. Start MongoDB

Make sure MongoDB is running:
```bash
# Windows (if installed as service)
net start MongoDB

# Or check service status
Get-Service MongoDB
```

#### 2. Start Backend Server

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
✅ Connected to MongoDB: fault_detection
📊 Database indexes created
INFO: Uvicorn running on http://0.0.0.0:8000
```

#### 3. Sync Data to MongoDB

Before using the dashboard, sync data from the external API:

```bash
# Sync today's data
curl -X POST http://localhost:8000/sync/today

# Sync last 7 days (recommended for charts)
curl -X POST "http://localhost:8000/sync/recent?days=7"

# Check sync status
curl http://localhost:8000/sync/status
```

#### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in terminal)

## 📡 API Endpoints

### Machines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/machines` | Get machines with optional filters |
| GET | `/machines/{id}` | Get machine details by ID |

**Query Parameters:**
- `date_from`, `date_to` - Date range (YYYY-MM-DD)
- `status` - Filter by status (Normal, Satisfactory, Alert, Unsatisfactory)
- `customerId` - Filter by customer ID
- `areaId` - Filter by area ID

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/pie` | Pie chart data (machines per customer) |
| GET | `/stats/stacked` | Stacked bar chart data (status trends) |

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sync/status` | Get sync status and database stats |
| POST | `/sync/today` | Sync today's data |
| POST | `/sync/recent?days=N` | Sync last N days |
| POST | `/sync/range?start_date=X&end_date=Y` | Sync date range |
| GET | `/sync/dates` | List available dates in database |

## 🔧 Configuration

### Backend (.env)
```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=fault_detection
```

### Frontend (vite.config.js)
The API URL can be configured via environment variable:
```env
VITE_API_URL=http://localhost:8000
```

## 📊 Usage Guide

### Dashboard Overview

1. **View KPIs**: See total machine counts and status breakdown
2. **Customer Trends**: Monitor machine activity by customer over time
3. **Status Trends**: 
   - View machine status distribution over time
   - **Click on any bar** to drill down to that specific date and status in Machine Inventory

### Machine Inventory

1. **Filter Machines**: Use the filter bar to narrow down results
   - Area ID, Status, Customer ID, Date Range
2. **Select Machines**: Click checkboxes to select machines
3. **Download Report**: Click "Download Report" to generate a text report for selected machines

### Data Synchronization

Keep your local database up-to-date:

```bash
# Daily sync (recommended to run via scheduler)
curl -X POST http://localhost:8000/sync/today

# Full refresh (30 days)
curl -X POST "http://localhost:8000/sync/recent?days=30"
```

## 🐛 Troubleshooting

### "Failed to fetch" error
- Ensure backend is running on port 8000
- Check CORS settings in `backend/app/main.py`

### "MongoDB connection failed"
- Verify MongoDB is running: `Get-Service MongoDB`
- Check connection string in `.env`

### Slow loading
- Sync data to MongoDB first: `curl -X POST http://localhost:8000/sync/recent?days=7`
- Data from MongoDB loads in ~300ms vs 15+ seconds from external API

### Filters not working
- Open browser console (F12) to check for errors
- Verify API is returning filtered data: `curl "http://localhost:8000/machines?status=Normal"`

## 📝 License

This project is proprietary software.

## 👥 Contributors

- [cezzan12](https://github.com/cezzan12)

## 📞 Support

For issues and feature requests, please create an issue on GitHub.
