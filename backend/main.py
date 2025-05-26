from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
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
def get_attendance(department: str = "", gender: str = "", maxDistance: float = None, date: str = "", page: int = 1, page_size: int = 20):
    conn = get_db_connection()
    cur = conn.cursor()
    query = "SELECT emp_id, emp_name, gender, dept_name, distance_from_office, punch_date FROM emp1 WHERE TRUE"
    params = []

    if department:
        query += " AND dept_name = %s"
        params.append(department)
    if gender:
        query += " AND gender = %s"
        params.append(gender)
    if maxDistance is not None:
        query += " AND distance_from_office <= %s"
        params.append(maxDistance)
    if date:
        query += " AND punch_date = %s"
        params.append(date)

    query += " ORDER BY punch_date LIMIT %s OFFSET %s"
    params.extend([page_size, (page - 1) * page_size])

    cur.execute(query, params)
    records = cur.fetchall()
    cur.close()
    conn.close()

    return [dict(zip(["emp_id", "emp_name", "gender", "dept_name", "distance_from_office", "punch_date"], row)) for row in records]