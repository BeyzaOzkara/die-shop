// src/services/operationTypeService.ts
import { api } from "../lib/api";
import type { OperationType } from "../types/database";

type OperationTypeCreatePayload = {
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
};

type OperationTypeUpdatePayload = Partial<OperationTypeCreatePayload>;

export async function getOperationTypes(params?: { only_active?: boolean }): Promise<OperationType[]> {
  // default: admin sayfasında hepsini görmek isteyeceğiz
  const onlyActive = params?.only_active ?? false;
  return api.get<OperationType[]>("/operation-types", { only_active: onlyActive });
}

export async function createOperationType(payload: OperationTypeCreatePayload): Promise<OperationType> {
  return api.post<OperationType>("/operation-types", payload);
}

export async function updateOperationType(id: number, updates: OperationTypeUpdatePayload): Promise<OperationType> {
  return api.patch<OperationType>(`/operation-types/${id}`, updates);
}

export async function deleteOperationType(id: number): Promise<void> {
  await api.del<void>(`/operation-types/${id}`);
}
