import { GOOGLE_SCRIPT_URL } from '../constants';
import { normalizeTime } from '../utils/dateUtils';

export function isLocalMode() {
    return (
        GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_URL_HERE') ||
        !GOOGLE_SCRIPT_URL.includes('script.google.com')
    );
}

export async function loadShifts() {
    if (isLocalMode()) {
        return { shifts: [], employees: [] };
    }

    const response = await fetch(GOOGLE_SCRIPT_URL);
    if (!response.ok) throw new Error('Failed to fetch shifts');

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const shifts = (data.shifts || []).map(shift => ({
        ...shift,
        startTime: normalizeTime(shift.startTime),
        endTime: normalizeTime(shift.endTime)
    }));

    const employees = Array.from(
        new Set(shifts.map(s => s.employee).filter(Boolean))
    ).sort();

    return { shifts, employees };
}

export async function addShift(payload) {
    if (isLocalMode()) return;
    const formData = new URLSearchParams(payload);
    await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
}

export async function deleteShift(rowIndex) {
    const deleteData = new URLSearchParams({
        method: 'DELETE',
        rowIndex: rowIndex.toString()
    });
    await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: deleteData });
}
