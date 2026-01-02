// src/App.tsx
import { useEffect, useState } from "react";
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
  LogOut,
} from "lucide-react";

import { DiesPage } from "./pages/DiesPage";
import { ProductionOrdersPage } from "./pages/ProductionOrdersPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { StockPage } from "./pages/StockPage";
import { WorkCentersPage } from "./pages/WorkCentersPage";
import { DieTypesPage } from "./pages/DieTypesPage";
import { ComponentTypesPage } from "./pages/ComponentTypesPage";
import { DieTypeComponentsPage } from "./pages/DieTypeComponentsPage";
import { ComponentBOMPage } from "./pages/ComponentBOMPage";
import { OperatorsPage } from "./pages/OperatorsPage";
import { OperationTypesPage } from "./pages/OperationTypesPage";
import { OperatorApp } from "./pages/operator/OperatorApp";

import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignUpPage";

import { fetchMe, logoutUser } from "./services/authService";
import { authToken } from "./lib/api";
import type { User } from "./types/database";

type Page =
  | "dies"
  | "production-orders"
  | "work-orders"
  | "stock"
  | "work-centers"
  | "operators"
  | "die-types"
  | "component-types"
  | "die-type-components"
  | "operation-types"
  | "component-bom";

type AuthScreen = "login" | "signup";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dies");
  const [showMasterData, setShowMasterData] = useState(false);
  const [isOperatorMode, setIsOperatorMode] = useState(false);

  // ✅ auth state
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");

  // ✅ /operator route kontrolü
  useEffect(() => {
    const checkOperatorMode = () => {
      const path = window.location.pathname;
      setIsOperatorMode(path.startsWith("/operator"));
    };

    checkOperatorMode();
    window.addEventListener("popstate", checkOperatorMode);
    return () => window.removeEventListener("popstate", checkOperatorMode);
  }, []);

  // ✅ token varsa /me çek
  useEffect(() => {
    if (isOperatorMode) return;

    (async () => {
      const token = authToken.get();
      if (!token) {
        setUser(null);
        setBooting(false);
        return;
      }

      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [isOperatorMode]);

  // ✅ operator paneli ayrı app
  if (isOperatorMode) {
    return <OperatorApp />;
  }

  // ✅ boot/loading
  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Yükleniyor...
      </div>
    );
  }

  // ✅ login/signup gate
  if (!user) {
    return authScreen === "login" ? (
      <LoginPage
        onLogin={(u) => {
          setUser(u);
          setAuthScreen("login");
        }}
        onSignupClick={() => setAuthScreen("signup")}
      />
    ) : (
      <SignupPage
        onSignup={(u) => {
          setUser(u);
          setAuthScreen("login");
        }}
        onLoginClick={() => setAuthScreen("login")}
      />
    );
  }

  // ✅ admin değilse (istersen farklı ekran)
  if (!user.is_admin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="text-xl font-semibold">Yetkiniz yok</div>
        <button
          onClick={() => {
            logoutUser();
            setUser(null);
            setAuthScreen("login");
          }}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white"
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  const mainNavigation = [
    { id: "dies" as Page, name: "Kalıplar", icon: Package },
    {
      id: "production-orders" as Page,
      name: "Üretim Emirleri",
      icon: ClipboardList,
    },
    { id: "work-orders" as Page, name: "İş Emirleri", icon: Settings },
    { id: "work-centers" as Page, name: "Çalışma Merkezleri", icon: Factory },
  ];

  const masterDataNavigation = [
    { id: "die-types" as Page, name: "Kalıp Tipi Tanımı", icon: FileText },
    {
      id: "component-types" as Page,
      name: "Bileşen Tipi Tanımı",
      icon: Boxes,
    },
    {
      id: "die-type-components" as Page,
      name: "Kalıp-Bileşen Eşlemesi",
      icon: Link2,
    },
    { id: "component-bom" as Page, name: "Bileşen BOM Yönetimi", icon: List },
    { id: "operators" as Page, name: "Operatörler", icon: UserCircle },
    { id: "stock" as Page, name: "Stok Yönetimi", icon: Database },
    {
      id: "operation-types" as Page,
      name: "Operasyon Tipleri Yönetimi",
      icon: Factory,
    },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dies":
        return <DiesPage />;
      case "production-orders":
        return <ProductionOrdersPage />;
      case "work-orders":
        return <WorkOrdersPage />;
      case "stock":
        return <StockPage />;
      case "work-centers":
        return <WorkCentersPage />;
      case "operators":
        return <OperatorsPage />;
      case "die-types":
        return <DieTypesPage />;
      case "component-types":
        return <ComponentTypesPage />;
      case "die-type-components":
        return <DieTypeComponentsPage />;
      case "component-bom":
        return <ComponentBOMPage />;
      case "operation-types":
        return <OperationTypesPage />;
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
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                    window.location.href = "/operator";
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
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700"
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

              {/* kullanıcı + logout */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col leading-tight">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name} {user.surname}
                  </div>
                  <div className="text-xs text-gray-500">@{user.username}</div>
                </div>

                <button
                  onClick={() => {
                    logoutUser();
                    setUser(null);
                    setAuthScreen("login");
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                  title="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Çıkış</span>
                </button>
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
