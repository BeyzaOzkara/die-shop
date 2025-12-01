import { api } from '../lib/api';
import type { DieType, ComponentType, DieTypeComponent } from '../types/database';

// =======================
// Die Types
// =======================

export async function getDieTypes(): Promise<DieType[]> {
  return api.get<DieType[]>('/die-config/die-types');
}

export async function getActiveDieTypes(): Promise<DieType[]> {
  return api.get<DieType[]>('/die-config/die-types/active');
}

export async function createDieType(
  dieType: Omit<DieType, 'id' | 'created_at' | 'updated_at'>
): Promise<DieType> {
  const payload = {
    code: dieType.code,
    name: dieType.name,
    description: dieType.description,
    is_active: dieType.is_active,
  };
  return api.post<DieType>('/die-config/die-types', payload);
}

export async function updateDieType(
  id: number,
  updates: Partial<DieType>
): Promise<DieType> {
  const { id: _omit, created_at, updated_at, ...rest } = updates as any;
  return api.patch<DieType>(`/die-config/die-types/${id}`, rest);
}

export async function deleteDieType(id: number): Promise<void> {
  await api.del<void>(`/die-config/die-types/${id}`);
}

// =======================
// Component Types
// =======================

export async function getComponentTypes(): Promise<ComponentType[]> {
  return api.get<ComponentType[]>('/die-config/component-types');
}

export async function getActiveComponentTypes(): Promise<ComponentType[]> {
  return api.get<ComponentType[]>('/die-config/component-types/active');
}

export async function createComponentType(
  componentType: Omit<ComponentType, 'id' | 'created_at' | 'updated_at'>
): Promise<ComponentType> {
  const payload = {
    code: componentType.code,
    name: componentType.name,
    description: componentType.description,
    is_active: componentType.is_active,
  };
  return api.post<ComponentType>('/die-config/component-types', payload);
}

export async function updateComponentType(
  id: number,
  updates: Partial<ComponentType>
): Promise<ComponentType> {
  const { id: _omit, created_at, updated_at, ...rest } = updates as any;
  return api.patch<ComponentType>(`/die-config/component-types/${id}`, rest);
}

export async function deleteComponentType(id: number): Promise<void> {
  await api.del<void>(`/die-config/component-types/${id}`);
}

// =======================
// DieType ↔ ComponentType Mapping
// =======================

export async function getDieTypeComponents(
  dieTypeId?: string
): Promise<DieTypeComponent[]> {
  const all = await api.get<DieTypeComponent[]>('/die-config/die-type-components');

  if (dieTypeId) {
    const idNum = Number(dieTypeId);
    return all.filter((m) => m.die_type_id === idNum);
  }

  return all;
}

export async function getComponentTypesForDieType(
  dieTypeId: string
): Promise<ComponentType[]> {
  return api.get<ComponentType[]>(
    `/die-config/die-types/${Number(dieTypeId)}/components`
  );
}

export async function addDieTypeComponent(
  dieTypeId: string,
  componentTypeId: string
): Promise<DieTypeComponent> {
  return api.post<DieTypeComponent>('/die-config/die-type-components', {
    die_type_id: Number(dieTypeId),
    component_type_id: Number(componentTypeId),
  });
}

export async function removeDieTypeComponent(
  dieTypeId: string,
  componentTypeId: string
): Promise<void> {
  await api.del<void>('/die-config/die-type-components', {
    die_type_id: Number(dieTypeId),
    component_type_id: Number(componentTypeId),
  });
}
