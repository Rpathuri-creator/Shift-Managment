import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import './components/Calendar.css';

// Set this to your own Google Apps Script URL after deployment
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGN7S9T_1DPAMe0x8Y5lchI6MCkkmgAcyFudGHSKoMEXttK-G_IODWM9IZT3-qRHP-oA/exec";

export default function App() {
    // Add tab state
    const [activeTab, setActiveTab] = useState('form');

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
        } catch {
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
                    { employee: "John Doe", date: "2025-05-15", startTime: "09:00", endTime: "17:00" },
                    { employee: "Jane Smith", date: "2025-05-15", startTime: "12:00", endTime: "20:00" },
                    { employee: "Mike Johnson", date: "2025-05-16", startTime: "08:30", endTime: "16:30" }
                ];
                setShifts(demoShifts);
                setLoading(false);
                return;
            }

            const response = await fetch(GOOGLE_SCRIPT_URL);
            const data = await response.json();
            setShifts(data.shifts || []);
        } catch (error) {
            console.error("Error fetching shifts:", error);
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

    // Get unique employee names from shifts
    const employeeList = Array.from(new Set(shifts.map(s => s.employee))).filter(Boolean);

    // Track total hours for selected date
    const [dateHours, setDateHours] = useState(0);
    const [hoursError, setHoursError] = useState("");
    const maxHoursPerDay = 13;

    // Multi-shift form state
    const [shiftForms, setShiftForms] = useState([
        { employee: '', startTime: '', endTime: '' }
    ]);

    // Update dateHours as form fields change
    useEffect(() => {
        if (!date) {
            setDateHours(0);
            setHoursError("");
            return;
        }
        // Calculate total hours for the selected date (existing + all forms)
        const shiftsForDate = shifts.filter(s => s.date === date);
        let total = shiftsForDate.reduce((sum, s) => {
            const h = parseFloat(calculateHours(s.date, s.startTime, s.endTime));
            return sum + (isNaN(h) ? 0 : h);
        }, 0);
        // Add all form hours
        total += shiftForms.reduce((sum, f) => {
            const h = parseFloat(calculateHours(date, f.startTime, f.endTime));
            return sum + (isNaN(h) ? 0 : h);
        }, 0);
        setDateHours(total);
        if (total > maxHoursPerDay) {
            setHoursError("Total hours for the day exceed 13. Please adjust your shift.");
        } else {
            setHoursError("");
        }
    }, [date, shifts, shiftForms, maxHoursPerDay]);

    // Calculate total hours for all forms for the selected date
    const totalFormHours = shiftForms.reduce((sum, f) => {
        const h = parseFloat(calculateHours(date, f.startTime, f.endTime));
        return sum + (isNaN(h) ? 0 : h);
    }, 0);
    // Calculate total hours for the day (existing shifts + forms)
    const shiftsForDate = shifts.filter(s => s.date === date);
    const totalExistingHours = shiftsForDate.reduce((sum, s) => {
        const h = parseFloat(calculateHours(s.date, s.startTime, s.endTime));
        return sum + (isNaN(h) ? 0 : h);
    }, 0);
    const totalDayHours = totalExistingHours + totalFormHours;

    // When date is changed, autofill times for first shift or continue from previous forms
    const handleDateChange = (newDate) => {
        setDate(newDate);
        // If no forms or all forms are empty, set default 09:00-15:00
        if (shiftForms.length === 1 && !shiftForms[0].startTime && !shiftForms[0].endTime) {
            setShiftForms([{ ...shiftForms[0], startTime: '09:00', endTime: '15:00', date: newDate }]);
        } else if (shiftForms.length > 0) {
            // If forms exist, update their date
            setShiftForms(forms => forms.map(f => ({ ...f, date: newDate })));
        }
    };

    // Add more shift form with time autofill logic
    const handleAddMoreShift = () => {
        const last = shiftForms[shiftForms.length - 1];
        const newStart = last.endTime || "";
        let newDate = date;
        if (!newStart) {
            // If no previous end time, default to 09:00-15:00
            setShiftForms([...shiftForms, { employee: '', startTime: '09:00', endTime: '15:00', date: newDate }]);
        } else {
            // Continue from previous end time, default 7 hours
            const [h, m] = newStart.split(":").map(Number);
            const newEnd = (h + 7 > 24 ? 24 : h + 7).toString().padStart(2, '0') + ":" + m.toString().padStart(2, '0');
            setShiftForms([...shiftForms, { employee: '', startTime: newStart, endTime: newEnd, date: newDate }]);
        }
    };

    // Remove a shift form
    const handleRemoveShift = idx => {
        setShiftForms(forms => forms.filter((_, i) => i !== idx));
    };

    // Update a shift form
    const handleFormChange = (idx, field, value) => {
        setShiftForms(forms => forms.map((f, i) => i === idx ? { ...f, [field]: value } : f));
    };

    // Submit all forms
    const handleMultiSubmit = async () => {
        let hasError = false;
        for (const f of shiftForms) {
            if (!f.employee || !f.startTime || !f.endTime) {
                setError("Please fill all fields in all shift forms.");
                hasError = true;
                break;
            }
        }
        if (hasError) return;
        // Check total hours
        if (totalDayHours > maxHoursPerDay) {
            setError("Cannot submit: total hours exceed 13 for this day.");
            return;
        }
        setError("");
        for (const f of shiftForms) {
            const payload = { employee: f.employee, date, startTime: f.startTime, endTime: f.endTime };
            try {
                if (GOOGLE_SCRIPT_URL === "YOUR_SCRIPT_URL_HERE") {
                    setShifts(prev => [...prev, payload]);
                } else {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: new URLSearchParams(payload),
                    });
                }
            } catch (error) {
                console.error('Error submitting shift:', error);
            }
        }
        setSuccess("Shifts added successfully");
        setShiftForms([{ employee: '', startTime: '', endTime: '' }]);
        setEmployee('');
        setStartTime('');
        setEndTime('');
        fetchShifts();
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

    // When user clicks a calendar day, set date and autofill time if first entry
    const handleCalendarDayClick = (selectedDate) => {
        setDate(selectedDate);
        if (!startTime && !endTime) {
            setStartTime("09:00");
            setEndTime("15:00");
        }
    };

    // Helper to safely format a date, returns '-' if invalid
    function safeFormat(dateObj, fmt) {
        if (!dateObj || isNaN(dateObj.getTime())) return '-';
        try {
            return format(dateObj, fmt);
        } catch (error) {
            console.error('Error formatting date:', error);
            return '-';
        }
    };

    return (
        <div className="container">
            <h1>Calder - Employee Shift Tracker</h1>

            {/* Tab Navigation */}
            <div className="tabs">
                <button
                    onClick={() => setActiveTab('form')}
                    className={`tab-button ${activeTab === 'form' ? 'active' : ''}`}
                >
                    Add Shift
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
                >
                    Calendar & Shifts
                </button>
            </div>

            {/* Show total hours left for the day */}
            {date && (
                <div style={{ fontWeight: 'bold', marginBottom: 16 }}>
                    Hours left for {date}: {Math.max(0, (maxHoursPerDay - dateHours)).toFixed(2)} / 13
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'form' && (
                <div className="form-container">
                    <h2>Add New Shift</h2>
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    {hoursError && <div className="error-message">{hoursError}</div>}
                    <div className="form">
                        {shiftForms.map((f, idx) => (
                            <div key={idx} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8, borderRadius: 4, position: 'relative' }}>
                                <select
                                    value={f.employee}
                                    onChange={e => handleFormChange(idx, 'employee', e.target.value)}
                                    style={{
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        marginBottom: '8px',
                                        width: '100%',
                                        fontSize: '1em',
                                        background: '#fff',
                                        color: f.employee ? '#222' : '#888'
                                    }}
                                >
                                    <option value="" disabled>Select employee</option>
                                    {employeeList.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => handleDateChange(e.target.value)}
                                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '8px', width: '100%', background: '#fff' }}
                                />
                                <div className="time-inputs">
                                    <div>
                                        <label>Start Time:</label>
                                        <input
                                            type="time"
                                            value={f.startTime}
                                            onChange={e => handleFormChange(idx, 'startTime', e.target.value)}
                                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '8px' }}
                                        />
                                    </div>
                                    <div>
                                        <label>End Time:</label>
                                        <input
                                            type="time"
                                            value={f.endTime}
                                            onChange={e => handleFormChange(idx, 'endTime', e.target.value)}
                                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '8px' }}
                                        />
                                    </div>
                                </div>
                                {shiftForms.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveShift(idx)} style={{ position: 'absolute', top: 8, right: 8, background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>Remove</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={handleAddMoreShift} disabled={totalDayHours >= maxHoursPerDay || Math.max(0, (maxHoursPerDay - dateHours)) === 0} style={{ marginBottom: 8 }}>
                            Add More Shift
                        </button>
                        <button onClick={handleMultiSubmit} disabled={totalDayHours > maxHoursPerDay}>Add Shift(s)</button>
                    </div>
                </div>
            )}

            {activeTab === 'calendar' && (
                <div>
                    {/* Calendar View */}
                    <div className="calendar-section">
                        <h2>Calendar View</h2>
                        <div className="month-navigation">
                            <button onClick={handlePrevMonth} aria-label="Previous Month">&#8592;</button>
                            <span className="month-name">{monthName}</span>
                            <button onClick={handleNextMonth} aria-label="Next Month">&#8594;</button>
                        </div>
                        {loading ? (
                            <div className="loading">Loading shifts...</div>
                        ) : (
                            <div className="calendar">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div className="day-header" key={day}>{day}</div>
                                ))}
                                {[...Array(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay())].map((_, i) => (
                                    <div className="day empty" key={`empty-${i}`}></div>
                                ))}
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const dayNum = i + 1;
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                                    const formattedDate = safeFormat(parseLocalDate(safeFormat(dayDate, 'yyyy-MM-dd')), 'yyyy-MM-dd');
                                    const dayShifts = shifts.filter(s => safeFormat(parseLocalDate(s.date), 'yyyy-MM-dd') === formattedDate);
                                    const hasShift = dayShifts.length > 0;
                                    return (
                                        <div
                                            className={`day${hasShift ? ' has-shift' : ''}`}
                                            key={dayNum}
                                        >
                                            <div className="day-number">{dayNum}</div>
                                            {dayShifts.map((s, idx) => (
                                                <div className="shift" key={idx}>
                                                    <b>{s.employee}</b>
                                                    <span>{formatTimeOnly(s.startTime)} - {formatTimeOnly(s.endTime)} ({calculateHours(s.date, s.startTime, s.endTime)}h)</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filter Section */}
                    <div className="filter-section">
                        <h2>Filter Shifts</h2>
                        <div className="filter-inputs">
                            <div>
                                <label className="filter-label">From Date</label>
                                <input
                                    type="date"
                                    value={filterFrom}
                                    onChange={(e) => setFilterFrom(e.target.value)}
                                    className="filter-select"
                                />
                            </div>
                            <div>
                                <label className="filter-label">To Date</label>
                                <input
                                    type="date"
                                    value={filterTo}
                                    onChange={(e) => setFilterTo(e.target.value)}
                                    className="filter-select"
                                />
                            </div>
                            <div>
                                <label className="filter-label">Employee</label>
                                <select
                                    value={filterEmployee}
                                    onChange={(e) => setFilterEmployee(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="">All Employees</option>
                                    {employeeList.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <strong>Total Hours: </strong>
                            {totalFilteredHours.toFixed(2)}
                        </div>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px' }}>
                            <table className="shifts-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Date</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredShifts.map((s, i) => (
                                        <tr key={i}>
                                            <td>{s.employee}</td>
                                            <td>{s.date}</td>
                                            <td>{formatTimeOnly(s.startTime)}</td>
                                            <td>{formatTimeOnly(s.endTime)}</td>
                                            <td>{calculateHours(s.date, s.startTime, s.endTime)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
