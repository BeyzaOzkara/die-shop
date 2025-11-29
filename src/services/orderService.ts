import { supabase } from '../lib/supabase';
import { updateLotStock } from './stockService';
import type { ProductionOrder, WorkOrder, WorkOrderOperation, StockMovement } from '../types/database';

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  const { data, error } = await supabase
    .from('production_orders')
    .select('*, die:dies(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | null> {
  const { data, error } = await supabase
    .from('production_orders')
    .select('*, die:dies(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWorkOrders(productionOrderId?: string): Promise<WorkOrder[]> {
  let query = supabase
    .from('work_orders')
    .select(`
      *,
      die_component:die_components(*, component_type:component_types(*), stock_item:steel_stock_items(*)),
      lot:lots(*, stock_item:steel_stock_items(*)),
      production_order:production_orders(*, die:dies(*))
    `)
    .order('created_at', { ascending: false });

  if (productionOrderId) {
    query = query.eq('production_order_id', productionOrderId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      die_component:die_components(*, component_type:component_types(*), stock_item:steel_stock_items(*)),
      lot:lots(*, stock_item:steel_stock_items(*)),
      production_order:production_orders(*, die:dies(*))
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWorkOrderOperations(workOrderId: string): Promise<WorkOrderOperation[]> {
  const { data, error } = await supabase
    .from('work_order_operations')
    .select('*, work_center:work_centers(*)')
    .eq('work_order_id', workOrderId)
    .order('sequence_number');

  if (error) throw error;
  return data || [];
}

export async function getOperationsByWorkCenter(workCenterId: string): Promise<WorkOrderOperation[]> {
  const { data, error } = await supabase
    .from('work_order_operations')
    .select(`
      *,
      work_center:work_centers(*),
      work_order:work_orders(
        *,
        die_component:die_components(*, component_type:component_types(*)),
        production_order:production_orders(*, die:dies(*))
      )
    `)
    .eq('work_center_id', workCenterId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function updateOperationStatus(
  id: string,
  status: WorkOrderOperation['status'],
  operatorName?: string
): Promise<WorkOrderOperation> {
  const updates: any = { status };

  if (status === 'In Progress') {
    updates.started_at = new Date().toISOString();
    if (operatorName) updates.operator_name = operatorName;
  } else if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('work_order_operations')
    .update(updates)
    .eq('id', id)
    .select('*, work_center:work_centers(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkOrderStatus(
  id: string,
  status: WorkOrder['status']
): Promise<WorkOrder> {
  const updates: any = { status };

  if (status === 'In Progress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('work_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeWorkOrder(
  workOrderId: string,
  actualConsumptionKg: number,
  lotId: string,
  notes?: string
): Promise<void> {
  await updateLotStock(lotId, actualConsumptionKg);

  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .update({
      actual_consumption_kg: actualConsumptionKg,
      lot_id: lotId,
      status: 'Completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', workOrderId)
    .select()
    .single();

  if (woError) throw woError;

  const { error: smError } = await supabase
    .from('stock_movements')
    .insert({
      lot_id: lotId,
      work_order_id: workOrderId,
      quantity_kg: actualConsumptionKg,
      movement_date: new Date().toISOString(),
      notes,
    });

  if (smError) throw smError;
}

export async function updateProductionOrderStatus(
  id: string,
  status: ProductionOrder['status']
): Promise<ProductionOrder> {
  const updates: any = { status };

  if (status === 'In Progress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('production_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStockMovements(): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      lot:lots(*, stock_item:steel_stock_items(*)),
      work_order:work_orders(*, die_component:die_components(*, component_type:component_types(*)))
    `)
    .order('movement_date', { ascending: false });

  if (error) throw error;
  return data || [];
}
