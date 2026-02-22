import React from 'react';
import { calculateHours, formatTimeOnly } from '../../utils/shiftUtils';

export default function CalendarCell({ dayNumber, dayShifts, onClick }) {
    const hasShift = dayShifts.length > 0;

    return (
        <div
            onClick={onClick}
            style={{
                backgroundColor: hasShift ? '#e3f2fd' : '#fff',
                minHeight: '100px',
                padding: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                border: '1px solid transparent'
            }}
            onMouseEnter={e => {
                e.target.style.backgroundColor = hasShift ? '#bbdefb' : '#f5f5f5';
                e.target.style.border = '1px solid #007bff';
            }}
            onMouseLeave={e => {
                e.target.style.backgroundColor = hasShift ? '#e3f2fd' : '#fff';
                e.target.style.border = '1px solid transparent';
            }}
        >
            <div style={{ fontWeight: '600', fontSize: '0.9em', color: '#333', marginBottom: '4px' }}>
                {dayNumber}
            </div>
            {dayShifts.map((s, idx) => (
                <div key={idx} style={{
                    backgroundColor: '#007bff', color: 'white', padding: '2px 4px',
                    borderRadius: '3px', fontSize: '0.7em', marginBottom: '2px', lineHeight: '1.2'
                }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8em' }}>{s.employee}</div>
                    <div style={{ fontSize: '0.7em', opacity: 0.9 }}>
                        {formatTimeOnly(s.startTime)} - {formatTimeOnly(s.endTime)} ({calculateHours(s.date, s.startTime, s.endTime).toFixed(1)}h)
                    </div>
                    {s.notes && (
                        <div style={{ fontSize: '0.6em', opacity: 0.8, fontStyle: 'italic', marginTop: '1px' }}>
                            {s.notes.length > 20 ? `${s.notes.substring(0, 20)}...` : s.notes}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
