import { api } from '../lib/api';
import type { StockItem, WorkOrder, Location } from '../types/database';

export interface PlannedOperation {
  operation_type_id: number;
  work_center_id?: number;
}

export interface PreMachiningOrderCreate {
  source_type: 'RAW_MATERIAL' | 'WIP';
  source_stock_item_id: number;
  planned_cut_length_mm?: number;
  planned_cut_weight_kg?: number;
  planned_operations: PlannedOperation[];
}

export async function getRawMaterials(): Promise<StockItem[]> {
  return api.get<StockItem[]>('/pre-machining/raw-materials');
}

export async function getAvailableWip(): Promise<StockItem[]> {
  return api.get<StockItem[]>('/pre-machining/available-wip');
}

export async function createPreMachiningOrder(payload: PreMachiningOrderCreate): Promise<{ message: string; order: WorkOrder }> {
  return api.post<{ message: string; order: WorkOrder }>('/pre-machining/orders', payload);
}

export async function getPreMachiningOrders(): Promise<WorkOrder[]> {
  return api.get<WorkOrder[]>('/pre-machining/orders');
}

export async function getWipShelf(): Promise<StockItem[]> {
  return api.get<StockItem[]>('/pre-machining/wip-shelf');
}

export async function shelveWip(orderId: number, targetLocationId: number): Promise<{ message: string; wip: StockItem }> {
  return api.post<{ message: string; wip: StockItem }>(`/pre-machining/orders/${orderId}/shelve`, { target_location_id: targetLocationId });
}
