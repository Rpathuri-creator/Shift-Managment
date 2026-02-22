import React from 'react';
import EmployeeSelect from './EmployeeSelect';
import { calculateHours } from '../../utils/shiftUtils';

export default function DaySection({ dayInfo, dayForms, totalHours, onFormChange, onAddMore, employees, onAddEmployee }) {
    const remainingHours = Math.max(0, dayInfo.maxHours - totalHours);
    const canAddMore = remainingHours > 0 && totalHours < dayInfo.maxHours;

    return (
        <div style={{
            border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '16px',
            backgroundColor: totalHours >= dayInfo.maxHours ? '#fff5f5' : '#f8f9fa'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>{dayInfo.dayName} - {dayInfo.date}</h3>
                <div style={{
                    color: totalHours >= dayInfo.maxHours ? '#dc3545' : (remainingHours > 0 ? '#28a745' : '#dc3545'),
                    fontWeight: '500'
                }}>
                    {totalHours >= dayInfo.maxHours ? (
                        <span>⚠️ Maximum hours reached ({totalHours.toFixed(1)}/{dayInfo.maxHours})</span>
                    ) : (
                        <span>Hours Left: {remainingHours.toFixed(1)} / {dayInfo.maxHours}</span>
                    )}
                </div>
            </div>

            {dayForms.map((form) => (
                <div key={form._idx} style={{
                    backgroundColor: 'white', padding: '12px', marginBottom: '8px',
                    borderRadius: '4px', border: '1px solid #e9ecef'
                }}>
                    <EmployeeSelect
                        value={form.employee}
                        onChange={val => onFormChange(form._idx, 'employee', val)}
                        employees={employees}
                        onAddEmployee={onAddEmployee}
                    />

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>
                                Start Time:
                            </label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={e => onFormChange(form._idx, 'startTime', e.target.value)}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>
                                End Time:
                            </label>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={e => onFormChange(form._idx, 'endTime', e.target.value)}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#333', fontSize: '0.9em' }}>
                            Notes (optional):
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={e => onFormChange(form._idx, 'notes', e.target.value)}
                            placeholder="Add any notes or comments for this shift..."
                            style={{
                                width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px',
                                fontSize: '14px', resize: 'vertical', minHeight: '60px', fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {form.employee && form.startTime && form.endTime && (
                        <div style={{ marginTop: '8px', color: '#666', fontSize: '0.9em' }}>
                            Hours: {calculateHours(form.date, form.startTime, form.endTime).toFixed(2)}
                        </div>
                    )}
                </div>
            ))}

            {canAddMore ? (
                <button
                    type="button"
                    onClick={onAddMore}
                    style={{
                        padding: '8px 16px', backgroundColor: '#28a745', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                        width: '100%', fontSize: '0.9em'
                    }}
                >
                    Add More Shift ({remainingHours.toFixed(1)} hours left)
                </button>
            ) : (
                <button
                    type="button"
                    disabled
                    style={{
                        padding: '8px 16px', backgroundColor: '#6c757d', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'not-allowed',
                        width: '100%', fontSize: '0.9em', opacity: 0.6
                    }}
                >
                    {totalHours >= dayInfo.maxHours ? 'Maximum hours reached' : 'No hours remaining'}
                </button>
            )}
        </div>
    );
}
