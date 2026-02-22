import React, { useState, useEffect, useCallback } from 'react';
import Notifications from './components/Notifications';
import TabBar from './components/TabBar';
import WeeklyShiftForm from './components/WeeklyShiftForm/WeeklyShiftForm';
import CalendarView from './components/CalendarView/CalendarView';
import { loadShifts } from './api/shiftsApi';

export default function ShiftTracker() {
    const [activeTab, setActiveTab] = useState('form');
    const [shifts, setShifts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');


    const refreshShifts = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await loadShifts();
            setShifts(data.shifts);
            setEmployees(data.employees);
        } catch {
            setError('Failed to load shifts from Google Apps Script. Starting with empty data.');
            setShifts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshShifts();
    }, [refreshShifts]);

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

    const handleAddEmployee = (name) => {
        if (!name.trim()) {
            setError('Employee name is required');
            return false;
        }
        if (employees.includes(name.trim())) {
            setError('Employee already exists');
            return false;
        }
        setEmployees(prev => [...prev, name.trim()].sort());
        setSuccess(`Added employee: ${name} (will be saved when first shift is created)`);
        return true;
    };

    return (
        <div style={{
            maxWidth: '1200px', margin: '0 auto', padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f8f9fa', minHeight: '100vh'
        }}>
            <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px', fontSize: '2.5em', fontWeight: '600' }}>
                Calder - Employee Shift Tracker
            </h1>

            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <Notifications error={error} success={success} />

            {activeTab === 'form' && (
                <WeeklyShiftForm
                    shifts={shifts}
                    employees={employees}
                    onAddEmployee={handleAddEmployee}
                    setError={setError}
                    setSuccess={setSuccess}
                    onShiftAdded={(shift) => setShifts(prev => [...prev, shift])}
                />
            )}

            {activeTab === 'calendar' && (
                <CalendarView
                    shifts={shifts}
                    employees={employees}
                    loading={loading}
                    setError={setError}
                    setSuccess={setSuccess}
                    setShifts={setShifts}
                    onRefreshShifts={refreshShifts}
                />
            )}
        </div>
    );
}
