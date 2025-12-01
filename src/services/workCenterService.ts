import { api } from '../lib/api';
import type { WorkCenter } from '../types/database';

// ==========================
// GET All Work Centers
// ==========================
export async function getWorkCenters(): Promise<WorkCenter[]> {
  // GET /work-centers
  return api.get<WorkCenter[]>('/inventory/work-centers');
}

// ==========================
// CREATE Work Center
// ==========================
export async function createWorkCenter(
  workCenter: Omit<WorkCenter, 'id' | 'created_at'>
): Promise<WorkCenter> {
  // POST /work-centers
  const payload = {
    name: workCenter.name,
    type: workCenter.type,
    status: workCenter.status,
    location: workCenter.location,
    capacity_per_hour: workCenter.capacity_per_hour,
    setup_time_minutes: workCenter.setup_time_minutes,
    cost_per_hour: workCenter.cost_per_hour,
  };

  return api.post<WorkCenter>('/inventory/work-centers', payload);
}

// ==========================
// UPDATE Work Center
// ==========================
export async function updateWorkCenter(
  id: string,
  updates: Partial<WorkCenter>
): Promise<WorkCenter> {
  // PATCH /work-centers/{id}
  return api.patch<WorkCenter>(`/inventory/work-centers/${Number(id)}`, updates);
}

// ==========================
// DELETE Work Center
// ==========================
export async function deleteWorkCenter(id: string): Promise<void> {
  // DELETE /work-centers/{id}
  await api.del<void>(`/inventory/work-centers/${Number(id)}`);
}
