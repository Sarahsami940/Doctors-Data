import React, { useState, useEffect } from 'react';
import { DoctorDetail as DoctorDetailType, LocationRecord, UserSession, DoctorSuggestion } from '../types';
import { MapPin, Plus, User, ArrowLeft, MapPinned, Loader2, FileText, Check, X, Pencil, Trash2 } from 'lucide-react';
import AddLocationForm from './AddLocationForm';
import DoctorInfoForm from './DoctorInfoForm';
import AdminEditForm from './AdminEditForm';

type DoctorDetailProps = {
    doctorId: number;
    session: UserSession;
    onBack: () => void;
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onSessionExpired: () => void;
    onLocationAdded?: () => void;
    isAdmin?: boolean;
    onDoctorDeleted?: () => void;
};

export default function DoctorDetail({ doctorId, session, onBack, onToast, onSessionExpired, onLocationAdded, isAdmin, onDoctorDeleted }: DoctorDetailProps) {
    const [doctor, setDoctor] = useState<DoctorDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    const [suggestions, setSuggestions] = useState<DoctorSuggestion[]>([]);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [editingSuggestion, setEditingSuggestion] = useState<DoctorSuggestion | null>(null);

    const fetchDoctor = async () => {
        try {
            const res = await fetch(`/api/doctors/${doctorId}`);
            if (!res.ok) throw new Error('Not found');
            const data = await res.json();
            setDoctor(data);
        } catch (err) {
            onToast('error', 'Failed to load doctor details');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuggestions = async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(`/api/doctors/${doctorId}/suggestions`);
            const data = await res.json();
            setSuggestions(data);
        } catch {}
    };

    useEffect(() => {
        setIsLoading(true);
        fetchDoctor();
        fetchSuggestions();
    }, [doctorId]);

    const handleLocationAdded = (newLocation: LocationRecord) => {
        setDoctor(prev => prev ? {
            ...prev,
            locations: [newLocation, ...(prev.locations || [])],
            location_count: (prev.location_count || 0) + 1
        } : prev);
        setIsAddingLocation(false);
        if (onLocationAdded) onLocationAdded();
    };

    const handleSuggestionAction = async (suggestionId: number, status: 'approved' | 'rejected', overrides?: any) => {
        try {
            const res = await fetch(`/api/suggestions/${suggestionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, reviewed_by: session.name, overrides })
            });
            if (!res.ok) { const d = await res.json(); onToast('error', d.error); return; }
            onToast('success', `Suggestion ${status}`);
            fetchSuggestions();
            if (status === 'approved') {
                const s = suggestions.find(s => s.id === suggestionId);
                if (s?.suggest_delete && onDoctorDeleted) onDoctorDeleted();
            }
        } catch { onToast('error', 'Failed to update suggestion'); }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading doctor details...</p>
                </div>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400">
                <p>Doctor not found</p>
            </div>
        );
    }

    const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
    const pastSuggestions = suggestions.filter(s => s.status !== 'pending');

    return (
        <div className="p-5 sm:p-8 lg:p-10 w-full max-w-4xl mx-auto">
            {/* Mobile Back Button */}
            <button onClick={onBack} className="md:hidden flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors group">
                <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" /> Back to list
            </button>

            {/* Doctor Header */}
            <div className="border-b border-slate-200 pb-5 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{doctor.doctor_name}</h2>
                    <div className="hidden sm:flex w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full items-center justify-center text-indigo-600 shrink-0 ml-4">
                        <User className="w-7 h-7" />
                    </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                    {[
                        ['City (DAS)', doctor.doctor_city_das],
                        ['Speciality', doctor.speciality],
                        ['Qualification', doctor.qualification],
                        ['Designation', doctor.designation],
                        ['Phone', doctor.mobile_number],
                        ['Distributor', doctor.distributor_name],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-xs font-medium text-slate-700 truncate">{value || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* === ADMIN VIEW: Suggestions Table === */}
            {isAdmin && (
                <div className="mb-8">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-amber-500" /> Received Suggestions
                        {pendingSuggestions.length > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingSuggestions.length} pending</span>
                        )}
                    </h3>

                    {pendingSuggestions.length === 0 && pastSuggestions.length === 0 && (
                        <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                            <p className="text-sm text-slate-500">No suggestions received yet</p>
                        </div>
                    )}

                    {/* Pending Suggestions Table */}
                    {pendingSuggestions.length > 0 && (
                        <div className="border border-amber-200 rounded-xl overflow-hidden shadow-sm mb-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-amber-100 text-left">
                                    <thead className="bg-amber-50">
                                        <tr>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">By</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Name</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Mobile</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Speciality</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Designation</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Qualification</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">PMDC</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">CNIC</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Type</th>
                                            <th className="px-2 py-2 text-[9px] font-semibold text-amber-700 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-amber-50">
                                        {pendingSuggestions.map(s => (
                                            <tr key={s.id} className={`hover:bg-amber-50/40 transition-colors ${editingSuggestion?.id === s.id ? 'bg-amber-50/60' : ''}`}>
                                                <td className="px-2 py-2 text-[11px] text-slate-700 whitespace-normal break-words max-w-[80px]">{s.employee_name}<br/><span className="text-[10px] text-slate-400">{s.team}</span></td>
                                                <td className="px-2 py-2 text-[11px] font-medium text-slate-800 whitespace-normal break-words max-w-[100px]">{s.suggest_delete ? <span className="text-red-600">⚠ DELETE</span> : s.suggested_name}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{s.suggested_mobile || '—'}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-normal break-words max-w-[90px]">{s.suggested_speciality || '—'}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-normal break-words max-w-[90px]">{s.suggested_designation || '—'}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-normal break-words max-w-[90px]">{s.suggested_qualification || '—'}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{s.suggested_pmdc || '—'}</td>
                                                <td className="px-2 py-2 text-[11px] text-slate-600 whitespace-nowrap">{s.suggested_cnic || '—'}</td>
                                                <td className="px-2 py-2">
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${s.suggest_delete ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                                        {s.suggest_delete ? 'Delete' : 'Update'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className="flex gap-1">
                                                        {!s.suggest_delete && (
                                                            <button onClick={() => setEditingSuggestion(editingSuggestion?.id === s.id ? null : s)}
                                                                className="flex items-center gap-0.5 text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium hover:bg-amber-200 transition-all">
                                                                <Pencil className="w-3 h-3" /> Edit
                                                            </button>
                                                        )}
                                                        {s.suggest_delete ? (
                                                            deleteConfirm === s.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => handleSuggestionAction(s.id, 'approved')} className="text-[10px] px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700">Yes</button>
                                                                    <button onClick={() => setDeleteConfirm(null)} className="text-[10px] px-2 py-1 bg-white text-slate-600 rounded border font-medium hover:bg-slate-50">No</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setDeleteConfirm(s.id)} className="flex items-center gap-0.5 text-[10px] px-2 py-1 bg-red-100 text-red-600 rounded font-medium hover:bg-red-200 transition-all">
                                                                    <Trash2 className="w-3 h-3" /> Delete
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button onClick={() => handleSuggestionAction(s.id, 'approved')}
                                                                className="flex items-center gap-0.5 text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded font-medium hover:bg-green-200 transition-all">
                                                                <Check className="w-3 h-3" /> Finalize
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleSuggestionAction(s.id, 'rejected')}
                                                            className="flex items-center gap-0.5 text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded font-medium hover:bg-slate-200 transition-all">
                                                            <X className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Edit Form (opens below table when admin clicks Edit) */}
                    {editingSuggestion && !editingSuggestion.suggest_delete && (
                        <div className="mb-4 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/30">
                            <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                                <Pencil className="w-4 h-4" /> Editing Suggestion #{editingSuggestion.id}
                                <button onClick={() => setEditingSuggestion(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                            </h4>
                            <AdminEditForm
                                suggestion={editingSuggestion}
                                onUpdate={(updated) => {
                                    setSuggestions(prev => prev.map(s => s.id === updated.id ? updated : s));
                                    setEditingSuggestion(updated);
                                    onToast('success', 'Suggestion updated');
                                }}
                                onFinalize={() => {
                                    handleSuggestionAction(editingSuggestion.id, 'approved');
                                    setEditingSuggestion(null);
                                }}
                                onToast={onToast}
                            />
                        </div>
                    )}

                    {pastSuggestions.length > 0 && (
                        <details className="mt-2">
                            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Past suggestions ({pastSuggestions.length})</summary>
                            {pastSuggestions.map(s => (
                                <div key={s.id} className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                                    <span className={`font-bold uppercase text-[10px] ${s.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>{s.status}</span>
                                    <span className="ml-2">{s.employee_name} — {s.suggest_delete ? 'Deletion request' : 'Info update'}</span>
                                    <span className="ml-2 text-slate-400">reviewed by {s.reviewed_by}</span>
                                </div>
                            ))}
                        </details>
                    )}
                </div>
            )}

            {/* === TSM VIEW: Doctor Info Form === */}
            {!isAdmin && (
                <div className="mb-8">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-indigo-400" /> Doctor Info
                    </h3>
                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5">
                        <DoctorInfoForm doctorId={doctorId} doctor={doctor} session={session} onToast={onToast} />
                    </div>
                </div>
            )}

            {/* Locations Section */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                        Associated Locations
                        {doctor.locations && doctor.locations.length > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{doctor.locations.length}</span>
                        )}
                    </h3>
                    {!isAddingLocation && !isAdmin && (
                        <button onClick={() => setIsAddingLocation(true)}
                            className="flex items-center text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-5 py-2.5 rounded-xl gap-2 shadow-md shadow-indigo-500/25 transition-all active:scale-95">
                            <Plus className="w-4.5 h-4.5" /> Add Location
                        </button>
                    )}
                </div>

                {isAddingLocation && (
                    <div className="mb-6 animate-fadeIn">
                        <AddLocationForm doctorId={doctor.id} sessionId={session.session_id} onLocationAdded={handleLocationAdded}
                            onCancel={() => setIsAddingLocation(false)} onToast={onToast} onSessionExpired={onSessionExpired} />
                    </div>
                )}

                {doctor.locations && doctor.locations.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">City (Expense)</th>
                                        <th className="px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">City (DAS)</th>
                                        <th className="px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Brick (DAS)</th>
                                        <th className="px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                        <th className="hidden sm:table-cell px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Added By</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {doctor.locations.map(loc => (
                                        <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-700">{loc.city_expense}</td>
                                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-700">{loc.city_das}</td>
                                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-700">{loc.brick_das}</td>
                                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">{loc.location_name || '—'}</td>
                                            <td className="hidden sm:table-cell px-4 sm:px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">{loc.added_by_name || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    !isAddingLocation && (
                        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                            <MapPinned className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 mb-1">No locations added yet.</p>
                            {!isAdmin && (
                                <button onClick={() => setIsAddingLocation(true)}
                                    className="mt-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95">
                                    Add the first location
                                </button>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
