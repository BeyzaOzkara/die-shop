import { supabase } from '../lib/supabase';
import type { ComponentType, ComponentBOM } from '../types/database';

export async function getComponentBOM(componentTypeId: string): Promise<ComponentBOM[]> {
  const { data, error } = await supabase
    .from('component_bom')
    .select('*, work_center:work_centers(*)')
    .eq('component_type_id', componentTypeId)
    .order('sequence_number');

  if (error) throw error;
  return data || [];
}

export async function createBOMOperation(operation: Omit<ComponentBOM, 'id' | 'created_at'>): Promise<ComponentBOM> {
  const { data, error } = await supabase
    .from('component_bom')
    .insert(operation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBOMOperation(id: string, updates: Partial<ComponentBOM>): Promise<ComponentBOM> {
  const { data, error } = await supabase
    .from('component_bom')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBOMOperation(id: string): Promise<void> {
  const { error } = await supabase
    .from('component_bom')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
