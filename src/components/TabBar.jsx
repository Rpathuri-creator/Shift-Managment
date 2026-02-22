import React from 'react';

export default function TabBar({ activeTab, onTabChange }) {
    const btnStyle = (tab) => ({
        flex: 1, padding: '15px 30px', border: 'none',
        backgroundColor: activeTab === tab ? '#007bff' : '#fff',
        color: activeTab === tab ? 'white' : '#666',
        cursor: 'pointer', fontSize: '16px', transition: 'all 0.3s ease',
        borderBottom: activeTab === tab ? '3px solid #0056b3' : '3px solid transparent'
    });

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', marginBottom: '30px',
            backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <button onClick={() => onTabChange('form')} style={btnStyle('form')}>
                Add Shifts
            </button>
            <button onClick={() => onTabChange('calendar')} style={btnStyle('calendar')}>
                Calendar &amp; Reports
            </button>
        </div>
    );
}
