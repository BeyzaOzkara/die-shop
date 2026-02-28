// src/services/supplierService.ts
import { api } from '../lib/api';
import type { Supplier } from '../types/database';

export interface SupplierCreatePayload {
    name: string;
    tax_no?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    is_active?: boolean;
}

export interface SupplierUpdatePayload extends Partial<SupplierCreatePayload> { }

export interface GetSuppliersParams {
    search?: string;
    active?: boolean;
}

export async function getSuppliers(params?: GetSuppliersParams): Promise<Supplier[]> {
    const queryParams: Record<string, string | boolean> = {};
    if (params?.search) queryParams['search'] = params.search;
    if (params?.active !== undefined) queryParams['active'] = params.active;
    return api.get<Supplier[]>('/suppliers/', queryParams);
}

export async function createSupplier(payload: SupplierCreatePayload): Promise<Supplier> {
    return api.post<Supplier>('/suppliers/', payload);
}

export async function updateSupplier(id: number, payload: SupplierUpdatePayload): Promise<Supplier> {
    return api.put<Supplier>(`/suppliers/${id}`, payload);
}

export async function deleteSupplier(id: number): Promise<void> {
    await api.del(`/suppliers/${id}`);
}
