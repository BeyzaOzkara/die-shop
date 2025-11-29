import { supabase } from '../lib/supabase';
import type { SteelStockItem, Lot } from '../types/database';

export async function getSteelStockItems(): Promise<SteelStockItem[]> {
  const { data, error } = await supabase
    .from('steel_stock_items')
    .select('*')
    .order('alloy, diameter_mm');

  if (error) throw error;
  return data || [];
}

export async function createSteelStockItem(item: Omit<SteelStockItem, 'id' | 'created_at'>): Promise<SteelStockItem> {
  const { data, error } = await supabase
    .from('steel_stock_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLots(stockItemId?: string): Promise<Lot[]> {
  let query = supabase
    .from('lots')
    .select('*, stock_item:steel_stock_items(*)')
    .order('received_date', { ascending: false });

  if (stockItemId) {
    query = query.eq('stock_item_id', stockItemId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAvailableLots(stockItemId: string): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*, stock_item:steel_stock_items(*)')
    .eq('stock_item_id', stockItemId)
    .gt('remaining_kg', 0)
    .order('received_date');

  if (error) throw error;
  return data || [];
}

export async function createLot(lot: Omit<Lot, 'id' | 'created_at'>): Promise<Lot> {
  const { data, error } = await supabase
    .from('lots')
    .insert(lot)
    .select('*, stock_item:steel_stock_items(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateLotStock(lotId: string, consumedKg: number): Promise<Lot> {
  const { data: lot, error: fetchError } = await supabase
    .from('lots')
    .select('remaining_kg')
    .eq('id', lotId)
    .single();

  if (fetchError) throw fetchError;

  const newRemaining = lot.remaining_kg - consumedKg;

  if (newRemaining < 0) {
    throw new Error('Yetersiz stok miktarı');
  }

  const { data, error } = await supabase
    .from('lots')
    .update({ remaining_kg: newRemaining })
    .eq('id', lotId)
    .select('*, stock_item:steel_stock_items(*)')
    .single();

  if (error) throw error;
  return data;
}
