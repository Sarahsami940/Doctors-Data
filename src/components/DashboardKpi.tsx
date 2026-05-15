import React, { useState } from 'react';
import { DashboardStats } from '../types';
import { X } from 'lucide-react';

interface Props {
    stats: DashboardStats | null;
    isLoading: boolean;
    activeLocationKpi: string;
    activeSuggestionKpi: string;
    onLocationKpiClick: (kpiId: string) => void;
    onSuggestionKpiClick: (kpiId: string) => void;
    onClearAll: () => void;
}

export default function DashboardKpi({ stats, isLoading, activeLocationKpi, activeSuggestionKpi, onLocationKpiClick, onSuggestionKpiClick, onClearAll }: Props) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    if (isLoading && !stats) {
        return (
            <div className="grid grid-cols-2 gap-1.5 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg h-12" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const locationItems = [
        {
            id: 'no-locations',
            label: 'No Loc.',
            value: stats.noLocations,
            description: 'Doctors with no locations',
            bg: 'bg-slate-50 hover:bg-slate-100',
            border: 'border-slate-200',
            activeBg: 'bg-slate-700',
            activeBorder: 'border-slate-800',
            tooltipBg: 'bg-slate-800'
        },
        {
            id: 'single-location',
            label: 'Single Loc.',
            value: stats.singleLocation,
            description: 'Exactly 1 location',
            bg: 'bg-emerald-50 hover:bg-emerald-100',
            border: 'border-emerald-100',
            activeBg: 'bg-emerald-600',
            activeBorder: 'border-emerald-700',
            tooltipBg: 'bg-emerald-700'
        },
        {
            id: 'multi-locations',
            label: 'Multi Loc.',
            value: stats.multipleLocations,
            description: '2 or more locations',
            bg: 'bg-indigo-50 hover:bg-indigo-100',
            border: 'border-indigo-100',
            activeBg: 'bg-indigo-600',
            activeBorder: 'border-indigo-700',
            tooltipBg: 'bg-indigo-700'
        }
    ];

    const suggestionItems = [
        {
            id: 'no-suggestions',
            label: 'No Suggs.',
            value: stats.noSuggestions,
            description: 'No suggestions recorded',
            bg: 'bg-orange-50 hover:bg-orange-100',
            border: 'border-orange-100',
            activeBg: 'bg-orange-500',
            activeBorder: 'border-orange-600',
            tooltipBg: 'bg-orange-600'
        },
        {
            id: 'with-suggestions',
            label: 'With Suggs.',
            value: stats.withSuggestions,
            description: 'Has pending suggestions',
            bg: 'bg-amber-50 hover:bg-amber-100',
            border: 'border-amber-100',
            activeBg: 'bg-amber-500',
            activeBorder: 'border-amber-600',
            tooltipBg: 'bg-amber-600'
        }
    ];

    const allActive = activeLocationKpi === 'all' && activeSuggestionKpi === 'all';

    return (
        <div className="grid grid-cols-2 gap-1.5 h-full content-start">
            {/* Total Doctors */}
            <div
                onClick={onClearAll}
                className={`col-span-2 px-2.5 py-1.5 rounded-lg border flex flex-col justify-center gap-0 transition-all relative cursor-pointer
                    ${allActive
                        ? 'bg-blue-600 border-blue-700 text-white shadow-md ring-1 ring-offset-1 ring-blue-400 z-10'
                        : 'bg-blue-50 border-blue-100 hover:bg-blue-100 text-slate-900 hover:shadow-sm'
                    }
                `}
            >
                <span className={`text-[9px] uppercase tracking-wider font-bold leading-tight ${allActive ? 'text-white/80' : 'text-slate-500'}`}>
                    Total Doctors
                </span>
                <div className={`text-[15px] font-black leading-tight ${allActive ? 'text-white' : 'text-slate-900'}`}>
                    {stats.totalDoctors.toLocaleString()}
                </div>
            </div>

            {/* Location Items */}
            {locationItems.map((item, idx) => {
                const isActive = activeLocationKpi === item.id;
                return (
                    <div
                        key={item.id}
                        onClick={() => onLocationKpiClick(isActive ? 'all' : item.id)}
                        className={`px-2 py-1.5 rounded-lg border flex flex-col justify-center gap-0 transition-all relative cursor-pointer
                            ${isActive
                                ? `${item.activeBg} ${item.activeBorder} text-white shadow-md z-10 scale-[1.02]`
                                : `${item.bg} ${item.border} text-slate-900 hover:shadow-sm`
                            }
                        `}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-[8px] uppercase tracking-wider font-bold leading-none ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <X className="w-2.5 h-2.5 text-white/80" />
                            )}
                        </div>
                        <div className={`text-sm font-black leading-tight mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {item.value.toLocaleString()}
                        </div>
                    </div>
                )
            })}

            {/* Suggestion Items */}
            {suggestionItems.map((item, idx) => {
                const isActive = activeSuggestionKpi === item.id;
                const hoverId = idx + 10;
                return (
                    <div
                        key={item.id}
                        onClick={() => onSuggestionKpiClick(isActive ? 'all' : item.id)}
                        className={`px-2 py-1.5 rounded-lg border flex flex-col justify-center gap-0 transition-all relative cursor-pointer
                            ${isActive
                                ? `${item.activeBg} ${item.activeBorder} text-white shadow-md z-10 scale-[1.02]`
                                : `${item.bg} ${item.border} text-slate-900 hover:shadow-sm`
                            }
                        `}
                        onMouseEnter={() => setHoveredIdx(hoverId)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-[8px] uppercase tracking-wider font-bold leading-none ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <X className="w-2.5 h-2.5 text-white/80" />
                            )}
                        </div>
                        <div className={`text-sm font-black leading-tight mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {item.value.toLocaleString()}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
