import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Doctor, PaginationInfo, UserSession, ToastMessage } from './types';
import UserPrompt from './components/UserPrompt';
import DoctorList from './components/DoctorList';
import DoctorDetail from './components/DoctorDetail';
import DashboardKpi from './components/DashboardKpi';
import AdminDashboard from './components/AdminDashboard';
import AdvancedSearch, { SearchFilters, emptyFilters } from './components/AdvancedSearch';
import Toast from './components/Toast';
import { User, Stethoscope } from 'lucide-react';
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
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Handle expired/invalid session - re-prompt user
  const handleSessionExpired = useCallback(() => {
    sessionStorage.removeItem('doctorDirSession');
    setSession(null);
    addToast('info', 'Your session has expired. Please enter your details again.');
  }, [addToast]);

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
  }, [fetchDoctors, fetchStats]);

  const handleSearch = useCallback((filters: SearchFilters) => {
    console.log('Searching with filters:', filters, 'and KPI:', activeKpiFilter);
    setCurrentFilters(filters);
    setSelectedDoctorId(null);
    fetchDoctors(filters, activeKpiFilter, 1, false);
    fetchStats(filters);
  }, [fetchDoctors, fetchStats, activeKpiFilter]);

  const handleKpiClick = useCallback((kpi: string) => {
    console.log('KPI Clicked:', kpi, 'current filters:', currentFilters);
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
    // Push a history entry so browser back goes to list instead of leaving the app
    window.history.pushState({ doctorId: id }, '', `#doctor-${id}`);
  }, []);

  // Listen for browser back button (popstate) to return to list
  useEffect(() => {
    const handlePopState = () => {
      setSelectedDoctorId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogoClick = useCallback(() => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 2000);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      window.open('/api/export/locations', '_blank');
      addToast('info', 'Downloading locations export...');
    }
  }, [addToast]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* User Prompt Modal */}
      {!session && <UserPrompt onSessionCreated={setSession} />}

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row h-screen">
        {/* Sidebar / List View */}
        <div className={`w-full md:w-[520px] lg:w-[600px] xl:w-[50%] border-r border-slate-200 bg-white flex flex-col h-screen shrink-0 ${selectedDoctorId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header Area */}
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 space-y-3 shrink-0 bg-white">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogoClick}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-500/20 hover:shadow-md hover:shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer shrink-0"
                  title="Doctor Directory"
                >
                  <Stethoscope className="w-5 h-5 text-white" />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Doctor Directory</h1>
              </div>
              <div className="flex items-center gap-2">
                {session && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100" title={`${session.name} (${session.role})`}>
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 max-w-[80px] truncate">{session.name}</span>
                  </div>
                )}
              </div>
            </div>

            <AdvancedSearch onSearch={handleSearch} isSearching={isSearching} />

            <DashboardKpi stats={stats} isLoading={isStatsLoading} activeKpi={activeKpiFilter} onKpiClick={handleKpiClick} />
          </div>

          {/* Doctor List - scrolls independently */}
          <div className="flex-1 min-h-0 flex flex-col">
            <DoctorList
              doctors={doctors}
              selectedDoctorId={selectedDoctorId}
              onSelectDoctor={handleSelectDoctor}
              pagination={pagination}
              onLoadMore={handleLoadMore}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
            />
          </div>
        </div>

        {/* Detail View - scrolls independently, white background fills full height */}
        <div className={`flex-1 h-screen overflow-y-auto bg-white ${!selectedDoctorId ? 'hidden md:block' : 'block'}`}>
          {selectedDoctorId && session ? (
            <DoctorDetail
              doctorId={selectedDoctorId}
              session={session}
              onBack={() => window.history.back()}
              onToast={addToast}
              onSessionExpired={handleSessionExpired}
              onLocationAdded={() => {
                fetchStats(currentFilters);
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

      {/* Toasts */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
