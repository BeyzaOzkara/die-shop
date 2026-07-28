import re

with open('src/types/database.ts', 'r', encoding='utf-8') as f:
    db_content = f.read()

# 1. Replace SteelStockItem and Lot
old_stock_lot = """// ===========================
// STEEL STOCK & LOT
// ===========================

export interface SteelStockItem {
  id: number;
  alloy: string;
  diameter_mm: number;
  description?: string | null;
  created_at: string;
}

export interface Lot {
  id: number;
  stock_item_id: number;
  certificate_number: string;
  supplier: string;
  supplier_id?: number | null;
  length_mm: number;
  gross_weight_kg: number;
  remaining_kg: number;
  certificate_file_url?: string | null;
  received_date: string;
  created_at: string;
  stock_item?: SteelStockItem;
  supplier_ref?: Supplier | null;
  files?: FileItem[];
}"""

new_stock_lot = """// ===========================
// MASTER DATA (NEW)
// ===========================

export interface ItemCategory {
  id: number;
  name: string;
  base_uom: string;
  is_cuttable: boolean;
  created_at: string;
}

export interface MaterialGrade {
  id: number;
  name: string;
  composition?: Record<string, number> | null;
  created_at: string;
}

export interface Location {
  id: number;
  name: string;
  location_type: string;
  description?: string | null;
  work_center_id?: number | null;
  is_active: boolean;
  created_at: string;
}

// ===========================
// UNIFIED INVENTORY
// ===========================

export interface Lot {
  id: number;
  lot_number: string;
  certificate_number?: string | null;
  receive_date: string;
  supplier_id?: number | null;
  material_grade_id?: number | null;
  notes?: string | null;
  created_at: string;
  
  supplier?: Supplier | null;
  material_grade?: MaterialGrade | null;
  files?: FileItem[];
}

export interface StockItem {
  id: number;
  item_type: 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOOD';
  category_id: number;
  lot_id?: number | null;
  parent_id?: number | null;
  location_id?: number | null;
  quantity: number;
  attributes?: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  category?: ItemCategory | null;
  lot?: Lot | null;
  location?: Location | null;
}

export interface ProcessBatch {
  id: number;
  batch_number: string;
  operation_type: string;
  status: string;
  process_parameters?: Record<string, any> | null;
  result_attributes?: Record<string, any> | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  created_at: string;

  stock_items?: StockItem[];
}"""

db_content = db_content.replace(old_stock_lot, new_stock_lot)

# 2. Replace StockMovement
old_movement = """// ===========================
// STOCK MOVEMENTS
// ===========================

export interface StockMovement {
  id: number;
  lot_id: number;
  work_order_id: number;
  quantity_kg: number;
  movement_date: string;
  notes?: string | null;
  created_at: string;
  lot?: Lot;
  work_order?: WorkOrder;
}"""

new_movement = """// ===========================
// STOCK TRANSACTIONS (LEDGER)
// ===========================

export interface StockTransaction {
  id: number;
  stock_item_id: number;
  transaction_type: 'RECEIVE' | 'CUT' | 'CONSUME' | 'PRODUCE' | 'ADJUST' | 'BATCH_PROCESS' | 'MOVE';
  quantity_change: number;
  quantity_after: number;
  work_order_id?: number | null;
  process_batch_id?: number | null;
  reference_item_id?: number | null;
  notes?: string | null;
  meta_data?: Record<string, any> | null;
  timestamp: string;

  stock_item?: StockItem;
  work_order?: WorkOrder;
  process_batch?: ProcessBatch;
}"""

db_content = db_content.replace(old_movement, new_movement)

# 3. Replace DieComponent.stock_item
db_content = db_content.replace('stock_item?: SteelStockItem;', 'stock_item?: StockItem;')

with open('src/types/database.ts', 'w', encoding='utf-8') as f:
    f.write(db_content)

print("Updated database.ts")

# 4. Rewrite stockService.ts
stock_service_content = """// src/services/stockService.ts
import { api } from '../lib/api';
import type { 
  StockItem, 
  Lot, 
  StockTransaction, 
  ItemCategory, 
  MaterialGrade, 
  Location 
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

export async function getItemCategories(): Promise<ItemCategory[]> {
  return api.get<ItemCategory[]>('/inventory/categories');
}

export async function createItemCategory(payload: {
  name: string;
  base_uom: string;
  is_cuttable?: boolean;
}): Promise<ItemCategory> {
  return api.post<ItemCategory>('/inventory/categories', payload);
}

export async function getMaterialGrades(): Promise<MaterialGrade[]> {
  return api.get<MaterialGrade[]>('/inventory/material-grades');
}

export async function createMaterialGrade(payload: {
  name: string;
  composition?: Record<string, number>;
}): Promise<MaterialGrade> {
  return api.post<MaterialGrade>('/inventory/material-grades', payload);
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
  material_grade_id?: number | null;
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
// STOCK ITEMS
// ===========================

export async function getStockItems(filters?: {
  item_type?: string;
  category_id?: number;
  lot_id?: number;
}): Promise<StockItem[]> {
  return api.get<StockItem[]>('/inventory/stock-items', filters ?? {});
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
"""

with open('src/services/stockService.ts', 'w', encoding='utf-8') as f:
    f.write(stock_service_content)

print("Updated stockService.ts")
