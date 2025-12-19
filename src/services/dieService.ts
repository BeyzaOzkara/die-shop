import { api } from '../lib/api';
import { calculateTheoreticalConsumption } from '../lib/calculations';
import type { Die, DieComponent, ProductionOrder } from '../types/database';

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


export async function createDie(params: {
  dieNumber: string;
  dieDiameterMm: number;
  totalPackageLengthMm: number;
  dieTypeId: number;
  designFiles: File[];

  profileNo?: string;
  figureCount?: number | null;
  customerName?: string;
  pressCode?: string;
}): Promise<Die> {
  const fd = new FormData();

  // ✅ Tek payload: yeni alan eklenince sadece buraya eklenecek
  fd.append(
    'payload',
    JSON.stringify({
      die_number: params.dieNumber,
      die_diameter_mm: params.dieDiameterMm,
      total_package_length_mm: params.totalPackageLengthMm,
      die_type_id: params.dieTypeId,
      // profile_no, figure_count, customer_name, press_code ...
      profile_no: params.profileNo ?? null,
      figure_count: params.figureCount ?? null,
      customer_name: params.customerName ?? null,
      press_code: params.pressCode ?? null,
    })
  );

  for (const f of params.designFiles ?? []) {
    fd.append('design_files', f); // backend param ismiyle aynı
  }

  return api.post<Die>('/dies', fd);
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

  // POST /production-orders
  const productionOrder = await api.post<ProductionOrder>('/production-orders', {
    die_id: dieId,
    // order_number: orderNumber,
    status: 'Waiting',
  });

  // 4) Kalıp durumunu Waiting yap
  await updateDieStatus(dieId, 'Waiting');

  return productionOrder;
}

export async function createWorkOrders(productionOrderId: number): Promise<void> {
  // Backend tüm işi yapıyor: iş emirleri + operasyonlar + kalıp status
  await api.post(`/production-orders/${productionOrderId}/generate-work-orders`, {});
}
