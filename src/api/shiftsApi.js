import { GOOGLE_SCRIPT_URL } from '../constants';
import { normalizeTime } from '../utils/dateUtils';

export function isLocalMode() {
    return (
        GOOGLE_SCRIPT_URL.includes('YOUR_SCRIPT_URL_HERE') ||
        !GOOGLE_SCRIPT_URL.includes('script.google.com')
    );
}

export async function loadShifts({ year, month } = {}) {
    if (isLocalMode()) {
        return { shifts: [] };
    }

    let url = GOOGLE_SCRIPT_URL;
    if (year && month) {
        url += `?year=${year}&month=${month}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch shifts');

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const shifts = (data.shifts || []).map(shift => ({
        ...shift,
        startTime: normalizeTime(shift.startTime),
        endTime: normalizeTime(shift.endTime)
    }));

    return { shifts };
}

export async function loadEmployees() {
    if (isLocalMode()) return { employees: [] };

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees`);
    if (!response.ok) throw new Error('Failed to fetch employees');

    const data = await response.json();
    return { employees: data.employees || [] };
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
