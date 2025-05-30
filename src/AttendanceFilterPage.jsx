import React, { useEffect, useState } from "react";
import axios from "axios";
import { parseISO, format } from 'date-fns';

const AttendanceFilterPage = () => {
  const [filters, setFilters] = useState({
    department: "",
    gender: "",
    maxDistance: "",
    date: "",
    attendance_status: ""
  });
  
  const [dateFormat, setDateFormat] = useState("us"); // default format


  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = parseISO(dateStr);
      if (dateFormat === "us") return format(date, "MM/dd/yyyy");
      if (dateFormat === "europe") return format(date, "dd.MM.yyyy");
      if (dateFormat === "india") return format(date, "dd/MM/yyyy");
      return format(date, "yyyy-MM-dd");
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = parseISO(timestamp);
      return format(date, 'h:mm a');
    } catch {
      return 'Invalid Time';
    }
  };

  // const formatTime = (timestamp) => {
  //   if (!timestamp) return 'N/A';  // handle empty punch times
  //   try {
  //     const date = parseISO(timestamp);
  //     return format(date, 'h:mm a');
  //   } catch {
  //     return 'Invalid Time';
  //   }
  // };



  const [pageInput, setPageInput] = useState(1);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  
  

  const totalPages = Math.ceil(totalRecords / pageSize);

  const fetchData = async (overridePage = page) => {
    const params = {
      page: overridePage,
      page_size: pageSize,
      department: filters.department || undefined,
      gender: filters.gender || undefined,
      maxDistance: filters.maxDistance ? Number(filters.maxDistance) : undefined,
      date: filters.date || undefined,
      attendance_status: filters.attendance_status || undefined
    };


    try {
      const res = await axios.get("http://localhost:8000/attendance", { params });
      setData(res.data.data);
      setTotalRecords(res.data.totalRecords);
      if (res.data.currentPage) {
      setPage(res.data.currentPage);
      setPageInput(res.data.currentPage);
    }
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
      setData([]);
      setTotalRecords(0);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(); // ✅ Fetch data immediately after filter submit
  };

  const handlePageInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setPage(val);
    }
  };

  return (
    <div>
      <h1>Attendance Filter</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: "10px 0", display: "flex", justifyContent: "flex-end", alignItems: "center",paddingRight: "40px", }}>
          <strong style={{ marginRight: "10px" }}>Choose Date Format:</strong>
          <button type="button" onClick={() => setDateFormat("us")}>US</button>
          <button type="button" onClick={() => setDateFormat("europe")}>Europe</button>
          <button type="button" onClick={() => setDateFormat("india")}>India</button>
        </div>

        {/* <div style={{ margin: "10px 0" }}>
          <button onClick={() => setDateFormat("us")}>US Format</button>
          <button onClick={() => setDateFormat("europe")}>European Format</button>
          <button onClick={() => setDateFormat("india")}>Indian Format</button>
        </div> */}

        <select
          value={filters.department}
          onChange={e => setFilters({ ...filters, department: e.target.value })}
        >
          <option value="">All Departments</option>
          <option value="Finance">Finance</option>
          <option value="Admin">Admin</option>
          <option value="Sales">Sales</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
        </select>

        <select
          value={filters.gender}
          onChange={e => setFilters({ ...filters, gender: e.target.value })}
        >
          <option value="">All Genders</option>
          <option value="M">M</option>
          <option value="F">F</option>
        </select>

        <input
          placeholder="Enter Distance (max 50km)"
          type="number"
          value={filters.maxDistance}
          onChange={e => setFilters({ ...filters, maxDistance: e.target.value })}
        />

        <select
          value={filters.attendance_status}
          onChange={e => setFilters({ ...filters, attendance_status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Late">Late</option>
          <option value="Half Day">Half Day</option>
        </select>


        <input
          type="date"
          value={filters.date}
          onChange={e => setFilters({ ...filters, date: e.target.value })}
        />

        <button type="submit">Filter</button>
      </form>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", marginTop: "20px" }}>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Employee Name</th>
            <th>Gender</th>
            <th>Department</th>
            <th>Distance (km)</th>
            <th>Date</th>
            <th>Status</th> 
            <th>Punch In</th>          
            <th>Punch Out</th> 
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>No records found</td>
            </tr>
          ) : (
            data.map((entry, i) => (
              <tr key={i}>
                <td>{entry.emp_id || "N/A"}</td>
                <td>{entry.emp_name || "N/A"}</td>
                <td>{entry.gender || "N/A"}</td>
                <td>{entry.dept_name || "N/A"}</td>
                <td>{entry.distance_from_office !== undefined ? entry.distance_from_office : "N/A"}</td>
                {/* <td>{entry.punch_date || "N/A"}</td> */}
                <td>{formatDate(entry.punch_date)}</td>
                <td>{entry.attendance_status || "N/A"}</td> 
                <td>{formatTime(entry.punch_in_time)}</td>
                <td>{formatTime(entry.punch_out_time)}</td>

              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button onClick={() => { setPage(1); setPageInput(1); }} disabled={page === 1}>First</button>
        <button onClick={() => { setPage(p => Math.max(p - 1, 1)); setPageInput(p => Math.max(p - 1, 1)); }} disabled={page === 1}>Prev</button>

        <span style={{ margin: "0 10px" }}>
          Page{" "}
          <input
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(Number(e.target.value))}
            min={1}
            max={totalPages}
            style={{ width: "50px" }}
          />{" "}
          of {totalPages}
          <button onClick={() => {
            if (pageInput >= 1 && pageInput <= totalPages) setPage(pageInput);
          }}>Go</button>
        </span>

        <button onClick={() => { setPage(p => Math.min(p + 1, totalPages)); setPageInput(p => Math.min(p + 1, totalPages)); }} disabled={page === totalPages}>Next</button>
        <button
          onClick={() => {
            // fetchData("last");
            setPage(totalPages);       // explicitly update page state to 'last' so useEffect doesn't override
            setPageInput(totalPages); 
          }}
        >
          Last
        </button>

      </div>
    </div>
  );
};

export default AttendanceFilterPage;
