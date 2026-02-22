import { normalizeTime, createSafeDate } from './dateUtils';

export function calculateHours(shiftDate, start, end) {
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
}

export function formatTimeOnly(value) {
    if (!value) return '-';
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime()) || dateObj.getFullYear() < 1900) {
        return normalizeTime(value);
    }
    return normalizeTime(dateObj.toISOString().substring(11, 16));
}

export function getNextShiftTimes(targetDate, existingForms, savedShifts = []) {
    const dayOfWeek = createSafeDate(targetDate).getDay();
    const isSunday = dayOfWeek === 0;

    const savedShiftsForDate = savedShifts.filter(s => s.date === targetDate);
    const formsWithTimesForDate = existingForms.filter(
        f => f.date === targetDate && f.startTime && f.endTime
    );
    const allShiftsForDate = [...savedShiftsForDate, ...formsWithTimesForDate];

    if (allShiftsForDate.length === 0) {
        return isSunday
            ? { startTime: '11:00', endTime: '18:00' }
            : { startTime: '09:00', endTime: '22:00' };
    }

    let latestEndTime = null;
    allShiftsForDate.forEach(shift => {
        const endTime = normalizeTime(shift.endTime);
        if (!latestEndTime || endTime > latestEndTime) latestEndTime = endTime;
    });

    return { startTime: latestEndTime, endTime: isSunday ? '18:00' : '22:00' };
}
