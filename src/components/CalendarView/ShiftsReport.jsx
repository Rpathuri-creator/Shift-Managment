import React, { useState } from 'react';
import { calculateHours, formatTimeOnly } from '../../utils/shiftUtils';

export default function ShiftsReport({ shifts, employees }) {
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');

    const filteredShifts = shifts.filter(s => {
        const shiftDate = s.date;
        const inDateRange = (!filterFrom || shiftDate >= filterFrom) && (!filterTo || shiftDate <= filterTo);
        const matchesEmployee = !filterEmployee || s.employee.toLowerCase().includes(filterEmployee.toLowerCase());
        return inDateRange && matchesEmployee;
    });

    const totalFilteredHours = filteredShifts.reduce(
        (sum, s) => sum + calculateHours(s.date, s.startTime, s.endTime), 0
    );

    return (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>
                Filter Shifts
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>From Date</label>
                    <input
                        type="date"
                        value={filterFrom}
                        onChange={e => setFilterFrom(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>To Date</label>
                    <input
                        type="date"
                        value={filterTo}
                        onChange={e => setFilterTo(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>Employee</label>
                    <select
                        value={filterEmployee}
                        onChange={e => setFilterEmployee(e.target.value)}
                        style={{ width: '100%', padding: '10px', border: '2px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                    >
                        <option value="">All Employees</option>
                        {employees.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '1.1em', fontWeight: '500' }}>
                <strong>Total Hours: </strong>{totalFilteredHours.toFixed(2)}
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '10px' }}>
                <table style={{
                    width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff',
                    borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <thead>
                        <tr>
                            {['Employee', 'Date', 'Start Time', 'End Time', 'Hours', 'Notes'].map(h => (
                                <th key={h} style={{
                                    padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6',
                                    backgroundColor: '#f8f9fa', fontWeight: '600', color: '#333',
                                    position: 'sticky', top: 0, zIndex: 10
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShifts.map((s, i) => {
                            const isLast = i === filteredShifts.length - 1;
                            const border = isLast ? 'none' : '1px solid #dee2e6';
                            const td = { padding: '12px', borderBottom: border };
                            return (
                                <tr key={i}>
                                    <td style={td}>{s.employee}</td>
                                    <td style={td}>{s.date}</td>
                                    <td style={td}>{formatTimeOnly(s.startTime)}</td>
                                    <td style={td}>{formatTimeOnly(s.endTime)}</td>
                                    <td style={td}>{calculateHours(s.date, s.startTime, s.endTime).toFixed(2)}</td>
                                    <td style={{ ...td, maxWidth: '200px' }}>
                                        <div style={{
                                            maxHeight: '40px', overflowY: 'auto', fontSize: '0.9em',
                                            color: s.notes ? '#333' : '#999',
                                            fontStyle: s.notes ? 'normal' : 'italic'
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
        </div>
    );
}
