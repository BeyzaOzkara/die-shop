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
  operatorId: number,  // operator.id — NOT operator.name
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/operator-panel/operations/${operationId}/start`,
    // `/work-order-operations/${operationId}/start`,
    {
      work_center_id: Number(workCenterId),
      operator_id: operatorId,
    }
  );
}


/**
 * Operasyon duraklat
 * eski POST /work-order-operations/{id}/pause
 * POST /operator-panel/operations/{id}/pause
 */
export async function pauseOperation(
  operationId: string | number,
  operatorId: number,
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/operator-panel/operations/${operationId}/pause`,
    { operator_id: operatorId }
  );
  // return await api.patch<WorkOrderOperation>(
  //   `/work-order-operations/${operationId}`,
  //   {
  //     status: 'Paused',
  //   }
  // );
}

/**
 * Duraklatılmış operasyonu devam ettir
 * POST /operator-panel/operations/{id}/resume
 */
export async function resumeOperation(
  operationId: string | number,
  operatorId: number,
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/operator-panel/operations/${operationId}/resume`,
    { operator_id: operatorId }
  );
}

/**
 * Operasyon tamamla
 * eski POST /work-order-operations/{id}/complete
 * POST /operator-panel/operations/{id}/complete
 */
export async function completeOperation(
  operationId: string | number,
  operatorId: number,
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
      `/operator-panel/operations/${operationId}/complete`,
      { operator_id: operatorId }
  );
}

export async function cancelOperation(
  operationId: string | number,
  operatorId: number,
  reasonCode?: string,
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/operator-panel/operations/${operationId}/cancel`,
    { operator_id: operatorId, reason_code: reasonCode }
  );
}

/**
 * Operasyon reddet (KK/Supervisor)
 * POST /operator-panel/operations/{id}/reject
 */
export async function rejectOperation(
  operationId: string | number,
  operatorId: number,
  reasonCode?: string,
  notes?: string,
): Promise<WorkOrderOperation> {
  return await api.post<WorkOrderOperation>(
    `/operator-panel/operations/${operationId}/reject`,
    { operator_id: operatorId, reason_code: reasonCode, notes }
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

/**
 * Son operatörü toplu sorgula (İş Emirleri / Çalışma Merkezleri sayfaları için)
 * GET /operator-panel/operations/last-operators?operation_ids=1,2,3
 *
 * Returns: Record<string, { operator_id, operator_name, action_type, performed_at }>
 */
export interface LastOperatorInfo {
  operator_id: number;
  operator_name: string;
  action_type: string;
  performed_at: string;
}

export async function getLastOperatorsForOperations(
  operationIds: number[]
): Promise<Record<string, LastOperatorInfo>> {
  if (operationIds.length === 0) return {};
  const ids = operationIds.join(',');
  return await api.get<Record<string, LastOperatorInfo>>(
    `/operator-panel/operations/last-operators?operation_ids=${ids}`
  );
}