import React, { useState, useEffect } from 'react';
import { 
  Scissors, Search, Plus, Trash2, ArrowRight, PlayCircle, Settings, Layers, MapPin
} from 'lucide-react';
import { 
  getRawMaterials, getAvailableWip, getPreMachiningOrders, 
  getWipShelf, createPreMachiningOrder, shelveWip,
  type PreMachiningOrderCreate, type PlannedOperation
} from '../services/preMachiningService';
import { getOperationTypes } from '../services/operationTypeService';
import { getLocations } from '../services/stockService';
import type { StockItem, WorkOrder, OperationType, Location } from '../types/database';
import { calculateTheoreticalConsumption } from '../lib/calculations';

interface Props {
  onBack?: () => void;
}

export function PreMachiningPage({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'create' | 'orders' | 'shelf'>('create');
  
  // Data
  const [rawMaterials, setRawMaterials] = useState<StockItem[]>([]);
  const [availableWips, setAvailableWips] = useState<StockItem[]>([]);
  const [pmOrders, setPmOrders] = useState<WorkOrder[]>([]);
  const [shelfItems, setShelfItems] = useState<StockItem[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [sourceType, setSourceType] = useState<'RAW_MATERIAL' | 'WIP'>('RAW_MATERIAL');
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [plannedCutLength, setPlannedCutLength] = useState('');
  const [plannedCutWeight, setPlannedCutWeight] = useState('');
  const [plannedOps, setPlannedOps] = useState<PlannedOperation[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Shelve Modal
  const [showShelveModal, setShowShelveModal] = useState(false);
  const [shelveOrderId, setShelveOrderId] = useState<number | null>(null);
  const [targetLocationId, setTargetLocationId] = useState<number | ''>('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'create') {
        const [raw, wips, ops] = await Promise.all([
          getRawMaterials(),
          getAvailableWip(),
          getOperationTypes({ active: true })
        ]);
        setRawMaterials(raw);
        setAvailableWips(wips);
        setOperationTypes(ops);
        if (ops.length > 0 && plannedOps.length === 0) {
            // Check if there is a Testere op
            const testere = ops.find(o => o.is_cutting || o.name.toLowerCase().includes('testere'));
            if (testere) {
                setPlannedOps([{ operation_type_id: testere.id }]);
            } else {
                setPlannedOps([{ operation_type_id: ops[0].id }]);
            }
        }
      } else if (activeTab === 'orders') {
        const [orders, locs] = await Promise.all([
          getPreMachiningOrders(),
          getLocations()
        ]);
        setPmOrders(orders);
        setLocations(locs.filter(l => l.location_type === 'WAREHOUSE'));
      } else if (activeTab === 'shelf') {
        const items = await getWipShelf();
        setShelfItems(items);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOp = () => {
    if (operationTypes.length > 0) {
      setPlannedOps([...plannedOps, { operation_type_id: operationTypes[0].id }]);
    }
  };

  const handleRemoveOp = (index: number) => {
    setPlannedOps(plannedOps.filter((_, i) => i !== index));
  };

  const handleOpChange = (index: number, opTypeId: number) => {
    const newOps = [...plannedOps];
    newOps[index].operation_type_id = opTypeId;
    setPlannedOps(newOps);
  };

  // Calculate weight when length or source changes
  useEffect(() => {
    if (sourceType === 'RAW_MATERIAL' && sourceId && plannedCutLength) {
      const stock = rawMaterials.find(r => r.id === Number(sourceId));
      if (stock && stock.attributes?.diameter_mm) {
        const kg = calculateTheoreticalConsumption(Number(plannedCutLength), Number(stock.attributes.diameter_mm));
        setPlannedCutWeight(kg.toFixed(3));
      } else {
        setPlannedCutWeight('');
      }
    } else {
      setPlannedCutWeight('');
    }
  }, [sourceId, plannedCutLength, sourceType, rawMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId) return setError('Kaynak materyal seçilmedi');
    if (plannedOps.length === 0) return setError('En az bir operasyon eklenmelidir');

    setError('');
    setSubmitting(true);
    try {
      const payload: PreMachiningOrderCreate = {
        source_type: sourceType,
        source_stock_item_id: Number(sourceId),
        planned_cut_length_mm: sourceType === 'RAW_MATERIAL' && plannedCutLength ? Number(plannedCutLength) : undefined,
        planned_cut_weight_kg: sourceType === 'RAW_MATERIAL' && plannedCutWeight ? Number(plannedCutWeight) : undefined,
        planned_operations: plannedOps,
      };
      await createPreMachiningOrder(payload);
      alert('Ön İşleme Emri oluşturuldu.');
      
      // Reset form
      setSourceId('');
      setPlannedCutLength('');
      setPlannedCutWeight('');
      setSourceType('RAW_MATERIAL');
      
      setActiveTab('orders');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShelve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelveOrderId || !targetLocationId) return;
    try {
      await shelveWip(shelveOrderId, Number(targetLocationId));
      setShowShelveModal(false);
      setShelveOrderId(null);
      setTargetLocationId('');
      loadData();
      alert('WIP rafa kaldırıldı.');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Bir hata oluştu');
    }
  };

  const sourceItems = sourceType === 'RAW_MATERIAL' ? rawMaterials : availableWips;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Scissors className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Ön İşleme (Pre-Machining)</h1>
          <p className="text-gray-500 mt-1">
            Standart malzemeleri kesin, operasyonlardan geçirin ve kalıp bileşeni olmadan rafa kaldırın.
          </p>
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Geri Dön
          </button>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-8">
        <button
          className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'create' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('create')}
        >
          Yeni Ön İşleme Başlat
          {activeTab === 'create' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
        </button>
        <button
          className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'orders' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('orders')}
        >
          Aktif Emirler
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
        </button>
        <button
          className={`pb-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'shelf' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('shelf')}
        >
          Raftaki WIP'ler
          {activeTab === 'shelf' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      ) : (
        <>
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">1. Kaynak Seçimi</h3>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={sourceType === 'RAW_MATERIAL'} onChange={() => { setSourceType('RAW_MATERIAL'); setSourceId(''); }} />
                      <span className="text-sm font-medium">Hammadde (RAW_MATERIAL)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={sourceType === 'WIP'} onChange={() => { setSourceType('WIP'); setSourceId(''); }} />
                      <span className="text-sm font-medium">Yarı Mamül (WIP)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stok Kalemi Seçin</label>
                    <select 
                      value={sourceId} 
                      onChange={e => setSourceId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="">Seçiniz...</option>
                      {sourceItems.map(item => (
                        <option key={item.id} value={item.id}>
                          [ID:{item.id}] {item.category?.name} - {item.quantity} kg 
                          {item.attributes?.diameter_mm && ` (Ø${item.attributes.diameter_mm})`}
                          {item.attributes?.length_mm && ` (L:${item.attributes.length_mm})`}
                          {item.attributes?.alloy && ` (${item.attributes.alloy})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {sourceType === 'RAW_MATERIAL' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Çap (mm)</label>
                        <input 
                          type="text" 
                          value={sourceId ? rawMaterials.find(r => r.id === Number(sourceId))?.attributes?.diameter_mm || '' : ''}
                          readOnly
                          className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                          placeholder="Otomatik"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Planlanan Kesim (mm)</label>
                        <input 
                          type="number" 
                          value={plannedCutLength}
                          onChange={e => setPlannedCutLength(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Örn: 250"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tahmini Ağırlık (kg)</label>
                        <input 
                          type="number" step="0.01"
                          value={plannedCutWeight}
                          readOnly
                          className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 outline-none cursor-not-allowed"
                          placeholder="Otomatik hesaplanır"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-semibold text-gray-900">2. Rota (Operasyonlar)</h3>
                    <button type="button" onClick={handleAddOp} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Operasyon Ekle
                    </button>
                  </div>
                  
                  {plannedOps.length === 0 && <p className="text-sm text-gray-500 italic">Henüz operasyon eklenmedi.</p>}
                  
                  <div className="space-y-3">
                    {plannedOps.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <select 
                          value={op.operation_type_id}
                          onChange={e => handleOpChange(idx, Number(e.target.value))}
                          className="flex-1 px-3 py-1.5 border rounded-lg outline-none text-sm"
                        >
                          {operationTypes.map(ot => (
                            <option key={ot.id} value={ot.id}>{ot.name}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleRemoveOp(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Oluşturuluyor...' : 'Ön İşleme Emrini Başlat'}
                </button>
              </form>
              
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 h-fit">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" /> Nasıl Çalışır?
                </h3>
                <ul className="space-y-4 text-sm text-blue-800">
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">1.</span>
                    <p>Ham çelik veya daha önce kesilmiş bir yarımamülü (WIP) seçin.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">2.</span>
                    <p>Kesim ve tornalama gibi standart ön işlemleri rotaya ekleyin.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">3.</span>
                    <p>Operatör Panelinde bu emirler otomatik belirir. <strong>Testere tamamlandığında</strong> stoktan düşüm yapılır ve yeni bir parça otomatik yaratılır.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">4.</span>
                    <p>Tüm işlemler bittiğinde "Aktif Emirler" sekmesinden parçayı Rafa kaldırabilirsiniz.</p>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Emir No</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4">Kaynak Stok ID</th>
                    <th className="px-6 py-4">Planlanan (L / kg)</th>
                    <th className="px-6 py-4">Gerçekleşen Tüketim</th>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {pmOrders.map(wo => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{wo.pre_machining_order_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          wo.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          wo.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{wo.stock_item_id}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {wo.planned_cut_length_mm || '-'} / {wo.planned_cut_weight_kg || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {wo.actual_consumption_kg ? `${wo.actual_consumption_kg} kg` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(wo.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {wo.status === 'Completed' && (
                           <button 
                             onClick={() => { setShelveOrderId(wo.id); setShowShelveModal(true); }}
                             className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-end gap-1 w-full"
                           >
                             <MapPin className="w-4 h-4" /> Üretimi Tamamla ve Rafa Kaldır
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pmOrders.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'shelf' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shelfItems.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md">WIP</span>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-lg">
                    {item.attributes?.alloy ? `${item.attributes.alloy}` : 'Stok'}: #{item.id}
                    {item.attributes?.diameter_mm && ` (Ø${item.attributes.diameter_mm})`}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-1">{item.category?.name}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Miktar:</span>
                      <span className="font-medium">{item.quantity} kg</span>
                    </div>
                    {item.attributes?.length_mm && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Uzunluk:</span>
                        <span className="font-medium">{item.attributes.length_mm} mm</span>
                      </div>
                    )}
                    {item.attributes?.diameter_mm && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Çap:</span>
                        <span className="font-medium">Ø{item.attributes.diameter_mm}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <MapPin className="w-4 h-4" /> {item.location?.name || 'Belirtilmedi'}
                  </div>
                </div>
              ))}
              {shelfItems.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">Rafta bekleyen WIP bulunmuyor.</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Shelve Modal */}
      {showShelveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">Rafa Kaldır</h3>
              <button onClick={() => setShowShelveModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleShelve} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Lokasyon (Depo)</label>
                <select 
                  value={targetLocationId} 
                  onChange={e => setTargetLocationId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowShelveModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  İptal
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
