import React, { useState, useEffect, useCallback } from 'react';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGN7S9T_1DPAMe0x8Y5lchI6MCkkmgAcyFudGHSKoMEXttK-G_IODWM9IZT3-qRHP-oA/exec";

export default function ShiftTracker() {
    const [activeTab, setActiveTab] = useState('form');
    const [date, setDate] = useState('');
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [shiftForms, setShiftForms] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    const maxHoursPerDay = 13;
    const sundayMaxHours = 7;

    // FIXED: Timezone-safe date creation
    const createSafeDate = useCallback((dateString) => {
        if (!dateString) return new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, []);

    const formatDate = (date, format) => {
        const d = new Date(date);
        if (format === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
        if (format === 'MMMM yyyy') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (format === 'EEEE') return d.toLocaleDateString('en-US', { weekday: 'long' });
        return d.toISOString();
    };

    const startOfWeek = (date, options = {}) => {
        const d = new Date(date);
        const day = d.getDay();
        if (options.weekStartsOn === 1) {
            const daysToSubtract = day === 0 ? 6 : day - 1;
            return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToSubtract);
        }
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const getDayConfig = (dayIndex) => {
        if (dayIndex === 0) {
            return { maxHours: sundayMaxHours, defaultStart: '11:00', defaultEnd: '18:00' };
        }
        return { maxHours: maxHoursPerDay, defaultStart: '09:00', defaultEnd: '15:00' };
    };

    const calculateHours = useCallback((shiftDate, start, end) => {
        if (!start || !end || !shiftDate) return 0;
        try {
            const startDateTime = new Date(`${shiftDate}T${start}`);
            const endDateTime = new Date(`${shiftDate}T${end}`);
            const diffMs = endDateTime - startDateTime;
            if (diffMs < 0) return 0;
            return diffMs / (1000 * 60 * 60);
        } catch {
            return 0;
        }
    }, []);

    const formatTimeOnly = useCallback((value) => {
        if (!value) return '-';
        const dateObj = new Date(value);
        if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900) return value;
        return dateObj.toISOString().substring(11, 16);
    }, []);

    const getWeekDates = useCallback((selectedDate) => {
        if (!selectedDate) return [];
        const startDate = startOfWeek(createSafeDate(selectedDate), { weekStartsOn: 1 });
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = addDays(startDate, i);
            const dayConfig = getDayConfig(currentDay.getDay());
            weekDates.push({
                date: formatDate(currentDay, 'yyyy-MM-dd'),
                dayName: formatDate(currentDay, 'EEEE'),
                maxHours: dayConfig.maxHours,
                defaultStart: dayConfig.defaultStart,
                defaultEnd: dayConfig.defaultEnd
            });
        }
        return weekDates;
    }, [createSafeDate]);

    const employeeList = Array.from(new Set(shifts.map(s => s.employee))).filter(Boolean);

    const filteredShifts = shifts.filter(s => {
        const shiftDate = s.date;
        const inDateRange = (!filterFrom || shiftDate >= filterFrom) && (!filterTo || shiftDate <= filterTo);
        const matchesEmployee = !filterEmployee || s.employee.toLowerCase().includes(filterEmployee.toLowerCase());
        return inDateRange && matchesEmployee;
    });

    const totalFilteredHours = filteredShifts.reduce((sum, s) => {
        const hours = calculateHours(s.date, s.startTime, s.endTime);
        return sum + hours;
    }, 0);

    const fetchShifts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const demoShifts = [
                { employee: "John Doe", date: "2025-07-15", startTime: "09:00", endTime: "17:00" },
                { employee: "Jane Smith", date: "2025-07-15", startTime: "12:00", endTime: "20:00" },
                { employee: "Mike Johnson", date: "2025-07-16", startTime: "08:30", endTime: "16:30" },
                { employee: "Sarah Wilson", date: "2025-07-17", startTime: "10:00", endTime: "18:00" },
                { employee: "Alice Brown", date: "2025-07-14", startTime: "11:00", endTime: "18:00" }
            ];
            setShifts(demoShifts);
        } catch (error) {
            setError("Failed to load shifts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (date) {
            const weekDates = getWeekDates(date);
            const newForms = weekDates.map(day => ({
                employee: '',
                startTime: day.defaultStart,
                endTime: day.defaultEnd,
                date: day.date,
                maxHours: day.maxHours
            }));
            setShiftForms(newForms);
        }
    }, [date, getWeekDates]);

    const getTotalHoursForDate = useCallback((formDate) => {
        const existingShifts = shifts.filter(s => s.date === formDate);
        const existingHours = existingShifts.reduce((sum, s) => {
            return sum + calculateHours(s.date, s.startTime, s.endTime);
        }, 0);
        const dayForms = shiftForms.filter(f => f.date === formDate && f.employee);
        const formHours = dayForms.reduce((sum, f) => {
            return sum + calculateHours(f.date, f.startTime, f.endTime);
        }, 0);
        return existingHours + formHours;
    }, [shifts, shiftForms, calculateHours]);

    const handleFormChange = (idx, field, value) => {
        setShiftForms(forms => forms.map((f, i) => i === idx ? { ...f, [field]: value } : f));
    };

    const handleAddMoreShiftForDate = (targetDate, dayIndex) => {
        const config = getDayConfig(dayIndex);
        const newForm = {
            employee: '',
            startTime: config.defaultStart,
            endTime: config.defaultEnd,
            date: targetDate,
            maxHours: config.maxHours
        };
        setShiftForms(prev => [...prev, newForm]);
    };

    // FIXED: Improved validation with timezone-safe date handling
    const handleWeekSubmit = async () => {
        try {
            setError('');
            setSuccess('');
            const formsToSubmit = shiftForms.filter(f => f.employee && f.startTime && f.endTime);
            if (formsToSubmit.length === 0) {
                setError("Please fill at least one shift form.");
                return;
            }

            const validationErrors = [];
            const dateHours = {};

            formsToSubmit.forEach(f => {
                const hours = calculateHours(f.date, f.startTime, f.endTime);
                dateHours[f.date] = (dateHours[f.date] || 0) + hours;
            });

            shifts.forEach(existingShift => {
                if (dateHours[existingShift.date] !== undefined) {
                    const existingHours = calculateHours(existingShift.date, existingShift.startTime, existingShift.endTime);
                    dateHours[existingShift.date] += existingHours;
                }
            });

            Object.entries(dateHours).forEach(([date, totalHours]) => {
                const dayOfWeek = createSafeDate(date).getDay(); // FIXED: Use timezone-safe date
                const maxHours = dayOfWeek === 0 ? sundayMaxHours : maxHoursPerDay;
                if (totalHours > maxHours) {
                    const dayName = createSafeDate(date).toLocaleDateString('en-US', { weekday: 'long' });
                    validationErrors.push(`${date} (${dayName}): ${totalHours.toFixed(1)}h exceeds ${maxHours}h limit`);
                }
            });

            if (validationErrors.length > 0) {
                setError(`Hours exceed daily limits:\n${validationErrors.join('\n')}`);
                return;
            }

            for (const form of formsToSubmit) {
                setShifts(prev => [...prev, form]);
            }

            setSuccess(`Successfully added ${formsToSubmit.length} shift(s)!`);

            if (date) {
                const weekDates = getWeekDates(date);
                const resetForms = weekDates.map(day => ({
                    employee: '',
                    startTime: day.defaultStart,
                    endTime: day.defaultEnd,
                    date: day.date,
                    maxHours: day.maxHours
                }));
                setShiftForms(resetForms);
            }
        } catch (error) {
            setError('Failed to submit shifts. Please try again.');
        }
    };

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    useEffect(() => {
        fetchShifts();
        setDate(formatDate(new Date(), 'yyyy-MM-dd'));
    }, [fetchShifts]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthName = formatDate(currentDate, 'MMMM yyyy');

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px', fontSize: '2.5em', fontWeight: '600' }}>
                Calder - Employee Shift Tracker
            </h1>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <button
                    onClick={() => setActiveTab('form')}
                    style={{
                        flex: 1, padding: '15px 30px', border: 'none',
                        backgroundColor: activeTab === 'form' ? '#007bff' : '#fff',
                        color: activeTab === 'form' ? 'white' : '#666',
                        cursor: 'pointer', fontSize: '16px', transition: 'all 0.3s ease',
                        borderBottom: activeTab === 'form' ? '3px solid #0056b3' : '3px solid transparent'
                    }}
                >
                    Add Shifts
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    style={{
                        flex: 1, padding: '15px 30px', border: 'none',
                        backgroundColor: activeTab === 'calendar' ? '#007bff' : '#fff',
                        color: activeTab === 'calendar' ? 'white' : '#666',
                        cursor: 'pointer', fontSize: '16px', transition: 'all 0.3s ease',
                        borderBottom: activeTab === 'calendar' ? '3px solid #0056b3' : '3px solid transparent'
                    }}
                >
                    Calendar & Reports
                </button>
            </div>

            {error && (
                <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #f5c6cb', fontWeight: '500', whiteSpace: 'pre-line' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #c3e6cb', fontWeight: '500' }}>
                    {success}
                </div>
            )}

            {activeTab === 'form' && (
                <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333', fontSize: '1.8em' }}>Add Weekly Shifts</h2>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>Select any date to show its week (Monday-Sunday):</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', width: '200px', fontSize: '14px' }}
                        />
                        {date && (
                            <div style={{ marginTop: '8px', color: '#666', fontSize: '0.9em' }}>
                                Selected date: {date} ({createSafeDate(date).toLocaleDateString('en-US', { weekday: 'long' })})
                                <br />
                                Showing week: {getWeekDates(date)[0]?.date} ({getWeekDates(date)[0]?.dayName}) to {getWeekDates(date)[6]?.date} ({getWeekDates(date)[6]?.dayName})
                            </div>
                        )}
                    </div>

                    {date && (
                        <div>
                            {getWeekDates(date).map((dayInfo, weekIndex) => {
                                const dayForms = shiftForms.filter(f => f.date === dayInfo.date);
                                const totalHours = getTotalHoursForDate(dayInfo.date);
                                const remainingHours = Math.max(0, dayInfo.maxHours - totalHours);
                                const canAddMore = remainingHours > 0 && totalHours < dayInfo.maxHours;

                                return (
                                    <div key={weekIndex} style={{
                                        border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '16px',
                                        backgroundColor: totalHours >= dayInfo.maxHours ? '#fff5f5' : '#f8f9fa'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h3 style={{ margin: 0, color: '#333' }}>{dayInfo.dayName} - {dayInfo.date}</h3>
                                            <div style={{
                                                color: totalHours >= dayInfo.maxHours ? '#dc3545' : (remainingHours > 0 ? '#28a745' : '#dc3545'),
                                                fontWeight: '500'
                                            }}>
                                                {totalHours >= dayInfo.maxHours ? (
                                                    <span>⚠️ Maximum hours reached ({totalHours.toFixed(1)}/{dayInfo.maxHours})</span>
                                                ) : (
                                                    <span>Hours Left: {remainingHours.toFixed(1)} / {dayInfo.maxHours}</span>
                                                )}
                                            </div>
                                        </div>

                                        {dayForms.map((form, formIdx) => (
                                            <div key={formIdx} style={{
                                                backgroundColor: 'white', padding: '12px', marginBottom: '8px',
                                                borderRadius: '4px', border: '1px solid #e9ecef'
                                            }}>
                                                <select
                                                    value={form.employee}
                                                    onChange={e => handleFormChange(shiftForms.indexOf(form), 'employee', e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px', marginBottom: '8px',
                                                        border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em',
                                                        backgroundColor: '#fff', color: form.employee ? '#222' : '#888'
                                                    }}
                                                >
                                                    <option value="">Select employee</option>
                                                    {employeeList.map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                                <div style={{ display: 'flex', gap: '16px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>Start Time:</label>
                                                        <input
                                                            type="time"
                                                            value={form.startTime}
                                                            onChange={e => handleFormChange(shiftForms.indexOf(form), 'startTime', e.target.value)}
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>End Time:</label>
                                                        <input
                                                            type="time"
                                                            value={form.endTime}
                                                            onChange={e => handleFormChange(shiftForms.indexOf(form), 'endTime', e.target.value)}
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                        />
                                                    </div>
                                                </div>
                                                {form.employee && form.startTime && form.endTime && (
                                                    <div style={{ marginTop: '8px', color: '#666', fontSize: '0.9em' }}>
                                                        Hours: {calculateHours(form.date, form.startTime, form.endTime).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {canAddMore ? (
                                            <button
                                                type="button"
                                                onClick={() => handleAddMoreShiftForDate(dayInfo.date, createSafeDate(dayInfo.date).getDay())}
                                                style={{
                                                    padding: '8px 16px', backgroundColor: '#28a745', color: 'white',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                    width: '100%', fontSize: '0.9em'
                                                }}
                                            >
                                                Add More Shift ({remainingHours.toFixed(1)} hours left)
                                            </button>
                                        ) : (
                                            <button
                                                type="button" disabled
                                                style={{
                                                    padding: '8px 16px', backgroundColor: '#6c757d', color: 'white',
                                                    border: 'none', borderRadius: '4px', cursor: 'not-allowed',
                                                    width: '100%', fontSize: '0.9em', opacity: 0.6
                                                }}
                                            >
                                                {totalHours >= dayInfo.maxHours ? 'Maximum hours reached' : 'No hours remaining'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                onClick={handleWeekSubmit}
                                style={{
                                    padding: '12px 24px', backgroundColor: '#007bff', color: 'white',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    fontSize: '16px', width: '100%', marginTop: '16px', fontWeight: '500'
                                }}
                            >
                                Submit All Shifts
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'calendar' && (
                <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>Calendar & Reports</h2>
                    <div style={{ marginBottom: '20px', fontSize: '1.1em', fontWeight: '500' }}>
                        <strong>Total Hours: </strong> {totalFilteredHours.toFixed(2)}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px' }}>
                        <thead>
                        <tr>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>Employee</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>Start Time</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>End Time</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>Hours</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredShifts.map((s, i) => (
                            <tr key={i}>
                                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{s.employee}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{s.date}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{formatTimeOnly(s.startTime)}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{formatTimeOnly(s.endTime)}</td>
                                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>{calculateHours(s.date, s.startTime, s.endTime).toFixed(2)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}