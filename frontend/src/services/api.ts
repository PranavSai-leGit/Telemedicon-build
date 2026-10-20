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
  RelationshipGraphResponse,
  ClinicianDocumentItem,
  ClinicianConsentItem,
  ClinicianHandoverItem,
  AdminDocumentItem,
  AdminHealthDetailed,
  AdminConfig,
  AIStatusInfo,
  FactConfidenceDetail,
  VerificationQueueItem,
  AIMonitoringMetrics,
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
  getDocuments: ((
    patientId?: number,
    options?: { page?: number; pageSize?: number; search?: string; documentType?: string }
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('page_size', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.documentType) params.append('document_type', options.documentType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    if (options?.page) {
      return request<{ items: MedicalDocument[]; pagination: any }>(`/documents${qs}`);
    }
    return request<MedicalDocument[]>(`/documents${qs}`);
  }) as {
    (patientId?: number): Promise<MedicalDocument[]>;
    (
      patientId: number | undefined,
      options: { page: number; pageSize?: number; search?: string; documentType?: string }
    ): Promise<{ items: MedicalDocument[]; pagination: any }>;
    (
      patientId?: number,
      options?: { page?: number; pageSize?: number; search?: string; documentType?: string }
    ): Promise<any>;
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
  getDocumentViewUrl: (id: number) => `/api/documents/${id}/view`,

  reprocessDocument: (id: number) =>
    request<MedicalDocument>(`/documents/${id}/reprocess`, {
      method: 'POST',
    }),

  getAIStatus: () => request<AIStatusInfo>('/documents/ai/status'),

  configureAI: (geminiApiKey: string, geminiModel: string = 'gemini-3.8-flash') =>
    request<AIStatusInfo>('/documents/ai/configure', {
      method: 'POST',
      body: JSON.stringify({ gemini_api_key: geminiApiKey, gemini_model: geminiModel }),
    }),

  // Facts & Timeline
  getTimelineFacts: ((
    patientId?: number,
    factType?: string,
    documentId?: number,
    options?: {
      verificationStatus?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId.toString());
    if (factType && factType !== 'all') params.append('fact_type', factType);
    if (documentId) params.append('document_id', documentId.toString());
    if (options?.verificationStatus && options.verificationStatus !== 'all') {
      params.append('verification_status', options.verificationStatus);
    }
    if (options?.search) params.append('search', options.search);
    if (options?.dateFrom) params.append('date_from', options.dateFrom);
    if (options?.dateTo) params.append('date_to', options.dateTo);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('page_size', options.pageSize.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    if (options?.page) {
      return request<{ items: ExtractedFact[]; pagination: any }>(`/facts${qs}`);
    }
    return request<ExtractedFact[]>(`/facts${qs}`);
  }) as {
    (patientId?: number, factType?: string, documentId?: number): Promise<ExtractedFact[]>;
    (
      patientId: number | undefined,
      factType: string | undefined,
      documentId: number | undefined,
      options: {
        page: number;
        pageSize?: number;
        verificationStatus?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
      }
    ): Promise<{ items: ExtractedFact[]; pagination: any }>;
    (
      patientId?: number,
      factType?: string,
      documentId?: number,
      options?: {
        page?: number;
        pageSize?: number;
        verificationStatus?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
      }
    ): Promise<any>;
  },

  getCanonicalLabTrends: (patientId?: number) => {
    const qs = patientId ? `?patient_id=${patientId}` : '';
    return request<LabTrendSeries[]>(`/facts/labs/trends${qs}`);
  },

  getRelationshipGraph: (patientId?: number) => {
    const qs = patientId ? `?patient_id=${patientId}` : '';
    return request<RelationshipGraphResponse>(`/facts/graph${qs}`);
  },

  updateFact: (factId: number, data: Partial<ExtractedFact>) =>
    request<ExtractedFact>(`/facts/${factId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getFactEvidence: (factId: number) => request<any>(`/facts/${factId}/evidence`),
  getFactConfidence: (factId: number) => request<FactConfidenceDetail>(`/facts/${factId}/confidence`),
  verifyFactClinician: (factId: number, data: { verification_status?: string; reviewer_notes?: string; normalized_value?: string }) =>
    request<ExtractedFact>(`/facts/${factId}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
  getAllClinicianDiscrepancies: () =>
    request<Discrepancy[]>('/clinician/all-discrepancies'),
  getClinicianSharedDocuments: () =>
    request<ClinicianDocumentItem[]>('/clinician/documents'),
  getClinicianConsents: () =>
    request<ClinicianConsentItem[]>('/clinician/consents'),
  getClinicianActivity: (limit = 50) =>
    request<AuditEventItem[]>(`/clinician/activity?limit=${limit}`),
  getClinicianHandovers: () =>
    request<ClinicianHandoverItem[]>('/clinician/handovers'),
  reviewDiscrepancy: (discrepancyId: number, reviewStatus: string, reviewNote?: string) =>
    request<Discrepancy>(`/clinician/discrepancies/${discrepancyId}/review`, {
      method: 'POST',
      body: JSON.stringify({ review_status: reviewStatus, review_note: reviewNote }),
    }),
  generateClinicianHandover: (patientId: number) =>
    request<SummaryResponseData>(`/clinician/patients/${patientId}/handover`, { method: 'POST' }),
  getHandoverPdfUrl: (patientId: number) => `/api/clinician/patients/${patientId}/handover/pdf`,
  getClinicianVerificationQueue: (params?: { patient_id?: number; filter_type?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.patient_id) q.append('patient_id', params.patient_id.toString());
    if (params?.filter_type) q.append('filter_type', params.filter_type);
    if (params?.limit) q.append('limit', params.limit.toString());
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<VerificationQueueItem[]>(`/clinician/verification-queue${qs}`);
  },
  resolveVerificationQueueItem: (factId: number, action: string, reviewerNotes?: string, correctedValue?: string) => {
    const q = new URLSearchParams({ action });
    if (reviewerNotes) q.append('reviewer_notes', reviewerNotes);
    if (correctedValue) q.append('corrected_value', correctedValue);
    return request<{ fact_id: number; verification_status: string; normalized_value: string; reviewer_notes?: string }>(
      `/clinician/verification-queue/${factId}/resolve?${q.toString()}`,
      { method: 'POST' }
    );
  },
  getClinicianVerificationHistory: (limit = 50) =>
    request<any[]>(`/clinician/verification-history?limit=${limit}`),

  // Admin
  getAdminStats: () => request<AdminStats>('/admin/stats'),
  getAdminAIMonitoring: (limit = 50) => request<AIMonitoringMetrics>(`/admin/ai-monitoring?limit=${limit}`),
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
  getAdminDocuments: (statusFilter?: string, limit = 50) => {
    const qs = statusFilter ? `?status_filter=${statusFilter}&limit=${limit}` : `?limit=${limit}`;
    return request<AdminDocumentItem[]>(`/admin/documents${qs}`);
  },
  reprocessAdminDocument: (documentId: number) =>
    request<{ message: string; status: string }>(`/admin/documents/${documentId}/reprocess`, {
      method: 'POST',
    }),
  getAdminHealthDetailed: () => request<AdminHealthDetailed>('/admin/health-detailed'),
  getAdminConfig: () => request<AdminConfig>('/admin/config'),
};

