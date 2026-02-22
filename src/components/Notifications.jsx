import React from 'react';

export default function Notifications({ error, success }) {
    return (
        <>
            {error && (
                <div style={{
                    backgroundColor: '#f8d7da', color: '#721c24', padding: '12px',
                    borderRadius: '6px', marginBottom: '20px', border: '1px solid #f5c6cb',
                    fontWeight: '500', whiteSpace: 'pre-line'
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    backgroundColor: '#d4edda', color: '#155724', padding: '12px',
                    borderRadius: '6px', marginBottom: '20px', border: '1px solid #c3e6cb',
                    fontWeight: '500'
                }}>
                    {success}
                </div>
            )}
        </>
    );
}
