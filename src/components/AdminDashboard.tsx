import React, { useEffect, useState } from 'react';

const ADMIN_KEY = new URLSearchParams(window.location.search).get('key') || '';

type Overview = {
    totalSessions: number;
    totalLocations: number;
    uniqueUsers: number;
    doctorsMapped: number;
    totalDoctors: number;
    progressPct: number;
    todaySessions: number;
    todayLocations: number;
};
type Contributor = { name: string; employee_code: number; role: string; team: string; locations_added: number; last_active: string };
type TeamRow = { team: string; locations_added: number; members_active: number };
type DayRow = { day: string; locations_added: number };
type ActivityRow = { id: number; user_name: string; employee_code: number; team: string; doctor_name: string; city_name: string; brick_name: string; location_name: string; created_at: string };
type InactiveUser = { name: string; employee_code: number; role: string; team: string; created_at: string };

type AdminData = {
    overview: Overview;
    topContributors: Contributor[];
    teamBreakdown: TeamRow[];
    dailyActivity: DayRow[];
    recentActivity: ActivityRow[];
    inactiveUsers: InactiveUser[];
};

// SQLite stores datetime('now') as UTC but without timezone marker.
// Appending ' UTC' forces JS to parse it as UTC → displays in local timezone.
function utcToLocal(ts: string | null | undefined): string {
    if (!ts) return '—';
    return new Date(ts + ' UTC').toLocaleString();
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
    return (
        <div className={`rounded-2xl p-5 ${color} flex flex-col gap-1`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
            <p className="text-3xl font-black">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
            <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function AdminDashboard() {
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams' | 'activity'>('overview');

    useEffect(() => {
        fetch(`/api/admin/overview?key=${ADMIN_KEY}`)
            .then(r => {
                if (r.status === 403) throw new Error('Invalid admin key. Access denied.');
                if (!r.ok) throw new Error('Failed to load admin data.');
                return r.json();
            })
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Loading analytics...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl">✕</div>
                <p className="text-red-400 font-semibold">{error}</p>
                <p className="text-slate-500 text-xs mt-2">Access this page using the correct admin key in the URL.</p>
            </div>
        </div>
    );

    if (!data) return null;
    const { overview, topContributors, teamBreakdown, dailyActivity, recentActivity, inactiveUsers } = data;

    const maxDayActivity = Math.max(...dailyActivity.map(d => d.locations_added), 1);
    const maxTeamLocations = Math.max(...teamBreakdown.map(t => t.locations_added), 1);

    // Build last 14 days map
    const last14: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const found = dailyActivity.find(r => r.day === key);
        last14.push({ day: key, count: found ? found.locations_added : 0 });
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'users', label: `Contributors (${topContributors.length})` },
        { id: 'teams', label: `Teams (${teamBreakdown.length})` },
        { id: 'activity', label: 'Recent Activity' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            {/* Header */}
            <div className="bg-slate-800/60 border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">📊 Admin Dashboard</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Doctor Directory · Internal Analytics · Restricted Access</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500">Last refreshed</p>
                    <p className="text-xs text-slate-300 font-medium">{new Date().toLocaleString()}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Top KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <KpiCard label="Total Sessions" value={overview.totalSessions} sub={`${overview.todaySessions} today`} color="bg-indigo-600/30 text-indigo-100 border border-indigo-500/30" />
                    <KpiCard label="Locations Added" value={overview.totalLocations} sub={`${overview.todayLocations} today`} color="bg-emerald-600/30 text-emerald-100 border border-emerald-500/30" />
                    <KpiCard label="Unique Users" value={overview.uniqueUsers} sub={`${inactiveUsers.length} visited but didn't add`} color="bg-violet-600/30 text-violet-100 border border-violet-500/30" />
                    <KpiCard label="Doctors Mapped" value={`${overview.progressPct}%`} sub={`${overview.doctorsMapped.toLocaleString()} of ${overview.totalDoctors.toLocaleString()}`} color="bg-amber-600/30 text-amber-100 border border-amber-500/30" />
                </div>

                {/* Progress Bar */}
                <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5 mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-semibold text-base">Overall Mapping Progress</p>
                            <p className="text-xs text-slate-400 mt-0.5">{overview.doctorsMapped.toLocaleString()} doctors mapped out of {overview.totalDoctors.toLocaleString()} total</p>
                        </div>
                        <span className="text-2xl font-black text-emerald-400">{overview.progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-700"
                            style={{ width: `${overview.progressPct}%` }}
                        />
                    </div>
                </div>

                {/* Daily Activity Chart */}
                <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5 mb-8">
                    <p className="font-semibold text-base mb-4">Daily Location Entries — Last 14 Days</p>
                    <div className="flex items-end gap-1 h-24">
                        {last14.map((d, i) => {
                            const pct = d.count > 0 ? Math.max(8, Math.round((d.count / maxDayActivity) * 100)) : 0;
                            const isToday = d.day === new Date().toISOString().slice(0, 10);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                        {d.day}: {d.count}
                                    </div>
                                    <div
                                        className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-emerald-400' : 'bg-indigo-500/70 group-hover:bg-indigo-400'}`}
                                        style={{ height: `${pct}%` }}
                                    />
                                    <span className="text-[8px] text-slate-500 rotate-45 origin-left">{d.day.slice(5)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-800/40 rounded-xl p-1 w-fit">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Overview / Contributors */}
                {activeTab === 'users' && (
                    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                                    <th className="px-5 py-3 text-left">#</th>
                                    <th className="px-5 py-3 text-left">Name</th>
                                    <th className="px-5 py-3 text-left">Emp. Code</th>
                                    <th className="px-5 py-3 text-left">Role</th>
                                    <th className="px-5 py-3 text-left">Team</th>
                                    <th className="px-5 py-3 text-right">Locations Added</th>
                                    <th className="px-5 py-3 text-right">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {topContributors.map((u, i) => (
                                    <tr key={u.employee_code} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-5 py-3 text-slate-500 text-xs">{i + 1}</td>
                                        <td className="px-5 py-3 font-medium">{u.name}</td>
                                        <td className="px-5 py-3 text-slate-400">{u.employee_code}</td>
                                        <td className="px-5 py-3 text-slate-400">{u.role}</td>
                                        <td className="px-5 py-3">
                                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{u.team}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`font-bold ${u.locations_added > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{u.locations_added}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-500 text-xs">{utcToLocal(u.last_active)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {inactiveUsers.length > 0 && (
                            <div className="border-t border-slate-700/50 p-4">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Visited but added no locations ({inactiveUsers.length} users)</p>
                                <div className="flex flex-wrap gap-2">
                                    {inactiveUsers.map(u => (
                                        <span key={u.employee_code} className="bg-slate-700/60 text-slate-300 text-xs px-2.5 py-1 rounded-lg" title={`${u.role} · ${u.team}`}>
                                            {u.name} ({u.employee_code})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Teams */}
                {activeTab === 'teams' && (
                    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                                    <th className="px-5 py-3 text-left">Team</th>
                                    <th className="px-5 py-3 text-left">Active Members</th>
                                    <th className="px-5 py-3 text-right">Locations Added</th>
                                    <th className="px-5 py-3">Progress Bar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {teamBreakdown.map(t => (
                                    <tr key={t.team} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-5 py-3 font-medium">{t.team}</td>
                                        <td className="px-5 py-3 text-slate-400">{t.members_active}</td>
                                        <td className="px-5 py-3 text-right font-bold text-emerald-400">{t.locations_added}</td>
                                        <td className="px-5 py-4 min-w-[120px]">
                                            <MiniBar value={t.locations_added} max={maxTeamLocations} color="bg-emerald-400" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Recent Activity */}
                {activeTab === 'activity' && (
                    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                                    <th className="px-5 py-3 text-left">When</th>
                                    <th className="px-5 py-3 text-left">User</th>
                                    <th className="px-5 py-3 text-left">Team</th>
                                    <th className="px-5 py-3 text-left">Doctor</th>
                                    <th className="px-5 py-3 text-left">Location Added</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {recentActivity.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{utcToLocal(a.created_at)}</td>
                                        <td className="px-5 py-3 font-medium">{a.user_name}</td>
                                        <td className="px-5 py-3">
                                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full">{a.team}</span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-300">{a.doctor_name}</td>
                                        <td className="px-5 py-3 text-slate-400 text-xs">{a.city_name} · {a.brick_name}{a.location_name ? ` · ${a.location_name}` : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Top 5 contributors */}
                        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5">
                            <p className="font-semibold text-sm mb-4 text-slate-300">🏆 Top Contributors</p>
                            <div className="space-y-3">
                                {topContributors.slice(0, 5).map((u, i) => (
                                    <div key={u.employee_code} className="flex items-center gap-3">
                                        <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                            <p className="text-[11px] text-slate-500">{u.team} · {u.role}</p>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-sm">{u.locations_added}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top 5 teams */}
                        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5">
                            <p className="font-semibold text-sm mb-4 text-slate-300">👥 Top Teams</p>
                            <div className="space-y-3">
                                {teamBreakdown.slice(0, 5).map(t => (
                                    <div key={t.team} className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-medium text-white truncate">{t.team}</p>
                                                <span className="text-emerald-400 font-bold text-sm">{t.locations_added}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full"
                                                    style={{ width: `${Math.round((t.locations_added / maxTeamLocations) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
