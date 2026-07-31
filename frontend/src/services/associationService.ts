import api from './api';

export interface AssociationBindPayload {
  customer_id: string;
  camera_id?: string;
  pos_x?: number;
  pos_y?: number;
  face_timestamp?: string;
}

export interface AssociationBindResponse {
  status: 'MATCHED' | 'UNMATCHED';
  reason?: string;
  customer_id: string;
  matched_track_id?: string;
  visit_id?: string;
  association_score?: number;
  score_details?: {
    spatial_score: number;
    kinematic_score: number;
    temporal_score: number;
    composite_score: number;
  };
  evaluated_candidates: number;
}

export interface CandidateTrackItem {
  raw_track_id: string;
  camera_id: string;
  pos_x: number | null;
  pos_y: number | null;
  velocity_x: number | null;
  velocity_y: number | null;
  status: string;
  last_seen_at: string;
}

export const associationService = {
  bindIdentity: async (payload: AssociationBindPayload): Promise<AssociationBindResponse> => {
    const response = await api.post<AssociationBindResponse>('/association/bind', payload);
    return response.data;
  },

  getActiveCandidates: async (cameraId: string = 'CAM_1'): Promise<CandidateTrackItem[]> => {
    const response = await api.get<CandidateTrackItem[]>(`/association/candidates/${cameraId}`);
    return response.data;
  },
};
