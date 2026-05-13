import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Doctor, PaginationInfo, UserSession, ToastMessage } from './types';
import UserPrompt from './components/UserPrompt';
import DoctorList from './components/DoctorList';
import DoctorDetail from './components/DoctorDetail';
import DashboardKpi from './components/DashboardKpi';
import AdminDashboard from './components/AdminDashboard';
import AdvancedSearch, { SearchFilters, emptyFilters } from './components/AdvancedSearch';
import Toast from './components/Toast';
import { User, Stethoscope, Shield, ArrowLeftRight, Database, CheckCircle } from 'lucide-react';
import { DashboardStats } from './types';

export default function App() {
  // Admin route guard — accessible at /admin?key=atco2024
  if (window.location.pathname === '/admin') {
    return <AdminDashboard />;
  }

  const [session, setSession] = useState<UserSession | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>(emptyFilters);
  const [activeKpiFilter, setActiveKpiFilter] = useState<string>('all');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [adminAppView, setAdminAppView] = useState(false); // Admin viewing as normal app
  const [suggestionCounts, setSuggestionCounts] = useState<Record<number, number>>({});
  const [viewFinalized, setViewFinalized] = useState(false); // Admin: toggle Master Data vs Finalized
  const [finalizedRecords, setFinalizedRecords] = useState<any[]>([]);
  const [finalizedLoading, setFinalizedLoading] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = session?.role === 'Admin' && !adminAppView;

  // Check for existing session
  useEffect(() => {
    const stored = sessionStorage.getItem('doctorDirSession');
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem('doctorDirSession');
      }
    }
  }, []);

  // Toast helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSessionExpired = useCallback(() => {
    sessionStorage.removeItem('doctorDirSession');
    setSession(null);
    addToast('info', 'Your session has expired. Please enter your details again.');
  }, [addToast]);

  // Fetch suggestion counts for admin
  const fetchSuggestionCounts = useCallback(async () => {
    if (!session || session.role !== 'Admin') return;
    try {
      const res = await fetch('/api/suggestions/pending/count');
      const data = await res.json();
      const map: Record<number, number> = {};
      for (const row of data) map[row.doctor_id] = row.pending_count;
      setSuggestionCounts(map);
    } catch {}
  }, [session]);

  // Fetch doctors
  const fetchDoctors = useCallback(async (filters: SearchFilters, kpi: string, page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setIsLoading(true);
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');

      if (filters.search) params.set('search', filters.search);
      if (filters.name) params.set('name', filters.name);
      if (filters.speciality) params.set('speciality', filters.speciality);
      if (filters.qualification) params.set('qualification', filters.qualification);
      if (filters.designation) params.set('designation', filters.designation);
      if (filters.city_das) params.set('city_das', filters.city_das);
      if (filters.distributor) params.set('distributor', filters.distributor);
      if (kpi && kpi !== 'all') params.set('kpi', kpi);

      const res = await fetch(`/api/doctors?${params}`);
      const data = await res.json();

      if (append) {
        setDoctors(prev => [...prev, ...data.doctors]);
      } else {
        setDoctors(data.doctors);
      }
      setPagination(data.pagination);
    } catch (err) {
      addToast('error', 'Failed to load doctors. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsSearching(false);
    }
  }, [addToast]);

  const fetchStats = useCallback(async (filters?: SearchFilters) => {
    setIsStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.search) params.set('search', filters.search);
        if (filters.name) params.set('name', filters.name);
        if (filters.speciality) params.set('speciality', filters.speciality);
        if (filters.qualification) params.set('qualification', filters.qualification);
        if (filters.designation) params.set('designation', filters.designation);
        if (filters.city_das) params.set('city_das', filters.city_das);
        if (filters.distributor) params.set('distributor', filters.distributor);
      }
      const qs = params.toString();
      const res = await fetch(`/api/stats${qs ? '?' + qs : ''}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats');
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDoctors(emptyFilters, 'all');
    fetchStats();
    fetchSuggestionCounts();
  }, [fetchDoctors, fetchStats, fetchSuggestionCounts]);

  const handleSearch = useCallback((filters: SearchFilters) => {
    setCurrentFilters(filters);
    setSelectedDoctorId(null);
    fetchDoctors(filters, activeKpiFilter, 1, false);
    fetchStats(filters);
  }, [fetchDoctors, fetchStats, activeKpiFilter]);

  const handleKpiClick = useCallback((kpi: string) => {
    setActiveKpiFilter(kpi);
    setSelectedDoctorId(null);
    fetchDoctors(currentFilters, kpi, 1, false);
  }, [fetchDoctors, currentFilters]);

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchDoctors(currentFilters, activeKpiFilter, pagination.page + 1, true);
    }
  }, [pagination, currentFilters, activeKpiFilter, fetchDoctors]);

  const handleSelectDoctor = useCallback((id: number) => {
    setSelectedDoctorId(id);
    window.history.pushState({ doctorId: id }, '', `#doctor-${id}`);
  }, []);

  useEffect(() => {
    const handlePopState = () => { setSelectedDoctorId(null); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogoClick = useCallback(() => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 2000);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      window.open('/api/export/locations', '_blank');
      addToast('info', 'Downloading locations export...');
    }
  }, [addToast]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!session && <UserPrompt onSessionCreated={setSession} />}

      <div className="flex flex-col md:flex-row h-screen">
        {/* Sidebar */}
        <div className={`w-full md:w-[520px] lg:w-[600px] xl:w-[50%] border-r border-slate-200 bg-white flex flex-col h-screen shrink-0 ${selectedDoctorId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 space-y-3 shrink-0 bg-white">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <button onClick={handleLogoClick}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/20 hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0">
                  <Stethoscope className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Doctor Directory</h1>
                {isAdmin && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Admin view toggle */}
                {session?.role === 'Admin' && (
                  <button onClick={() => setAdminAppView(!adminAppView)}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-all hover:bg-slate-50"
                    title={adminAppView ? 'Switch to Admin Panel' : 'Switch to App View'}>
                    <ArrowLeftRight className="w-3 h-3" />
                    {adminAppView ? 'Admin' : 'App'}
                  </button>
                )}
                {session && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100" title={`${session.name} (${session.role})`}>
                    {isAdmin ? <Shield className="w-3.5 h-3.5 text-amber-500" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="text-xs text-slate-500 max-w-[80px] truncate">{session.name}</span>
                  </div>
                )}
              </div>
            </div>

            <AdvancedSearch onSearch={handleSearch} isSearching={isSearching} />
            <DashboardKpi stats={stats} isLoading={isStatsLoading} activeKpi={activeKpiFilter} onKpiClick={handleKpiClick} />

            {/* Admin: View Switcher */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 mt-1">
                <button
                  onClick={() => { setViewFinalized(false); setSelectedDoctorId(null); }}
                  className={`flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                    !viewFinalized ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <Database className="w-3 h-3" /> Master Data
                </button>
                <button
                  onClick={() => {
                    setViewFinalized(true);
                    setSelectedDoctorId(null);
                    // Fetch finalized records
                    setFinalizedLoading(true);
                    fetch('/api/finalized?limit=100').then(r => r.json()).then(data => {
                      setFinalizedRecords(data.records || []);
                    }).catch(() => {}).finally(() => setFinalizedLoading(false));
                  }}
                  className={`flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${
                    viewFinalized ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <CheckCircle className="w-3 h-3" /> Finalized
                </button>
              </div>
            )}
          </div>

          {/* Doctor List */}
          <div className="flex-1 min-h-0 flex flex-col">
            {isAdmin && viewFinalized ? (
              /* Finalized Records List */
              <div className="flex-1 overflow-y-auto">
                {finalizedLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-500">Loading finalized records...</p>
                    </div>
                  </div>
                ) : finalizedRecords.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No finalized records yet</p>
                      <p className="text-xs text-slate-400 mt-1">Approved suggestions will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {finalizedRecords.map((rec: any) => (
                      <div key={rec.id} className="px-4 sm:px-6 py-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{rec.doctor_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {rec.speciality} · {rec.designation} · {rec.qualification}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">by {rec.finalized_by}</p>
                            <p className="text-[10px] text-slate-400">{new Date(rec.finalized_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                          <span>PMDC (old): {rec.pmdc_number || '—'}</span>
                          <span>PMDC (new): {rec.pmdc_number_new || '—'}</span>
                          <span>CNIC: {rec.cnic || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <DoctorList
                doctors={doctors}
                selectedDoctorId={selectedDoctorId}
                onSelectDoctor={handleSelectDoctor}
                pagination={pagination}
                onLoadMore={handleLoadMore}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                suggestionCounts={isAdmin ? suggestionCounts : undefined}
              />
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className={`flex-1 h-screen overflow-y-auto bg-white ${!selectedDoctorId ? 'hidden md:block' : 'block'}`}>
          {selectedDoctorId && session ? (
            <DoctorDetail
              doctorId={selectedDoctorId}
              session={session}
              onBack={() => window.history.back()}
              onToast={addToast}
              onSessionExpired={handleSessionExpired}
              onLocationAdded={() => { fetchStats(currentFilters); }}
              isAdmin={isAdmin}
              onDoctorDeleted={() => {
                setSelectedDoctorId(null);
                fetchDoctors(currentFilters, activeKpiFilter, 1, false);
                fetchStats(currentFilters);
                fetchSuggestionCounts();
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm">Select a doctor from the list</p>
                <p className="text-slate-400 text-xs mt-1">to view details and manage locations</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
