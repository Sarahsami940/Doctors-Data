import React, { useState, useEffect, useCallback } from 'react';
import { DoctorSuggestion } from '../types';
import { Loader2, Save, CheckCircle } from 'lucide-react';

type Props = {
    suggestion: DoctorSuggestion;
    onUpdate: (updated: DoctorSuggestion) => void;
    onFinalize: () => void;
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
};

type DropdownOptions = { speciality: string[]; designation: string[]; qualification: string[] };

export default function AdminEditForm({ suggestion, onUpdate, onFinalize, onToast }: Props) {
    const [name, setName] = useState(suggestion.suggested_name || '');
    const [mobile, setMobile] = useState(suggestion.suggested_mobile || '');
    const [speciality, setSpeciality] = useState(suggestion.suggested_speciality || '');
    const [designation, setDesignation] = useState(suggestion.suggested_designation || '');
    const [qualification, setQualification] = useState(suggestion.suggested_qualification || '');
    const [pmdc, setPmdc] = useState(suggestion.suggested_pmdc || '');
    const [cnic, setCnic] = useState(suggestion.suggested_cnic || '');
    const [pmdcMatchedName, setPmdcMatchedName] = useState<string | null>(null);
    const [pmdcChecking, setPmdcChecking] = useState(false);
    const [pmdcValid, setPmdcValid] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [options, setOptions] = useState<DropdownOptions>({ speciality: [], designation: [], qualification: [] });

    useEffect(() => {
        fetch('/api/filter-options').then(r => r.json()).then(data => {
            setOptions({ speciality: data.specialities || [], designation: data.designations || [], qualification: data.qualifications || [] });
        }).catch(() => {});
    }, []);

    // Sync form when suggestion changes (from parent update)
    useEffect(() => {
        setName(suggestion.suggested_name || '');
        setMobile(suggestion.suggested_mobile || '');
        setSpeciality(suggestion.suggested_speciality || '');
        setDesignation(suggestion.suggested_designation || '');
        setQualification(suggestion.suggested_qualification || '');
        setPmdc(suggestion.suggested_pmdc || '');
        setCnic(suggestion.suggested_cnic || '');
    }, [suggestion.id]);

    // PMDC lookup
    const validatePmdc = useCallback(async (value: string) => {
        if (!value.trim()) { setPmdcValid(null); setPmdcMatchedName(null); return; }
        if (value.trim().toLowerCase() === 'special prescriber') { setPmdcValid(true); setPmdcMatchedName(null); return; }
        const normalized = value.trim().toUpperCase();
        setPmdcChecking(true);
        try {
            const res = await fetch(`/api/pmdc/${encodeURIComponent(normalized)}`);
            const data = await res.json();
            setPmdcValid(data.valid);
            setPmdcMatchedName(data.valid && data.doctor_name ? data.doctor_name : null);
        } catch { setPmdcValid(false); setPmdcMatchedName(null); }
        finally { setPmdcChecking(false); }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => { if (pmdc) validatePmdc(pmdc); }, 500);
        return () => clearTimeout(t);
    }, [pmdc, validatePmdc]);

    const handleUpdate = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/suggestions/${suggestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggested_name: name, suggested_mobile: mobile,
                    suggested_speciality: speciality, suggested_designation: designation,
                    suggested_qualification: qualification, suggested_pmdc: pmdc, suggested_cnic: cnic
                })
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
                onToast('error', d.error || 'Failed to update suggestion');
                return;
            }
            const updated = await res.json();
            onUpdate(updated);
        } catch (err: any) {
            onToast('error', `Network error: ${err.message || 'Failed to update suggestion'}`);
        }
        finally { setSaving(false); }
    };

    const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1';
    const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all bg-white';
    const selectCls = inputCls + ' appearance-none pr-8';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
                <label className={labelCls}>Doctor Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
                <label className={labelCls}>Mobile</label>
                <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} className={inputCls} />
            </div>
            <div className="relative">
                <label className={labelCls}>Speciality</label>
                <select value={speciality} onChange={e => setSpeciality(e.target.value)} className={selectCls}>
                    <option value="">Select</option>
                    {options.speciality.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="relative">
                <label className={labelCls}>Designation</label>
                <select value={designation} onChange={e => setDesignation(e.target.value)} className={selectCls}>
                    <option value="">Select</option>
                    {options.designation.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="relative">
                <label className={labelCls}>Qualification</label>
                <select value={qualification} onChange={e => setQualification(e.target.value)} className={selectCls}>
                    <option value="">Select</option>
                    {options.qualification.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
            </div>
            <div>
                <label className={labelCls}>
                    PMDC Number
                    {pmdcChecking && <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-amber-500" />}
                    {pmdcValid === true && <span className="ml-1 text-green-500">✓</span>}
                    {pmdcValid === false && <span className="ml-1 text-red-500">✗</span>}
                </label>
                <input type="text" value={pmdc} onChange={e => { setPmdc(e.target.value.toUpperCase()); setPmdcValid(null); setPmdcMatchedName(null); }} className={inputCls} />
                {pmdcValid === false && <p className="text-[10px] text-red-500 mt-0.5">PMDC number not found</p>}
                {pmdcMatchedName && <p className="text-[10px] text-green-600 mt-0.5">Registered as: <span className="font-semibold">{pmdcMatchedName}</span></p>}
            </div>
            <div>
                <label className={labelCls}>CNIC</label>
                <input type="text" value={cnic} onChange={e => setCnic(e.target.value)} className={inputCls} placeholder="12345-6789012-3" />
            </div>

            {/* Action buttons spanning full width */}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-2 border-t border-amber-200 mt-1">
                <button onClick={handleUpdate} disabled={saving}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Update
                </button>
                <button onClick={() => {
                    if (window.confirm("Are you sure you want to finalize this suggestion? It cannot be changed later.")) {
                        onFinalize();
                    }
                }}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all">
                    <CheckCircle className="w-3 h-3" /> Finalize
                </button>
            </div>
        </div>
    );
}
