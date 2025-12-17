import { useState, useEffect } from 'react';
import {
  Package,
  ClipboardList,
  Settings,
  Database,
  Factory,
  FileText,
  Boxes,
  Link2,
  List,
  UserCircle,
} from 'lucide-react';
import { DiesPage } from './pages/DiesPage';
import { ProductionOrdersPage } from './pages/ProductionOrdersPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { StockPage } from './pages/StockPage';
import { WorkCentersPage } from './pages/WorkCentersPage';
import { DieTypesPage } from './pages/DieTypesPage';
import { ComponentTypesPage } from './pages/ComponentTypesPage';
import { DieTypeComponentsPage } from './pages/DieTypeComponentsPage';
import { ComponentBOMPage } from './pages/ComponentBOMPage';
import { OperatorsPage } from './pages/OperatorsPage';
import { OperatorApp } from './pages/operator/OperatorApp';

type Page =
  | 'dies'
  | 'production-orders'
  | 'work-orders'
  | 'stock'
  | 'work-centers'
  | 'operators'
  | 'die-types'
  | 'component-types'
  | 'die-type-components'
  | 'component-bom';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dies');
  const [showMasterData, setShowMasterData] = useState(false);
  const [isOperatorMode, setIsOperatorMode] = useState(false);

  useEffect(() => {
    const checkOperatorMode = () => {
      const path = window.location.pathname;
      setIsOperatorMode(path.startsWith('/operator'));
    };

    checkOperatorMode();
    window.addEventListener('popstate', checkOperatorMode);
    return () => window.removeEventListener('popstate', checkOperatorMode);
  }, []);

  if (isOperatorMode) {
    return <OperatorApp />;
  }

  const mainNavigation = [
    { id: 'dies' as Page, name: 'Kalıplar', icon: Package },
    { id: 'production-orders' as Page, name: 'Üretim Emirleri', icon: ClipboardList },
    { id: 'work-orders' as Page, name: 'İş Emirleri', icon: Settings },
    { id: 'work-centers' as Page, name: 'Çalışma Merkezleri', icon: Factory },
  ];

  const masterDataNavigation = [
    { id: 'die-types' as Page, name: 'Kalıp Tipi Tanımı', icon: FileText },
    { id: 'component-types' as Page, name: 'Bileşen Tipi Tanımı', icon: Boxes },
    { id: 'die-type-components' as Page, name: 'Kalıp-Bileşen Eşlemesi', icon: Link2 },
    { id: 'component-bom' as Page, name: 'Bileşen BOM Yönetimi', icon: List },
    { id: 'operators' as Page, name: 'Operatörler', icon: UserCircle },
    { id: 'stock' as Page, name: 'Stok Yönetimi', icon: Database },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dies':
        return <DiesPage />;
      case 'production-orders':
        return <ProductionOrdersPage />;
      case 'work-orders':
        return <WorkOrdersPage />;
      case 'stock':
        return <StockPage />;
      case 'work-centers':
        return <WorkCentersPage />;
      case 'operators':
        return <OperatorsPage />;
      case 'die-types':
        return <DieTypesPage />;
      case 'component-types':
        return <ComponentTypesPage />;
      case 'die-type-components':
        return <DieTypeComponentsPage />;
      case 'component-bom':
        return <ComponentBOMPage />;
      default:
        return <DiesPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Sol taraf - logo & başlık */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kalıp Atölyesi</h1>
                <p className="text-xs text-gray-600">Yönetim Sistemi</p>
              </div>
            </div>

            {/* Sağ taraf - menüler */}
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setShowMasterData(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        currentPage === item.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{item.name}</span>
                    </button>
                  );
                })}

                {/* Operatör Paneli butonu */}
                <button
                  onClick={() => {
                    window.location.href = '/operator';
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                >
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden lg:inline">Operatör Paneli</span>
                </button>
              </div>

              {/* Ana Veri dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMasterData(!showMasterData)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <Database className="w-4 h-4" />
                  <span>Ana Veri</span>
                </button>
                {showMasterData && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {masterDataNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentPage(item.id);
                            setShowMasterData(false);
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors text-sm ${
                            currentPage === item.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>{renderPage()}</main>
    </div>
  );
}

export default App;
