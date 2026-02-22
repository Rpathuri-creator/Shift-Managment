import React from 'react';
import { calculateHours } from '../../utils/shiftUtils';

export default function EditModal({ show, editingDate, editForms, employees, isSaving, onClose, onFormChange, onAddShift, onRemoveShift, onSave }) {
    if (!show || !editingDate) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', padding: '30px',
                maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>Edit Shifts for {editingDate}</h3>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
                    >
                        ×
                    </button>
                </div>

                {editForms.map((form, idx) => (
                    <div key={idx} style={{
                        marginBottom: '20px', padding: '15px',
                        border: '1px solid #ddd', borderRadius: '8px',
                        backgroundColor: form.isExisting ? '#f8f9fa' : '#fff'
                    }}>
                        {form.isExisting && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                                Existing Shift
                            </div>
                        )}

                        <div style={{ marginBottom: '12px' }}>
                            <select
                                value={form.employee}
                                onChange={e => onFormChange(idx, 'employee', e.target.value)}
                                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }}
                            >
                                <option value="">Select employee</option>
                                {employees.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Start Time</label>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={e => onFormChange(idx, 'startTime', e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>End Time</label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={e => onFormChange(idx, 'endTime', e.target.value)}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={e => onFormChange(idx, 'notes', e.target.value)}
                                placeholder="Add any notes or comments..."
                                style={{
                                    width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px',
                                    minHeight: '60px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px'
                                }}
                            />
                        </div>

                        {form.employee && form.startTime && form.endTime && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                Hours: {calculateHours(form.date, form.startTime, form.endTime).toFixed(2)}
                            </div>
                        )}

                        <button
                            onClick={() => onRemoveShift(idx)}
                            style={{
                                backgroundColor: '#dc3545', color: 'white', border: 'none',
                                padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                            }}
                        >
                            Remove Shift
                        </button>
                    </div>
                ))}

                <button
                    onClick={onAddShift}
                    style={{
                        backgroundColor: '#28a745', color: 'white', border: 'none',
                        padding: '10px 20px', borderRadius: '4px', cursor: 'pointer',
                        marginBottom: '20px', width: '100%'
                    }}
                >
                    Add Another Shift
                </button>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px', backgroundColor: '#6c757d', color: 'white',
                            border: 'none', borderRadius: '4px',
                            cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: isSaving ? '#6c757d' : '#007bff',
                            color: 'white', border: 'none', borderRadius: '4px',
                            cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
