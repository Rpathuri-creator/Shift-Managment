import React, { useState, useEffect, useReducer } from 'react';
import CalendarGrid from './CalendarGrid';
import EditModal from './EditModal';
import { addShift, deleteShift, isLocalMode } from '../../api/shiftsApi';
import { normalizeTime, createSafeDate } from '../../utils/dateUtils';
import { calculateHours, getNextShiftTimes } from '../../utils/shiftUtils';
import { SUNDAY_MAX_HOURS, MAX_HOURS_PER_DAY } from '../../constants';

const modalInitial = { show: false, date: null, forms: [], isSaving: false };

function modalReducer(state, action) {
    switch (action.type) {
        case 'OPEN':
            return { ...state, show: true, date: action.date, forms: action.forms };
        case 'CLOSE':
            return modalInitial;
        case 'CHANGE_FORM':
            return {
                ...state,
                forms: state.forms.map((f, i) => i !== action.idx ? f : {
                    ...f,
                    [action.field]: action.field === 'startTime' || action.field === 'endTime'
                        ? normalizeTime(action.value) : action.value,
                }),
            };
        case 'ADD_FORM':
            return { ...state, forms: [...state.forms, action.form] };
        case 'REMOVE_FORM':
            return { ...state, forms: state.forms.filter((_, i) => i !== action.idx) };
        case 'SAVING_START':
            return { ...state, isSaving: true };
        case 'SAVING_DONE':
            return { ...state, isSaving: false };
        default:
            return state;
    }
}

export default function CalendarView({ shifts, employees, loading, setError, setSuccess, setShifts, onLoadMonth, onReloadMonth, role }) {
    const canEdit = role === 'Admin' || role === 'Manager';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modal, dispatchModal] = useReducer(modalReducer, modalInitial);
    const { show: showEditModal, date: editingDate, forms: editForms, isSaving: isSavingEdits } = modal;

    // Load shifts for the displayed month whenever it changes
    useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        onLoadMonth(year, month);
    }, [currentDate, onLoadMonth]);

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const handleCalendarCellClick = (formattedDate, dayShifts) => {
        if (!canEdit) return;
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

        dispatchModal({ type: 'OPEN', date: formattedDate, forms });
    };

    const handleEditFormChange = (idx, field, value) => {
        dispatchModal({ type: 'CHANGE_FORM', idx, field, value });
    };

    const handleAddShiftToEditModal = () => {
        const nextTimes = getNextShiftTimes(editingDate, editForms, shifts);
        dispatchModal({
            type: 'ADD_FORM',
            form: {
                employee: '',
                date: editingDate,
                startTime: nextTimes.startTime,
                endTime: nextTimes.endTime,
                notes: '',
                isExisting: false
            }
        });
    };

    const handleRemoveShiftFromEditModal = (idx) => {
        dispatchModal({ type: 'REMOVE_FORM', idx });
    };

    const handleSaveEdits = async () => {
        try {
            setError('');
            setSuccess('');
            dispatchModal({ type: 'SAVING_START' });

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
                // Reload this month to get fresh row indices after deletes/adds
                const [year, month] = editingDate.split('-').map(Number);
                await onReloadMonth(year, month);
            }

            setSuccess(`Successfully updated shifts for ${editingDate}!`);
            dispatchModal({ type: 'CLOSE' });
        } catch {
            setError('Failed to save changes. Please try again.');
        } finally {
            dispatchModal({ type: 'SAVING_DONE' });
        }
    };

    const visibleYear = currentDate.getFullYear();
    const visibleMonth = currentDate.getMonth() + 1;
    const visibleShifts = shifts.filter(s => {
        if (!s.date) return false;
        const [y, m] = s.date.split('-').map(Number);
        return y === visibleYear && m === visibleMonth;
    });

    return (
        <div>
            <CalendarGrid
                shifts={visibleShifts}
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onCellClick={handleCalendarCellClick}
                loading={loading}
            />
            <EditModal
                show={showEditModal}
                editingDate={editingDate}
                editForms={editForms}
                employees={employees}
                isSaving={isSavingEdits}
                onClose={() => dispatchModal({ type: 'CLOSE' })}
                onFormChange={handleEditFormChange}
                onAddShift={handleAddShiftToEditModal}
                onRemoveShift={handleRemoveShiftFromEditModal}
                onSave={handleSaveEdits}
            />
        </div>
    );
}
