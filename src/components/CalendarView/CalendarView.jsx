import React, { useState } from 'react';
import CalendarGrid from './CalendarGrid';
import ShiftsReport from './ShiftsReport';
import EditModal from './EditModal';
import { addShift, deleteShift, isLocalMode } from '../../api/shiftsApi';
import { normalizeTime, createSafeDate } from '../../utils/dateUtils';
import { calculateHours, getNextShiftTimes } from '../../utils/shiftUtils';
import { SUNDAY_MAX_HOURS, MAX_HOURS_PER_DAY } from '../../constants';

export default function CalendarView({ shifts, employees, loading, setError, setSuccess, setShifts, onRefreshShifts }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDate, setEditingDate] = useState(null);
    const [editForms, setEditForms] = useState([]);
    const [isSavingEdits, setIsSavingEdits] = useState(false);

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const handleCalendarCellClick = (formattedDate, dayShifts) => {
        setEditingDate(formattedDate);

        const forms = dayShifts.map(shift => ({
            ...shift,
            startTime: normalizeTime(shift.startTime),
            endTime: normalizeTime(shift.endTime),
            isExisting: true
        }));

        const dayOfWeek = createSafeDate(formattedDate).getDay();
        const maxHours = dayOfWeek === 0 ? SUNDAY_MAX_HOURS : MAX_HOURS_PER_DAY;
        const totalHours = dayShifts.reduce((sum, s) => sum + calculateHours(s.date, s.startTime, s.endTime), 0);

        if (totalHours < maxHours) {
            const nextTimes = getNextShiftTimes(formattedDate, forms, shifts);
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

    const handleEditFormChange = (idx, field, value) => {
        setEditForms(forms => forms.map((f, i) => {
            if (i !== idx) return f;
            return {
                ...f,
                [field]: field === 'startTime' || field === 'endTime' ? normalizeTime(value) : value
            };
        }));
    };

    const handleAddShiftToEditModal = () => {
        const nextTimes = getNextShiftTimes(editingDate, editForms, shifts);
        setEditForms(prev => [...prev, {
            employee: '',
            date: editingDate,
            startTime: nextTimes.startTime,
            endTime: nextTimes.endTime,
            notes: '',
            isExisting: false
        }]);
    };

    const handleRemoveShiftFromEditModal = (idx) => {
        setEditForms(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveEdits = async () => {
        try {
            setError('');
            setSuccess('');
            setIsSavingEdits(true);

            const normalizedForms = editForms.map(f => ({
                ...f,
                startTime: normalizeTime(f.startTime),
                endTime: normalizeTime(f.endTime)
            }));

            const validForms = normalizedForms.filter(f => f.employee && f.startTime && f.endTime);
            if (validForms.length === 0) {
                setError('At least one shift must be filled out.');
                return;
            }

            const totalHours = validForms.reduce(
                (sum, f) => sum + calculateHours(f.date, f.startTime, f.endTime), 0
            );
            const dayOfWeek = createSafeDate(editingDate).getDay();
            const maxHours = dayOfWeek === 0 ? SUNDAY_MAX_HOURS : MAX_HOURS_PER_DAY;
            if (totalHours > maxHours) {
                setError(`Total hours (${totalHours.toFixed(1)}) exceed daily limit (${maxHours}h)`);
                return;
            }

            if (isLocalMode()) {
                const updated = shifts.filter(s => s.date !== editingDate);
                validForms.forEach(f => {
                    if (f.employee) {
                        updated.push({
                            employee: f.employee,
                            date: f.date,
                            startTime: f.startTime,
                            endTime: f.endTime,
                            notes: f.notes || ''
                        });
                    }
                });
                setShifts(updated);
            } else {
                const existingShifts = shifts.filter(s => s.date === editingDate && s.rowIndex);
                for (const shift of existingShifts) {
                    await deleteShift(shift.rowIndex);
                }
                for (const form of validForms) {
                    if (form.employee) {
                        await addShift({
                            employee: form.employee,
                            date: form.date,
                            startTime: form.startTime,
                            endTime: form.endTime,
                            notes: form.notes || ''
                        });
                    }
                }
                await onRefreshShifts();
            }

            setSuccess(`Successfully updated shifts for ${editingDate}!`);
            setShowEditModal(false);
            setEditingDate(null);
            setEditForms([]);
        } catch {
            setError('Failed to save changes. Please try again.');
        } finally {
            setIsSavingEdits(false);
        }
    };

    return (
        <div>
            <CalendarGrid
                shifts={shifts}
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onCellClick={handleCalendarCellClick}
                loading={loading}
            />
            <ShiftsReport shifts={shifts} employees={employees} />
            <EditModal
                show={showEditModal}
                editingDate={editingDate}
                editForms={editForms}
                employees={employees}
                isSaving={isSavingEdits}
                onClose={() => setShowEditModal(false)}
                onFormChange={handleEditFormChange}
                onAddShift={handleAddShiftToEditModal}
                onRemoveShift={handleRemoveShiftFromEditModal}
                onSave={handleSaveEdits}
            />
        </div>
    );
}
