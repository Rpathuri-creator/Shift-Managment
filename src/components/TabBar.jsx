import React from 'react';

const MENU_ITEMS = [
    {
        key: 'form',
        label: 'Add Shifts',
        managerAdminOnly: true,
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
        )
    },
    {
        key: 'calendar',
        label: 'Calendar',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        )
    },
    {
        key: 'reports',
        label: 'Shift Reports',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
        )
    },
    {
        key: 'payperiod',
        label: 'Pay Periods',
        adminOnly: true,
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        )
    },
];

export default function Sidebar({ activeTab, onTabChange, role, currentUser, onLogout }) {
    return (
        <div style={{
            width: '220px',
            minHeight: '100vh',
            backgroundColor: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            alignSelf: 'flex-start',
            height: '100vh',
        }}>
            {/* Branding */}
            <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: '#f1f5f9', fontSize: '1.25em', fontWeight: '700', letterSpacing: '-0.3px' }}>
                    Calder
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75em', marginTop: '3px' }}>
                    Employee Shift Tracker
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '12px 0' }}>
                {MENU_ITEMS
                    .filter(item => {
                        if (item.adminOnly) return role === 'Admin';
                        if (item.managerAdminOnly) return role === 'Admin' || role === 'Manager';
                        return true;
                    })
                    .map(item => {
                        const isActive = activeTab === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => onTabChange(item.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '11px 20px',
                                    border: 'none',
                                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                    backgroundColor: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                                    color: isActive ? '#93c5fd' : '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.875em',
                                    fontWeight: isActive ? '600' : '400',
                                    textAlign: 'left',
                                    transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                                    boxSizing: 'border-box',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                    if (!isActive) e.currentTarget.style.color = '#cbd5e1';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                    if (!isActive) e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <span style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
            </nav>

            {/* User + Logout */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ color: '#f1f5f9', fontSize: '0.85em', fontWeight: '500' }}>
                        {currentUser.username}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75em', marginTop: '2px' }}>
                        {currentUser.role}
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8em',
                        fontWeight: '500',
                        transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
