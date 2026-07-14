import React from 'react';
import { calculateHours, formatTimeOnly } from '../../utils/shiftUtils';

export default function CalendarCell({ dayNumber, dayShifts, onClick, canManageDeposits, onDepositClick }) {
    const hasShift = dayShifts.length > 0;
    const showDepositBadge = canManageDeposits && hasShift;
    const hasUnexplainedDifference = canManageDeposits &&
        dayShifts.some(s => s.difference !== 0 && !(s.reason || '').trim());

    if (hasUnexplainedDifference) {
        // Diagnostic: open the browser console (F12) to see exactly what the
        // API returned for each flagged shift — raw dailyBalance/countedBalance/
        // reason values, to tell apart a real discrepancy from a data issue
        // (e.g. currency symbols stored as text) or a stale sheet column.
        console.warn(
            `[CashDeposit] Unexplained difference on ${dayShifts[0]?.date}:`,
            dayShifts.map(s => ({
                employee: s.employee,
                dailyBalance: s.dailyBalance,
                countedBalance: s.countedBalance,
                difference: s.difference,
                reason: s.reason,
                rowIndex: s.rowIndex
            }))
        );
    }

    return (
        <div
            onClick={onClick}
            style={{
                position: 'relative',
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

            {showDepositBadge && (
                <button
                    onClick={e => {
                        e.stopPropagation();
                        onDepositClick();
                    }}
                    title="Manage cash deposits"
                    style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: '#f0ad4e', color: 'white', border: 'none',
                        fontSize: '11px', fontWeight: 'bold', lineHeight: '18px',
                        padding: 0, cursor: 'pointer', zIndex: 1
                    }}
                >
                    $
                </button>
            )}

            {hasUnexplainedDifference && (
                <span
                    title="Unexplained cash difference — no reason recorded"
                    style={{
                        position: 'absolute', top: '6px', left: '6px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: '#dc3545', color: 'white',
                        fontSize: '11px', fontWeight: 'bold', lineHeight: '16px',
                        textAlign: 'center', zIndex: 1
                    }}
                >
                    !
                </span>
            )}

            {dayShifts.map((s, idx) => (
                <div key={idx} style={{
                    position: 'relative',
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
                    {canManageDeposits && (s.dailyBalance > 0 || s.countedBalance > 0) && (
                        <div style={{ fontSize: '0.6em', opacity: 0.95, marginTop: '1px', color: '#ffe9b3' }}>
                            Daily ${Number(s.dailyBalance).toFixed(2)} / Counted ${Number(s.countedBalance).toFixed(2)}
                            {s.difference !== 0 && (
                                <span style={{
                                    color: s.difference > 0 ? '#86efac' : '#fca5a5',
                                    fontWeight: 'bold', marginLeft: '4px'
                                }}>
                                    (Δ {s.difference > 0 ? '+' : ''}${Number(s.difference).toFixed(2)})
                                </span>
                            )}
                        </div>
                    )}
                    {canManageDeposits && s.reason && (
                        <div style={{ fontSize: '0.6em', opacity: 0.85, marginTop: '1px', fontStyle: 'italic' }}>
                            Reason: {s.reason.length > 24 ? `${s.reason.substring(0, 24)}...` : s.reason}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
