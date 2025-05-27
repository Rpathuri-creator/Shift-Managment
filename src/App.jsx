import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

// Set this to your own Google Apps Script URL after deployment
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGN7S9T_1DPAMe0x8Y5lchI6MCkkmgAcyFudGHSKoMEXttK-G_IODWM9IZT3-qRHP-oA/exec";

// Table header component for shifts summary
function ShiftsTableHeader() {
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Hours</th>
                </tr>
            </thead>
        </table>
    );
}

export default function App() {
    const [employee, setEmployee] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filter state for summary
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');

    // Filtered shifts and total hours
    const filteredShifts = shifts.filter(s => {
        const shiftDate = s.date;
        const inDateRange = (!filterFrom || shiftDate >= filterFrom) && (!filterTo || shiftDate <= filterTo);
        const matchesEmployee = !filterEmployee || s.employee.toLowerCase().includes(filterEmployee.toLowerCase());
        return inDateRange && matchesEmployee;
    });
    const totalFilteredHours = filteredShifts.reduce((sum, s) => {
        const hours = parseFloat(calculateHours(s.date, s.startTime, s.endTime));
        return sum + (isNaN(hours) ? 0 : hours);
    }, 0);

    const parseLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0); // Local date, safe noon time
    };

    const formatTimeOnly = (value) => {
        if (!value) return '-';
        const dateObj = new Date(value);

        // If dateObj is invalid OR before 1900 (weird Google Sheets time)
        if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900) {
            // Just return original string (might already be correct)
            return value;
        }

        // Otherwise, extract HH:mm
        return dateObj.toISOString().substring(11, 16); // "HH:MM"
    };

    // Calculate hours for a shift
    function calculateHours(shiftDate, start, end) {
        if (!start || !end || !shiftDate) return '-';
        try {
            const startDateTime = parseISO(`${shiftDate}T${start}`);
            const endDateTime = parseISO(`${shiftDate}T${end}`);
            const diffMs = endDateTime - startDateTime;
            if (diffMs < 0) return '-'; // End time before start time
            return (diffMs / (1000 * 60 * 60)).toFixed(2);
        } catch (err) {
            return '-';
        }
    }

    const fetchShifts = async () => {
        try {
            setLoading(true);
            // For development/demo purposes, you can use local data instead of the API call
            if (GOOGLE_SCRIPT_URL === "YOUR_SCRIPT_URL_HERE") {
                // Demo data
                const demoShifts = [

                ];
                setShifts(demoShifts);
                setLoading(false);
                return;
            }

            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            setShifts(data.shifts || []);
        } catch (err) {
            console.error("Error fetching shifts:", err);
            setError("Failed to load shifts. Using demo data instead.");
            // Fallback to demo data
            const demoShifts = [
                { employee: "John Doe", date: "2025-05-15", startTime: "09:00", endTime: "17:00" },
                { employee: "Jane Smith", date: "2025-05-15", startTime: "12:00", endTime: "20:00" },
                { employee: "Mike Johnson", date: "2025-05-16", startTime: "08:30", endTime: "16:30" }
            ];
            setShifts(demoShifts);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validate inputs
        if (!employee.trim()) {
            setError("Please enter employee name");
            return;
        }
        if (!date) {
            setError("Please select a date");
            return;
        }
        if (!startTime) {
            setError("Please select start time");
            return;
        }
        if (!endTime) {
            setError("Please select end time");
            return;
        }

        const payload = { employee, date, startTime, endTime };
        setError('');

        try {
            // For demo/development without Google Script
            if (GOOGLE_SCRIPT_URL === "YOUR_SCRIPT_URL_HERE") {
                setShifts(prev => [...prev, payload]);
                setSuccess("Shift added successfully (demo mode)");
                setEmployee('');
                setDate('');
                setStartTime('');
                setEndTime('');
                return;
            }

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: new URLSearchParams(payload),
            });

            const data = await response.json();
            if (data.result === "success") {
                setShifts(prev => [...prev, payload]);
                setSuccess("Shift added successfully");
                setEmployee('');
                setDate('');
                setStartTime('');
                setEndTime('');
            } else {
                setError("Failed to add shift");
            }
        } catch (err) {
            console.error("Error adding shift:", err);
            setError("Failed to add shift. Check your connection and try again.");
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    // Get current month days (for calendar display)
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    // Calculate month name
    const monthName = format(currentDate, 'MMMM yyyy');

    // Handlers for month navigation
    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    return (
        <div className="container">
            <h1>Calder - Employee Shift Tracker</h1>

            {/* Form for adding shifts */}
            <div className="form-container">
                <h2>Add New Shift</h2>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="form">
                    <input
                        placeholder="Enter employee name"
                        value={employee}
                        onChange={e => setEmployee(e.target.value)}
                    />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
                    <div className="time-inputs">
                        <div>
                            <label>Start Time:</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label>End Time:</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <button onClick={handleSubmit}>Add Shift</button>
                </div>
            </div>

            {/* Calendar View */}
            <div className="calendar-section">
                <h2>Calendar View</h2>
                <div className="month-navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <button onClick={handlePrevMonth} style={{ fontSize: '1.5em', width: 40, height: 40, borderRadius: '50%' }} aria-label="Previous Month">&#8592;</button>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{monthName}</span>
                    <button onClick={handleNextMonth} style={{ fontSize: '1.5em', width: 40, height: 40, borderRadius: '50%' }} aria-label="Next Month">&#8594;</button>
                </div>
                {loading ? (
                    <div className="loading">Loading shifts...</div>
                ) : (
                    <div className="calendar">
                        {/* Day headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div className="day-header" key={day}>{day}</div>
                        ))}

                        {/* Empty spaces for days before start of month */}
                        {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay())].map((_, i) => (
                            <div className="day empty" key={`empty-${i}`}></div>
                        ))}

                        {/* Calendar days */}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const dayNum = i + 1;
                            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const formattedDate = format(parseLocalDate(format(dayDate, 'yyyy-MM-dd')), 'yyyy-MM-dd');
                            const dayShifts = shifts.filter(s => format(parseLocalDate(s.date), 'yyyy-MM-dd') === formattedDate);
                            const hasShift = dayShifts.length > 0;

                            return (
                                <div className={`day${hasShift ? ' has-shift' : ''}`} key={dayNum}>
                                    <div className="day-number">{dayNum}</div>
                                    {dayShifts.map((s, idx) => (
                                        <div className="shift" key={idx}>
                                            <b>{s.employee}</b><br />
                                            {s.startTime} - {s.endTime}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Shifts Summary Table */}
            <div className="shifts-summary">
                <h2>Shifts Summary</h2>
                {shifts.length === 0 ? (
                    <p>No shifts recorded yet.</p>
                ) : (
                    <>
                        <div style={{ overflow: 'hidden' }}>
                            <ShiftsTableHeader />
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <tbody>
                                {shifts.map((s, i) => (
                                    <tr key={i}>
                                        <td>{s.employee}</td>
                                        <td>{format(new Date(s.date), 'yyyy-MM-dd')}</td>
                                        <td>{formatTimeOnly(s.startTime)}</td>
                                        <td>{formatTimeOnly(s.endTime)}</td>
                                        <td>{calculateHours(s.date, s.startTime, s.endTime)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {/* Filtered summary form and table */}
                <div style={{ marginTop: 30, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
                    <h3>Filter Shifts</h3>
                    <form style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }} onSubmit={e => e.preventDefault()}>
                        <div>
                            <label>From: </label>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                        </div>
                        <div>
                            <label>To: </label>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                        </div>
                        <div>
                            <label>Employee: </label>
                            <input type="text" placeholder="Employee name" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} />
                        </div>
                    </form>
                    <div style={{ overflow: 'hidden' }}>
                        <ShiftsTableHeader />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <tbody>
                            {filteredShifts.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No shifts found for filter.</td></tr>
                            ) : (
                                filteredShifts.map((s, i) => (
                                    <tr key={i}>
                                        <td>{s.employee}</td>
                                        <td>{format(new Date(s.date), 'yyyy-MM-dd')}</td>
                                        <td>{formatTimeOnly(s.startTime)}</td>
                                        <td>{formatTimeOnly(s.endTime)}</td>
                                        <td>{calculateHours(s.date, s.startTime, s.endTime)}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 'bold' }}>
                        Total Hours: {totalFilteredHours.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}

