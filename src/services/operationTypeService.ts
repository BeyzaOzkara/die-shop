import { api } from '../lib/api';
import type { OperationType } from '../types/database';

export async function getOperationTypes(onlyActive: boolean = true): Promise<OperationType[]> {
  // backend endpoint'in: GET /operation-types (veya /master/operation-types) nasılsa ona göre path düzelt
  // Ben varsayılanı /operation-types kabul ediyorum
  return api.get<OperationType[]>('/operation-types', { only_active: onlyActive });
}
