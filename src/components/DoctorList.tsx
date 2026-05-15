import React, { useRef, useCallback } from 'react';
import { Doctor, PaginationInfo } from '../types';
import { ChevronRight, MapPin, Loader2 } from 'lucide-react';

type DoctorListProps = {
    doctors: Doctor[];
    selectedDoctorId: number | null;
    onSelectDoctor: (id: number) => void;
    pagination: PaginationInfo | null;
    onLoadMore: () => void;
    isLoading: boolean;
    isLoadingMore: boolean;
    suggestionCounts?: Record<number, number>;
    isAdmin?: boolean;
    finalizedDoctorIds?: Set<number>;
};

export default function DoctorList({
    doctors,
    selectedDoctorId,
    onSelectDoctor,
    pagination,
    onLoadMore,
    isLoading,
    isLoadingMore,
    suggestionCounts,
    isAdmin,
    finalizedDoctorIds,
}: DoctorListProps) {
    const observerRef = useRef<IntersectionObserver | null>(null);

    const lastDoctorRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isLoadingMore) return;
            if (observerRef.current) observerRef.current.disconnect();
            observerRef.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && pagination && pagination.page < pagination.totalPages) {
                    onLoadMore();
                }
            });
            if (node) observerRef.current.observe(node);
        },
        [isLoadingMore, pagination, onLoadMore]
    );

    // Calculate the starting serial number based on pagination
    const serialStart = pagination ? (pagination.page - 1) * pagination.limit : 0;
    // For appended results, we just use the index in the array
    const formatSerial = (index: number) => {
        return String(index + 1).padStart(5, '0');
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading doctors...</p>
                </div>
            </div>
        );
    }

    if (doctors.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center px-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-1">No doctors found</p>
                    <p className="text-xs text-slate-500">Try adjusting your search criteria</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header Row */}
            <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 z-10">
                <div className="flex items-center px-4 sm:px-6 py-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-12 shrink-0 text-center">#</div>
                    <div className="flex-1">Name</div>
                    {isAdmin ? (
                        <>
                            <div className="hidden sm:block w-20 text-center">Locations</div>
                            <div className="hidden sm:block w-32 text-center">Status</div>
                        </>
                    ) : (
                        <div className="hidden sm:block w-20 text-center">Locations</div>
                    )}
                    <div className="w-5 shrink-0"></div>
                </div>
            </div>

            {/* Doctor Rows */}
            <div className="divide-y divide-slate-100">
                {doctors.map((doctor, index) => {
                    const isLast = index === doctors.length - 1;
                    return (
                        <div
                            key={doctor.id}
                            ref={isLast ? lastDoctorRef : undefined}
                            onClick={() => onSelectDoctor(doctor.id)}
                            className={`flex items-center px-4 sm:px-6 py-3 cursor-pointer transition-all duration-150 group
                ${selectedDoctorId === doctor.id
                                    ? (isAdmin ? 'bg-amber-50/70 border-l-3 border-l-amber-500' : 'bg-indigo-50/70 border-l-3 border-l-indigo-500')
                                    : 'hover:bg-slate-50/80 border-l-3 border-l-transparent'
                                }`}
                        >
                            <div className="w-12 shrink-0 text-center">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded">
                                    {formatSerial(index)}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-900 truncate">{doctor.doctor_name}</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                    {doctor.doctor_city_das}{doctor.mobile_number ? ` · ${doctor.mobile_number}` : ''}
                                </p>
                            </div>
                            {isAdmin ? (
                                <>
                                    <div className="hidden sm:flex items-center justify-center w-20 shrink-0">
                                        {doctor.location_count > 0 ? (
                                            <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {doctor.location_count}
                                            </span>
                                        ) : <span className="text-[10px] text-slate-300">—</span>}
                                    </div>
                                    <div className="hidden sm:flex flex-col items-center justify-center gap-1 w-32 shrink-0">
                                        {suggestionCounts && suggestionCounts[doctor.id] > 0 && (
                                            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-200">
                                                {suggestionCounts[doctor.id]} Suggestion{suggestionCounts[doctor.id] > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {finalizedDoctorIds && finalizedDoctorIds.has(doctor.id) && (
                                            <span className="inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 tracking-wide">
                                                ✓ Finalized
                                            </span>
                                        )}
                                        {(!suggestionCounts || !suggestionCounts[doctor.id]) && (!finalizedDoctorIds || !finalizedDoctorIds.has(doctor.id)) && (
                                            <span className="text-[10px] text-slate-300">—</span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="hidden sm:flex items-center justify-center w-20 shrink-0">
                                    {doctor.location_count > 0 ? (
                                        <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {doctor.location_count}
                                        </span>
                                    ) : <span className="text-[10px] text-slate-300">—</span>}
                                </div>
                            )}
                            <ChevronRight className={`w-5 h-5 shrink-0 text-slate-300 transition-colors ${selectedDoctorId === doctor.id ? (isAdmin ? 'text-amber-500' : 'text-indigo-500') : 'group-hover:text-slate-400'
                                }`} />
                        </div>
                    );
                })}
            </div>

            {/* Load More Indicator */}
            {isLoadingMore && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-2" />
                    <span className="text-xs text-slate-500">Loading more doctors...</span>
                </div>
            )}

            {/* Pagination Info */}
            {pagination && (
                <div className="px-6 py-3 text-center border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                        Showing {doctors.length} of {pagination.total.toLocaleString()} doctors
                    </p>
                </div>
            )}
        </div>
    );
}
