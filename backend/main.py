from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import psycopg2

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

@app.get("/attendance")
def get_attendance(
    department: Optional[str] = "",
    gender: Optional[str] = "",
    maxDistance: Optional[float] = None,
    date: Optional[str] = "",
    page: int = 1,
    page_size: int = 20
):
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

    if filters:
        base_query += " AND " + " AND ".join(filters)

    # Total count query
    count_query = f"SELECT COUNT(*) {base_query}"
    cur.execute(count_query, params)
    total_records = cur.fetchone()[0]

    # Paginated data query
    data_query = f"""
        SELECT emp_id, emp_name, gender, dept_name, distance_from_office, punch_date
        {base_query}
        ORDER BY punch_date
        LIMIT %s OFFSET %s
    """
    paginated_params = params + [page_size, (page - 1) * page_size]
    cur.execute(data_query, paginated_params)
    records = cur.fetchall()

    cur.close()
    conn.close()

    return {
        "data": [
            dict(zip(
                ["emp_id", "emp_name", "gender", "dept_name", "distance_from_office", "punch_date"],
                row
            )) for row in records
        ],
        "totalRecords": total_records
    }
