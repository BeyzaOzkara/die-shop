import { supabase } from '../lib/supabase';
import { calculateTheoreticalConsumption, generateOrderNumber } from '../lib/calculations';
import type { Die, DieComponent, ProductionOrder, WorkOrder } from '../types/database';
import { getComponentBOM } from './componentService';

export async function getDies(): Promise<Die[]> {
  const { data, error } = await supabase
    .from('dies')
    .select('*, die_type_ref:die_types(id, code, name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDieById(id: string): Promise<Die | null> {
  const { data, error } = await supabase
    .from('dies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDieComponents(dieId: string): Promise<DieComponent[]> {
  const { data, error } = await supabase
    .from('die_components')
    .select('*, component_type:component_types(*), stock_item:steel_stock_items(*)')
    .eq('die_id', dieId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function createDie(die: Omit<Die, 'id' | 'created_at' | 'updated_at'>): Promise<Die> {
  const { data, error } = await supabase
    .from('dies')
    .insert({ ...die, status: 'Draft' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addComponentToDie(
  dieId: string,
  componentTypeId: string,
  stockItemId: string,
  packageLengthMm: number,
  diameterMm: number
): Promise<DieComponent> {
  const theoreticalConsumption = calculateTheoreticalConsumption(packageLengthMm, diameterMm);

  const { data, error } = await supabase
    .from('die_components')
    .insert({
      die_id: dieId,
      component_type_id: componentTypeId,
      stock_item_id: stockItemId,
      package_length_mm: packageLengthMm,
      theoretical_consumption_kg: theoreticalConsumption,
    })
    .select('*, component_type:component_types(*), stock_item:steel_stock_items(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateDieStatus(dieId: string, status: Die['status']): Promise<Die> {
  const { data, error } = await supabase
    .from('dies')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', dieId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createProductionOrder(dieId: string): Promise<ProductionOrder> {
  const die = await getDieById(dieId);
  if (!die) throw new Error('Kalıp bulunamadı');

  const orderNumber = generateOrderNumber('UE');

  const { data: productionOrder, error: poError } = await supabase
    .from('production_orders')
    .insert({
      die_id: dieId,
      order_number: orderNumber,
      status: 'Waiting',
    })
    .select()
    .single();

  if (poError) throw poError;

  const components = await getDieComponents(dieId);

  for (const component of components) {
    const workOrderNumber = generateOrderNumber('IE');

    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .insert({
        production_order_id: productionOrder.id,
        die_component_id: component.id,
        order_number: workOrderNumber,
        theoretical_consumption_kg: component.theoretical_consumption_kg,
        status: 'Waiting',
      })
      .select()
      .single();

    if (woError) throw woError;

    const bomOperations = await getComponentBOM(component.component_type_id);

    for (const bomOp of bomOperations) {
      const { error: opError } = await supabase
        .from('work_order_operations')
        .insert({
          work_order_id: workOrder.id,
          sequence_number: bomOp.sequence_number,
          operation_name: bomOp.operation_name,
          work_center_id: bomOp.work_center_id,
          estimated_duration_minutes: bomOp.estimated_duration_minutes,
          notes: bomOp.notes,
          status: 'Waiting',
        });

      if (opError) throw opError;
    }
  }

  await updateDieStatus(dieId, 'Ready');

  return productionOrder;
}
