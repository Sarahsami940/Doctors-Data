import React, { useState, useEffect, useCallback } from 'react';
import { UserSession } from '../types';
import { Send, Trash2, ChevronDown, Loader2 } from 'lucide-react';

type Props = {
    doctorId: number;
    doctor: { doctor_name: string; mobile_number: string; speciality: string; designation: string; qualification: string; pmdc_number: string; };
    session: UserSession;
    onToast: (type: 'success' | 'error' | 'info', message: string) => void;
};

type DropdownOptions = { speciality: string[]; designation: string[]; qualification: string[]; };

export default function DoctorInfoForm({ doctorId, doctor, session, onToast }: Props) {
    const [name, setName] = useState(doctor.doctor_name || '');
    const [mobile, setMobile] = useState(doctor.mobile_number || '');
    const [speciality, setSpeciality] = useState(doctor.speciality || '');
    const [designation, setDesignation] = useState(doctor.designation || '');
    const [qualification, setQualification] = useState(doctor.qualification || '');
    const [pmdc, setPmdc] = useState('');
    const [pmdcValid, setPmdcValid] = useState<boolean | null>(null);
    const [pmdcChecking, setPmdcChecking] = useState(false);
    const [pmdcMatchedName, setPmdcMatchedName] = useState<string | null>(null);
    const [isSpecialPrescriber, setIsSpecialPrescriber] = useState(false);
    const [cnic, setCnic] = useState('');
    const [changeReason, setChangeReason] = useState('');
    const [suggestDelete, setSuggestDelete] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [options, setOptions] = useState<DropdownOptions>({ speciality: [], designation: [], qualification: [] });

    // Load dropdowns
    useEffect(() => {
        fetch('/api/dropdown-options').then(r => r.json()).then(data => {
            setOptions({ speciality: data.speciality || [], designation: data.designation || [], qualification: data.qualification || [] });
        }).catch(() => {});
    }, [doctorId]);

    // Reset form when doctor changes
    useEffect(() => {
        setName(doctor.doctor_name || ''); setMobile(doctor.mobile_number || '');
        setSpeciality(doctor.speciality || ''); setDesignation(doctor.designation || '');
        setQualification(doctor.qualification || ''); setPmdc(''); setPmdcValid(null);
        setChangeReason(''); setSuggestDelete(false); setDeleteReason(''); setSubmitted(false);
    }, [doctorId, doctor]);

    // PMDC validation with debounce
    const validatePmdc = useCallback(async (value: string) => {
        if (!value.trim()) { setPmdcValid(null); setPmdcMatchedName(null); return; }
        if (value.trim().toLowerCase() === 'special prescriber') { setPmdcValid(true); setPmdcMatchedName(null); return; }
        // Auto-capitalize: PMDC format is ####-X (capital letter at end)
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

    // CNIC mask: 12345-6789012-3
    const handleCnicChange = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 13);
        let formatted = '';
        for (let i = 0; i < digits.length; i++) {
            if (i === 5 || i === 12) formatted += '-';
            formatted += digits[i];
        }
        setCnic(formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client-side validation
        if (!suggestDelete) {
            const missing: string[] = [];
            if (!name.trim()) missing.push('Doctor Name');
            if (!mobile.trim()) missing.push('Mobile');
            if (!speciality) missing.push('Speciality');
            if (!designation) missing.push('Designation');
            if (!qualification) missing.push('Qualification');
            if (!pmdc.trim()) missing.push('PMDC Number');
            if (!cnic.trim()) missing.push('CNIC');
            if (missing.length > 0) {
                onToast('error', `Please fill: ${missing.join(', ')}`);
                return;
            }
            if (pmdcValid === false) {
                onToast('error', 'PMDC number is invalid');
                return;
            }
        } else if (!deleteReason.trim()) {
            onToast('error', 'Please provide a reason for deletion');
            return;
        }

        setIsSubmitting(true);
        try {
            const body: any = { session_id: session.session_id, suggest_delete: suggestDelete };
            if (suggestDelete) {
                body.delete_reason = deleteReason;
            } else {
                Object.assign(body, { suggested_name: name, suggested_mobile: mobile, suggested_speciality: speciality, suggested_designation: designation, suggested_qualification: qualification, suggested_pmdc: pmdc, suggested_cnic: cnic, change_reason: changeReason || undefined });
            }
            const res = await fetch(`/api/doctors/${doctorId}/suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) { onToast('error', data.error || 'Failed to submit'); return; }
            onToast('success', suggestDelete ? 'Deletion request submitted for review' : 'Suggestion submitted successfully');
            setSubmitted(true);
        } catch { onToast('error', 'Network error'); }
        finally { setIsSubmitting(false); }
    };

    if (submitted) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Send className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-slate-700">Suggestion submitted!</p>
                <p className="text-xs text-slate-400 mt-1">It will be reviewed by an admin</p>
                <button onClick={() => setSubmitted(false)} className="mt-4 text-xs text-indigo-600 hover:text-indigo-700 font-medium">Submit another</button>
            </div>
        );
    }

    const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";
    const selectCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none";
    const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Delete toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={suggestDelete} onChange={e => setSuggestDelete(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                <span className="text-xs font-medium text-red-600 group-hover:text-red-700 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Suggest Deletion
                </span>
            </label>

            {suggestDelete ? (
                <div>
                    <label className={labelCls}>Reason for deletion <span className="text-red-500">*</span></label>
                    <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                        className={inputCls + " min-h-[80px]"} placeholder="Why should this record be deleted?" required />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Doctor Name <span className="text-red-500">*</span></label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
                        </div>
                        <div>
                            <label className={labelCls}>Mobile <span className="text-red-500">*</span></label>
                            <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} className={inputCls} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <label className={labelCls}>Speciality <span className="text-red-500">*</span></label>
                            <select value={speciality} onChange={e => setSpeciality(e.target.value)} className={selectCls} required>
                                <option value="">Select</option>
                                {options.speciality.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Designation <span className="text-red-500">*</span></label>
                            <select value={designation} onChange={e => setDesignation(e.target.value)} className={selectCls} required>
                                <option value="">Select</option>
                                {options.designation.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Qualification <span className="text-red-500">*</span></label>
                            <select value={qualification} onChange={e => setQualification(e.target.value)} className={selectCls} required>
                                <option value="">Select</option>
                                {options.qualification.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 bottom-2.5 w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className={`${labelCls} !mb-0`}>
                                    PMDC Number <span className="text-red-500">*</span>
                                    {!isSpecialPrescriber && pmdcChecking && <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-indigo-500" />}
                                    {!isSpecialPrescriber && pmdcValid === true && <span className="ml-1 text-green-500">✓</span>}
                                    {!isSpecialPrescriber && pmdcValid === false && <span className="ml-1 text-red-500">✗</span>}
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                    <input type="checkbox" checked={isSpecialPrescriber} onChange={e => {
                                        setIsSpecialPrescriber(e.target.checked);
                                        if (e.target.checked) {
                                            setPmdc('Special Prescriber');
                                            setPmdcValid(true);
                                            setPmdcChecking(false);
                                        } else {
                                            setPmdc('');
                                            setPmdcValid(null);
                                        }
                                    }} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-[10px] text-slate-500">Special Prescriber (no PMDC)</span>
                                </label>
                            </div>
                            <input type="text" value={pmdc}
                                onChange={e => { const v = e.target.value.toUpperCase(); setPmdc(v); setPmdcValid(null); setPmdcMatchedName(null); }}
                                className={`${inputCls} ${pmdcValid === false ? 'border-red-300 focus:ring-red-500/20' : ''} ${isSpecialPrescriber ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                                placeholder='e.g. 100022-P'
                                disabled={isSpecialPrescriber}
                                required />
                            {!isSpecialPrescriber && pmdcValid === false && <p className="text-[10px] text-red-500 mt-0.5">PMDC number not found</p>}
                            {!isSpecialPrescriber && pmdcMatchedName && <p className="text-[10px] text-green-600 mt-0.5">Registered as: <span className="font-semibold">{pmdcMatchedName}</span></p>}
                        </div>
                        <div>
                            <label className={labelCls}>CNIC <span className="text-red-500">*</span></label>
                            <input type="text" value={cnic} onChange={e => handleCnicChange(e.target.value)}
                                className={inputCls} placeholder="12345-6789012-3" required />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Change Reason <span className="text-slate-400 normal-case">(optional)</span></label>
                        <textarea value={changeReason} onChange={e => setChangeReason(e.target.value)}
                            className={inputCls + " min-h-[60px]"} placeholder="Reason for changes..." />
                    </div>
                </>
            )}

            <button type="submit" disabled={isSubmitting || (!suggestDelete && pmdcValid === false)}
                className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                    suggestDelete ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20' : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-500/20'
                }`}>
                {isSubmitting ? 'Submitting...' : suggestDelete ? 'Submit Deletion Request' : 'Submit Suggestion'}
            </button>
        </form>
    );
}
