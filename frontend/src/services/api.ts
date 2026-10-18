import {
  User,
  SessionResponse,
  MedicalDocument,
  ExtractedFact,
  Discrepancy,
  SharingGrant,
  SummaryResponseData,
  ClinicianPatient,
  LabTrendSeries,
  AdminStats,
  AuditEventItem,
} from '../types';

let cachedCsrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  cachedCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return cachedCsrfToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (cachedCsrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Token', cachedCsrfToken);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<SessionResponse> => {
    const res = await request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCsrfToken(res.csrf_token);
    return res;
  },

  register: async (fullName: string, email: string, password: string): Promise<SessionResponse> => {
    const res = await request<SessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    setCsrfToken(res.csrf_token);
    return res;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await request<{ message: string }>('/auth/logout', { method: 'POST' });
    setCsrfToken(null);
    return res;
  },

  getMe: async (): Promise<SessionResponse> => {
    const res = await request<SessionResponse>('/auth/me');
    if (res.csrf_token) {
      setCsrfToken(res.csrf_token);
    }
    return res;
  },

  // Documents
  getDocuments: (patientId?: number) => {
    const query = patientId ? `?patient_id=${patientId}` : '';
    return request<MedicalDocument[]>(`/documents${query}`);
  },

  getDocument: (id: number) => request<MedicalDocument>(`/documents/${id}`),

  uploadDocument: async (file: File, documentType?: string): Promise<MedicalDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('document_type', documentType);
    return request<MedicalDocument>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  saveManualEntry: (documentId: number, data: any) =>
    request<MedicalDocument>(`/documents/${documentId}/manual-entry`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDocument: (id: number) => request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),

  getDocumentFileUrl: (id: number) => `/api/documents/${id}/file`,

  // Facts & Timeline
  getTimelineFacts: (patientId?: number, factType?: string) => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (factType) params.append('fact_type', factType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<ExtractedFact[]>(`/facts${qs}`);
  },

  updateFact: (factId: number, data: Partial<ExtractedFact>) =>
    request<ExtractedFact>(`/facts/${factId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getFactEvidence: (factId: number) => request<any>(`/facts/${factId}/evidence`),

  // Sharing
  getClinicians: () => request<User[]>('/sharing/clinicians'),
  getSharingGrants: () => request<SharingGrant[]>('/sharing/grants'),
  createSharingGrant: (clinicianId: number, documentIds: number[], expiresInDays = 30) =>
    request<SharingGrant>('/sharing/grants', {
      method: 'POST',
      body: JSON.stringify({
        clinician_id: clinicianId,
        document_ids: documentIds,
        expires_in_days: expiresInDays,
      }),
    }),
  revokeSharingGrant: (grantId: number) =>
    request<{ message: string; status: string }>(`/sharing/grants/${grantId}/revoke`, {
      method: 'POST',
    }),

  // Summary
  generatePatientSummary: (documentIds?: number[]) =>
    request<SummaryResponseData>('/summary/generate', {
      method: 'POST',
      body: JSON.stringify({ document_ids: documentIds }),
    }),
  getLatestPatientSummary: () => request<SummaryResponseData | null>('/summary/latest'),

  // Clinician
  getSharedPatients: () => request<ClinicianPatient[]>('/clinician/patients'),
  getPatientLabTrends: (patientId: number) => request<LabTrendSeries[]>(`/clinician/patients/${patientId}/labs`),
  getPatientDiscrepancies: (patientId: number) =>
    request<Discrepancy[]>(`/clinician/patients/${patientId}/discrepancies`),
  reviewDiscrepancy: (discrepancyId: number, reviewStatus: string, reviewNote?: string) =>
    request<Discrepancy>(`/clinician/discrepancies/${discrepancyId}/review`, {
      method: 'POST',
      body: JSON.stringify({ review_status: reviewStatus, review_note: reviewNote }),
    }),
  generateClinicianHandover: (patientId: number) =>
    request<SummaryResponseData>(`/clinician/patients/${patientId}/handover`, { method: 'POST' }),
  getHandoverPdfUrl: (patientId: number) => `/api/clinician/patients/${patientId}/handover/pdf`,

  // Admin
  getAdminStats: () => request<AdminStats>('/admin/stats'),
  getAdminUsers: (role?: string) => {
    const qs = role ? `?role=${role}` : '';
    return request<User[]>(`/admin/users${qs}`);
  },
  updateAdminUser: (userId: number, data: { role?: string; is_active?: boolean }) =>
    request<User>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getAuditLogs: (limit = 50) => request<AuditEventItem[]>(`/admin/audit-logs?limit=${limit}`),
};
