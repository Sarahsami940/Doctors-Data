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
            <div className="grid grid-cols-2 gap-1.5 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg h-12" />
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
        <div className="grid grid-cols-2 gap-1.5">
            {items.map((item, idx) => {
                const isActive = activeKpi === item.id || (activeKpi === 'all' && item.id === 'all');
                return (
                    <div
                        key={idx}
                        onClick={() => onKpiClick(isActive ? 'all' : item.id)}
                        className={`px-2 py-1.5 rounded-lg border flex flex-col justify-center gap-0 transition-all relative cursor-pointer
                        ${isActive
                                ? `${item.activeBg} ${item.activeBorder} text-white shadow-md ring-1 ring-offset-1 ring-${item.activeBg.split('-')[1]}-400 scale-[1.02] z-10`
                                : `${item.bg} ${item.border} text-slate-900 hover:shadow-sm`
                            }
                    `}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-[8px] uppercase tracking-wider font-bold truncate leading-tight ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.label}
                            </span>
                            {isActive && item.id !== 'all' && (
                                <div className="bg-white/20 rounded-full p-0.5" title="Clear Filter">
                                    <X className="w-2.5 h-2.5 text-white" />
                                </div>
                            )}
                            {isActive && item.id === 'all' && activeKpi !== 'all' && (
                                null
                            )}
                        </div>
                        <div className={`text-base font-black leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            {item.value.toLocaleString()}
                        </div>

                        {/* Tooltip */}
                        {hoveredIdx === idx && (
                            <div className={`absolute z-50 bottom-full left-0 mb-1.5 w-48 ${item.tooltipBg} text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none`}>
                                {item.description}
                                <div className={`absolute top-full left-4 w-0 h-0 border-x-4 border-x-transparent border-t-4 ${item.tooltipBg.replace('bg-', 'border-t-')}`} />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    );
}
