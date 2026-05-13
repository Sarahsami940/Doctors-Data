import React, { useState, useEffect } from 'react';
import { DoctorDetail as DoctorDetailType, LocationRecord, UserSession } from '../types';
import { MapPin, Plus, User, ArrowLeft, MapPinned, Loader2 } from 'lucide-react';
import AddLocationForm from './AddLocationForm';

type DoctorDetailProps = {
    doctorId: number;
    session: UserSession;
    onBack: () => void;
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onSessionExpired: () => void;
    onLocationAdded?: () => void;
};

export default function DoctorDetail({ doctorId, session, onBack, onToast, onSessionExpired, onLocationAdded }: DoctorDetailProps) {
    const [doctor, setDoctor] = useState<DoctorDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingLocation, setIsAddingLocation] = useState(false);

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

    useEffect(() => {
        setIsLoading(true);
        fetchDoctor();
    }, [doctorId]);

    // Called by AddLocationForm with the new location returned by the API
    const handleLocationAdded = (newLocation: LocationRecord) => {
        // Immediately append to local state — no round-trip needed
        setDoctor(prev => prev ? {
            ...prev,
            locations: [newLocation, ...(prev.locations || [])],
            location_count: (prev.location_count || 0) + 1
        } : prev);
        setIsAddingLocation(false);
        if (onLocationAdded) onLocationAdded(); // Refresh KPI tiles on sidebar
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

    return (
        <div className="p-5 sm:p-8 lg:p-10 w-full max-w-4xl mx-auto">
            {/* Mobile Back Button */}
            <button
                onClick={onBack}
                className="md:hidden flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to list
            </button>

            {/* Doctor Header */}
            <div className="border-b border-slate-200 pb-6 mb-6">
                <div className="flex items-start justify-between mb-5">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{doctor.doctor_name}</h2>
                    <div className="hidden sm:flex w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full items-center justify-center text-indigo-600 shrink-0 ml-4">
                        <User className="w-7 h-7" />
                    </div>
                </div>

                {/* Info Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">City (DAS)</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.doctor_city_das || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Speciality</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.speciality || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Qualification</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.qualification || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Designation</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.designation || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.mobile_number || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Distributor</p>
                        <p className="text-sm font-medium text-slate-700 truncate">{doctor.distributor_name || 'N/A'}</p>
                    </div>
                </div>

                {doctor.pmdc_number && (
                    <p className="mt-3 text-xs text-slate-400">PMDC# {doctor.pmdc_number}</p>
                )}
            </div>

            {/* Locations Section */}
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                        Associated Locations
                        {doctor.locations && doctor.locations.length > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                {doctor.locations.length}
                            </span>
                        )}
                    </h3>
                    {!isAddingLocation && (
                        <button
                            onClick={() => setIsAddingLocation(true)}
                            className="flex items-center text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-5 py-2.5 rounded-xl gap-2 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            Add Location
                        </button>
                    )}
                </div>

                {/* Add Location Form */}
                {isAddingLocation && (
                    <div className="mb-6 animate-fadeIn">
                        <AddLocationForm
                            doctorId={doctor.id}
                            sessionId={session.session_id}
                            onLocationAdded={handleLocationAdded}
                            onCancel={() => setIsAddingLocation(false)}
                            onToast={onToast}
                            onSessionExpired={onSessionExpired}
                        />
                    </div>
                )}

                {/* Locations Table */}
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
                            <button
                                onClick={() => setIsAddingLocation(true)}
                                className="mt-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/25 hover:shadow-lg transition-all active:scale-95"
                            >
                                Add the first location
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
