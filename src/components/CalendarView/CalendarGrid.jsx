import React from 'react';
import CalendarCell from './CalendarCell';
import { formatDate } from '../../utils/dateUtils';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({ shifts, currentDate, onPrevMonth, onNextMonth, onCellClick, loading }) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const monthName = formatDate(currentDate, 'MMMM yyyy');

    return (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h2 style={{ color: '#333', marginBottom: '20px', fontSize: '1.8em', textAlign: 'center' }}>
                Calendar View
            </h2>
            <div style={{ marginBottom: '15px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                Click on any date to edit shifts for that day
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 20px' }}>
                <button
                    onClick={onPrevMonth}
                    style={{
                        backgroundColor: '#007bff', color: 'white', border: 'none',
                        padding: '10px 15px', borderRadius: '50%', cursor: 'pointer',
                        fontSize: '18px', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    ←
                </button>
                <span style={{ fontSize: '1.5em', fontWeight: '600', color: '#333' }}>{monthName}</span>
                <button
                    onClick={onNextMonth}
                    style={{
                        backgroundColor: '#007bff', color: 'white', border: 'none',
                        padding: '10px 15px', borderRadius: '50%', cursor: 'pointer',
                        fontSize: '18px', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    →
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '1.1em' }}>
                    Loading shifts...
                </div>
            ) : (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '2px', backgroundColor: '#e9ecef', padding: '2px', borderRadius: '8px'
                }}>
                    {DAY_HEADERS.map(day => (
                        <div key={day} style={{
                            backgroundColor: '#6c757d', color: 'white', padding: '12px',
                            textAlign: 'center', fontWeight: '600', fontSize: '0.9em'
                        }}>
                            {day}
                        </div>
                    ))}

                    {[...Array(firstDayOfMonth)].map((_, i) => (
                        <div key={`empty-${i}`} style={{ backgroundColor: '#f8f9fa', minHeight: '100px' }} />
                    ))}

                    {[...Array(daysInMonth)].map((_, i) => {
                        const dayNum = i + 1;
                        const dayDate = new Date(year, month, dayNum);
                        const formattedDate = formatDate(dayDate, 'yyyy-MM-dd');
                        const dayShifts = shifts.filter(s => s.date === formattedDate);

                        return (
                            <CalendarCell
                                key={dayNum}
                                dayNumber={dayNum}
                                dayShifts={dayShifts}
                                onClick={() => onCellClick(formattedDate, dayShifts)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
