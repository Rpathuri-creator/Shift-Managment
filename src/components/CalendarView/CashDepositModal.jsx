import React, { useState, useEffect } from 'react';

export default function CashDepositModal({ show, date, shifts, isSaving, onClose, onSave }) {
    const [amounts, setAmounts] = useState({});

    useEffect(() => {
        if (!show) return;
        const initial = {};
        shifts.forEach(s => {
            initial[s.rowIndex] = {
                dailyBalance: s.dailyBalance ? String(s.dailyBalance) : '',
                countedBalance: s.countedBalance ? String(s.countedBalance) : '',
                reason: s.reason || ''
            };
        });
        setAmounts(initial);
    }, [show, date, shifts]);

    if (!show || !date) return null;

    const handleChange = (rowIndex, field, value) => {
        setAmounts(prev => ({
            ...prev,
            [rowIndex]: { ...prev[rowIndex], [field]: value }
        }));
    };

    const handleSave = () => {
        const entries = shifts.map(s => {
            const dailyBalance = parseFloat(amounts[s.rowIndex]?.dailyBalance) || 0;
            const countedBalance = parseFloat(amounts[s.rowIndex]?.countedBalance) || 0;
            const reason = amounts[s.rowIndex]?.reason || '';
            return { rowIndex: s.rowIndex, dailyBalance, countedBalance, reason };
        });
        onSave(entries);
    };

    const inputStyle = {
        width: '90px', padding: '6px 8px', border: '1px solid #ccc',
        borderRadius: '4px', fontSize: '14px'
    };
    const labelStyle = { display: 'block', fontSize: '11px', color: '#888', marginBottom: '3px' };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', padding: '24px',
                maxWidth: '480px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1.1em' }}>Cash Deposits — {date}</h3>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#666' }}
                    >
                        ×
                    </button>
                </div>

                {shifts.length === 0 ? (
                    <div style={{ color: '#888', fontStyle: 'italic', marginBottom: '16px' }}>
                        No shifts on this date.
                    </div>
                ) : (
                    shifts.map(s => {
                        const dailyBalance = parseFloat(amounts[s.rowIndex]?.dailyBalance) || 0;
                        const countedBalance = parseFloat(amounts[s.rowIndex]?.countedBalance) || 0;
                        const difference = countedBalance - dailyBalance;
                        const reason = amounts[s.rowIndex]?.reason || '';
                        const diffColor = difference === 0 ? '#666' : (difference > 0 ? '#16a34a' : '#dc3545');
                        const needsReason = difference !== 0 && !reason.trim();

                        return (
                            <div key={s.rowIndex} style={{
                                marginBottom: '12px', padding: '10px 12px',
                                border: needsReason ? '1px solid #f0ad4e' : '1px solid #ddd',
                                backgroundColor: needsReason ? '#fff8ec' : 'transparent',
                                borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '14px', color: '#333', fontWeight: '500', marginBottom: '8px' }}>
                                    {s.employee}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <div>
                                        <label style={labelStyle}>Daily Balance</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: '#666' }}>$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={amounts[s.rowIndex]?.dailyBalance ?? ''}
                                                onChange={e => handleChange(s.rowIndex, 'dailyBalance', e.target.value)}
                                                placeholder="0.00"
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Counted Balance</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: '#666' }}>$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={amounts[s.rowIndex]?.countedBalance ?? ''}
                                                onChange={e => handleChange(s.rowIndex, 'countedBalance', e.target.value)}
                                                placeholder="0.00"
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Difference</label>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: diffColor, padding: '6px 0' }}>
                                            {difference > 0 ? '+' : ''}${difference.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <label style={{ ...labelStyle, color: needsReason ? '#b45309' : '#888' }}>
                                    Reason {needsReason ? '(required — amounts don\'t match)' : '(optional)'}
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={e => handleChange(s.rowIndex, 'reason', e.target.value)}
                                    placeholder="e.g. register short, tip payout, till error..."
                                    style={{
                                        width: '100%', padding: '6px 8px', fontSize: '14px', boxSizing: 'border-box',
                                        border: needsReason ? '1px solid #f0ad4e' : '1px solid #ccc', borderRadius: '4px'
                                    }}
                                />
                            </div>
                        );
                    })
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px', backgroundColor: '#6c757d', color: 'white',
                            border: 'none', borderRadius: '4px',
                            cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || shifts.length === 0}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isSaving ? '#6c757d' : '#28a745',
                            color: 'white', border: 'none', borderRadius: '4px',
                            cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
