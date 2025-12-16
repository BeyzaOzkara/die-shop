// src/services/stockService.ts
import { api } from '../lib/api';
import type { SteelStockItem, Lot, StockMovement } from '../types/database';

// Çelik ürünler
export async function getSteelStockItems(): Promise<SteelStockItem[]> {
  return api.get<SteelStockItem[]>('/inventory/steel-stock-items');
}

export async function createSteelStockItem(payload: {
  alloy: string;
  diameter_mm: number;
  description?: string;
}): Promise<SteelStockItem> {
  return api.post<SteelStockItem>('/inventory/steel-stock-items', payload);
}

// Lotlar
export async function getLots(): Promise<Lot[]> {
  return api.get<Lot[]>('/inventory/lots');
}

export async function createLot(payload: {
  stock_item_id: number;
  certificate_number: string;
  supplier: string;
  length_mm: number;
  gross_weight_kg: number;
  remaining_kg: number;
  certificate_file_url?: string;
  received_date: string; // "YYYY-MM-DD" formatında
}): Promise<Lot> {
  return api.post<Lot>('/inventory/lots', payload);
}

// Belirli stok item için kalan lotlar
export async function getAvailableLots(
  stockItemId: string | number
): Promise<Lot[]> {
  return api.get<Lot[]>(`/inventory/lots/by-stock-item/${stockItemId}`, {
    only_with_remaining: true,
  });
}

// Stok hareketleri
export async function getStockMovements(): Promise<StockMovement[]> {
  return api.get<StockMovement[]>('/inventory/stock-movements');
}

export async function updateLotStock(
  lotId: number | string,
  remainingKg: number
): Promise<Lot> {
  return api.patch<Lot>(`/inventory/lots/${lotId}/remaining`, {
    remaining_kg: remainingKg,
  });
}
