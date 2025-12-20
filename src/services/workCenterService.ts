import { api } from '../lib/api';
import type { WorkCenter } from '../types/database';

export async function getWorkCenters(): Promise<WorkCenter[]> {
  return api.get<WorkCenter[]>('/inventory/work-centers');
}

// CREATE
export async function createWorkCenter(payload: {
  name: string;
  status: WorkCenter['status'];
  location?: string;
  capacity_per_hour?: number;
  setup_time_minutes?: number;
  cost_per_hour?: number;
  operation_type_ids: number[]; // NEW
}): Promise<WorkCenter> {
  return api.post<WorkCenter>('/inventory/work-centers', payload);
}

// UPDATE
export async function updateWorkCenter(
  id: string,
  updates: Partial<{
    name: string;
    status: WorkCenter['status'];
    location?: string | null;
    capacity_per_hour?: number | null;
    setup_time_minutes?: number | null;
    cost_per_hour?: number | null;
    operation_type_ids?: number[]; // NEW
  }>
): Promise<WorkCenter> {
  return api.patch<WorkCenter>(`/inventory/work-centers/${Number(id)}`, updates);
}

export async function deleteWorkCenter(id: string): Promise<void> {
  await api.del<void>(`/inventory/work-centers/${Number(id)}`);
}
