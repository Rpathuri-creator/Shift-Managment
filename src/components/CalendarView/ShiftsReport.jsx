import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { calculateHours, formatTimeOnly } from '../../utils/shiftUtils';

// Returns every { year, month } between two date strings (inclusive)
function monthsInRange(from, to) {
    if (!from || !to) return [];
    const result = [];
    const cur = new Date(from + 'T00:00:00');
    const end = new Date(to   + 'T00:00:00');
    cur.setDate(1);
    while (cur <= end) {
        result.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
        cur.setMonth(cur.getMonth() + 1);
    }
    return result;
}

// First and last day of current month as YYYY-MM-DD
function currentMonthRange() {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    const mm    = String(month).padStart(2, '0');
    const last  = new Date(year, month, 0).getDate();
    return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${last}` };
}

export default function ShiftsReport({ shifts, employees, employeeRates = [], currentUser, onLoadMonth }) {
    const canViewAll = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

    const { from: defaultFrom, to: defaultTo } = currentMonthRange();

    const [filterFrom, setFilterFrom]         = useState(defaultFrom);
    const [filterTo, setFilterTo]             = useState(defaultTo);
    const [filterEmployee, setFilterEmployee] = useState(canViewAll ? '' : (currentUser?.name || ''));
    const [loadingDates, setLoadingDates]     = useState(false);

    // For employees: find their record in employeeRates by username (robust even if name was empty on login)
    const myRecord = useMemo(() => {
        if (canViewAll) return null;
        return employeeRates.find(e =>
            (e.username || '').toLowerCase() === (currentUser?.username || '').toLowerCase()
        ) || employeeRates.find(e =>
            (e.name || '').toLowerCase() === (currentUser?.name || '').toLowerCase()
        ) || null;
    }, [canViewAll, employeeRates, currentUser]);

    // Once employeeRates loads, sync the employee's real name into the filter
    useEffect(() => {
        if (!canViewAll && myRecord?.name && filterEmployee !== myRecord.name) {
            setFilterEmployee(myRecord.name);
        }
    }, [canViewAll, myRecord]);

    // When date range changes, fetch any uncached months
    const loadRangeMonths = useCallback(async (from, to) => {
        if (!onLoadMonth || !from || !to) return;
        const months = monthsInRange(from, to);
        if (!months.length) return;
        setLoadingDates(true);
        try {
            await Promise.all(months.map(({ year, month }) => onLoadMonth(year, month)));
        } finally {
            setLoadingDates(false);
        }
    }, [onLoadMonth]);

    // Load initial month range on mount
    useEffect(() => {
        loadRangeMonths(filterFrom, filterTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFromChange = (val) => {
        setFilterFrom(val);
        if (val && filterTo) loadRangeMonths(val, filterTo);
    };

    const handleToChange = (val) => {
        setFilterTo(val);
        if (filterFrom && val) loadRangeMonths(filterFrom, val);
    };

    // Filtered shifts
    const filteredShifts = useMemo(() => shifts.filter(s => {
        const inRange = (!filterFrom || s.date >= filterFrom) && (!filterTo || s.date <= filterTo);
        const byName  = !filterEmployee || s.employee.toLowerCase().includes(filterEmployee.toLowerCase());
        return inRange && byName;
    }), [shifts, filterFrom, filterTo, filterEmployee]);

    // Total hours
    const totalHours = useMemo(() =>
        filteredShifts.reduce((sum, s) => sum + calculateHours(s.date, s.startTime, s.endTime), 0),
    [filteredShifts]);

    // Pay rate logic:
    // - Employees: always their own rate (never null)
    // - Admin/Manager + "All Employees": null (no single rate)
    // - Admin/Manager + specific employee selected: that employee's rate
    const payRate = useMemo(() => {
        if (!canViewAll) {
            // Always show employee's own rate
            return myRecord?.hourlyRate ?? currentUser?.payRate ?? 0;
        }
        if (!filterEmployee) return null; // "All Employees" selected
        const emp = employeeRates.find(e => e.name === filterEmployee);
        return emp?.hourlyRate ?? 0;
    }, [canViewAll, filterEmployee, currentUser, employeeRates, myRecord]);

    const totalPay = payRate !== null ? totalHours * payRate : null;

    // Display name for the locked field
    const lockedName = myRecord?.name || currentUser?.name || currentUser?.username || '';

    const inputStyle = {
        width: '100%', padding: '10px', border: '2px solid #dee2e6',
        borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'
    };
    const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' };

    return (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>
                Shift Reports
            </h2>

            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                    <label style={labelStyle}>From Date</label>
                    <input type="date" value={filterFrom} onChange={e => handleFromChange(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>To Date</label>
                    <input type="date" value={filterTo} onChange={e => handleToChange(e.target.value)} style={inputStyle} />
                </div>
                <div>
                    <label style={labelStyle}>Employee</label>
                    {canViewAll ? (
                        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={inputStyle}>
                            <option value="">All Employees</option>
                            {employees.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={lockedName}
                            readOnly
                            style={{ ...inputStyle, backgroundColor: '#f8f9fa', color: '#555', cursor: 'not-allowed' }}
                        />
                    )}
                </div>
            </div>

            {/* Loading indicator */}
            {loadingDates && (
                <div style={{ marginBottom: '12px', color: '#3b82f6', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #93c5fd', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Loading shifts for selected date range…
                </div>
            )}

            {/* Summary bar */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center',
                marginBottom: '20px', padding: '16px 20px',
                backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #cce0ff'
            }}>
                <div>
                    <span style={{ color: '#555', fontSize: '0.9em' }}>Total Hours</span>
                    <div style={{ fontSize: '1.4em', fontWeight: '700', color: '#1e3a5f' }}>
                        {totalHours.toFixed(2)} h
                    </div>
                </div>

                {payRate !== null && (
                    <>
                        <div style={{ width: '1px', height: '40px', backgroundColor: '#cce0ff' }} />
                        <div>
                            <span style={{ color: '#555', fontSize: '0.9em' }}>Pay Rate</span>
                            <div style={{ fontSize: '1.4em', fontWeight: '700', color: '#1e3a5f' }}>
                                ${payRate.toFixed(2)} / hr
                            </div>
                        </div>
                        <div style={{ width: '1px', height: '40px', backgroundColor: '#cce0ff' }} />
                        <div>
                            <span style={{ color: '#555', fontSize: '0.9em' }}>Total Pay ✦</span>
                            <div style={{ fontSize: '1.4em', fontWeight: '700', color: '#16a34a' }}>
                                ${totalPay.toFixed(2)}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                    <thead>
                        <tr>
                            {['Employee', 'Date', 'Start Time', 'End Time', 'Hours', 'Pay *', 'Notes'].map(h => (
                                <th key={h} style={{
                                    padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6',
                                    backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333',
                                    position: 'sticky', top: 0, zIndex: 10, whiteSpace: 'nowrap'
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShifts.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                                    No shifts found for the selected filters.
                                </td>
                            </tr>
                        ) : filteredShifts.map((s, i) => {
                            const hrs = calculateHours(s.date, s.startTime, s.endTime);
                            const border = i === filteredShifts.length - 1 ? 'none' : '1px solid #dee2e6';
                            const td = { padding: '12px', borderBottom: border };

                            // Row-level pay rate
                            const rowRate = payRate !== null
                                ? payRate
                                : (employeeRates.find(r => r.name === s.employee)?.hourlyRate ?? null);
                            const rowPay = rowRate !== null ? `$${(hrs * rowRate).toFixed(2)}` : '—';

                            return (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={td}>{s.employee}</td>
                                    <td style={td}>{s.date}</td>
                                    <td style={td}>{formatTimeOnly(s.startTime)}</td>
                                    <td style={td}>{formatTimeOnly(s.endTime)}</td>
                                    <td style={td}>{hrs.toFixed(2)}</td>
                                    <td style={{ ...td, color: rowPay !== '—' ? '#16a34a' : '#999', fontWeight: rowPay !== '—' ? '600' : '400' }}>
                                        {rowPay}
                                    </td>
                                    <td style={{ ...td, maxWidth: '200px' }}>
                                        <div style={{
                                            maxHeight: '40px', overflowY: 'auto', fontSize: '0.9em',
                                            color: s.notes ? '#333' : '#999', fontStyle: s.notes ? 'normal' : 'italic'
                                        }}>
                                            {s.notes || 'No notes'}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {payRate !== null && (
                <p style={{ marginTop: '10px', fontSize: '0.78em', color: '#888' }}>
                    * Pay calculated at ${payRate.toFixed(2)}/hr
                    {filterEmployee ? ` for ${filterEmployee}` : ' per employee rate'}
                </p>
            )}
        </div>
    );
}
