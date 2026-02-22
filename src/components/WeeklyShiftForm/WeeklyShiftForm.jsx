import React, { useState, useEffect } from 'react';
import DaySection from './DaySection';
import { addShift } from '../../api/shiftsApi';
import { getWeekDates, createSafeDate, normalizeTime } from '../../utils/dateUtils';
import { calculateHours, getNextShiftTimes } from '../../utils/shiftUtils';
import { getDayConfig } from '../../utils/dateUtils';
import { SUNDAY_MAX_HOURS, MAX_HOURS_PER_DAY } from '../../constants';

export default function WeeklyShiftForm({ shifts, employees, onAddEmployee, setError, setSuccess, onShiftAdded }) {
    const [date, setDate] = useState('');
    const [shiftForms, setShiftForms] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Rebuild week forms when selected date changes
    useEffect(() => {
        if (date) {
            const weekDates = getWeekDates(date);
            setShiftForms(weekDates.map(day => ({
                employee: '',
                startTime: day.defaultStart,
                endTime: day.defaultEnd,
                date: day.date,
                maxHours: day.maxHours,
                notes: ''
            })));
        }
    }, [date]);

    // Set initial date to today on mount
    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
    }, []);

    const getTotalHoursForDate = (formDate) => {
        const existingHours = shifts
            .filter(s => s.date === formDate)
            .reduce((sum, s) => sum + calculateHours(s.date, s.startTime, s.endTime), 0);
        const formHours = shiftForms
            .filter(f => f.date === formDate && f.employee)
            .reduce((sum, f) => sum + calculateHours(f.date, f.startTime, f.endTime), 0);
        return existingHours + formHours;
    };

    const handleFormChange = (idx, field, value) => {
        setShiftForms(forms => forms.map((f, i) => {
            if (i !== idx) return f;
            return {
                ...f,
                [field]: field === 'startTime' || field === 'endTime' ? normalizeTime(value) : value
            };
        }));
    };

    const handleAddMoreShiftForDate = (targetDate, dayIndex) => {
        const nextTimes = getNextShiftTimes(targetDate, shiftForms, shifts);
        const config = getDayConfig(dayIndex);
        setShiftForms(prev => [...prev, {
            employee: '',
            startTime: nextTimes.startTime,
            endTime: nextTimes.endTime,
            date: targetDate,
            maxHours: config.maxHours,
            notes: ''
        }]);
    };

    const handleWeekSubmit = async () => {
        try {
            setError('');
            setSuccess('');
            setIsSubmitting(true);

            const normalizedForms = shiftForms.map(f => ({
                ...f,
                startTime: normalizeTime(f.startTime),
                endTime: normalizeTime(f.endTime)
            }));

            const formsToSubmit = normalizedForms.filter(f => f.employee && f.startTime && f.endTime);
            if (formsToSubmit.length === 0) {
                setError('Please fill at least one shift form.');
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
                    dateHours[existingShift.date] += calculateHours(
                        existingShift.date, existingShift.startTime, existingShift.endTime
                    );
                }
            });

            Object.entries(dateHours).forEach(([d, totalHours]) => {
                const dayOfWeek = createSafeDate(d).getDay();
                const maxHours = dayOfWeek === 0 ? SUNDAY_MAX_HOURS : MAX_HOURS_PER_DAY;
                if (totalHours > maxHours) {
                    const dayName = createSafeDate(d).toLocaleDateString('en-US', { weekday: 'long' });
                    validationErrors.push(`${d} (${dayName}): ${totalHours.toFixed(1)}h exceeds ${maxHours}h limit`);
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
                await addShift(payload);
                onShiftAdded(payload);
            }

            setSuccess(`Successfully added ${formsToSubmit.length} shift(s)!`);

            if (date) {
                const weekDates = getWeekDates(date);
                setShiftForms(weekDates.map(day => ({
                    employee: '',
                    startTime: day.defaultStart,
                    endTime: day.defaultEnd,
                    date: day.date,
                    maxHours: day.maxHours,
                    notes: ''
                })));
            }
        } catch {
            setError('Failed to submit shifts. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const weekDates = getWeekDates(date);

    return (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333', fontSize: '1.8em' }}>
                Add Weekly Shifts
            </h2>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Select any date to show its week (Monday-Sunday):
                </label>
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
                        Showing week: {weekDates[0]?.date} ({weekDates[0]?.dayName}) to {weekDates[6]?.date} ({weekDates[6]?.dayName})
                    </div>
                )}
            </div>

            {date && (
                <div>
                    {weekDates.map((dayInfo) => {
                        const dayFormsWithIdx = shiftForms
                            .map((f, i) => ({ ...f, _idx: i }))
                            .filter(f => f.date === dayInfo.date);
                        const totalHours = getTotalHoursForDate(dayInfo.date);

                        return (
                            <DaySection
                                key={dayInfo.date}
                                dayInfo={dayInfo}
                                dayForms={dayFormsWithIdx}
                                totalHours={totalHours}
                                onFormChange={handleFormChange}
                                onAddMore={() => handleAddMoreShiftForDate(dayInfo.date, dayInfo.dayIndex)}
                                employees={employees}
                                onAddEmployee={onAddEmployee}
                            />
                        );
                    })}

                    <button
                        onClick={handleWeekSubmit}
                        disabled={isSubmitting}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
                            color: 'white', border: 'none', borderRadius: '4px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontSize: '16px', width: '100%', marginTop: '16px', fontWeight: '500',
                            opacity: isSubmitting ? 0.6 : 1, transition: 'all 0.3s ease'
                        }}
                    >
                        {isSubmitting ? 'Submitting Shifts...' : 'Submit All Shifts'}
                    </button>
                </div>
            )}
        </div>
    );
}
