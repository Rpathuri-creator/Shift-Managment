import React, { useState, useEffect, useCallback } from 'react';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxMW0ecBV3a5mFujwT7XIHI_vbqEzjqhhl5D4p8NQPHHR3MIrqC-gXAOzD71V_UIPsrHg/exec";

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
    const [employees, setEmployees] = useState([]);
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit modal states
    const [editingDate, setEditingDate] = useState(null);
    const [editForms, setEditForms] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSavingEdits, setIsSavingEdits] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());

    const maxHoursPerDay = 13;
    const sundayMaxHours = 7;

    // Normalize time to ensure two-digit format (HH:MM)
    const normalizeTime = (timeString) => {
        if (!timeString) return '';
        const parts = timeString.split(':');
        if (parts.length !== 2) return timeString;
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Get the next shift times based on existing shifts for a date
    const getNextShiftTimes = (targetDate, existingForms) => {
        const dayOfWeek = createSafeDate(targetDate).getDay();
        const isSunday = dayOfWeek === 0;

        // Get all existing shifts for this date from saved shifts
        const savedShiftsForDate = shifts.filter(s => s.date === targetDate);

        // Get all forms for this date that have times filled (even if employee not selected)
        const formsWithTimesForDate = existingForms.filter(f =>
            f.date === targetDate && f.startTime && f.endTime
        );

        // Combine both sources
        const allShiftsForDate = [...savedShiftsForDate, ...formsWithTimesForDate];

        if (allShiftsForDate.length === 0) {
            // First shift - use defaults
            if (isSunday) {
                return { startTime: '11:00', endTime: '18:00' };
            } else {
                return { startTime: '09:00', endTime: '22:00' };
            }
        }

        // Find the latest end time
        let latestEndTime = null;
        allShiftsForDate.forEach(shift => {
            const endTime = normalizeTime(shift.endTime);
            if (!latestEndTime || endTime > latestEndTime) {
                latestEndTime = endTime;
            }
        });

        // Next shift starts when the last one ended
        const startTime = latestEndTime;
        const endTime = isSunday ? '18:00' : '22:00';

        return { startTime, endTime };
    };

    // Fetch employees from existing shifts in Google Sheets
    const fetchEmployees = useCallback(async () => {
        try {
            if (GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE") || !GOOGLE_SCRIPT_URL.includes("script.google.com")) {
                console.log("No Google Apps Script configured for employees");
                return;
            }

            const response = await fetch(GOOGLE_SCRIPT_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch shifts for employees');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            const uniqueEmployees = Array.from(new Set(
                (data.shifts || [])
                    .map(shift => shift.employee)
                    .filter(Boolean)
            )).sort();

            setEmployees(uniqueEmployees);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    }, []);

    // Add new employee
    const addEmployee = async (name) => {
        try {
            if (!name.trim()) {
                setError("Employee name is required");
                return false;
            }

            if (employees.includes(name.trim())) {
                setError("Employee already exists");
                return false;
            }

            if (GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE") || !GOOGLE_SCRIPT_URL.includes("script.google.com")) {
                setEmployees(prev => [...prev, name.trim()].sort());
                setSuccess(`Added employee: ${name}`);
                return true;
            }

            setEmployees(prev => [...prev, name.trim()].sort());
            setSuccess(`Added employee: ${name} (will be saved when first shift is created)`);
            return true;
        } catch (error) {
            console.error('Error adding employee:', error);
            setError(`Failed to add employee: ${error.message}`);
            return false;
        }
    };

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
        return { maxHours: maxHoursPerDay, defaultStart: '09:00', defaultEnd: '22:00' };
    };

    const calculateHours = useCallback((shiftDate, start, end) => {
        if (!start || !end || !shiftDate) return 0;
        try {
            const normalizedStart = normalizeTime(start);
            const normalizedEnd = normalizeTime(end);
            const startDateTime = new Date(`${shiftDate}T${normalizedStart}`);
            const endDateTime = new Date(`${shiftDate}T${normalizedEnd}`);
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
        if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900) {
            return normalizeTime(value);
        }
        return normalizeTime(dateObj.toISOString().substring(11, 16));
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

    // Calendar cell click handler
    const handleCalendarCellClick = (formattedDate, dayShifts) => {
        setEditingDate(formattedDate);

        // Convert existing shifts to editable forms with normalized times
        const forms = dayShifts.map(shift => ({
            ...shift,
            startTime: normalizeTime(shift.startTime),
            endTime: normalizeTime(shift.endTime),
            isExisting: true
        }));

        // Add empty form for new shift if there's remaining hours
        const dayOfWeek = createSafeDate(formattedDate).getDay();
        const maxHours = dayOfWeek === 0 ? sundayMaxHours : maxHoursPerDay;
        const totalHours = dayShifts.reduce((sum, s) => sum + calculateHours(s.date, s.startTime, s.endTime), 0);

        if (totalHours < maxHours) {
            const nextTimes = getNextShiftTimes(formattedDate, forms);
            forms.push({
                employee: '',
                date: formattedDate,
                startTime: nextTimes.startTime,
                endTime: nextTimes.endTime,
                notes: '',
                isExisting: false
            });
        }

        setEditForms(forms);
        setShowEditModal(true);
    };

    // Handle saving edits
    const handleSaveEdits = async () => {
        try {
            setError('');
            setSuccess('');
            setIsSavingEdits(true);

            // Normalize times in all forms before validation
            const normalizedForms = editForms.map(f => ({
                ...f,
                startTime: normalizeTime(f.startTime),
                endTime: normalizeTime(f.endTime)
            }));

            // Validate forms
            const validForms = normalizedForms.filter(f => f.employee && f.startTime && f.endTime);
            if (validForms.length === 0) {
                setError("At least one shift must be filled out.");
                return;
            }

            // Check hour limits
            const totalHours = validForms.reduce((sum, f) => sum + calculateHours(f.date, f.startTime, f.endTime), 0);
            const dayOfWeek = createSafeDate(editingDate).getDay();
            const maxHours = dayOfWeek === 0 ? sundayMaxHours : maxHoursPerDay;

            if (totalHours > maxHours) {
                setError(`Total hours (${totalHours.toFixed(1)}) exceed daily limit (${maxHours}h)`);
                return;
            }

            if (GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE") || !GOOGLE_SCRIPT_URL.includes("script.google.com")) {
                // Local mode - update state directly
                const newShifts = [...shifts];

                // Remove existing shifts for this date
                const filteredShifts = newShifts.filter(s => s.date !== editingDate);

                // Add all valid forms as shifts with normalized times
                validForms.forEach(form => {
                    if (!form.isExisting || form.employee) {
                        filteredShifts.push({
                            employee: form.employee,
                            date: form.date,
                            startTime: form.startTime,
                            endTime: form.endTime,
                            notes: form.notes || ''
                        });
                    }
                });

                setShifts(filteredShifts);
            } else {
                // First, delete existing shifts for this date
                const existingShifts = shifts.filter(s => s.date === editingDate && s.rowIndex);
                for (const shift of existingShifts) {
                    const deleteData = new URLSearchParams({
                        method: 'DELETE',
                        rowIndex: shift.rowIndex.toString()
                    });
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: deleteData
                    });
                }

                // Then add all valid forms as new shifts
                for (const form of validForms) {
                    if (form.employee) {
                        const payload = {
                            employee: form.employee,
                            date: form.date,
                            startTime: form.startTime,
                            endTime: form.endTime,
                            notes: form.notes || ''
                        };

                        const formData = new URLSearchParams(payload);
                        await fetch(GOOGLE_SCRIPT_URL, {
                            method: 'POST',
                            body: formData
                        });
                    }
                }

                // Refresh shifts data
                await fetchShifts();
            }

            setSuccess(`Successfully updated shifts for ${editingDate}!`);
            setShowEditModal(false);
            setEditingDate(null);
            setEditForms([]);

        } catch (error) {
            console.error('Error saving edits:', error);
            setError('Failed to save changes. Please try again.');
        } finally {
            setIsSavingEdits(false);
        }
    };

    const employeeList = employees.length > 0 ? employees : Array.from(new Set(shifts.map(s => s.employee))).filter(Boolean);

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

            if (GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE") || !GOOGLE_SCRIPT_URL.includes("script.google.com")) {
                console.log("No Google Apps Script configured, starting with empty data");
                setShifts([]);
                return;
            }

            const response = await fetch(GOOGLE_SCRIPT_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch shifts');
            }

            const data = await response.json();
            // Normalize times when fetching
            const normalizedShifts = (data.shifts || []).map(shift => ({
                ...shift,
                startTime: normalizeTime(shift.startTime),
                endTime: normalizeTime(shift.endTime)
            }));
            setShifts(normalizedShifts);
        } catch (error) {
            console.error("Error fetching shifts:", error);
            setError("Failed to load shifts from Google Apps Script. Starting with empty data.");
            setShifts([]);
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
                maxHours: day.maxHours,
                notes: ''
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
        setShiftForms(forms => forms.map((f, i) => {
            if (i === idx) {
                const updatedForm = { ...f, [field]: field === 'startTime' || field === 'endTime' ? normalizeTime(value) : value };
                return updatedForm;
            }
            return f;
        }));
    };

    const handleEditFormChange = (idx, field, value) => {
        setEditForms(forms => forms.map((f, i) => {
            if (i === idx) {
                const updatedForm = { ...f, [field]: field === 'startTime' || field === 'endTime' ? normalizeTime(value) : value };
                return updatedForm;
            }
            return f;
        }));
    };

    const handleAddMoreShiftForDate = (targetDate, dayIndex) => {
        // Pass current shiftForms to get the next shift times
        setShiftForms(prev => {
            const nextTimes = getNextShiftTimes(targetDate, prev);
            const config = getDayConfig(dayIndex);
            const newForm = {
                employee: '',
                startTime: nextTimes.startTime,
                endTime: nextTimes.endTime,
                date: targetDate,
                maxHours: config.maxHours,
                notes: ''
            };
            return [...prev, newForm];
        });
    };

    const handleWeekSubmit = async () => {
        try {
            setError('');
            setSuccess('');
            setIsSubmitting(true);

            // Normalize times before submission
            const normalizedForms = shiftForms.map(f => ({
                ...f,
                startTime: normalizeTime(f.startTime),
                endTime: normalizeTime(f.endTime)
            }));

            const formsToSubmit = normalizedForms.filter(f => f.employee && f.startTime && f.endTime);
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
                const dayOfWeek = createSafeDate(date).getDay();
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
                const payload = {
                    employee: form.employee,
                    date: form.date,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    notes: form.notes || ''
                };

                if (GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE") || !GOOGLE_SCRIPT_URL.includes("script.google.com")) {
                    setShifts(prev => [...prev, payload]);
                } else {
                    const formData = new URLSearchParams(payload);
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: formData,
                    });
                    setShifts(prev => [...prev, payload]);
                }
            }

            setSuccess(`Successfully added ${formsToSubmit.length} shift(s)!`);

            if (date) {
                const weekDates = getWeekDates(date);
                const resetForms = weekDates.map(day => ({
                    employee: '',
                    startTime: day.defaultStart,
                    endTime: day.defaultEnd,
                    date: day.date,
                    maxHours: day.maxHours,
                    notes: ''
                }));
                setShiftForms(resetForms);
            }
        } catch (error) {
            setError('Failed to submit shifts. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    useEffect(() => {
        fetchShifts();
        fetchEmployees();
        setDate(formatDate(new Date(), 'yyyy-MM-dd'));
    }, [fetchShifts, fetchEmployees]);

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

    // Edit Modal Component
    const EditModal = () => {
        if (!showEditModal || !editingDate) return null;

        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{
                    backgroundColor: 'white', borderRadius: '12px', padding: '30px',
                    maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#333' }}>Edit Shifts for {editingDate}</h3>
                        <button
                            onClick={() => setShowEditModal(false)}
                            style={{ backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
                        >
                            ×
                        </button>
                    </div>

                    {editForms.map((form, idx) => (
                        <div key={idx} style={{
                            marginBottom: '20px',
                            padding: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            backgroundColor: form.isExisting ? '#f8f9fa' : '#fff'
                        }}>
                            {form.isExisting && (
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                                    Existing Shift
                                </div>
                            )}

                            <div style={{ marginBottom: '12px' }}>
                                <select
                                    value={form.employee}
                                    onChange={e => handleEditFormChange(idx, 'employee', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select employee</option>
                                    {employeeList.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={e => handleEditFormChange(idx, 'startTime', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>End Time</label>
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={e => handleEditFormChange(idx, 'endTime', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => handleEditFormChange(idx, 'notes', e.target.value)}
                                    placeholder="Add any notes or comments..."
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            {form.employee && form.startTime && form.endTime && (
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                    Hours: {calculateHours(form.date, form.startTime, form.endTime).toFixed(2)}
                                </div>
                            )}

                            <button
                                onClick={() => setEditForms(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Remove Shift
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            const nextTimes = getNextShiftTimes(editingDate, editForms);
                            setEditForms(prev => [...prev, {
                                employee: '',
                                date: editingDate,
                                startTime: nextTimes.startTime,
                                endTime: nextTimes.endTime,
                                notes: '',
                                isExisting: false
                            }]);
                        }}
                        style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginBottom: '20px',
                            width: '100%'
                        }}
                    >
                        Add Another Shift
                    </button>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowEditModal(false)}
                            disabled={isSavingEdits}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSavingEdits ? 'not-allowed' : 'pointer',
                                opacity: isSavingEdits ? 0.6 : 1
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdits}
                            disabled={isSavingEdits}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: isSavingEdits ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isSavingEdits ? 'not-allowed' : 'pointer',
                                opacity: isSavingEdits ? 0.6 : 1
                            }}
                        >
                            {isSavingEdits ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                                    <select
                                                        value={form.employee}
                                                        onChange={e => handleFormChange(shiftForms.indexOf(form), 'employee', e.target.value)}
                                                        style={{
                                                            flex: 1, padding: '8px',
                                                            border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em',
                                                            backgroundColor: '#fff', color: form.employee ? '#222' : '#888'
                                                        }}
                                                    >
                                                        <option value="">Select employee</option>
                                                        {employeeList.map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddEmployee(!showAddEmployee)}
                                                        style={{
                                                            padding: '8px 12px', backgroundColor: '#28a745', color: 'white',
                                                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                                                            fontSize: '0.9em', whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        + Add
                                                    </button>
                                                </div>
                                                {showAddEmployee && (
                                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="New employee name"
                                                            value={newEmployeeName}
                                                            onChange={e => setNewEmployeeName(e.target.value)}
                                                            style={{
                                                                flex: 1, padding: '8px',
                                                                border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em'
                                                            }}
                                                            onKeyPress={e => {
                                                                if (e.key === 'Enter') {
                                                                    addEmployee(newEmployeeName).then(success => {
                                                                        if (success) {
                                                                            setNewEmployeeName('');
                                                                            setShowAddEmployee(false);
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                addEmployee(newEmployeeName).then(success => {
                                                                    if (success) {
                                                                        setNewEmployeeName('');
                                                                        setShowAddEmployee(false);
                                                                    }
                                                                });
                                                            }}
                                                            style={{
                                                                padding: '8px 12px', backgroundColor: '#007bff', color: 'white',
                                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowAddEmployee(false);
                                                                setNewEmployeeName('');
                                                            }}
                                                            style={{
                                                                padding: '8px 12px', backgroundColor: '#6c757d', color: 'white',
                                                                border: 'none', borderRadius: '4px', cursor: 'pointer'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
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
                                                <div style={{ marginBottom: '8px' }}>
                                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>Notes (optional):</label>
                                                    <textarea
                                                        value={form.notes}
                                                        onChange={e => handleFormChange(shiftForms.indexOf(form), 'notes', e.target.value)}
                                                        placeholder="Add any notes or comments for this shift..."
                                                        style={{
                                                            width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px',
                                                            fontSize: '14px', resize: 'vertical', minHeight: '60px',
                                                            fontFamily: 'inherit'
                                                        }}
                                                    />
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
                                disabled={isSubmitting}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
                                    color: 'white',
                                    border: 'none', borderRadius: '4px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontSize: '16px', width: '100%', marginTop: '16px', fontWeight: '500',
                                    opacity: isSubmitting ? 0.6 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {isSubmitting ? 'Submitting Shifts...' : 'Submit All Shifts'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'calendar' && (
                <div>
                    {/* Calendar View */}
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
                        <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>Calendar View</h2>
                        <div style={{ marginBottom: '15px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                            Click on any date to edit shifts for that day
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 20px' }}>
                            <button onClick={handlePrevMonth} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ←
                            </button>
                            <span style={{ fontSize: '1.5em', fontWeight: '600', color: '#333' }}>{monthName}</span>
                            <button onClick={handleNextMonth} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                →
                            </button>
                        </div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '1.1em' }}>Loading shifts...</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', backgroundColor: '#e9ecef', padding: '2px', borderRadius: '8px' }}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} style={{ backgroundColor: '#6c757d', color: 'white', padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '0.9em' }}>
                                        {day}
                                    </div>
                                ))}
                                {[...Array(firstDayOfMonth)].map((_, i) => (
                                    <div key={`empty-${i}`} style={{ backgroundColor: '#f8f9fa', minHeight: '100px' }}></div>
                                ))}
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const dayNum = i + 1;
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                                    const formattedDate = formatDate(dayDate, 'yyyy-MM-dd');
                                    const dayShifts = shifts.filter(s => s.date === formattedDate);
                                    const hasShift = dayShifts.length > 0;
                                    return (
                                        <div
                                            key={dayNum}
                                            onClick={() => handleCalendarCellClick(formattedDate, dayShifts)}
                                            style={{
                                                backgroundColor: hasShift ? '#e3f2fd' : '#fff',
                                                minHeight: '100px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s ease',
                                                border: '1px solid transparent'
                                            }}
                                            onMouseEnter={e => {
                                                e.target.style.backgroundColor = hasShift ? '#bbdefb' : '#f5f5f5';
                                                e.target.style.border = '1px solid #007bff';
                                            }}
                                            onMouseLeave={e => {
                                                e.target.style.backgroundColor = hasShift ? '#e3f2fd' : '#fff';
                                                e.target.style.border = '1px solid transparent';
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', fontSize: '0.9em', color: '#333', marginBottom: '4px' }}>
                                                {dayNum}
                                            </div>
                                            {dayShifts.map((s, idx) => (
                                                <div key={idx} style={{ backgroundColor: '#007bff', color: 'white', padding: '2px 4px', borderRadius: '3px', fontSize: '0.7em', marginBottom: '2px', lineHeight: '1.2' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.8em' }}>{s.employee}</div>
                                                    <div style={{ fontSize: '0.7em', opacity: 0.9 }}>
                                                        {formatTimeOnly(s.startTime)} - {formatTimeOnly(s.endTime)} ({calculateHours(s.date, s.startTime, s.endTime).toFixed(1)}h)
                                                    </div>
                                                    {s.notes && (
                                                        <div style={{ fontSize: '0.6em', opacity: 0.8, fontStyle: 'italic', marginTop: '1px' }}>
                                                            {s.notes.length > 20 ? `${s.notes.substring(0, 20)}...` : s.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filter Section */}
                    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>Filter Shifts</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>From Date</label>
                                <input
                                    type="date"
                                    value={filterFrom}
                                    onChange={(e) => setFilterFrom(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>To Date</label>
                                <input
                                    type="date"
                                    value={filterTo}
                                    onChange={(e) => setFilterTo(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>Employee</label>
                                <select
                                    value={filterEmployee}
                                    onChange={(e) => setFilterEmployee(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                                >
                                    <option value="">All Employees</option>
                                    {employeeList.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px', fontSize: '1.1em', fontWeight: '500' }}>
                            <strong>Total Hours: </strong>
                            {totalFilteredHours.toFixed(2)}
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <thead>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>Employee</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>Start Time</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>End Time</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>Hours</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333', position: 'sticky', top: 0, zIndex: 10 }}>Notes</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredShifts.map((s, i) => (
                                    <tr key={i} style={{ ':hover': { backgroundColor: '#f8f9fa' } }}>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6' }}>{s.employee}</td>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6' }}>{s.date}</td>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6' }}>{formatTimeOnly(s.startTime)}</td>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6' }}>{formatTimeOnly(s.endTime)}</td>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6' }}>{calculateHours(s.date, s.startTime, s.endTime).toFixed(2)}</td>
                                        <td style={{ padding: '12px', borderBottom: i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6', maxWidth: '200px' }}>
                                            <div style={{
                                                maxHeight: '40px',
                                                overflowY: 'auto',
                                                fontSize: '0.9em',
                                                color: s.notes ? '#333' : '#999',
                                                fontStyle: s.notes ? 'normal' : 'italic'
                                            }}>
                                                {s.notes || 'No notes'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <EditModal />
        </div>
    );
}