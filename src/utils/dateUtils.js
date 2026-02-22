import { MAX_HOURS_PER_DAY, SUNDAY_MAX_HOURS } from '../constants';

export function normalizeTime(timeString) {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length !== 2) return timeString;
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
}

export function createSafeDate(dateString) {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function formatDate(date, format) {
    const d = new Date(date);
    if (format === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
    if (format === 'MMMM yyyy') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (format === 'EEEE') return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toISOString();
}

export function startOfWeek(date, options = {}) {
    const d = new Date(date);
    const day = d.getDay();
    if (options.weekStartsOn === 1) {
        const daysToSubtract = day === 0 ? 6 : day - 1;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysToSubtract);
    }
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function getDayConfig(dayIndex) {
    if (dayIndex === 0) {
        return { maxHours: SUNDAY_MAX_HOURS, defaultStart: '11:00', defaultEnd: '18:00' };
    }
    return { maxHours: MAX_HOURS_PER_DAY, defaultStart: '09:00', defaultEnd: '22:00' };
}

export function getWeekDates(selectedDate) {
    if (!selectedDate) return [];
    const startDate = startOfWeek(createSafeDate(selectedDate), { weekStartsOn: 1 });
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const currentDay = addDays(startDate, i);
        const dayConfig = getDayConfig(currentDay.getDay());
        weekDates.push({
            date: formatDate(currentDay, 'yyyy-MM-dd'),
            dayName: formatDate(currentDay, 'EEEE'),
            dayIndex: currentDay.getDay(),
            maxHours: dayConfig.maxHours,
            defaultStart: dayConfig.defaultStart,
            defaultEnd: dayConfig.defaultEnd
        });
    }
    return weekDates;
}
