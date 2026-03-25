import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import Notifications from './components/Notifications';
import TabBar from './components/TabBar';
import WeeklyShiftForm from './components/WeeklyShiftForm/WeeklyShiftForm';
import CalendarView from './components/CalendarView/CalendarView';
import ShiftsReport from './components/CalendarView/ShiftsReport';
import PayPeriodReport from './components/PayPeriod/PayPeriodReport';
import LoginPage from './components/LoginPage';
import { loadShifts, loadEmployees } from './api/shiftsApi';

function notifReducer(state, action) {
    switch (action.type) {
        case 'loading': return { ...state, loading: action.value };
        case 'error':   return { ...state, error: action.value };
        case 'success': return { ...state, success: action.value };
        default:        return state;
    }
}

export default function ShiftTracker() {
    const [currentUser, setCurrentUser] = useState(null); // { username, role }
    const [activeTab, setActiveTab] = useState('form');
    const [shifts, setShifts] = useState([]);
    const [employeeData, setEmployeeData] = useState({ list: [], rates: [] });
    const [notif, dispatchNotif] = useReducer(notifReducer, { loading: false, error: '', success: '' });
    const { loading, error, success } = notif;
    const loadedMonths = useRef(new Set());

    const setError   = useCallback((value) => dispatchNotif({ type: 'error',   value }), []);
    const setSuccess = useCallback((value) => dispatchNotif({ type: 'success', value }), []);

    // Load one month of shifts; skips if already cached
    const loadMonth = useCallback(async (year, month) => {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (loadedMonths.current.has(key)) return;
        try {
            const data = await loadShifts({ year, month });
            // Only keep shifts that belong to the requested month
            const monthShifts = data.shifts.filter(s => {
                if (!s.date) return false;
                const [y, m] = s.date.split('-').map(Number);
                return y === year && m === month;
            });
            loadedMonths.current.add(key);
            setShifts(prev => {
                const filtered = prev.filter(s => {
                    if (!s.date) return true;
                    const [y, m] = s.date.split('-').map(Number);
                    return !(y === year && m === month);
                });
                return [...filtered, ...monthShifts];
            });
        } catch {
            setError(`Failed to load shifts for ${key}`);
        }
    }, [setError]);

    // Force re-fetch a month (e.g. after edits that change row indices)
    const reloadMonth = useCallback(async (year, month) => {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        loadedMonths.current.delete(key);
        await loadMonth(year, month);
    }, [loadMonth]);

    // After login: load current month + employee list
    useEffect(() => {
        if (!currentUser) return;
        const now = new Date();
        dispatchNotif({ type: 'loading', value: true });
        Promise.all([
            loadMonth(now.getFullYear(), now.getMonth() + 1),
            loadEmployees().then(data => {
                setEmployeeData({
                    list: data.employees.map(e => e.name).sort(),
                    rates: data.employees,
                });
            }).catch(() => dispatchNotif({ type: 'error', value: 'Failed to load employee list' }))
        ]).finally(() => dispatchNotif({ type: 'loading', value: false }));
    }, [currentUser, loadMonth]);

    // Auto-dismiss success banner after 5 s
    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => setSuccess(''), 5000);
        return () => clearTimeout(timer);
    }, [success, setSuccess]);

    // Auto-dismiss error banner after 5 s
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error, setError]);

    const handleAddEmployee = (name) => {
        if (!name.trim()) {
            setError('Employee name is required');
            return false;
        }
        if (employeeData.list.includes(name.trim())) {
            setError('Employee already exists');
            return false;
        }
        setEmployeeData(prev => ({ ...prev, list: [...prev.list, name.trim()].sort() }));
        setSuccess(`Added employee: ${name} (will be saved when first shift is created)`);
        return true;
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setShifts([]);
        setEmployeeData({ list: [], rates: [] });
        loadedMonths.current.clear();
        setActiveTab('form');
    };

    const canEditShifts = (role) => role === 'Admin' || role === 'Manager';

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        if (!canEditShifts(user.role)) setActiveTab('calendar');
    };

    if (!currentUser) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                role={currentUser.role}
                currentUser={currentUser}
                onLogout={handleLogout}
            />

            <div style={{ flex: 1, backgroundColor: '#f1f5f9', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 28px' }}>
                    <Notifications error={error} success={success} />

                    {activeTab === 'form' && canEditShifts(currentUser.role) && (
                        <WeeklyShiftForm
                            shifts={shifts}
                            employees={employeeData.list}
                            onAddEmployee={handleAddEmployee}
                            setError={setError}
                            setSuccess={setSuccess}
                            onShiftAdded={(shift) => setShifts(prev => [...prev, shift])}
                        />
                    )}

                    {activeTab === 'calendar' && (
                        <CalendarView
                            shifts={shifts}
                            employees={employeeData.list}
                            loading={loading}
                            setError={setError}
                            setSuccess={setSuccess}
                            setShifts={setShifts}
                            onLoadMonth={loadMonth}
                            onReloadMonth={reloadMonth}
                            role={currentUser.role}
                        />
                    )}

                    {activeTab === 'reports' && (
                        <ShiftsReport
                            shifts={shifts}
                            employees={employeeData.list}
                            employeeRates={employeeData.rates}
                            currentUser={currentUser}
                            onLoadMonth={loadMonth}
                        />
                    )}

                    {activeTab === 'payperiod' && (
                        <PayPeriodReport
                            shifts={shifts}
                            employeeRates={employeeData.rates}
                            onLoadMonth={loadMonth}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
