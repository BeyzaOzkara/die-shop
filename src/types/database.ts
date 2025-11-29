export type OrderStatus = 'Waiting' | 'In Progress' | 'Completed' | 'Cancelled';
export type WorkCenterStatus = 'Available' | 'Busy' | 'Under Maintenance';
export type OperationStatus = 'Waiting' | 'In Progress' | 'Completed';
export type DieStatus = 'Draft' | 'Ready' | 'In Production' | 'Completed';

export interface DieType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkCenter {
  id: string;
  name: string;
  type: string;
  status: WorkCenterStatus;
  location?: string;
  capacity_per_hour?: number;
  setup_time_minutes?: number;
  cost_per_hour?: number;
  created_at: string;
}

export interface ComponentType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DieTypeComponent {
  id: string;
  die_type_id: string;
  component_type_id: string;
  created_at: string;
  die_type?: DieType;
  component_type?: ComponentType;
}

export interface ComponentBOM {
  id: string;
  component_type_id: string;
  sequence_number: number;
  operation_name: string;
  work_center_id: string;
  estimated_duration_minutes?: number;
  notes?: string;
  created_at: string;
  work_center?: WorkCenter;
}

export interface SteelStockItem {
  id: string;
  alloy: string;
  diameter_mm: number;
  description?: string;
  created_at: string;
}

export interface Lot {
  id: string;
  stock_item_id: string;
  certificate_number: string;
  supplier: string;
  length_mm: number;
  gross_weight_kg: number;
  remaining_kg: number;
  certificate_file_url?: string;
  received_date: string;
  created_at: string;
  stock_item?: SteelStockItem;
}

export interface Die {
  id: string;
  die_number: string;
  die_diameter_mm: number;
  total_package_length_mm: number;
  die_type?: string;
  die_type_id?: string;
  design_file_url?: string;
  status: DieStatus;
  created_at: string;
  updated_at: string;
  die_type_ref?: DieType;
}

export interface DieComponent {
  id: string;
  die_id: string;
  component_type_id: string;
  stock_item_id: string;
  package_length_mm: number;
  theoretical_consumption_kg: number;
  created_at: string;
  component_type?: ComponentType;
  stock_item?: SteelStockItem;
}

export interface ProductionOrder {
  id: string;
  die_id: string;
  order_number: string;
  status: OrderStatus;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  die?: Die;
}

export interface WorkOrder {
  id: string;
  production_order_id: string;
  die_component_id: string;
  order_number: string;
  status: OrderStatus;
  theoretical_consumption_kg: number;
  actual_consumption_kg?: number;
  lot_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  die_component?: DieComponent;
  lot?: Lot;
  production_order?: ProductionOrder;
}

export interface WorkOrderOperation {
  id: string;
  work_order_id: string;
  sequence_number: number;
  operation_name: string;
  work_center_id: string;
  operator_name?: string;
  status: OperationStatus;
  estimated_duration_minutes?: number;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  work_center?: WorkCenter;
  work_order?: WorkOrder;
}

export interface StockMovement {
  id: string;
  lot_id: string;
  work_order_id: string;
  quantity_kg: number;
  movement_date: string;
  notes?: string;
  created_at: string;
  lot?: Lot;
  work_order?: WorkOrder;
}
