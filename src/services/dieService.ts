import { api } from '../lib/api';
import { calculateTheoreticalConsumption, generateOrderNumber } from '../lib/calculations';
import type { Die, DieComponent, ProductionOrder, WorkOrder } from '../types/database';
import { getComponentBOM } from './componentService';

// =======================
// Dies
// =======================

export async function getDies(): Promise<Die[]> {
  // GET /dies (backend die_type_ref ile dönüyor)
  return api.get<Die[]>('/dies');
}

export async function getDieById(id: number): Promise<Die | null> {
  // FastAPI: GET /dies/{id} -> 404 ise null’a çeviriyoruz
  try {
    return await api.get<Die>(`/dies/${id}`);
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith('API error 404')) {
      return null;
    }
    throw err;
  }
}

export async function getDieComponents(dieId: number): Promise<DieComponent[]> {
  // GET /dies/{dieId}/components
  return api.get<DieComponent[]>(`/dies/${dieId}/components`);
}

export async function createDie(
  die: Omit<Die, 'id' | 'created_at' | 'updated_at'>
): Promise<Die> {
  // POST /dies (status'i backend Draft olarak set ediyor)
  const payload = {
    die_number: die.die_number,
    die_diameter_mm: die.die_diameter_mm,
    total_package_length_mm: die.total_package_length_mm,
    die_type_id: die.die_type_id,     // number
    design_file_url: die.design_file_url,
  };

  return api.post<Die>('/dies', payload);
}

export async function addComponentToDie(
  dieId: number,
  componentTypeId: number,
  stockItemId: number,
  packageLengthMm: number,
  diameterMm: number
): Promise<DieComponent> {
  const theoreticalConsumption = calculateTheoreticalConsumption(
    packageLengthMm,
    diameterMm
  );

  // POST /dies/{dieId}/components
  const payload = {
    component_type_id: componentTypeId,
    stock_item_id: stockItemId,
    package_length_mm: packageLengthMm,
    theoretical_consumption_kg: theoreticalConsumption,
  };

  return api.post<DieComponent>(`/dies/${dieId}/components`, payload);
}

export async function updateDieStatus(
  dieId: number,
  status: Die['status']
): Promise<Die> {
  // PATCH /dies/{dieId}
  return api.patch<Die>(`/dies/${dieId}`, { status });
}

// =======================
// Production Order & Work Orders
// =======================

export async function createProductionOrder(dieId: number): Promise<ProductionOrder> {
  // 1) Kalıp kontrolü
  const die = await getDieById(dieId);
  if (!die) throw new Error('Kalıp bulunamadı');

  // 2) Üretim emri oluştur
  const orderNumber = generateOrderNumber('UE');

  // POST /production-orders
  const productionOrder = await api.post<ProductionOrder>('/production-orders', {
    die_id: dieId,
    order_number: orderNumber,
    status: 'Waiting',
  });

  // 3) Kalıp bileşenlerini çek
  const components = await getDieComponents(dieId);

  // 4) Her bileşen için İş Emri + Operasyonları oluştur
  for (const component of components) {
    const workOrderNumber = generateOrderNumber('IE');

    // POST /work-orders
    const workOrder = await api.post<WorkOrder>('/work-orders', {
      production_order_id: productionOrder.id,
      die_component_id: component.id,
      order_number: workOrderNumber,
      theoretical_consumption_kg: component.theoretical_consumption_kg,
      status: 'Waiting',
    });

    // Bileşen tipine göre BOM operasyonlarını çek
    const bomOperations = await getComponentBOM(component.component_type_id);

    // Her BOM operasyonu için İş Emri Operasyon kaydı oluştur
    for (const bomOp of bomOperations) {
      // POST /work-order-operations
      await api.post('/work-order-operations', {
        work_order_id: workOrder.id,
        sequence_number: bomOp.sequence_number,
        operation_name: bomOp.operation_name,
        work_center_id: bomOp.work_center_id,
        estimated_duration_minutes: bomOp.estimated_duration_minutes,
        notes: bomOp.notes,
        status: 'Waiting',
      });
    }
  }

  // 5) Kalıp durumunu Ready yap
  await updateDieStatus(dieId, 'Ready');

  return productionOrder;
}
