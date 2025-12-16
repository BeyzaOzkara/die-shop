// src/types/database.ts

export type OrderStatus = 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled';
export type WorkCenterStatus = 'Available' | 'Busy' | 'UnderMaintenance';
export type OperationStatus = 'Waiting' | 'InProgress' | 'Completed' | 'Paused' | 'Cancelled';
export type DieStatus = 'Draft' | 'Waiting' | 'Ready' | 'InProduction' | 'Completed';

// ===========================
// DIE TYPES
// ===========================

export interface DieType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===========================
// WORK CENTER
// ===========================

export interface WorkCenter {
  id: number;
  name: string;
  type: string;
  status: WorkCenterStatus;
  location?: string | null;
  capacity_per_hour?: number | null;
  setup_time_minutes?: number | null;
  cost_per_hour?: number | null;
  created_at: string;
}

// ===========================
// COMPONENT TYPE & MAPPING
// ===========================

export interface ComponentType {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DieTypeComponent {
  id: number;
  die_type_id: number;
  component_type_id: number;
  created_at: string;

  // Backend nested'ler minimal (id, code, name), ama burada geniş tip kullanmak sorun yaratmaz;
  // sadece bazı field'lar undefined olabilir.
  die_type?: DieType;
  component_type?: ComponentType;
}

// ===========================
// COMPONENT BOM
// ===========================

export interface ComponentBOM {
  id: number;
  component_type_id: number;
  sequence_number: number;
  operation_name: string;
  work_center_id: number;
  estimated_duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  work_center?: WorkCenter;
  // backend'de component_type nested'i de var ama şu an frontend kullanmıyor
}

// ===========================
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
  length_mm: number;
  gross_weight_kg: number;
  remaining_kg: number;
  certificate_file_url?: string | null;
  received_date: string;
  created_at: string;
  stock_item?: SteelStockItem;
}

// ===========================
// DIE & COMPONENT
// ===========================

export interface FileItem { 
  id: number;
  original_name: string;
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}

// Backend DieRead.die_type_ref: {id, code, name}
export interface DieTypeRef {
  id: number;
  code: string;
  name: string;
}

export interface Die {
  id: number;
  die_number: string;
  die_diameter_mm: number;
  total_package_length_mm: number;

  // Backend'de die_type_id zorunlu
  die_type_id: number;
  status: DieStatus;
  created_at: string;
  updated_at: string;

  // Supabase'te de benzer mantık vardı; backend FastAPI bunu die_type_ref olarak döndürüyor.
  die_type_ref?: DieTypeRef;
  files?: FileItem[];
}

export interface DieComponent {
  id: number;
  die_id: number;
  component_type_id: number;
  stock_item_id: number;
  package_length_mm: number;
  theoretical_consumption_kg: number;
  created_at: string;
  component_type?: ComponentType;
  stock_item?: SteelStockItem;
}

// ===========================
// PRODUCTION ORDERS
// ===========================

export interface ProductionOrder {
  id: number;
  die_id: number;
  order_number: string;
  status: OrderStatus;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  die?: Die;
}

// ===========================
// WORK ORDERS
// ===========================

export interface WorkOrder {
  id: number;
  production_order_id: number;
  die_component_id: number;
  order_number: string;
  status: OrderStatus;
  theoretical_consumption_kg: number;
  actual_consumption_kg?: number | null;

  // Backend: lot_id: Optional[int]
  lot_id?: number | null;

  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  die_component?: DieComponent;
  lot?: Lot;
  production_order?: ProductionOrder;
}

// ===========================
// WORK ORDER OPERATIONS
// ===========================

export interface WorkOrderOperation {
  id: number;
  work_order_id: number;
  sequence_number: number;
  operation_name: string;
  work_center_id: number;
  operator_name?: string | null;
  status: OperationStatus;
  estimated_duration_minutes?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  work_center?: WorkCenter;
  work_order?: WorkOrder;
}

// ===========================
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
}

// operator eklenecek
export interface Operator {
  id: number;
  rfid_code: string;
  name: string;
  employee_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  work_centers?: WorkCenter[];
}