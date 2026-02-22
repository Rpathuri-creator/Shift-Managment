import React, { useState } from 'react';

export default function EmployeeSelect({ value, onChange, employees, onAddEmployee }) {
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    const handleSave = async () => {
        const ok = await onAddEmployee(newName);
        if (ok) {
            setNewName('');
            setShowAdd(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        flex: 1, padding: '8px',
                        border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em',
                        backgroundColor: '#fff', color: value ? '#222' : '#888'
                    }}
                >
                    <option value="">Select employee</option>
                    {employees.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setShowAdd(!showAdd)}
                    style={{
                        padding: '8px 12px', backgroundColor: '#28a745', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                        fontSize: '0.9em', whiteSpace: 'nowrap'
                    }}
                >
                    + Add
                </button>
            </div>

            {showAdd && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        type="text"
                        placeholder="New employee name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') handleSave(); }}
                        style={{
                            flex: 1, padding: '8px',
                            border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em'
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            padding: '8px 12px', backgroundColor: '#007bff', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowAdd(false); setNewName(''); }}
                        style={{
                            padding: '8px 12px', backgroundColor: '#6c757d', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}
