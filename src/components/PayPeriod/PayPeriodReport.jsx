import React, { useEffect, useMemo } from 'react';
import { calculateHours } from '../../utils/shiftUtils';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function getPeriods(today) {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const lastOfMonth = new Date(year, today.getMonth() + 1, 0).getDate();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const lastOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

    const pad = n => String(n).padStart(2, '0');

    if (day <= 14) {
        return {
            current: {
                start: `${year}-${pad(month)}-01`,
                end:   `${year}-${pad(month)}-14`,
                label: `${MONTH_NAMES[month - 1]} 1–14`,
                year, month
            },
            previous: {
                start: `${prevYear}-${pad(prevMonth)}-15`,
                end:   `${prevYear}-${pad(prevMonth)}-${lastOfPrevMonth}`,
                label: `${MONTH_NAMES[prevMonth - 1]} 15–${lastOfPrevMonth}`,
                year: prevYear, month: prevMonth
            }
        };
    } else {
        return {
            current: {
                start: `${year}-${pad(month)}-15`,
                end:   `${year}-${pad(month)}-${lastOfMonth}`,
                label: `${MONTH_NAMES[month - 1]} 15–${lastOfMonth}`,
                year, month
            },
            previous: {
                start: `${year}-${pad(month)}-01`,
                end:   `${year}-${pad(month)}-14`,
                label: `${MONTH_NAMES[month - 1]} 1–14`,
                year, month
            }
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

    // Ensure both period months are loaded
    useEffect(() => {
        onLoadMonth(previous.year, previous.month);
        onLoadMonth(current.year, current.month);
    }, [previous.year, previous.month, current.year, current.month, onLoadMonth]);

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

    const getRate = name => {
        const e = employeeRates.find(r => r.name === name);
        return e ? e.hourlyRate : 0;
    };

    let totalPrevHrs = 0, totalPrevPay = 0, totalCurrHrs = 0, totalCurrPay = 0;

    const rows = allEmployees.map(name => {
        const rate = getRate(name);
        const ph = prevHours[name] || 0;
        const ch = currHours[name] || 0;
        const pp = ph * rate;
        const cp = ch * rate;
        totalPrevHrs += ph;
        totalPrevPay += pp;
        totalCurrHrs += ch;
        totalCurrPay += cp;
        return { name, rate, ph, ch, pp, cp };
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, backgroundColor: '#343a40', color: '#fff', textAlign: 'left' }} rowSpan={2}>
                                    Employee
                                </th>
                                <th style={{ ...th, backgroundColor: '#6c757d', color: '#fff' }} colSpan={2}>
                                    Previous: {previous.label}
                                </th>
                                <th style={{ ...th, backgroundColor: '#007bff', color: '#fff' }} colSpan={2}>
                                    Current: {current.label}
                                </th>
                                <th style={{ ...th, backgroundColor: '#28a745', color: '#fff' }} colSpan={2}>
                                    Total
                                </th>
                            </tr>
                            <tr>
                                <th style={{ ...th, backgroundColor: '#868e96', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#868e96', color: '#fff' }}>Pay</th>
                                <th style={{ ...th, backgroundColor: '#4dabf7', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#4dabf7', color: '#fff' }}>Pay</th>
                                <th style={{ ...th, backgroundColor: '#40c057', color: '#fff' }}>Hours</th>
                                <th style={{ ...th, backgroundColor: '#40c057', color: '#fff' }}>Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ name, rate, ph, ch, pp, cp }) => (
                                <tr
                                    key={name}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                >
                                    <td style={{ ...td, textAlign: 'left', fontWeight: 500 }}>
                                        {name}
                                        {rate > 0 && (
                                            <span style={{ color: '#999', fontSize: '0.78em', marginLeft: '6px' }}>
                                                ${rate}/hr
                                            </span>
                                        )}
                                    </td>
                                    <td style={td}>{ph.toFixed(1)}</td>
                                    <td style={td}>{rate > 0 ? `$${pp.toFixed(2)}` : '—'}</td>
                                    <td style={td}>{ch.toFixed(1)}</td>
                                    <td style={td}>{rate > 0 ? `$${cp.toFixed(2)}` : '—'}</td>
                                    <td style={{ ...td, fontWeight: 700 }}>{(ph + ch).toFixed(1)}</td>
                                    <td style={{ ...td, fontWeight: 700 }}>
                                        {rate > 0 ? `$${(pp + cp).toFixed(2)}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style={{ ...tdTotal, textAlign: 'left' }}>TOTAL</td>
                                <td style={tdTotal}>{totalPrevHrs.toFixed(1)}</td>
                                <td style={tdTotal}>${totalPrevPay.toFixed(2)}</td>
                                <td style={tdTotal}>{totalCurrHrs.toFixed(1)}</td>
                                <td style={tdTotal}>${totalCurrPay.toFixed(2)}</td>
                                <td style={tdTotal}>{(totalPrevHrs + totalCurrHrs).toFixed(1)}</td>
                                <td style={tdTotal}>${(totalPrevPay + totalCurrPay).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <p style={{ fontSize: '0.78em', color: '#aaa', marginTop: '10px' }}>
                        * Pay is estimated from hourly rate in the Employee sheet. Employees with $0/hr show — for pay.
                    </p>
                </div>
            )}
        </div>
    );
}
