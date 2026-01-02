// src/services/operatorService.ts
import { api } from '../lib/api';
import type { Operator, WorkOrderOperation, WorkCenterStatus, Lot } from '../types/database';

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
  role: Operator['role'];
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
    role: Operator['role'];
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
  await api.del(`/operators/${id}`);
}

/**
 * Operatör paneli:
 * (Eski) Belirli bir çalışma merkezindeki operasyon kuyruğu
 * GET /work-order-operations/by-work-center/{workCenterId}
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
// export async function startOperation(
//   operationId: string | number,
//   operatorId: string | number, // bu apiye eklenmeli
//   operatorName: string
// ): Promise<WorkOrderOperation> {
//   return await api.patch<WorkOrderOperation>(
//     // `/work-order-operations/${operationId}/start`,
//     // {
//     //   operator_id: operatorId,
//     //   operator_name: operatorName,
//     // }
//     `/work-order-operations/${operationId}`,
//     {
//       status: 'InProgress',
//       operator_name: operatorName,
//     }
//   );
// }


export async function getAvailableOperationsForOperator(payload: {
  operator_id: number;
  operation_type_id: number;
}): Promise<WorkOrderOperation[]> {
  return api.post<WorkOrderOperation[]>(
    `/work-order-operations/available-for-operator`,
    payload
  );
}


export async function startOperation( // operatörün kullandığı start work center atama yapan
  operationId: string | number,
  workCenterId: string | number,
  operatorName?: string
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/work-order-operations/${operationId}/start`,
    {
      work_center_id: Number(workCenterId),
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

 export interface EligibleWorkCenterRead {
  id: number;
  name: string;
  status: WorkCenterStatus;
}

export async function getEligibleWorkCentersForOperator(
  operatorId: number,
  operationTypeId: number
): Promise<EligibleWorkCenterRead[]> {
  // api.get wrapper'ına göre params geçişi:
  return await api.get<EligibleWorkCenterRead[]>(
    `/operators/${operatorId}/eligible-work-centers?operation_type_id=${operationTypeId}`
  );
}

// Operatör restore edilebilir public bilgileri, kullanacak mıyız bilmiyorum şimdilik ekledim
export async function getOperatorPublicById(id: number): Promise<Operator> {
  return await api.get<Operator>(`/operators/public/${id}`);
}

// ✅ NEW
export async function getAssignedOperationsByWorkCenter(
  workCenterId: number
): Promise<WorkOrderOperation[]> {
  return api.get<WorkOrderOperation[]>(
    `/work-order-operations/assigned/by-work-center/${workCenterId}`
  );
}


export async function getAvailableLotsForOperation(
  operationId: string | number
): Promise<Lot[]> {
  return await api.get<Lot[]>(`/work-order-operations/${operationId}/available-lots`);
}

export async function completeSawOperation(
  operationId: string | number,
  payload: { lot_id: number; quantity_kg: number; note?: string }
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/work-order-operations/${operationId}/complete-saw`,
    payload
  );
}