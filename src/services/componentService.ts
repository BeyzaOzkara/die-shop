import { api } from '../lib/api';
import type { ComponentBOM } from '../types/database';

// Payload tipi: id, created_at ve nested work_center'ı backend'e GÖNDERMİYORUZ
type ComponentBOMPayload = Omit<ComponentBOM, 'id' | 'created_at' | 'work_center'>;

export async function getComponentBOM(componentTypeId: number): Promise<ComponentBOM[]> {
  // Supabase:
  // .from('component_bom')
  // .select('*, work_center:work_centers(*)')
  // .eq('component_type_id', componentTypeId)
  // .order('sequence_number');
  //
  // FastAPI endpoint varsayımı:
  // GET /component-bom?component_type_id=...
  return api.get<ComponentBOM[]>('/component-bom', {
    component_type_id: componentTypeId,
  });
}

export async function createBOMOperation(
  operation: ComponentBOMPayload
): Promise<ComponentBOM> {
  // Supabase:
  // insert(operation).select().single();
  //
  // FastAPI:
  // POST /component-bom
  return api.post<ComponentBOM>('/component-bom', operation);
}

export async function updateBOMOperation(
  id: number,
  updates: Partial<ComponentBOMPayload>
): Promise<ComponentBOM> {
  // Supabase:
  // update(updates).eq('id', id).select().single();
  //
  // FastAPI:
  // PATCH /component-bom/{id}
  return api.patch<ComponentBOM>(`/component-bom/${id}`, updates);
}

export async function deleteBOMOperation(id: number): Promise<void> {
  // Supabase:
  // delete().eq('id', id)
  //
  // FastAPI:
  // DELETE /component-bom/{id}
  await api.del<void>(`/component-bom/${id}`);
}
