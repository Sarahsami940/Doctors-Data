import React, { useState, useCallback } from 'react';
import { UserSession, TEAMS, ROLES } from '../types';

type UserPromptProps = {
    onSessionCreated: (session: UserSession) => void;
};

export default function UserPrompt({ onSessionCreated }: UserPromptProps) {
    const [name, setName] = useState('');
    const [employeeCode, setEmployeeCode] = useState('');
    const [role, setRole] = useState('');
    const [team, setTeam] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = role === 'Admin';

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !employeeCode || !role || !team) {
            setError('All fields are required');
            return;
        }

        if (isNaN(parseInt(employeeCode))) {
            setError('Employee Code must be a number');
            return;
        }

        if (isAdmin && !adminPassword) {
            setError('Admin password is required');
            return;
        }

        setIsSubmitting(true);
        try {
            // If admin, validate password first
            if (isAdmin) {
                const authRes = await fetch('/api/admin/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                });
                if (!authRes.ok) {
                    setError('Incorrect admin password');
                    setIsSubmitting(false);
                    return;
                }
            }

            const res = await fetch('/api/user-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    employee_code: parseInt(employeeCode),
                    role,
                    team,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create session');
                return;
            }

            const session: UserSession = {
                session_id: data.session_id,
                name: name.trim(),
                employee_code: parseInt(employeeCode),
                role,
                team,
            };

            localStorage.setItem('doctorDirSession', JSON.stringify(session));
            onSessionCreated(session);
        } catch (err) {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, employeeCode, role, team, adminPassword, isAdmin, onSessionCreated]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Blurred backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                {/* Header gradient */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                    <h2 className="text-xl font-bold text-white">Welcome to Doctor Directory</h2>
                    <p className="text-indigo-100 text-sm mt-1">Please enter your details to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Employee Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={employeeCode}
                            onChange={e => setEmployeeCode(e.target.value)}
                            placeholder="Enter your employee code"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={role}
                            onChange={e => {
                                setRole(e.target.value);
                                setAdminPassword('');
                                setError('');
                            }}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all appearance-none"
                            required
                        >
                            <option value="">Select your role</option>
                            {ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Admin Password — only shown when Admin role selected */}
                    {isAdmin && (
                        <div className="animate-fadeIn">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Admin Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-amber-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Team <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={team}
                            onChange={e => setTeam(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all appearance-none"
                            required
                        >
                            <option value="">Select your team</option>
                            {TEAMS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-white ${
                            isAdmin
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
                        }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Please wait...
                            </span>
                        ) : (
                            isAdmin ? 'Enter Admin Panel' : 'Continue to App'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
