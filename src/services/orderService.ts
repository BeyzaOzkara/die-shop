import { api } from '../lib/api';
import { updateLotStock } from './stockService';
import type {
  ProductionOrder,
  WorkOrder,
  WorkOrderOperation,
  StockMovement,
} from '../types/database';

// =======================
// Production Orders
// =======================

export async function getProductionOrders(): Promise<ProductionOrder[]> {
  // FastAPI:
  // GET /production-orders   (backend zaten die ile birlikte dönüyor)
  return api.get<ProductionOrder[]>('/production-orders');
}

export async function getProductionOrderById(
  id: string
): Promise<ProductionOrder | null> {
  // FastAPI: GET /production-orders/{id} -> 404
  try {
    return await api.get<ProductionOrder>(`/production-orders/${Number(id)}`);
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('API error 404')) {
      return null;
    }
    throw err;
  }
}

// =======================
// Work Orders
// =======================

export async function getWorkOrders(
  productionOrderId?: string
): Promise<WorkOrder[]> {
  // FastAPI:
  // GET /work-orders (backend nested ilişkilerle dönüyor)
  const all = await api.get<WorkOrder[]>('/work-orders');

  if (productionOrderId) {
    const pid = Number(productionOrderId);
    return all.filter((w) => w.production_order_id === pid);
  }

  return all;
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  // FastAPI: GET /work-orders/{id} -> 404
  try {
    return await api.get<WorkOrder>(`/work-orders/${Number(id)}`);
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('API error 404')) {
      return null;
    }
    throw err;
  }
}

// =======================
// Work Order Operations
// =======================

export async function getWorkOrderOperations(
  workOrderId: string
): Promise<WorkOrderOperation[]> {
  // FastAPI:
  // GET /work-order-operations/by-work-order/{work_order_id}
  return api.get<WorkOrderOperation[]>(
    `/work-order-operations/by-work-order/${Number(workOrderId)}`
  );
}

export async function getOperationsByWorkCenter(
  workCenterId: string
): Promise<WorkOrderOperation[]> {
  // FastAPI:
  // GET /work-order-operations/by-work-center/{work_center_id}
  // Backend, WorkOrderOperationWithWorkOrderRead dönüyor (nested work_order + work_center);
  // TS tarafında WorkOrderOperation tipi already bunları optional field olarak içerebilir.
  return api.get<WorkOrderOperation[]>(
    `/work-order-operations/by-work-center/${Number(workCenterId)}`
  );
}

export async function updateOperationStatus(
  id: string,
  status: WorkOrderOperation['status'],
  operatorName?: string
): Promise<WorkOrderOperation> {
  const updates: any = { status };

  if (operatorName) {
    updates.operator_name = operatorName;
  }

  // FastAPI:
  // PATCH /work-order-operations/{id}
  return api.patch<WorkOrderOperation>(
    `/work-order-operations/${Number(id)}`,
    updates
  );
  // if (status === 'InProgress') {
  //   updates.started_at = new Date().toISOString();
  //   if (operatorName) updates.operator_name = operatorName;
  // } else if (status === 'Completed') {
  //   updates.completed_at = new Date().toISOString();
  // }
  // // FastAPI:
  // // PATCH /work-order-operations/{id}
  // return api.patch<WorkOrderOperation>(
  //   `/work-order-operations/${Number(id)}`,
  //   updates
  // );
}

export async function updateWorkOrderStatus(
  id: string,
  status: WorkOrder['status']
): Promise<WorkOrder> {
  const updates: any = { status };

  if (status === 'InProgress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }
  // FastAPI:
  // PATCH /work-orders/{id}
  return api.patch<WorkOrder>(`/work-orders/${Number(id)}`, updates);
}

// =======================
// Complete Work Order + Stock Movement
// =======================

export async function completeWorkOrder(
  workOrderId: string,
  actualConsumptionKg: number,
  lotId: string,
  notes?: string
): Promise<void> {
  // 1) Lot stok güncelle
  await updateLotStock(lotId, actualConsumptionKg);

  // 2) İş emrini güncelle (gerçek tüketim, lot, status Completed)
  await api.patch<WorkOrder>(`/work-orders/${Number(workOrderId)}`, {
    actual_consumption_kg: actualConsumptionKg,
    lot_id: Number(lotId),
    status: 'Completed',
    completed_at: new Date().toISOString(),
  });

  // 3) Stok hareketini kaydet
  await api.post<StockMovement>('/inventory/stock-movements', {
    lot_id: Number(lotId),
    work_order_id: Number(workOrderId),
    quantity_kg: actualConsumptionKg,
    movement_date: new Date().toISOString(),
    notes,
  });
}

// =======================
// Production Order Status
// =======================

export async function updateProductionOrderStatus( // hata veriyor
  id: string,
  status: ProductionOrder['status']
): Promise<ProductionOrder> {
  const updates: any = { status };
  console.log("update: ", updates)
  if (status === 'InProgress') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'Completed') {
    updates.completed_at = new Date().toISOString();
  }
  
  console.log("update2: ", updates)
  // FastAPI:
  // PATCH /production-orders/{id}
  return api.patch<ProductionOrder>(
    `/production-orders/${Number(id)}`,
    updates
  );
}

// =======================
// Stock Movements
// =======================

export async function getStockMovements(): Promise<StockMovement[]> {
  // FastAPI:
  // GET /inventory/stock-movements
  return api.get<StockMovement[]>('/inventory/stock-movements');
}
