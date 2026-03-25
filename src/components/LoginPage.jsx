import React, { useState } from 'react';
import { login } from '../api/authApi';

export default function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Username and password are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await login(username.trim(), password);
            if (result.success) {
                onLoginSuccess({ username: result.username, role: result.role || 'Employee' });
            } else {
                setError(result.message || 'Invalid username or password');
            }
        } catch {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#f8f9fa', minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                backgroundColor: '#fff', borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                padding: '48px 40px', width: '100%', maxWidth: '400px'
            }}>
                <h1 style={{
                    textAlign: 'center', color: '#333', marginBottom: '8px',
                    fontSize: '1.8em', fontWeight: '600'
                }}>
                    Calder
                </h1>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '32px', fontSize: '0.95em' }}>
                    Employee Shift Tracker
                </p>

                {error && (
                    <div style={{
                        backgroundColor: '#fde8e8', border: '1px solid #f5c6c6',
                        color: '#c0392b', padding: '10px 14px', borderRadius: '6px',
                        marginBottom: '20px', fontSize: '0.9em'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#444', fontSize: '0.9em' }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid #ccc',
                                borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box',
                                outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4a90e2'}
                            onBlur={e => e.target.style.borderColor = '#ccc'}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#444', fontSize: '0.9em' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid #ccc',
                                borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box',
                                outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#4a90e2'}
                            onBlur={e => e.target.style.borderColor = '#ccc'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px', backgroundColor: loading ? '#aaa' : '#4a90e2',
                            color: '#fff', border: 'none', borderRadius: '6px',
                            fontSize: '1em', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => { if (!loading) e.target.style.backgroundColor = '#357abd'; }}
                        onMouseLeave={e => { if (!loading) e.target.style.backgroundColor = '#4a90e2'; }}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
