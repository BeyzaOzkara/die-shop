// src/services/operatorService.ts
import { api } from '../lib/api';
import type { Operator, WorkOrderOperation } from '../types/database';

/**
 * RFID ile operatör giriş
 * POST /operators/login-by-rfid
 */
export async function loginOperatorByRFID(rfidCode: string): Promise<Operator> {
  return await api.post<Operator>('/operators/login-by-rfid', {
    rfid_code: rfidCode,
  });
}

/**
 * Tek bir operatörü id ile getir
 * GET /operators/{id}
 */
export async function getOperatorById(id: string | number): Promise<Operator | null> {
  return await api.get<Operator | null>(`/operators/${id}`);
}

/**
 * Tüm operatörleri listele
 * GET /operators
 */
export async function getOperators(): Promise<Operator[]> {
  return await api.get<Operator[]>('/operators/');
}

/**
 * Operatör oluştur
 * POST /operators
 *
 * Body:
 * {
 *   rfid_code: string;
 *   name: string;
 *   employee_number?: string;
 *   work_center_ids: number[];
 *   is_active: boolean;
 * }
 */
export async function createOperator(payload: {
  rfid_code: string;
  name: string;
  employee_number?: string;
  work_center_ids: number[];
  is_active: boolean;
}): Promise<Operator> {
  return await api.post<Operator>('/operators', payload);
}

/**
 * Operatör güncelle
 * PATCH /operators/{id}
 */
export async function updateOperator(
  id: string | number,
  updates: Partial<{
    rfid_code: string;
    name: string;
    employee_number?: string;
    work_center_ids: number[];
    is_active: boolean;
  }>
): Promise<Operator> {
  return await api.patch<Operator>(`/operators/${id}`, updates);
}

/**
 * Operatör sil
 * DELETE /operators/{id}
 */
export async function deleteOperator(id: string | number): Promise<void> {
  // await api.delete(`/operators/${id}`);
}

/**
 * Operatör paneli:
 * Belirli bir çalışma merkezindeki operasyon kuyruğu
 * GET /work-centers/{work_center_id}/operations-queue
 */
export async function getWorkCenterOperations(
  workCenterId: string | number
): Promise<WorkOrderOperation[]> {
  return await api.get<WorkOrderOperation[]>(
    `/work-order-operations/by-work-center/${workCenterId}`
    // `/work-centers/${workCenterId}/operations-queue`
  );
}

/**
 * Operasyon başlat
 * POST /work-order-operations/{id}/start
 * Body: { operator_id, operator_name }
 */
export async function startOperation(
  operationId: string | number,
  operatorId: string | number, // bu apiye eklenmeli
  operatorName: string
): Promise<WorkOrderOperation> {
  return await api.patch<WorkOrderOperation>(
    // `/work-order-operations/${operationId}/start`,
    // {
    //   operator_id: operatorId,
    //   operator_name: operatorName,
    // }
    `/work-order-operations/${operationId}`,
    {
      status: 'InProgress',
      operator_name: operatorName,
    }
  );
}

/**
 * Operasyon duraklat
 * POST /work-order-operations/{id}/pause
 */
export async function pauseOperation(
  operationId: string | number
): Promise<WorkOrderOperation> {
  return await api.patch<WorkOrderOperation>(
    `/work-order-operations/${operationId}`,
    {
      status: 'Paused',
    }
  );
  // return await api.post<WorkOrderOperation>(
  //   `/work-order-operations/${operationId}/pause`
  // );
}

/**
 * Operasyon tamamla
 * POST /work-order-operations/{id}/complete
 */
export async function completeOperation(
  operationId: string | number
): Promise<WorkOrderOperation> {
  return await api.patch<WorkOrderOperation>(
    `/work-order-operations/${operationId}`,
    {
      status: 'Completed',
    }
  );
  // return await api.post<WorkOrderOperation>(
  //   `/work-order-operations/${operationId}/complete`
  // );
}

export async function cancelOperation(
  operationId: string | number
): Promise<WorkOrderOperation> {
  return await api.patch<WorkOrderOperation>(
    `/work-order-operations/${operationId}`,
    {
      status: 'Cancelled',
    }
  );
 }
