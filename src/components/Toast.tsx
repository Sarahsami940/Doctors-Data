import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastProps = {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
};

export default function Toast({ toasts, onRemove }: ToastProps) {
    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    const config = {
        success: {
            bg: 'bg-emerald-50 border-emerald-200',
            text: 'text-emerald-800',
            icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            text: 'text-red-800',
            icon: <XCircle className="w-5 h-5 text-red-500" />,
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            icon: <Info className="w-5 h-5 text-blue-500" />,
        },
    }[toast.type];

    return (
        <div
            className={`${config.bg} border rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-slideIn'
                }`}
        >
            <div className="shrink-0 mt-0.5">{config.icon}</div>
            <p className={`${config.text} text-sm flex-1`}>{toast.message}</p>
            <button onClick={handleClose} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
