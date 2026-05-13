import React, { useState } from 'react';
import { DashboardStats } from '../types';
import { X, Filter } from 'lucide-react';

interface Props {
    stats: DashboardStats | null;
    isLoading: boolean;
    activeKpi: string;
    onKpiClick: (kpiId: string) => void;
}

export default function DashboardKpi({ stats, isLoading, activeKpi, onKpiClick }: Props) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    if (isLoading && !stats) {
        return (
            <div className="grid grid-cols-2 gap-2 mb-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl h-16" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const items = [
        {
            id: 'all',
            label: 'Total Doctors',
            value: stats.totalDoctors,
            description: 'Total number of doctors in the master directory. Click to clear filters.',
            bg: 'bg-blue-50 hover:bg-blue-100',
            border: 'border-blue-100',
            activeBg: 'bg-blue-600',
            activeBorder: 'border-blue-700',
            tooltipBg: 'bg-blue-700'
        },
        {
            id: 'no-locations',
            label: 'No Locations',
            value: stats.noLocations,
            description: 'Doctors with no locations associated yet. Click to filter.',
            bg: 'bg-slate-50 hover:bg-slate-100',
            border: 'border-slate-200',
            activeBg: 'bg-slate-700',
            activeBorder: 'border-slate-800',
            tooltipBg: 'bg-slate-800'
        },
        {
            id: 'single-location',
            label: 'Single Location',
            value: stats.singleLocation,
            description: 'Doctors associated with exactly one location record. Click to filter.',
            bg: 'bg-emerald-50 hover:bg-emerald-100',
            border: 'border-emerald-100',
            activeBg: 'bg-emerald-600',
            activeBorder: 'border-emerald-700',
            tooltipBg: 'bg-emerald-700'
        },
        {
            id: 'multi-locations',
            label: 'Multi Locations',
            value: stats.multipleLocations,
            description: 'Doctors associated with two or more location records. Click to filter.',
            bg: 'bg-indigo-50 hover:bg-indigo-100',
            border: 'border-indigo-100',
            activeBg: 'bg-indigo-600',
            activeBorder: 'border-indigo-700',
            tooltipBg: 'bg-indigo-700'
        }
    ];

    return (
        <div className="grid grid-cols-2 gap-2 mb-4">
            {items.map((item, idx) => {
                const isActive = activeKpi === item.id || (activeKpi === 'all' && item.id === 'all');
                return (
                    <div
                        key={idx}
                        onClick={() => onKpiClick(isActive ? 'all' : item.id)}
                        className={`px-3 py-2.5 rounded-xl border flex flex-col justify-center gap-0.5 transition-all relative cursor-pointer
                        ${isActive
                                ? `${item.activeBg} ${item.activeBorder} text-white shadow-md ring-2 ring-offset-1 ring-${item.activeBg.split('-')[1]}-400 scale-[1.02] z-10`
                                : `${item.bg} ${item.border} text-slate-900 hover:shadow-sm`
                            }
                    `}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-[10px] uppercase tracking-wider font-bold truncate ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.label}
                            </span>
                            {isActive && item.id !== 'all' && (
                                <div className="bg-white/20 rounded-full p-0.5" title="Clear Filter">
                                    <X className="w-3 h-3 text-white" />
                                </div>
                            )}
                            {isActive && item.id === 'all' && activeKpi !== 'all' && ( // "All" is active by default but only show filter icon if specifically filtering
                                null
                            )}
                        </div>
                        <div className={`text-lg font-black leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {item.value.toLocaleString()}
                        </div>

                        {/* Tooltip */}
                        {hoveredIdx === idx && (
                            <div className={`absolute z-50 bottom-full left-0 mb-1.5 w-56 ${item.tooltipBg} text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none`}>
                                {item.description}
                                {/* Arrow */}
                                <div className={`absolute top-full left-4 w-0 h-0 border-x-4 border-x-transparent border-t-4 ${item.tooltipBg.replace('bg-', 'border-t-')}`} />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
