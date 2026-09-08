// src/services/stockService.ts
import { api } from '../lib/api';
import type { 
  StockItem, 
  Lot, 
  StockTransaction, 
  ItemCategory, 
  MaterialProfile, 
  Location,
  AttributeDefinition
} from '../types/database';

// ===========================
// MASTER DATA
// ===========================

export async function getLocations(): Promise<Location[]> {
  return api.get<Location[]>('/inventory/locations');
}

export async function createLocation(payload: {
  name: string;
  location_type: string;
  description?: string;
  work_center_id?: number;
}): Promise<Location> {
  return api.post<Location>('/inventory/locations', payload);
}

export async function updateLocation(id: number, payload: Partial<{
  name: string;
  location_type: string;
  description: string;
  work_center_id: number;
  is_active: boolean;
}>): Promise<Location> {
  return api.patch<Location>(`/inventory/locations/${id}`, payload);
}

export async function deleteLocation(id: number): Promise<void> {
  return api.delete(`/inventory/locations/${id}`);
}

export async function getItemCategories(): Promise<ItemCategory[]> {
  return api.get<ItemCategory[]>('/inventory/categories');
}

export async function createItemCategory(payload: {
  name: string;
  base_uom: string;
  is_cuttable?: boolean;
  attributes_schema?: AttributeDefinition[] | null;
}): Promise<ItemCategory> {
  return api.post<ItemCategory>('/inventory/categories', payload);
}

export async function updateItemCategory(id: number, payload: Partial<{
  name: string;
  base_uom: string;
  is_cuttable: boolean;
  attributes_schema: AttributeDefinition[] | null;
}>): Promise<ItemCategory> {
  return api.patch<ItemCategory>(`/inventory/categories/${id}`, payload);
}

export async function deleteItemCategory(id: number): Promise<void> {
  return api.delete(`/inventory/categories/${id}`);
}

export async function getMaterialProfiles(category_id?: number): Promise<MaterialProfile[]> {
  const params = category_id ? { category_id } : {};
  return api.get<MaterialProfile[]>('/inventory/material-profiles', params);
}

export async function createMaterialProfile(payload: {
  category_id: number;
  attributes: Record<string, any>;
  display_name: string;
}): Promise<MaterialProfile> {
  return api.post<MaterialProfile>('/inventory/material-profiles', payload);
}

export async function updateMaterialProfile(id: number, payload: Partial<{
  attributes: Record<string, any>;
  display_name: string;
  is_active: boolean;
}>): Promise<MaterialProfile> {
  return api.patch<MaterialProfile>(`/inventory/material-profiles/${id}`, payload);
}

export async function deleteMaterialProfile(id: number): Promise<void> {
  return api.delete(`/inventory/material-profiles/${id}`);
}

// ===========================
// LOTS
// ===========================

export async function getLots(filters?: {
  lot_number?: string;
  certificate_number?: string;
}): Promise<Lot[]> {
  return api.get<Lot[]>('/inventory/lots', filters ?? {});
}

export async function createLot(payload: {
  lot_number: string;
  certificate_number?: string;
  receive_date: string; // YYYY-MM-DD
  supplier_id?: number | null;
  material_profile_id?: number | null;
  notes?: string;
}, certificateFiles: File[] = []): Promise<Lot> {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));

  for (const f of certificateFiles) {
    formData.append('certificate_files', f);
  }

  return api.post<Lot>('/inventory/lots', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ===========================
// SUMMARY (NEW)
// ===========================

export interface MaterialProfileSummary {
  material_profile_id: number;
  display_name: string;
  attributes: Record<string, any>;
  category_name: string;
  base_uom: string;
  total_quantity: number;
}

export async function getMaterialProfileSummaries(): Promise<MaterialProfileSummary[]> {
  return api.get<MaterialProfileSummary[]>('/inventory/summary/material-profiles');
}

// ===========================
// STOCK ITEMS
// ===========================

export async function getStockItems(filters?: {
  item_type?: string;
  category_id?: number;
  lot_id?: number;
}): Promise<StockItem[]> {
  return api.get<StockItem[]>('/inventory/stock-items', filters ?? {});
}

export async function getStockItemsPaginated(filters?: {
  skip?: number;
  limit?: number;
  search?: string;
  item_type?: string;
  category_id?: number;
  location_id?: number;
  min_quantity?: number;
  max_quantity?: number;
  attributes_search?: string;
}): Promise<{ items: StockItem[]; total: number }> {
  return api.get<{ items: StockItem[]; total: number }>('/inventory/stock-items-paginated', filters ?? {});
}

export async function createStockItem(payload: {
  item_type: 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOOD';
  category_id: number;
  quantity: number;
  location_id?: number | null;
  lot_id?: number | null;
  attributes?: Record<string, any>;
}): Promise<StockItem> {
  return api.post<StockItem>('/inventory/stock-items', payload);
}

// ===========================
// STOCK TRANSACTIONS (LEDGER)
// ===========================

export async function getStockTransactions(filters?: {
  stock_item_id?: number;
}): Promise<StockTransaction[]> {
  return api.get<StockTransaction[]>('/inventory/stock-transactions', filters ?? {});
}

// ===========================
// OPERATIONS (CUT / BATCH)
// ===========================

export async function cutSteel(payload: {
  parent_stock_item_id: number;
  cut_quantity: number;
  child_attributes?: Record<string, any>;
  work_order_id?: number;
  notes?: string;
}): Promise<{ parent: StockItem; child: StockItem; transaction: StockTransaction }> {
  return api.post('/inventory/cut-steel', payload);
}

