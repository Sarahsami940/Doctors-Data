import React, { useState, useEffect } from 'react';
import { CityOption, BrickOption, LocationRecord } from '../types';

type AddLocationFormProps = {
    doctorId: number;
    sessionId: number;
    onLocationAdded: (newLocation: LocationRecord) => void;
    onCancel: () => void;
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
    onSessionExpired: () => void;
};

export default function AddLocationForm({ doctorId, sessionId, onLocationAdded, onCancel, onToast, onSessionExpired }: AddLocationFormProps) {
    // City for Expense state
    const [expenseCities, setExpenseCities] = useState<string[]>([]);
    const [expenseCitySearch, setExpenseCitySearch] = useState('');
    const [selectedExpenseCity, setSelectedExpenseCity] = useState('');
    const [showExpenseCityDropdown, setShowExpenseCityDropdown] = useState(false);

    // City for DAS state
    const [dasCities, setDasCities] = useState<CityOption[]>([]);
    const [dasCitySearch, setDasCitySearch] = useState('');
    const [selectedDasCity, setSelectedDasCity] = useState('');
    const [showDasCityDropdown, setShowDasCityDropdown] = useState(false);

    // Brick for DAS state
    const [bricks, setBricks] = useState<BrickOption[]>([]);
    const [brickSearch, setBrickSearch] = useState('');
    const [selectedBrick, setSelectedBrick] = useState('');
    const [showBrickDropdown, setShowBrickDropdown] = useState(false);

    // Location name
    const [locationName, setLocationName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load expense cities on mount
    useEffect(() => {
        fetch('/api/cities-expense')
            .then(res => res.json())
            .then((data: { city_name: string }[]) => setExpenseCities(data.map(d => d.city_name)))
            .catch(() => onToast('error', 'Failed to load expense cities'));
    }, []);

    // Load DAS cities on mount
    useEffect(() => {
        fetch('/api/cities')
            .then(res => res.json())
            .then(data => setDasCities(data))
            .catch(() => onToast('error', 'Failed to load DAS cities'));
    }, []);

    // Load bricks when DAS city changes
    useEffect(() => {
        if (!selectedDasCity) {
            setBricks([]);
            return;
        }
        const params = new URLSearchParams();
        params.set('cityName', selectedDasCity);
        if (brickSearch) params.set('search', brickSearch);
        fetch(`/api/bricks?${params}`)
            .then(res => res.json())
            .then(data => setBricks(data))
            .catch(() => onToast('error', 'Failed to load bricks'));
    }, [selectedDasCity, brickSearch]);

    const handleExpenseCitySelect = (city: string) => {
        setSelectedExpenseCity(city);
        setExpenseCitySearch(city);
        setShowExpenseCityDropdown(false);
    };

    const handleDasCitySelect = (city: CityOption) => {
        setSelectedDasCity(city.city_name);
        setDasCitySearch(city.city_name);
        setShowDasCityDropdown(false);
        // Reset brick
        setSelectedBrick('');
        setBrickSearch('');
    };

    const handleBrickSelect = (brick: BrickOption) => {
        setSelectedBrick(brick.brick_name);
        setBrickSearch(brick.brick_name);
        setShowBrickDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedExpenseCity) {
            onToast('error', 'Please select City for Expense');
            return;
        }
        if (!selectedDasCity || !selectedBrick) {
            onToast('error', 'Please select both City for DAS and Brick for DAS');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/doctors/${doctorId}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city_expense: selectedExpenseCity,
                    city_das: selectedDasCity,
                    brick_das: selectedBrick,
                    location_name: locationName.trim() || null,
                    session_id: sessionId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409) {
                    onToast('error', data.message || 'This location already exists for this doctor');
                } else if (res.status === 400 && (data.error || '').toLowerCase().includes('session')) {
                    onSessionExpired();
                } else {
                    onToast('error', data.error || 'Failed to add location');
                }
                return;
            }

            onToast('success', 'Location added successfully!');
            // Reset form
            setSelectedExpenseCity('');
            setExpenseCitySearch('');
            setSelectedDasCity('');
            setDasCitySearch('');
            setSelectedBrick('');
            setBrickSearch('');
            setLocationName('');
            // Pass the new location returned by the API directly to parent
            onLocationAdded(data.location as LocationRecord);
        } catch (err) {
            onToast('error', 'Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredExpenseCities = expenseCities.filter(c =>
        c.toLowerCase().includes(expenseCitySearch.toLowerCase())
    );

    const filteredDasCities = dasCities.filter(c =>
        c.city_name.toLowerCase().includes(dasCitySearch.toLowerCase())
    );

    const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";

    return (
        <div className="bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                Add New Location
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. City for Expense — Searchable Dropdown */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            City <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={expenseCitySearch}
                            onChange={e => {
                                setExpenseCitySearch(e.target.value);
                                setShowExpenseCityDropdown(true);
                                if (!e.target.value) setSelectedExpenseCity('');
                            }}
                            onFocus={() => setShowExpenseCityDropdown(true)}
                            onBlur={() => setTimeout(() => setShowExpenseCityDropdown(false), 200)}
                            className={inputClass}
                            placeholder="Search expense city..."
                        />
                        {showExpenseCityDropdown && filteredExpenseCities.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredExpenseCities.slice(0, 100).map(city => (
                                    <button
                                        key={city}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleExpenseCitySelect(city)}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${selectedExpenseCity === city ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. City for DAS — Searchable Dropdown */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Distributor City <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={dasCitySearch}
                            onChange={e => {
                                setDasCitySearch(e.target.value);
                                setShowDasCityDropdown(true);
                                if (!e.target.value) {
                                    setSelectedDasCity('');
                                    setSelectedBrick('');
                                    setBrickSearch('');
                                }
                            }}
                            onFocus={() => setShowDasCityDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDasCityDropdown(false), 200)}
                            className={inputClass}
                            placeholder="Search DAS city..."
                        />
                        {showDasCityDropdown && filteredDasCities.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredDasCities.map(city => (
                                    <button
                                        key={city.city_name}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleDasCitySelect(city)}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${selectedDasCity === city.city_name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                                    >
                                        {city.city_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Brick for DAS — Auto-populated from City for DAS */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Brick <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={brickSearch}
                            onChange={e => {
                                setBrickSearch(e.target.value);
                                setShowBrickDropdown(true);
                                if (!e.target.value) setSelectedBrick('');
                            }}
                            onFocus={() => setShowBrickDropdown(true)}
                            onBlur={() => setTimeout(() => setShowBrickDropdown(false), 200)}
                            className={inputClass}
                            placeholder={selectedDasCity ? "Search brick..." : "Select city first..."}
                            disabled={!selectedDasCity}
                        />
                        {showBrickDropdown && bricks.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {bricks.map(brick => (
                                    <button
                                        key={brick.brick_name}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleBrickSelect(brick)}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${selectedBrick === brick.brick_name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                                    >
                                        {brick.brick_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Location Name — Text Input */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Location
                        </label>
                        <input
                            type="text"
                            value={locationName}
                            onChange={e => setLocationName(e.target.value)}
                            className={inputClass}
                            placeholder="e.g. General Hospital"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !selectedExpenseCity || !selectedDasCity || !selectedBrick}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            'Save Location'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
