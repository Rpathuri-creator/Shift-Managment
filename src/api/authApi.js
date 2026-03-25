import { GOOGLE_SCRIPT_URL } from '../constants';
import { isLocalMode } from './shiftsApi';

function normalizeRole(raw) {
    const r = (raw || '').trim().toLowerCase();
    if (r === 'admin')   return 'Admin';
    if (r === 'manager') return 'Manager';
    return 'Employee';
}

export async function login(username, password) {
    if (isLocalMode()) {
        return { success: false, message: 'No backend configured. Please set GOOGLE_SCRIPT_URL.' };
    }

    const formData = new URLSearchParams({ action: 'login', username, password });
    const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Login request failed');
    const result = await response.json();
    console.log('[authApi] Login response:', JSON.stringify(result));

    if (result.success === true) {
        return {
            success:  true,
            username: result.username || username,
            role:     normalizeRole(result.role),
            name:     result.name     || result.username || username,
            payRate:  result.payRate  || 0,
        };
    }
    return { success: false, message: result.message || 'Invalid username or password' };
}
