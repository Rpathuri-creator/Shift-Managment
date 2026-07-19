import React, { useEffect, useMemo } from 'react';
import { calculateHours } from '../../utils/shiftUtils';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function addMonths(year, month, delta) {
    const total = month - 1 + delta;
    const y = year + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    return { year: y, month: m + 1 };
}

function getPeriods(today) {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const pad = n => String(n).padStart(2, '0');

    // "Mid" period: 11th–25th of a single month.
    const mid = (y, m) => ({
        start: `${y}-${pad(m)}-11`,
        end:   `${y}-${pad(m)}-25`,
        label: `${MONTH_NAMES[m - 1]} 11–25`,
        months: [{ year: y, month: m }]
    });

    // "Wrap" period: 26th of month (y, m) through the 10th of the following month.
    const wrap = (y, m) => {
        const next = addMonths(y, m, 1);
        return {
            start: `${y}-${pad(m)}-26`,
            end:   `${next.year}-${pad(next.month)}-10`,
            label: `${MONTH_NAMES[m - 1]} 26 – ${MONTH_NAMES[next.month - 1]} 10`,
            months: [{ year: y, month: m }, { year: next.year, month: next.month }]
        };
    };

    if (day >= 11 && day <= 25) {
        const prev = addMonths(year, month, -1);
        return {
            current: mid(year, month),
            previous: wrap(prev.year, prev.month)
        };
    } else if (day >= 26) {
        return {
            current: wrap(year, month),
            previous: mid(year, month)
        };
    } else {
        const prev = addMonths(year, month, -1);
        return {
            current: wrap(prev.year, prev.month),
            previous: mid(prev.year, prev.month)
        };
    }
}

function filterShifts(shifts, period) {
    return shifts.filter(s => s.date >= period.start && s.date <= period.end);
}

function aggregateHours(shifts) {
    const map = {};
    for (const s of shifts) {
        if (!s.employee) continue;
        map[s.employee] = (map[s.employee] || 0) + calculateHours(s.date, s.startTime, s.endTime);
    }
    return map;
}

export default function PayPeriodReport({ shifts, employeeRates, onLoadMonth }) {
    const today = useMemo(() => new Date(), []);
    const { current, previous } = useMemo(() => getPeriods(today), [today]);

    // Ensure every month touched by either period is loaded
    useEffect(() => {
        [...previous.months, ...current.months].forEach(({ year, month }) => {
            onLoadMonth(year, month);
        });
    }, [previous, current, onLoadMonth]);

    const prevShifts = useMemo(() => filterShifts(shifts, previous), [shifts, previous]);
    const currShifts = useMemo(() => filterShifts(shifts, current), [shifts, current]);

    const prevHours = useMemo(() => aggregateHours(prevShifts), [prevShifts]);
    const currHours = useMemo(() => aggregateHours(currShifts), [currShifts]);

    const allEmployees = useMemo(() => {
        const names = new Set([
            ...Object.keys(prevHours),
            ...Object.keys(currHours)
        ]);
        return Array.from(names).sort();
    }, [prevHours, currHours]);

    const getEmployee = name => employeeRates.find(r => r.name === name);

    let totalPrevHrs = 0, totalCurrHrs = 0;
    let totalPrevPayroll = 0, totalPrevCash = 0, totalCurrPayroll = 0, totalCurrCash = 0;

    const rows = allEmployees.map(name => {
        const emp = getEmployee(name);
        const rate = emp ? emp.hourlyRate : 0;
        const payrollPercent = emp ? emp.payrollPercent ?? 100 : 100;
        const cashPercent = emp ? emp.cashPercent ?? (100 - payrollPercent) : 0;
        const ph = prevHours[name] || 0;
        const ch = currHours[name] || 0;
        const pp = ph * rate;
        const cp = ch * rate;
        const ppPayroll = pp * (payrollPercent / 100);
        const ppCash = pp * (cashPercent / 100);
        const cpPayroll = cp * (payrollPercent / 100);
        const cpCash = cp * (cashPercent / 100);
        totalPrevHrs += ph;
        totalCurrHrs += ch;
        totalPrevPayroll += ppPayroll;
        totalPrevCash += ppCash;
        totalCurrPayroll += cpPayroll;
        totalCurrCash += cpCash;
        return { name, rate, payrollPercent, cashPercent, ph, ch, ppPayroll, ppCash, cpPayroll, cpCash };
    });

    const th = {
        padding: '10px 14px', fontWeight: 600, textAlign: 'center',
        fontSize: '0.85em', border: '1px solid rgba(255,255,255,0.2)',
        whiteSpace: 'nowrap'
    };
    const td = {
        padding: '10px 14px', borderBottom: '1px solid #dee2e6',
        textAlign: 'center', fontSize: '0.9em'
    };
    const tdTotal = { ...td, fontWeight: 700, backgroundColor: '#f0f4ff' };

    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#333', marginBottom: '4px', fontSize: '1.4em' }}>Pay Period Report</h2>
            <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '24px' }}>
                Hours worked and estimated pay per employee for the current and previous half-period.
            </p>

            {allEmployees.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '48px 0' }}>
                    No shifts found for these pay periods.
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, backgroundColor: '#343a40', color: '#fff', textAlign: 'left' }} rowSpan={2}>
                                    Employee
                                </th>
                                <th style={{ ...th, backgroundColor: '#6c757d', color: '#fff' }} colSpan={3}>
                                    Previous: {previous.label}
                                </th>
                                <th style={{ ...th, backgroundColor: '#007bff', color: '#fff' }} colSpan={3}>
                                    Current: {current.label}
                                </th>
                                <th style={{ ...th, backgroundColor: '#28a745', color: '#fff' }} colSpan={3}>
                                    Total
                                </th>
                            </tr>
                            <tr>
                                <th style={{ ...th, backgroundColor: '#868e96', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#868e96', color: '#fff' }}>Payroll</th>
                                <th style={{ ...th, backgroundColor: '#868e96', color: '#fff' }}>Cash</th>
                                <th style={{ ...th, backgroundColor: '#4dabf7', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#4dabf7', color: '#fff' }}>Payroll</th>
                                <th style={{ ...th, backgroundColor: '#4dabf7', color: '#fff' }}>Cash</th>
                                <th style={{ ...th, backgroundColor: '#40c057', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#40c057', color: '#fff' }}>Payroll</th>
                                <th style={{ ...th, backgroundColor: '#40c057', color: '#fff' }}>Cash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ name, rate, payrollPercent, cashPercent, ph, ch, ppPayroll, ppCash, cpPayroll, cpCash }) => (
                                <tr
                                    key={name}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                >
                                    <td style={{ ...td, textAlign: 'left', fontWeight: 500 }}>
                                        {name}
                                        {rate > 0 && (
                                            <span style={{ color: '#999', fontSize: '0.78em', marginLeft: '6px' }}>
                                                ${rate}/hr · {payrollPercent}%/{cashPercent}% payroll/cash
                                            </span>
                                        )}
                                    </td>
                                    <td style={td}>{ph.toFixed(1)}</td>
                                    <td style={td}>{rate > 0 ? `$${ppPayroll.toFixed(2)}` : '—'}</td>
                                    <td style={td}>{rate > 0 ? `$${ppCash.toFixed(2)}` : '—'}</td>
                                    <td style={td}>{ch.toFixed(1)}</td>
                                    <td style={td}>{rate > 0 ? `$${cpPayroll.toFixed(2)}` : '—'}</td>
                                    <td style={td}>{rate > 0 ? `$${cpCash.toFixed(2)}` : '—'}</td>
                                    <td style={{ ...td, fontWeight: 700 }}>{(ph + ch).toFixed(1)}</td>
                                    <td style={{ ...td, fontWeight: 700 }}>
                                        {rate > 0 ? `$${(ppPayroll + cpPayroll).toFixed(2)}` : '—'}
                                    </td>
                                    <td style={{ ...td, fontWeight: 700 }}>
                                        {rate > 0 ? `$${(ppCash + cpCash).toFixed(2)}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style={{ ...tdTotal, textAlign: 'left' }}>TOTAL</td>
                                <td style={tdTotal}>{totalPrevHrs.toFixed(1)}</td>
                                <td style={tdTotal}>${totalPrevPayroll.toFixed(2)}</td>
                                <td style={tdTotal}>${totalPrevCash.toFixed(2)}</td>
                                <td style={tdTotal}>{totalCurrHrs.toFixed(1)}</td>
                                <td style={tdTotal}>${totalCurrPayroll.toFixed(2)}</td>
                                <td style={tdTotal}>${totalCurrCash.toFixed(2)}</td>
                                <td style={tdTotal}>{(totalPrevHrs + totalCurrHrs).toFixed(1)}</td>
                                <td style={tdTotal}>${(totalPrevPayroll + totalCurrPayroll).toFixed(2)}</td>
                                <td style={tdTotal}>${(totalPrevCash + totalCurrCash).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p style={{ fontSize: '0.78em', color: '#aaa', marginTop: '10px' }}>
                        * Pay is estimated from hourly rate, "Payroll %", and "Cash %" in the Employee sheet. Employees with $0/hr show — for pay; missing "Payroll %"/"Cash %" default to 100% payroll / 0% cash.
                    </p>
                </div>
            )}
        </div>
    );
}
