import { supabase } from '../lib/supabase';
import type { DieType, ComponentType, DieTypeComponent } from '../types/database';

export async function getDieTypes(): Promise<DieType[]> {
  const { data, error } = await supabase
    .from('die_types')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getActiveDieTypes(): Promise<DieType[]> {
  const { data, error } = await supabase
    .from('die_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createDieType(dieType: Omit<DieType, 'id' | 'created_at' | 'updated_at'>): Promise<DieType> {
  const { data, error } = await supabase
    .from('die_types')
    .insert(dieType)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDieType(id: string, updates: Partial<DieType>): Promise<DieType> {
  const { data, error } = await supabase
    .from('die_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDieType(id: string): Promise<void> {
  const { error } = await supabase
    .from('die_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getComponentTypes(): Promise<ComponentType[]> {
  const { data, error } = await supabase
    .from('component_types')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getActiveComponentTypes(): Promise<ComponentType[]> {
  const { data, error } = await supabase
    .from('component_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createComponentType(componentType: Omit<ComponentType, 'id' | 'created_at' | 'updated_at'>): Promise<ComponentType> {
  const { data, error } = await supabase
    .from('component_types')
    .insert(componentType)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateComponentType(id: string, updates: Partial<ComponentType>): Promise<ComponentType> {
  const { data, error } = await supabase
    .from('component_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComponentType(id: string): Promise<void> {
  const { error } = await supabase
    .from('component_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getDieTypeComponents(dieTypeId?: string): Promise<DieTypeComponent[]> {
  let query = supabase
    .from('die_type_components')
    .select('*, die_type:die_types(*), component_type:component_types(*)')
    .order('created_at');

  if (dieTypeId) {
    query = query.eq('die_type_id', dieTypeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getComponentTypesForDieType(dieTypeId: string): Promise<ComponentType[]> {
  const { data, error } = await supabase
    .from('die_type_components')
    .select('component_type:component_types(*)')
    .eq('die_type_id', dieTypeId);

  if (error) throw error;
  return (data || []).map(item => item.component_type).filter(Boolean) as ComponentType[];
}

export async function addDieTypeComponent(dieTypeId: string, componentTypeId: string): Promise<DieTypeComponent> {
  const { data, error } = await supabase
    .from('die_type_components')
    .insert({ die_type_id: dieTypeId, component_type_id: componentTypeId })
    .select('*, die_type:die_types(*), component_type:component_types(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function removeDieTypeComponent(dieTypeId: string, componentTypeId: string): Promise<void> {
  const { error } = await supabase
    .from('die_type_components')
    .delete()
    .eq('die_type_id', dieTypeId)
    .eq('component_type_id', componentTypeId);

  if (error) throw error;
}
