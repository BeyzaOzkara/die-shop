import { api } from '../lib/api';
import type { ComponentBOM } from '../types/database';

// Payload tipi: id, created_at ve nested work_center'ı backend'e GÖNDERMİYORUZ
type ComponentBOMPayload = Omit<ComponentBOM, 'id' | 'created_at' | 'work_center'>;

export async function getComponentBOM(componentTypeId: number): Promise<ComponentBOM[]> {
  return api.get<ComponentBOM[]>('/component-bom', {
    component_type_id: componentTypeId,
  });
}

export async function createBOMOperation(
  operation: ComponentBOMPayload
): Promise<ComponentBOM> {
  return api.post<ComponentBOM>('/component-bom', operation);
}

export async function updateBOMOperation(
  id: number,
  updates: Partial<ComponentBOMPayload>
): Promise<ComponentBOM> {
  return api.patch<ComponentBOM>(`/component-bom/${id}`, updates);
}

export async function deleteBOMOperation(id: number): Promise<void> {
  await api.del<void>(`/component-bom/${id}`);
}
