from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Union
import psycopg2
import math
import redis
import json
import hashlib
import decimal

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return psycopg2.connect(
        dbname="emp4",
        user="postgres",
        password="1234",
        host="localhost",
        port="5432"
    )

def get_estimated_count(cur):
    cur.execute("SELECT reltuples::BIGINT AS estimate FROM pg_class WHERE relname = 'emp1'")
    return int(cur.fetchone()[0])



def convert_decimal(obj):
    if isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    else:
        return obj

import decimal
import datetime

def convert_decimal(obj):
    if isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, decimal.Decimal):
        return float(obj)
    elif isinstance(obj, (datetime.date, datetime.datetime)):
        return obj.isoformat()
    else:
        return obj


@app.get("/attendance")
def get_attendance(
    department: Optional[str] = "",
    gender: Optional[str] = "",
    maxDistance: Optional[float] = None,
    date: Optional[str] = "",
    attendance_status: Optional[str] = "",
    page: Union[int, str] = 1,
    page_size: int = 20
):
    # Create a unique cache key based on filters and pagination
    cache_key = f"attendance:{department}:{gender}:{maxDistance}:{date}:{attendance_status}:{page}:{page_size}"
    cache_key = hashlib.md5(cache_key.encode()).hexdigest()

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    conn = get_db_connection()
    cur = conn.cursor()

    base_query = "FROM emp1 WHERE TRUE"
    filters = []
    params = []

    if department:
        filters.append("dept_name = %s")
        params.append(department)
    if gender:
        filters.append("gender = %s")
        params.append(gender)
    if maxDistance is not None:
        filters.append("distance_from_office <= %s")
        params.append(maxDistance)
    if date:
        filters.append("punch_date = %s")
        params.append(date)
    if attendance_status:
        filters.append("attendance_status = %s")
        params.append(attendance_status)

    if filters:
        base_query += " AND " + " AND ".join(filters)

    cur.execute(f"SELECT COUNT(*) {base_query}", params)
    total_records = cur.fetchone()[0]

    data_query = f"""
        SELECT emp_id, emp_name, gender, dept_name, distance_from_office, punch_date, attendance_status, punch_in_time, punch_out_time
        {base_query}
        ORDER BY punch_date
        LIMIT %s OFFSET %s
    """
    paginated_params = params + [page_size, (int(page) - 1) * page_size]
    cur.execute(data_query, paginated_params)
    records = cur.fetchall()

    cur.close()
    conn.close()

    result = {
        "data": [
            dict(zip(
                ["emp_id", "emp_name", "gender", "dept_name", "distance_from_office", "punch_date", "attendance_status", "punch_in_time", "punch_out_time"],
                row
            )) for row in records
        ],
        "totalRecords": total_records,
        "currentPage": page 
    }

    # Convert Decimal to float before caching
    result = convert_decimal(result)

    # Cache the result for 2 minutes (120 seconds)
    redis_client.setex(cache_key, 120, json.dumps(result))

    return result
