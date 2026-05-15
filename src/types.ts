export type Doctor = {
    id: number;
    doctor_city_das: string;
    distributor_name: string;
    doctor_name: string;
    mobile_number: string;
    qualification: string;
    designation: string;
    speciality: string;
    pmdc_number: string;
    location_count: number;
};

export type DoctorDetail = Doctor & {
    locations: LocationRecord[];
};

export type LocationRecord = {
    id: number;
    doctor_id: number;
    city_expense: string;
    city_das: string;
    brick_das: string;
    location_name: string | null;
    session_id: number;
    created_at: string;
    added_by_name: string;
    added_by_code: number;
};

export type CityOption = {
    city_name: string;
};

export type BrickOption = {
    brick_name: string;
    city_name: string;
};

export type UserSession = {
    session_id: number;
    name: string;
    employee_code: number;
    role: string;
    team: string;
};

export type PaginationInfo = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
    id: string;
    type: ToastType;
    message: string;
};

export type DashboardStats = {
    totalDoctors: number;
    noLocations: number;
    singleLocation: number;
    multipleLocations: number;
    noSuggestions: number;
    withSuggestions: number;
};

export const TEAMS = [
    'Atco Life Sciences', 'Betaderm', 'Biologics', 'Cheetah', 'Child - Mother Care',
    'Clobederm', 'Cougar', 'Derma Health Care', 'Derma Physician', 'Diab-Gastro',
    'Essential Care', 'Gynae Care', 'Invasive', 'Jaguar', 'Leopard', 'Lions',
    'Oncology', 'Ortho-Neuro', 'Paeds-1', 'Paeds-3', 'Panther', 'Smecta',
    'Stallion', 'Steroid', 'Steroid - H', 'Terbiderm', 'Tiger', 'Trade Excellence', 'Vision'
];

export const ROLES = ['TSM', 'DSM', 'RSM', 'Admin'];

export type DoctorSuggestion = {
    id: number;
    doctor_id: number;
    session_id: number;
    employee_name: string;
    employee_code: number;
    team: string;
    suggested_name: string | null;
    suggested_mobile: string | null;
    suggested_speciality: string | null;
    suggested_designation: string | null;
    suggested_qualification: string | null;
    suggested_pmdc: string | null;
    suggested_cnic: string | null;
    suggest_delete: number;
    delete_reason: string | null;
    change_reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
};

export type FinalizedDoctor = {
    id: number;
    source_doctor_id: number;
    doctor_name: string;
    mobile_number: string;
    speciality: string;
    designation: string;
    qualification: string;
    pmdc_number: string;
    cnic: string;
    finalized_by: string;
    finalized_at: string;
    doctor_city_das?: string;
    distributor_name?: string;
};
