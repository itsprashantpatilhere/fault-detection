# File: app/routers/sync.py
"""
Data Sync Router
Endpoints for syncing data from external API to MongoDB
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

# Support both absolute and relative imports
try:
    from app.database import get_database
    from app.services.sync_service import (
        sync_machines_for_date,
        sync_date_range,
        sync_today,
        sync_last_n_days,
        get_sync_status,
        get_available_dates,
        get_machine_count
    )
except ImportError:
    from database import get_database
    from services.sync_service import (
        sync_machines_for_date,
        sync_date_range,
        sync_today,
        sync_last_n_days,
        get_sync_status,
        get_available_dates,
        get_machine_count
    )

router = APIRouter()


class SyncRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days: Optional[int] = None


# ------------------- Sync Status -------------------
@router.get("/status")
async def get_status():
    """
    Get current sync status and database statistics
    """
    try:
        db = get_database()
        
        if db is None:
            return {
                "status": "disconnected",
                "error": "MongoDB is not connected",
                "machine_count": 0,
                "available_dates_count": 0,
                "latest_dates": [],
                "sync_metadata": None
            }
        
        sync_status = await get_sync_status(db)
        machine_count = await get_machine_count(db)
        available_dates = await get_available_dates(db)
        
        return {
            "status": "connected",
            "machine_count": machine_count,
            "available_dates_count": len(available_dates),
            "latest_dates": available_dates[:10] if available_dates else [],
            "sync_metadata": sync_status
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


# ------------------- Auto-Sync (Smart Sync) -------------------
@router.post("/auto")
async def auto_sync(background_tasks: BackgroundTasks, days: int = Query(default=8, ge=1, le=30)):
    """
    Smart auto-sync: Syncs recent data to keep dashboard updated.
    This is called automatically by the frontend on dashboard load.
    Runs sync in background to not block the response.
    
    - **days**: Number of days to sync (default: 8 to match dashboard date range)
    """
    try:
        db = get_database()
        
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get last sync time
        sync_status = await get_sync_status(db)
        last_sync = None
        
        if sync_status and sync_status.get("last_sync"):
            try:
                last_sync_str = sync_status["last_sync"]
                if isinstance(last_sync_str, str):
                    last_sync = datetime.fromisoformat(last_sync_str.replace('Z', '+00:00'))
            except Exception:
                pass
        
        # Check if we need to sync (if last sync was more than 10 minutes ago or never)
        needs_sync = True
        if last_sync:
            time_since_sync = datetime.utcnow() - last_sync.replace(tzinfo=None)
            needs_sync = time_since_sync.total_seconds() > 600  # 10 minutes
        
        if needs_sync:
            # Run sync in background to not block dashboard loading
            # Sync last N days to ensure data completeness
            async def sync_recent_data():
                await sync_last_n_days(db, days)
            
            background_tasks.add_task(sync_recent_data)
            return {
                "message": f"Syncing last {days} days in background",
                "needs_sync": True,
                "last_sync": sync_status.get("last_sync") if sync_status else None
            }
        else:
            return {
                "message": "Data is up to date",
                "needs_sync": False,
                "last_sync": sync_status.get("last_sync") if sync_status else None
            }
            
    except Exception as e:
        # Don't fail the dashboard load, just log the error
        return {
            "message": f"Auto-sync check failed: {str(e)}",
            "needs_sync": False
        }


# ------------------- Sync Today -------------------
@router.post("/today")
async def sync_today_endpoint():
    """
    Sync today's machine data from external API
    """
    try:
        db = get_database()
        result = await sync_today(db)
        return {
            "message": "Sync completed",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ------------------- Sync Last N Days -------------------
@router.post("/recent")
async def sync_recent_days(days: int = Query(default=7, ge=1, le=365)):
    """
    Sync last N days of machine data from external API
    
    - **days**: Number of days to sync (default: 7, max: 365)
    """
    try:
        db = get_database()
        result = await sync_last_n_days(db, days)
        return {
            "message": f"Synced last {days} days",
            "result": {
                "total_dates": result["total_dates"],
                "total_fetched": result["total_fetched"],
                "total_inserted": result["total_inserted"],
                "total_updated": result["total_updated"],
                "failed_dates": result["failed_dates"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ------------------- Sync Date Range -------------------
@router.post("/range")
async def sync_range(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """
    Sync machine data for a specific date range
    
    - **start_date**: Start date in YYYY-MM-DD format
    - **end_date**: End date in YYYY-MM-DD format
    """
    try:
        # Validate date format
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    try:
        db = get_database()
        result = await sync_date_range(db, start_date, end_date)
        return {
            "message": f"Synced from {start_date} to {end_date}",
            "result": {
                "total_dates": result["total_dates"],
                "total_fetched": result["total_fetched"],
                "total_inserted": result["total_inserted"],
                "total_updated": result["total_updated"],
                "failed_dates": result["failed_dates"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ------------------- Sync Single Date -------------------
@router.post("/date/{date_str}")
async def sync_single_date(date_str: str):
    """
    Sync machine data for a specific date
    
    - **date_str**: Date in YYYY-MM-DD format
    """
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    try:
        db = get_database()
        result = await sync_machines_for_date(db, date_str)
        return {
            "message": f"Synced data for {date_str}",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# ------------------- Background Sync -------------------
async def background_sync_task(days: int):
    """Background task for syncing data"""
    try:
        db = get_database()
        await sync_last_n_days(db, days)
    except Exception as e:
        print(f"Background sync failed: {e}")


@router.post("/background")
async def start_background_sync(
    background_tasks: BackgroundTasks,
    days: int = Query(default=30, ge=1, le=365)
):
    """
    Start a background sync process (doesn't block the response)
    
    - **days**: Number of days to sync (default: 30)
    """
    background_tasks.add_task(background_sync_task, days)
    return {
        "message": f"Background sync started for last {days} days",
        "note": "Check /sync/status for progress"
    }


# ------------------- Available Dates -------------------
@router.get("/dates")
async def list_available_dates():
    """
    Get list of dates available in the database
    """
    try:
        db = get_database()
        dates = await get_available_dates(db)
        return {
            "count": len(dates),
            "dates": dates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------- Clear Database -------------------
@router.delete("/clear")
async def clear_machines_data(confirm: bool = Query(default=False)):
    """
    Clear all machines data from database (use with caution!)
    
    - **confirm**: Must be True to actually delete data
    """
    if not confirm:
        return {
            "warning": "This will delete all machines data. Set confirm=true to proceed."
        }
    
    try:
        db = get_database()
        result = await db.machines.delete_many({})
        return {
            "message": "Database cleared",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
