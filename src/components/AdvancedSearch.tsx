import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

type AdvancedSearchProps = {
    onSearch: (filters: SearchFilters) => void;
    isSearching: boolean;
};

export type SearchFilters = {
    search: string;
    name: string;
    speciality: string;
    qualification: string;
    designation: string;
    city_das: string;
    distributor: string;
};

export const emptyFilters: SearchFilters = {
    search: '',
    name: '',
    speciality: '',
    qualification: '',
    designation: '',
    city_das: '',
    distributor: '',
};

type FilterOptions = {
    specialities: string[];
    qualifications: string[];
    designations: string[];
    doctor_cities_das: string[];
    distributors: string[];
};

export default function AdvancedSearch({ onSearch, isSearching }: AdvancedSearchProps) {
    const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({ specialities: [], qualifications: [], designations: [], doctor_cities_das: [], distributors: [] });
    const [cityDasSearch, setCityDasSearch] = useState('');
    const [showCityDasDropdown, setShowCityDasDropdown] = useState(false);

    useEffect(() => {
        fetch('/api/filter-options')
            .then(r => r.json())
            .then(data => setFilterOptions(data))
            .catch(() => { });
    }, []);

    const activeFilterCount = [filters.speciality, filters.qualification, filters.designation, filters.city_das, filters.distributor]
        .filter(v => v.trim() !== '').length;

    const handleQuickSearch = (value: string) => {
        const newFilters = { ...filters, search: value };
        setFilters(newFilters);
        debouncedSearch(newFilters);
    };

    const handleFilterChange = (field: keyof SearchFilters, value: string) => {
        const newFilters = { ...filters, [field]: value, search: '' };
        setFilters(newFilters);
        debouncedSearch(newFilters);
    };

    const debouncedSearch = (f: SearchFilters) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => onSearch(f), 300);
        setDebounceTimer(timer);
    };

    const clearFilters = () => {
        setFilters(emptyFilters);
        setCityDasSearch('');
        onSearch(emptyFilters);
    };

    const hasAnyFilter = filters.search || activeFilterCount > 0;

    const filteredCitiesDas = filterOptions.doctor_cities_das.filter(c =>
        c.toLowerCase().includes(cityDasSearch.toLowerCase())
    );

    // Compact select styling
    const miniSelectClass = "w-full pl-2 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer text-slate-600 truncate";

    return (
        <div className="space-y-2.5">
            {/* Quick Search */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 ${isSearching ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                    placeholder="Search by name, speciality, city, distributor..."
                    value={filters.search}
                    onChange={(e) => handleQuickSearch(e.target.value)}
                />
                {hasAnyFilter && (
                    <button
                        onClick={clearFilters}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Compact Inline Filters */}
            <div className="flex flex-wrap gap-1.5 items-end">
                {/* Speciality */}
                <div className="relative flex-1 min-w-[100px]">
                    <select
                        value={filters.speciality}
                        onChange={e => handleFilterChange('speciality', e.target.value)}
                        className={miniSelectClass}
                        title="Speciality"
                    >
                        <option value="">Speciality</option>
                        {filterOptions.specialities.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>

                {/* Designation */}
                <div className="relative flex-1 min-w-[100px]">
                    <select
                        value={filters.designation}
                        onChange={e => handleFilterChange('designation', e.target.value)}
                        className={miniSelectClass}
                        title="Designation"
                    >
                        <option value="">Designation</option>
                        {filterOptions.designations.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>

                {/* Qualification */}
                <div className="relative flex-1 min-w-[100px]">
                    <select
                        value={filters.qualification}
                        onChange={e => handleFilterChange('qualification', e.target.value)}
                        className={miniSelectClass}
                        title="Qualification"
                    >
                        <option value="">Qualification</option>
                        {filterOptions.qualifications.map(q => (
                            <option key={q} value={q}>{q}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* Second row */}
            <div className="flex flex-wrap gap-1.5 items-end">
                {/* City for DAS — Searchable */}
                <div className="relative flex-1 min-w-[120px]">
                    <input
                        type="text"
                        value={cityDasSearch || filters.city_das}
                        onChange={e => {
                            setCityDasSearch(e.target.value);
                            setShowCityDasDropdown(true);
                            if (!e.target.value) {
                                handleFilterChange('city_das', '');
                            }
                        }}
                        onFocus={() => setShowCityDasDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCityDasDropdown(false), 200)}
                        className="w-full pl-2 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
                        placeholder="City for DAS"
                        title="City for DAS"
                    />
                    {showCityDasDropdown && filteredCitiesDas.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {filteredCitiesDas.slice(0, 50).map(city => (
                                <button
                                    key={city}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setCityDasSearch(city);
                                        setShowCityDasDropdown(false);
                                        handleFilterChange('city_das', city);
                                    }}
                                    className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-indigo-50 transition-colors ${filters.city_das === city ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Distributor */}
                <div className="relative flex-1 min-w-[120px]">
                    <select
                        value={filters.distributor}
                        onChange={e => handleFilterChange('distributor', e.target.value)}
                        className={miniSelectClass}
                        title="Distributor"
                    >
                        <option value="">Distributor</option>
                        {filterOptions.distributors.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>

                {/* Reset button — only shows when filters are active */}
                {activeFilterCount > 0 && (
                    <button
                        onClick={clearFilters}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg uppercase tracking-wide transition-all active:scale-95 shrink-0"
                        title="Clear all filters"
                    >
                        Reset ({activeFilterCount})
                    </button>
                )}
            </div>
        </div>
    );
}
