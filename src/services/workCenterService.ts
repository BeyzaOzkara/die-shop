import { supabase } from '../lib/supabase';
import type { WorkCenter } from '../types/database';

export async function getWorkCenters(): Promise<WorkCenter[]> {
  const { data, error } = await supabase
    .from('work_centers')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createWorkCenter(workCenter: Omit<WorkCenter, 'id' | 'created_at'>): Promise<WorkCenter> {
  const { data, error } = await supabase
    .from('work_centers')
    .insert(workCenter)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkCenter(id: string, updates: Partial<WorkCenter>): Promise<WorkCenter> {
  const { data, error } = await supabase
    .from('work_centers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkCenter(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_centers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
