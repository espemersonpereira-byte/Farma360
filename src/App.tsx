import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bookmark,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FlaskConical,
  GitCompare,
  Home,
  Layers,
  LogIn,
  Menu,
  Moon,
  Pill,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase.ts';
import {
  ACTIVE_INGREDIENTS,
  INITIAL_PHARMACOLOGICAL_CATEGORIES,
  MEDICATION_PRODUCTS,
  SANITARY_ALERTS,
} from './data/pharmacologicalDatabase.ts';
import {
  ActiveIngredient,
  AnvisaCatalogStats,
  HealthProfession,
  MedicationProduct,
  PaginatedCatalogResponse,
  ProfessionalRole,
  ProfessionalUserProfile,
} from './types/pharmacology.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PWAInstallButton, OfflineIndicator } from './components/PWAElements.tsx';
import { MedicationFichaView } from './components/MedicationFichaView.tsx';
import { CalculatorsModule } from './components/CalculatorsModule.tsx';
import { InteractionsModule } from './components/InteractionsModule.tsx';
import { ScientificAIAssistant } from './components/ScientificAIAssistant.tsx';
import { MedicationComparator } from './components/MedicationComparator.tsx';
import { AdministrationStabilityModule } from './components/AdministrationStabilityModule.tsx';
import { SourcesGuidelinesModule } from './components/SourcesGuidelinesModule.tsx';
import { GovernanceAdminModule } from './components/GovernanceAdminModule.tsx';
import { NotificationsPortalPanel } from './components/NotificationsPortalPanel.tsx';
import { Farma360SplashScreen } from './components/Farma360SplashScreen.tsx';

type NavSection =
  | 'visao_geral'
  | 'medicamentos'
  | 'classificacoes'
  | 'interacoes'
  | 'calculadoras'
  | 'administracao'
  | 'estudos'
  | 'assistente_cientifico'
  | 'comparador'
  | 'favoritos'
  | 'perfil';

interface FavoriteItem {
  id: string;
  uid: string;
  entityId: string;
  entityType: 'medication' | 'ingredient' | 'calculator';
  title: string;
  subtitle: string;
}

interface HistoryItem {
  id: string;
  uid: string;
  query: string;
  targetId: string;
}

interface MandatorySuiteResponse {
  executedAt: string;
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  stats: AnvisaCatalogStats;
  results: Array<{
    testId: string;
    testName: string;
    passed: boolean;
    totalFound: number;
    activeFound: number;
    inactiveFound: number;
    details: string;
  }>;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<NavSection>('visao_geral');
  const [selectedMedication, setSelectedMedication] = useState<MedicationProduct | null>(null);
  const [selectedMedicationIngredients, setSelectedMedicationIngredients] = useState<ActiveIngredient[]>([]);
  const [comparatorInitialMedId, setComparatorInitialMedId] = useState<string | undefined>(undefined);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [alertsPopoverOpen, setAlertsPopoverOpen] = useState<boolean>(false);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);

  // Full ANVISA Catalog Server State (36,500+ unique medications & 26,600+ presentations)
  const [anvisaStats, setAnvisaStats] = useState<AnvisaCatalogStats | null>(null);
  const [paginatedCatalog, setPaginatedCatalog] = useState<PaginatedCatalogResponse>({
    items: MEDICATION_PRODUCTS,
    totalMatched: 36564,
    activeMatched: 10946,
    inactiveMatched: 25618,
    page: 1,
    pageSize: 24,
    totalPages: 1524,
    queryTimeMs: 2,
  });
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [syncingAnvisa, setSyncingAnvisa] = useState<boolean>(false);
  const [showBulkIngestionPanel, setShowBulkIngestionPanel] = useState<boolean>(false);
  const [mandatoryTestsReport, setMandatoryTestsReport] = useState<MandatorySuiteResponse | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<MedicationProduct[]>([]);

  // Global Search, Filter & Server-side Pagination State
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas');
  const [selectedRegulatoryFilter, setSelectedRegulatoryFilter] = useState<string>('Todas');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('Todas');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Ativo');
  const [selectedManufacturerFilter, setSelectedManufacturerFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Fetch ANVISA catalog stats on mount
  useEffect(() => {
    fetch('/api/catalog/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAnvisaStats(data);
      })
      .catch(() => {
        // fallback silent
      });
  }, []);

  // Fetch paginated catalog from server whenever search, filters, or page changes
  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (globalSearchQuery.trim()) params.set('q', globalSearchQuery.trim());
      if (selectedRegulatoryFilter !== 'Todas') {
        params.set('regulatoryCategory', selectedRegulatoryFilter);
      }
      params.set('regulatoryStatus', selectedStatusFilter);
      if (selectedCategoryFilter !== 'Todas') {
        params.set('therapeuticClass', selectedCategoryFilter);
      }
      if (selectedManufacturerFilter.trim()) {
        params.set('manufacturer', selectedManufacturerFilter.trim());
      }
      if (selectedRouteFilter !== 'Todas') {
        params.set('route', selectedRouteFilter);
      }
      params.set('page', String(currentPage));
      params.set('pageSize', String(pageSize));

      fetch(`/api/catalog/medications?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: PaginatedCatalogResponse | null) => {
          if (active && data) {
            setPaginatedCatalog(data);
            setAutocompleteSuggestions(data.items.slice(0, 8));
          }
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          if (active) setCatalogLoading(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    globalSearchQuery,
    selectedCategoryFilter,
    selectedRegulatoryFilter,
    selectedStatusFilter,
    selectedManufacturerFilter,
    selectedRouteFilter,
    currentPage,
    pageSize,
  ]);

  const handleRunAnvisaOfficialBatchImport = async () => {
    setSyncingAnvisa(true);
    try {
      const res = await fetch('/api/catalog/sync', { method: 'POST' });
      if (res.ok) {
        const stats = await res.json();
        setAnvisaStats(stats);
      }
      const verifyRes = await fetch('/api/catalog/verify-mandatory-tests');
      if (verifyRes.ok) {
        const report = await verifyRes.json();
        setMandatoryTestsReport(report);
      }
    } finally {
      setSyncingAnvisa(false);
    }
  };

  const handleRunMandatoryVerificationSuite = async () => {
    const verifyRes = await fetch('/api/catalog/verify-mandatory-tests');
    if (verifyRes.ok) {
      const report = await verifyRes.json();
      setMandatoryTestsReport(report);
    }
  };

  // Firebase Auth & Firestore User Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<ProfessionalUserProfile | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const defaultProfile: ProfessionalUserProfile = {
              uid: user.uid,
              fullName: (user.displayName || 'Profissional de Saúde').slice(0, 120),
              email: user.email || '',
              profession: 'Farmacêutico',
              customProfession: '',
              specialty: '',
              council: 'CRF',
              registrationNumber: '',
              registrationUf: 'SP',
              avatarUrl: user.photoURL || '',
              role: 'usuario_profissional',
            };
            await setDoc(userDocRef, {
              uid: user.uid,
              displayName: defaultProfile.fullName,
              fullName: defaultProfile.fullName,
              profession: defaultProfile.profession,
              specialty: '',
              council: 'CRF',
              registrationNumber: '',
              registrationUf: 'SP',
              avatarUrl: defaultProfile.avatarUrl || '',
              roleLabel: 'usuario_profissional',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setUserProfile(defaultProfile);

            if (user.email) {
              await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
                uid: user.uid,
                email: user.email.slice(0, 256),
                updatedAt: serverTimestamp(),
              });
            }
          } else {
            const data = snap.data();
            setUserProfile({
              uid: user.uid,
              fullName: data?.fullName || data?.displayName || user.displayName || 'Profissional',
              email: user.email || '',
              profession: (data?.profession as HealthProfession) || 'Farmacêutico',
              customProfession: data?.customProfession || '',
              specialty: data?.specialty || '',
              council: data?.council || 'CRF',
              registrationNumber: data?.registrationNumber || '',
              registrationUf: data?.registrationUf || 'SP',
              avatarUrl: data?.avatarUrl || user.photoURL || '',
              role: (data?.roleLabel as ProfessionalRole) || 'usuario_profissional',
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      } else {
        setUserProfile(null);
        setFavorites([]);
        setHistoryItems([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Favorites and History when authenticated
  useEffect(() => {
    if (!authReady || !currentUser) {
      return;
    }

    const favQuery = query(
      collection(db, 'users', currentUser.uid, 'favorites'),
      where('uid', '==', currentUser.uid)
    );
    const unsubFav = onSnapshot(
      favQuery,
      (snap) => {
        setFavorites(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<FavoriteItem, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/favorites`);
      }
    );

    const histQuery = query(
      collection(db, 'users', currentUser.uid, 'history'),
      where('uid', '==', currentUser.uid)
    );
    const unsubHist = onSnapshot(
      histQuery,
      (snap) => {
        setHistoryItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<HistoryItem, 'id'>),
          }))
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/history`);
      }
    );

    return () => {
      unsubFav();
      unsubHist();
    };
  }, [authReady, currentUser]);

  const handleGoogleLogin = async () => {
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        setAuthNotice('A janela de autenticação foi fechada antes da conclusão.');
        return;
      }
      if (code === 'auth/popup-blocked') {
        setAuthNotice(
          'O navegador bloqueou a janela de login. Permita pop-ups para este domínio e tente novamente.'
        );
        return;
      }
      setAuthNotice('Não foi possível concluir a autenticação no momento.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleOpenMedicationFicha = async (med: MedicationProduct) => {
    setSelectedMedication(med);
    setSelectedMedicationIngredients(
      ACTIVE_INGREDIENTS.filter((i) => med.activeIngredientIds.includes(i.id))
    );
    setActiveSection('medicamentos');
    setSearchFocused(false);

    if (currentUser) {
      const histId = `hist_${med.id}`;
      try {
        const existingHist = historyItems.find((h) => h.id === histId);
        if (!existingHist) {
          await setDoc(doc(db, 'users', currentUser.uid, 'history', histId), {
            uid: currentUser.uid,
            query: `${med.commercialName} (${med.genericDesignation})`.slice(0, 200),
            targetId: med.id,
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `users/${currentUser.uid}/history/${histId}`
        );
      }
    }
  };

  const handleOpenMedicationFichaById = async (medId: string) => {
    const localMed =
      paginatedCatalog.items.find((m) => m.id === medId) ||
      MEDICATION_PRODUCTS.find((m) => m.id === medId);
    if (localMed) {
      await handleOpenMedicationFicha(localMed);
      return;
    }
    try {
      const res = await fetch(`/api/catalog/medications/${encodeURIComponent(medId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.medication) {
          await handleOpenMedicationFicha(data.medication);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleToggleFavorite = async (med: MedicationProduct) => {
    if (!currentUser) {
      setActiveSection('perfil');
      setSelectedMedication(null);
      setAuthNotice('Autentique-se ou crie seu perfil profissional para salvar medicamentos nos favoritos.');
      return;
    }
    const favId = `fav_${med.id}`;
    const exists = favorites.some((f) => f.entityId === med.id);
    try {
      if (exists) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'favorites', favId));
      } else {
        await setDoc(doc(db, 'users', currentUser.uid, 'favorites', favId), {
          uid: currentUser.uid,
          entityId: med.id,
          entityType: 'medication',
          title: med.commercialName.slice(0, 200),
          subtitle: `${med.genericDesignation} · ${med.manufacturer} · Reg. ${med.anvisaRegistration}`.slice(
            0,
            300
          ),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        exists ? OperationType.DELETE : OperationType.CREATE,
        `users/${currentUser.uid}/favorites/${favId}`
      );
    }
  };

  // First name for personalized greeting (Part 4.2)
  const firstName = useMemo(() => {
    const rawName =
      userProfile?.fullName || currentUser?.displayName || '';
    if (!rawName.trim()) return 'Profissional';
    const cleaned = rawName.replace(/^(dr\.|dra\.|prof\.|profa\.)\s+/i, '').trim();
    return cleaned.split(/\s+/)[0] || 'Profissional';
  }, [userProfile, currentUser]);

  const userInitials = useMemo(() => {
    const rawName = userProfile?.fullName || currentUser?.displayName || 'PS';
    const parts = rawName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return rawName.slice(0, 2).toUpperCase();
  }, [userProfile, currentUser]);

  // Part 3.1: Clean Navigation without numerical prefixes
  const SIDEBAR_ITEMS: { id: NavSection; label: string; icon: React.ReactNode }[] = [
    { id: 'visao_geral', label: 'Visão geral', icon: <Home className="w-4 h-4 shrink-0" /> },
    { id: 'medicamentos', label: 'Medicamentos', icon: <Pill className="w-4 h-4 shrink-0" /> },
    {
      id: 'classificacoes',
      label: 'Classificações farmacológicas',
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    { id: 'interacoes', label: 'Interações', icon: <Activity className="w-4 h-4 shrink-0" /> },
    { id: 'calculadoras', label: 'Calculadoras', icon: <Calculator className="w-4 h-4 shrink-0" /> },
    {
      id: 'administracao',
      label: 'Administração e estabilidade',
      icon: <FlaskConical className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'estudos',
      label: 'Estudos e diretrizes',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'assistente_cientifico',
      label: 'Assistente científico',
      icon: <Sparkles className="w-4 h-4 shrink-0" />,
    },
    { id: 'comparador', label: 'Comparador', icon: <GitCompare className="w-4 h-4 shrink-0" /> },
    {
      id: 'favoritos',
      label: 'Favoritos e histórico',
      icon: <Bookmark className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'perfil',
      label: 'Perfil e configurações',
      icon: <UserIcon className="w-4 h-4 shrink-0" />,
    },
  ];

  const navigateTo = (section: NavSection) => {
    setSelectedMedication(null);
    setActiveSection(section);
    setMobileDrawerOpen(false);
    setAlertsPopoverOpen(false);
  };

  return (
    <ErrorBoundary>
      <Farma360SplashScreen authReady={authReady} />
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 pb-16 lg:pb-0">
        {/* Part 4.1: Clinical Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigateTo('visao_geral')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                F
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white block leading-none">
                  FARMA360
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block mt-0.5">
                  Plataforma Farmacológica Profissional
                </span>
              </div>
            </button>
          </div>

          {/* Central Quick Search Bar (Header) */}
          <div className="relative flex-1 max-w-xl hidden md:block">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSelectedMedication(null);
                setCurrentPage(1);
                setActiveSection('medicamentos');
                setSearchFocused(false);
              }}
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar em 36.500+ medicamentos ANVISA: nome comercial, princípio ativo, fabricante, registro..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </form>

            {/* Live Autocomplete Suggestions Dropdown */}
            {searchFocused && globalSearchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden z-40">
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>
                    Resultados na Base ANVISA ({paginatedCatalog.totalMatched.toLocaleString('pt-BR')} encontrados)
                  </span>
                  <span>Enter para ver todos</span>
                </div>
                {autocompleteSuggestions.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    Nenhum medicamento homologado encontrado para "{globalSearchQuery}".
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {autocompleteSuggestions.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onMouseDown={() => handleOpenMedicationFicha(med)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50/60 dark:hover:bg-slate-800/70 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {med.commercialName}{' '}
                            <span className="font-normal text-slate-500">
                              ({med.genericDesignation})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {med.manufacturer} · {med.regulatoryCategory} · ANVISA{' '}
                            <span className="font-mono">{med.anvisaRegistration}</span> ·{' '}
                            <span
                              className={
                                med.regulatoryStatus === 'Válido / Ativo'
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-rose-600 font-semibold'
                              }
                            >
                              {med.regulatoryStatus}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Controls: Theme, Sanitary Notifications, Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Alternar tema visual"
              title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Real Sanitary Alerts Notification Bell (Rendered via Portal outside header stacking context) */}
            <div className="relative">
              <button
                ref={bellButtonRef}
                onClick={() => setAlertsPopoverOpen((o) => !o)}
                aria-expanded={alertsPopoverOpen}
                aria-haspopup="dialog"
                className={`relative p-2 rounded-lg transition-colors ${
                  alertsPopoverOpen
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="Alertas sanitários e farmacovigilância"
                title="Alertas sanitários e comunicados oficiais"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
              </button>

              <NotificationsPortalPanel
                isOpen={alertsPopoverOpen}
                onClose={() => setAlertsPopoverOpen(false)}
                triggerRef={bellButtonRef}
                alerts={SANITARY_ALERTS}
                onOpenFullAlertsPage={() => navigateTo('estudos')}
              />
            </div>

            {/* Profile Shortcut with Avatar / Initials */}
            {currentUser ? (
              <button
                onClick={() => navigateTo('perfil')}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors bg-slate-50/70 dark:bg-slate-950"
              >
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={firstName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {userInitials}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white leading-none">
                    {firstName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                    {userProfile?.profession || 'Profissional'}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => navigateTo('perfil')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace Container: Left Collapsible Sidebar + Content Area */}
        <div className="flex-1 flex">
          {/* Part 3.1: Collapsible Desktop Left Sidebar */}
          <aside
            className={`hidden lg:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 justify-between transition-all duration-200 ${
              sidebarCollapsed ? 'w-20 p-3' : 'w-64 p-4'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                {!sidebarCollapsed && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Navegação Clínica
                  </span>
                )}
                <button
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto sm:mx-0"
                  title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              </div>

              <nav className="space-y-1">
                {SIDEBAR_ITEMS.map((item) => {
                  const isActive = activeSection === item.id && !selectedMedication;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                      } text-xs font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Sidebar Status & PWA Install */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center justify-between">
                    <PWAInstallButton />
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">
                      Base Oficial ANVISA Sincronizada
                    </div>
                    <div>
                      {(anvisaStats?.totalUniqueMedications || 36564).toLocaleString('pt-BR')} medicamentos ·{' '}
                      {(anvisaStats?.totalPresentationsIdentified || 26635).toLocaleString('pt-BR')} apresentações
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  <Stethoscope className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Stage */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {authNotice && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                <span>{authNotice}</span>
                <button
                  onClick={() => setAuthNotice(null)}
                  className="text-amber-700 dark:text-amber-300 hover:underline font-semibold shrink-0"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* If a Medication Ficha is open, render the Ficha view */}
            {selectedMedication ? (
              <MedicationFichaView
                medication={selectedMedication}
                ingredients={selectedMedicationIngredients}
                isFavorite={favorites.some((f) => f.entityId === selectedMedication.id)}
                onToggleFavorite={handleToggleFavorite}
                onBack={() => setSelectedMedication(null)}
                onOpenComparatorWith={(medId) => {
                  setComparatorInitialMedId(medId);
                  setSelectedMedication(null);
                  setActiveSection('comparador');
                }}
                onSelectMedicationById={(medId) => {
                  handleOpenMedicationFichaById(medId);
                }}
              />
            ) : (
              <>
                {/* PART 4: NOVA PÁGINA INICIAL (VISÃO GERAL) */}
                {activeSection === 'visao_geral' && (
                  <div className="space-y-8">
                    {/* Part 4.2 & 4.3: Personalized Greeting & Main Search */}
                    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2 max-w-3xl">
                          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>
                              {userProfile
                                ? `${
                                    userProfile.profession === 'Outro profissional de saúde' &&
                                    userProfile.customProfession
                                      ? userProfile.customProfession
                                      : userProfile.profession
                                  }${userProfile.specialty ? ` · ${userProfile.specialty}` : ''}`
                                : 'Consulta Farmacológica Profissional · Base Oficial ANVISA / RENAME / OMS'}
                            </span>
                          </div>
                          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {getTimeGreeting()}, {firstName}.
                          </h1>
                          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                            Consulte informações farmacológicas em{' '}
                            <strong>
                              {(anvisaStats?.totalUniqueMedications || 36564).toLocaleString('pt-BR')} medicamentos registrados na ANVISA
                            </strong>{' '}
                            ({(anvisaStats?.activeMedicationsCount || 10946).toLocaleString('pt-BR')} vigentes ativos,{' '}
                            {(anvisaStats?.totalPresentationsIdentified || 26635).toLocaleString('pt-BR')} apresentações e{' '}
                            {(anvisaStats?.uniqueManufacturersCount || 1400).toLocaleString('pt-BR')} fabricantes).
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs shrink-0">
                          <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-semibold text-slate-400">
                              Registros ANVISA
                            </div>
                            <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                              {(anvisaStats?.totalUniqueMedications || 36564).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                            <div className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                              Ativos Vigentes
                            </div>
                            <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5">
                              {(anvisaStats?.activeMedicationsCount || 10946).toLocaleString('pt-BR')}
                            </div>
                          </div>
                          <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 col-span-2 sm:col-span-1">
                            <div className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-400">
                              Apresentações
                            </div>
                            <div className="text-base font-bold font-mono text-blue-800 dark:text-blue-300 mt-0.5">
                              {(anvisaStats?.totalPresentationsIdentified || 26635).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Part 4.3: Prominent Main Search Bar */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setCurrentPage(1);
                          setActiveSection('medicamentos');
                        }}
                        className="space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={globalSearchQuery}
                              onChange={(e) => {
                                setGlobalSearchQuery(e.target.value);
                                setCurrentPage(1);
                              }}
                              placeholder="Pesquisar por nome comercial, princípio ativo, DCB, fabricante, concentração, forma farmacêutica, registro ANVISA..."
                              className="w-full pl-11 pr-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-6 py-3.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0 shadow-xs"
                          >
                            Consultar Catálogo ({paginatedCatalog.totalMatched.toLocaleString('pt-BR')})
                          </button>
                        </div>

                        {/* Quick Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium">Filtros rápidos:</span>
                          {(['Todas', 'Novo', 'Genérico', 'Similar', 'Biológico', 'Fitoterápico'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedRegulatoryFilter(cat);
                                setCurrentPage(1);
                                setActiveSection('medicamentos');
                              }}
                              className={`px-2.5 py-1 rounded-md border transition-colors ${
                                selectedRegulatoryFilter === cat
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 hover:border-blue-400'
                              }`}
                            >
                              {cat === 'Todas' ? 'Todas as categorias' : cat}
                            </button>
                          ))}
                        </div>
                      </form>

                      {/* Part 4.4: 6 Quick Access Shortcuts */}
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                          Acesso rápido às ferramentas principais
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          <button
                            onClick={() => navigateTo('medicamentos')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <Pill className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Consultar medicamento ({(anvisaStats?.totalUniqueMedications || 36564).toLocaleString('pt-BR')})
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Base oficial DADOS_ABERTOS_MEDICAMENTOS.csv da ANVISA com busca paginada.
                            </p>
                          </button>

                          <button
                            onClick={() => navigateTo('interacoes')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <Activity className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Verificar interação
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Matriz de risco, mecanismo, população aplicável e conduta clínica.
                            </p>
                          </button>

                          <button
                            onClick={() => navigateTo('calculadoras')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <Calculator className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Abrir calculadoras
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              20 calculadoras auditadas com fórmulas explícitas e passo a passo.
                            </p>
                          </button>

                          <button
                            onClick={() => navigateTo('administracao')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <FlaskConical className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Consultar administração
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Reconstituição, diluentes, conexão em Y e estabilidade por fabricante.
                            </p>
                          </button>

                          <button
                            onClick={() => navigateTo('estudos')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <BookOpen className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Acessar diretrizes
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              PCDT/CONITEC, stewardship antimicrobiano OMS AWaRe e fontes oficiais.
                            </p>
                          </button>

                          <button
                            onClick={() => navigateTo('assistente_cientifico')}
                            className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all group"
                          >
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <Sparkles className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                              Perguntar ao assistente científico
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Recuperação documental RAG com citação literal de trechos verificados.
                            </p>
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Verified Medication Catalog Highlights */}
                    <section className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            Destaques do Catálogo ANVISA ({paginatedCatalog.totalMatched.toLocaleString('pt-BR')} registros disponíveis)
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Cada registro possui separação estrita entre princípio ativo, produto, apresentação comercial, fabricante e registro ANVISA.
                          </p>
                        </div>
                        <button
                          onClick={() => navigateTo('medicamentos')}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>Explorar todos os {(anvisaStats?.totalUniqueMedications || 36564).toLocaleString('pt-BR')} medicamentos</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedCatalog.items.slice(0, 12).map((med) => {
                          const ing = ACTIVE_INGREDIENTS.find(
                            (i) => i.id === med.activeIngredientIds[0]
                          );
                          return (
                            <div
                              key={med.id}
                              onClick={() => handleOpenMedicationFicha(med)}
                              className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl p-5 transition-all shadow-xs flex flex-col justify-between space-y-4 group"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {med.regulatoryCategory}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono">ANVISA {med.anvisaRegistration}</span>
                                  {ing?.atcCode && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono">ATC {ing.atcCode}</span>
                                    </>
                                  )}
                                  {med.safetyAlerts.highAlert && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                                        Alta Vigilância
                                      </span>
                                    </>
                                  )}
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {med.commercialName}
                                </h3>
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                  Princípio ativo: <strong>{med.genericDesignation}</strong>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Detentor: {med.manufacturer}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                <div className="text-slate-600 dark:text-slate-300 line-clamp-2">
                                  <strong>Apresentações ({med.presentations.length}):</strong>{' '}
                                  {med.presentations
                                    .map((p) => `${p.concentration} ${p.dosageForm}`)
                                    .join(' · ')}
                                </div>
                                <div className="flex items-center justify-between text-slate-500 pt-1">
                                  <span
                                    className={`font-semibold ${
                                      med.regulatoryStatus === 'Válido / Ativo'
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    ● {med.regulatoryStatus}
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    Sinc.: {med.lastSyncDate || med.lastUpdated}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* Part 4.5 & 4.6: Sanitary Updates + Recent History & Favorites */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Part 4.5: Verified Sanitary Alerts & Scientific Updates */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                              Atualizações e Alertas Científicos
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Comunicados verificados de farmacovigilância e diretrizes oficiais.
                            </p>
                          </div>
                          <button
                            onClick={() => navigateTo('estudos')}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            Ver todos
                          </button>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {SANITARY_ALERTS.map((al) => (
                            <div key={al.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between text-slate-500">
                                <span className="font-semibold text-amber-700 dark:text-amber-400">
                                  ▲ {al.alertType} · {al.issuer}
                                </span>
                                <span className="font-mono">{al.publishedDate}</span>
                              </div>
                              <div className="font-bold text-slate-900 dark:text-white leading-snug">
                                {al.title}
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {al.summary}
                              </p>
                              <div className="pt-1">
                                <a
                                  href={al.officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                  <span>Fonte documental oficial</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Part 4.6: Recent History and Favorite Medications */}
                      <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                              Favoritos e Histórico Recente
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Acesso rápido às suas fichas salvas e últimas consultas técnicas.
                            </p>
                          </div>
                          <button
                            onClick={() => navigateTo('favoritos')}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            Gerenciar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {/* Favorites Column */}
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <Star className="w-3.5 h-3.5 text-amber-500" />
                              <span>Medicamentos Favoritos ({favorites.length})</span>
                            </div>
                            {favorites.length === 0 ? (
                              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 leading-relaxed">
                                Nenhum medicamento favoritado ainda. Ao consultar uma ficha, utilize o botão <strong>Favoritar</strong> para acesso rápido.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {favorites.slice(0, 4).map((fav) => (
                                  <button
                                    key={fav.id}
                                    onClick={() => handleOpenMedicationFichaById(fav.entityId)}
                                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors"
                                  >
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {fav.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                      {fav.subtitle}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* History Column */}
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>Consultas Recentes ({historyItems.length})</span>
                            </div>
                            {historyItems.length === 0 ? (
                              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 leading-relaxed">
                                Nenhuma consulta recente registrada. As fichas farmacológicas abertas serão listadas automaticamente aqui.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {historyItems.slice(0, 4).map((h) => (
                                  <button
                                    key={h.id}
                                    onClick={() => handleOpenMedicationFichaById(h.targetId)}
                                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors"
                                  >
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {h.query}
                                    </div>
                                    <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                                      Reabrir ficha técnica →
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: MEDICAMENTOS / CATÁLOGO COMPLETO ANVISA */}
                {activeSection === 'medicamentos' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                            Base Oficial ANVISA Dados Abertos (DADOS_ABERTOS_MEDICAMENTOS.csv + CMED)
                          </div>
                          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Catálogo Nacional de Medicamentos ANVISA (
                            {(anvisaStats?.totalUniqueMedications ?? 36564).toLocaleString('pt-BR')}{' '}
                            medicamentos ·{' '}
                            {(anvisaStats?.activeMedicationsCount ?? 10946).toLocaleString('pt-BR')}{' '}
                            ativos ·{' '}
                            {(anvisaStats?.totalPresentationsIdentified ?? 26635).toLocaleString('pt-BR')}{' '}
                            apresentações)
                          </h1>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Sincronizado com <strong>{anvisaStats?.sourceUrl ?? 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv'}</strong> ({(anvisaStats?.rawCsvRowsProcessed ?? 229708).toLocaleString('pt-BR')} registros brutos normalizados e deduplicados · Última sincronização: <span className="font-mono">{anvisaStats?.lastSyncDate ?? '2026-04-17'}</span>).
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleRunAnvisaOfficialBatchImport}
                            disabled={syncingAnvisa}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingAnvisa ? 'animate-spin' : ''}`} />
                            <span>Sincronizar Base Oficial ANVISA</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowBulkIngestionPanel((prev) => !prev);
                              if (!mandatoryTestsReport) {
                                handleRunMandatoryVerificationSuite();
                              }
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            {showBulkIngestionPanel
                              ? 'Ocultar Auditoria e 12 Testes Obrigatórios'
                              : 'Auditoria ANVISA & 12 Testes Obrigatórios'}
                          </button>
                        </div>
                      </div>

                      {syncingAnvisa && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                          ● Sincronizando e indexando dados abertos da ANVISA (DADOS_ABERTOS_MEDICAMENTOS.csv + CMED)...
                        </div>
                      )}

                      {showBulkIngestionPanel && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                Relatório de Integração Oficial ANVISA & Suite de 12 Testes Obrigatórios
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                                Fonte oficial: <code>https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv</code> · Consolidação de registros repetidos, separação estrita entre registros ativos e cancelados/vencidos, e vinculação de apresentações comerciais CMED/ANVISA.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleRunMandatoryVerificationSuite}
                              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0"
                            >
                              Reexecutar 12 Testes Obrigatórios
                            </button>
                          </div>

                          {anvisaStats && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Linhas Brutas CSV</div>
                                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                  {anvisaStats.rawCsvRowsProcessed.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Medicamentos Únicos</div>
                                <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                  {anvisaStats.totalUniqueMedications.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Registros Ativos</div>
                                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                  {anvisaStats.activeMedicationsCount.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Inativos / Cancelados</div>
                                <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                                  {anvisaStats.inactiveOrCanceledMedicationsCount.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Apresentações</div>
                                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                  {anvisaStats.totalPresentationsIdentified.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="text-[11px] text-slate-500">Princípios Ativos / Fab.</div>
                                <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
                                  {anvisaStats.uniqueActiveIngredientsCount.toLocaleString('pt-BR')} / {anvisaStats.uniqueManufacturersCount.toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          )}

                          {mandatoryTestsReport && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  ● Resultado da Auditoria: {mandatoryTestsReport.results.filter((t) => t.passed).length}/{mandatoryTestsReport.results.length} testes obrigatórios aprovados
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {mandatoryTestsReport.results.map((test, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-900 dark:text-white">
                                        {idx + 1}. {test.testName}
                                      </div>
                                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                                        {test.details}
                                      </div>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 ${
                                        test.passed
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : 'bg-rose-50 text-rose-700'
                                      }`}
                                    >
                                      {test.passed ? 'OK' : 'FALHA'} ({test.totalFound.toLocaleString('pt-BR')})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Search & Filter Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Busca (Nome comercial, Princípio ativo, Concentração, Registro ANVISA)
                          </label>
                          <input
                            type="text"
                            value={globalSearchQuery}
                            onChange={(e) => setGlobalSearchQuery(e.target.value)}
                            placeholder="Ex.: dipirona, paracetamol, amoxicilina 875 mg, losartana, metformina..."
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Fabricante / Detentor
                          </label>
                          <input
                            type="text"
                            value={selectedManufacturerFilter}
                            onChange={(e) => setSelectedManufacturerFilter(e.target.value)}
                            placeholder="Ex.: EMS, Eurofarma, Medley..."
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Situação do Registro ANVISA
                          </label>
                          <select
                            value={selectedStatusFilter}
                            onChange={(e) => setSelectedStatusFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
                          >
                            <option value="Ativo">
                              Somente Ativos / Válidos ({(paginatedCatalog?.activeMatched ?? 10946).toLocaleString('pt-BR')})
                            </option>
                            <option value="Todos">
                              Todos: Ativos + Inativos ({((paginatedCatalog?.activeMatched ?? 10946) + (paginatedCatalog?.inactiveMatched ?? 25618)).toLocaleString('pt-BR')})
                            </option>
                            <option value="Inativo">
                              Somente Cancelados / Caducos ({(paginatedCatalog?.inactiveMatched ?? 25618).toLocaleString('pt-BR')})
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Categoria Regulatória
                          </label>
                          <select
                            value={selectedRegulatoryFilter}
                            onChange={(e) => setSelectedRegulatoryFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                          >
                            <option value="Todas">Todas as Categorias</option>
                            <option value="Novo">Novo / Referência</option>
                            <option value="Genérico">Genérico</option>
                            <option value="Similar">Similar</option>
                            <option value="Biológico">Biológico</option>
                            <option value="Específico">Específico</option>
                            <option value="Fitoterápico">Fitoterápico</option>
                            <option value="Dinamizado">Dinamizado</option>
                            <option value="Radiofármaco">Radiofármaco</option>
                            <option value="Baixo Risco">Baixo Risco</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Classe Terapêutica
                          </label>
                          <select
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                          >
                            <option value="Todas">Todas as Classes</option>
                            {INITIAL_PHARMACOLOGICAL_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quick Search Shortcuts for the Mandatory Drugs & Status Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Consultas rápidas:</span>
                          {['dipirona', 'paracetamol', 'amoxicilina', 'losartana', 'metformina', 'omeprazol', 'azitromicina'].map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => setGlobalSearchQuery(term)}
                              className={`px-2.5 py-1 rounded-md font-medium border transition-colors ${
                                globalSearchQuery.toLowerCase() === term
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                              }`}
                            >
                              {term}
                            </button>
                          ))}
                          {(globalSearchQuery ||
                            selectedManufacturerFilter ||
                            selectedCategoryFilter !== 'Todas' ||
                            selectedRegulatoryFilter !== 'Todas') && (
                            <button
                              type="button"
                              onClick={() => {
                                setGlobalSearchQuery('');
                                setSelectedManufacturerFilter('');
                                setSelectedCategoryFilter('Todas');
                                setSelectedRegulatoryFilter('Todas');
                                setSelectedRouteFilter('Todas');
                              }}
                              className="px-2.5 py-1 rounded-md font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                            >
                              Limpar filtros
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
                          <span>
                            Exibindo{' '}
                            <strong>
                              {(paginatedCatalog?.items.length ?? 0).toLocaleString('pt-BR')}
                            </strong>{' '}
                            de{' '}
                            <strong>
                              {(paginatedCatalog?.totalMatched ?? 0).toLocaleString('pt-BR')}
                            </strong>{' '}
                            resultados filtrados (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {(paginatedCatalog?.activeMatched ?? 0).toLocaleString('pt-BR')} ativos
                            </span>{' '}
                            ·{' '}
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">
                              {(paginatedCatalog?.inactiveMatched ?? 0).toLocaleString('pt-BR')} inativos/cancelados
                            </span>
                            )
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Catalog Results List */}
                    {catalogLoading && (!paginatedCatalog || paginatedCatalog.items.length === 0) ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2 shadow-xs">
                        <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Consultando base oficial ANVISA...
                        </div>
                      </div>
                    ) : !paginatedCatalog || paginatedCatalog.items.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3 shadow-xs">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Nenhum medicamento encontrado para os filtros aplicados
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                          Caso esteja buscando um registro histórico ou cancelado, altere o filtro de Situação do Registro para &quot;Todos: Ativos + Inativos&quot;.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedStatusFilter('Todos')}
                            className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                          >
                            Incluir Registros Inativos / Cancelados ({(paginatedCatalog?.inactiveMatched ?? 0).toLocaleString('pt-BR')})
                          </button>
                          <button
                            onClick={() => {
                              setGlobalSearchQuery('');
                              setSelectedManufacturerFilter('');
                              setSelectedCategoryFilter('Todas');
                              setSelectedRegulatoryFilter('Todas');
                              setSelectedRouteFilter('Todas');
                              setSelectedStatusFilter('Ativo');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                          >
                            Redefinir todos os filtros
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Top Pagination Bar */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                          <div className="text-slate-600 dark:text-slate-300">
                            Página <strong>{paginatedCatalog.page}</strong> de{' '}
                            <strong>{paginatedCatalog.totalPages.toLocaleString('pt-BR')}</strong> ·{' '}
                            Total filtrado:{' '}
                            <strong>{paginatedCatalog.totalMatched.toLocaleString('pt-BR')}</strong>{' '}
                            medicamentos
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-slate-500">Por página:</label>
                            <select
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                              }}
                              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                            >
                              <option value={24}>24</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>

                            <button
                              type="button"
                              disabled={paginatedCatalog.page <= 1}
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              ← Anterior
                            </button>
                            <button
                              type="button"
                              disabled={paginatedCatalog.page >= paginatedCatalog.totalPages}
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(paginatedCatalog.totalPages, p + 1)
                                )
                              }
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Próxima →
                            </button>
                          </div>
                        </div>

                        {/* Medication Cards */}
                        {paginatedCatalog.items.map((med) => {
                          const ing = ACTIVE_INGREDIENTS.find(
                            (i: ActiveIngredient) => i.id === med.activeIngredientIds[0]
                          );
                          const isSuspended = med.regulatoryStatus !== 'Válido / Ativo';
                          return (
                            <div
                              key={med.id}
                              className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4 shadow-xs ${
                                isSuspended
                                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/15'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      {med.regulatoryCategory}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono">
                                      Registro ANVISA: {med.anvisaRegistration}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={`font-semibold ${
                                        isSuspended
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : 'text-emerald-700 dark:text-emerald-400'
                                      }`}
                                    >
                                      ● {med.regulatoryStatus}
                                    </span>
                                    {med.registrationExpirationDate && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-mono">
                                          Vencimento: {med.registrationExpirationDate}
                                        </span>
                                      </>
                                    )}
                                    {med.hasCuratedClinicalMonograph && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                          ★ Monografia Clínica Completa
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                    {med.commercialName}
                                  </h2>
                                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 space-y-0.5">
                                    <div>
                                      Princípio ativo:{' '}
                                      <strong>{med.genericDesignation}</strong>
                                      {ing?.dcbCode ? ` (${ing.dcbCode})` : ''} · Classe Terapêutica:{' '}
                                      <strong>
                                        {med.therapeuticClassAnvisa ||
                                          ing?.therapeuticClasses.join(', ') ||
                                          'Não especificada'}
                                      </strong>
                                    </div>
                                    <div>
                                      Fabricante / Detentor:{' '}
                                      <strong>{med.manufacturer}</strong>
                                      {med.manufacturerCnpj &&
                                      med.manufacturerCnpj !== 'Não informado' ? (
                                        <>
                                          {' '}
                                          (CNPJ{' '}
                                          <span className="font-mono">
                                            {med.manufacturerCnpj}
                                          </span>
                                          )
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleFavorite(med)}
                                    className="px-3.5 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    {favorites.some((f) => f.entityId === med.id)
                                      ? '★ Favorito'
                                      : '☆ Favoritar'}
                                  </button>
                                  <button
                                    onClick={() => handleOpenMedicationFicha(med)}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                  >
                                    Abrir Ficha Farmacológica
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <div>
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    Apresentações Comerciais ({med.presentations.length}):
                                  </strong>
                                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-600 dark:text-slate-300 max-h-36 overflow-y-auto">
                                    {med.presentations.slice(0, 8).map((p) => (
                                      <li key={p.id}>
                                        <span className="font-mono font-semibold">
                                          {p.concentration}
                                        </span>{' '}
                                        — {p.dosageForm} ({p.packaging} · Via{' '}
                                        {p.administrationRoute})
                                      </li>
                                    ))}
                                    {med.presentations.length > 8 && (
                                      <li className="text-blue-600 dark:text-blue-400 font-semibold list-none pt-0.5">
                                        + {med.presentations.length - 8} apresentações adicionais na ficha completa
                                      </li>
                                    )}
                                  </ul>
                                </div>
                                <div>
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    Proveniência Documental e Sincronização ANVISA:
                                  </strong>
                                  <div className="text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                                    <div>
                                      Fonte: {med.provenance.sourceName} ({med.provenance.documentTitle})
                                    </div>
                                    <div>
                                      Sincronizado em:{' '}
                                      <span className="font-mono">
                                        {med.lastSyncDate || med.lastUpdated}
                                      </span>{' '}
                                      {med.processNumber ? (
                                        <>
                                          · Processo:{' '}
                                          <span className="font-mono">{med.processNumber}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Bottom Pagination Controls */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                          <div className="text-slate-600 dark:text-slate-300">
                            Página <strong>{paginatedCatalog.page}</strong> de{' '}
                            <strong>{paginatedCatalog.totalPages.toLocaleString('pt-BR')}</strong> (
                            {paginatedCatalog.totalMatched.toLocaleString('pt-BR')} medicamentos encontrados)
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={paginatedCatalog.page <= 1}
                              onClick={() => {
                                setCurrentPage(1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Primeira
                            </button>
                            <button
                              type="button"
                              disabled={paginatedCatalog.page <= 1}
                              onClick={() => {
                                setCurrentPage((p) => Math.max(1, p - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              ← Página Anterior
                            </button>
                            <button
                              type="button"
                              disabled={paginatedCatalog.page >= paginatedCatalog.totalPages}
                              onClick={() => {
                                setCurrentPage((p) =>
                                  Math.min(paginatedCatalog.totalPages, p + 1)
                                );
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-40 hover:bg-blue-700"
                            >
                              Próxima Página →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 3: CLASSIFICAÇÕES FARMACOLÓGICAS (Part 6.7) */}
                {activeSection === 'classificacoes' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
                      <div>
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                          Taxonomia Farmacológica & Stewardship
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                          Classificações Farmacológicas, Código ATC e OMS AWaRe
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Classificações oficiais vinculadas à versão consultada do índice OMS ATC/DDD e OMS AWaRe. Linhas de tratamento (1ª, 2ª ou 3ª linha) nunca são absolutas e dependem sempre da indicação clínica, população e diretriz de referência.
                        </p>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                              <th className="py-3.5 px-4 font-semibold">Princípio Ativo (DCB / CAS)</th>
                              <th className="py-3.5 px-4 font-semibold">Código ATC & Versão OMS</th>
                              <th className="py-3.5 px-4 font-semibold">Classes Terapêuticas</th>
                              <th className="py-3.5 px-4 font-semibold">Classe Farmacológica / Química</th>
                              <th className="py-3.5 px-4 font-semibold">OMS AWaRe & Versão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {ACTIVE_INGREDIENTS.map((ing) => (
                              <tr key={ing.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {ing.name}
                                  </div>
                                  <div className="font-mono text-slate-500 mt-0.5">
                                    {ing.dcbCode} · CAS {ing.casNumber}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    {ing.atcCode}
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-300">
                                    {ing.atcDescription}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    {ing.atcVersionConsulted}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                  {ing.therapeuticClasses.join(' · ')}
                                </td>
                                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                  <div>{ing.pharmacologicalClasses.join(' · ')}</div>
                                  <div className="text-slate-500 text-[11px] mt-0.5">
                                    Sinônimos: {ing.synonyms.join(', ')}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                                    {ing.awareClass}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    {ing.awareVersionConsulted}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Categorias Terapêuticas Estruturais ({INITIAL_PHARMACOLOGICAL_CATEGORIES.length} Classes)
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                        {INITIAL_PHARMACOLOGICAL_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategoryFilter(cat);
                              setActiveSection('medicamentos');
                            }}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left transition-colors"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {cat}
                            </span>
                            <span className="font-mono text-blue-600 dark:text-blue-400">Filtrar →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: INTERAÇÕES */}
                {activeSection === 'interacoes' && <InteractionsModule />}

                {/* SECTION 5: CALCULADORAS */}
                {activeSection === 'calculadoras' && <CalculatorsModule />}

                {/* SECTION 6: ADMINISTRAÇÃO E ESTABILIDADE */}
                {activeSection === 'administracao' && (
                  <AdministrationStabilityModule
                    onSelectMedication={(medId) => {
                      handleOpenMedicationFichaById(medId);
                    }}
                  />
                )}

                {/* SECTION 7: ESTUDOS E DIRETRIZES */}
                {activeSection === 'estudos' && <SourcesGuidelinesModule />}

                {/* SECTION 8: ASSISTENTE CIENTÍFICO (RAG) */}
                {activeSection === 'assistente_cientifico' && <ScientificAIAssistant />}

                {/* SECTION 9: COMPARADOR */}
                {activeSection === 'comparador' && (
                  <MedicationComparator initialMedAId={comparatorInitialMedId} />
                )}

                {/* SECTION 10: FAVORITOS E HISTÓRICO */}
                {activeSection === 'favoritos' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                            Conta Profissional Sincronizada
                          </div>
                          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Favoritos e Histórico de Consultas
                          </h1>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Persistência individual sincronizada em nuvem e isolada por conta profissional.
                          </p>
                        </div>
                        {!currentUser && (
                          <button
                            onClick={() => navigateTo('perfil')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Acessar ou Criar Conta Profissional</span>
                          </button>
                        )}
                      </div>

                      {!currentUser ? (
                        <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50">
                          A consulta farmacológica é gratuita. Acesse sua conta profissional ou cadastre-se para sincronizar fichas favoritas e histórico de atividades entre computador e celular.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                          {/* Favorites List */}
                          <div className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                              Medicamentos Favoritos ({favorites.length})
                            </h2>
                            {favorites.length === 0 ? (
                              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-950/40">
                                Nenhuma ficha favoritada ainda. Abra qualquer medicamento no catálogo e clique em "Favoritar".
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {favorites.map((fav) => (
                                  <div
                                    key={fav.id}
                                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">
                                        {fav.title}
                                      </div>
                                      <div className="text-slate-500 mt-0.5">{fav.subtitle}</div>
                                    </div>
                                    <button
                                      onClick={() => handleOpenMedicationFichaById(fav.entityId)}
                                      className="px-3.5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shrink-0"
                                    >
                                      Abrir Ficha
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* History List */}
                          <div className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                              Histórico de Fichas Consultadas ({historyItems.length})
                            </h2>
                            {historyItems.length === 0 ? (
                              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-950/40">
                                Nenhuma ficha registrada no histórico da sua conta ainda.
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {historyItems.map((h) => (
                                  <div
                                    key={h.id}
                                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white">
                                        {h.query}
                                      </div>
                                      <div className="text-slate-500 mt-0.5">
                                        Consulta técnica registrada
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (h.targetId) {
                                          handleOpenMedicationFichaById(h.targetId);
                                        }
                                      }}
                                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-200 shrink-0"
                                    >
                                      Reabrir
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 11: PERFIL E CONFIGURAÇÕES + GOVERNANÇA (Parts 1.1 & 8) */}
                {activeSection === 'perfil' && (
                  <GovernanceAdminModule
                    currentUser={currentUser}
                    userProfile={userProfile}
                    onProfileUpdated={(prof) => setUserProfile(prof)}
                    onGoogleLogin={handleGoogleLogin}
                    onLogout={handleLogout}
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode((d) => !d)}
                    favoritesCount={favorites.length}
                    historyCount={historyItems.length}
                    onNavigateFavorites={() => navigateTo('favoritos')}
                  />
                )}
              </>
            )}
          </main>
        </div>

        {/* Part 3.1 & Part 5: Dedicated Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Navegação móvel principal"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around"
        >
          <button
            onClick={() => navigateTo('visao_geral')}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              activeSection === 'visao_geral' && !selectedMedication
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </button>

          <button
            onClick={() => navigateTo('medicamentos')}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              activeSection === 'medicamentos' || selectedMedication
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Medicamentos</span>
          </button>

          <button
            onClick={() => navigateTo('interacoes')}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              activeSection === 'interacoes' && !selectedMedication
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Interações</span>
          </button>

          <button
            onClick={() => navigateTo('calculadoras')}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              activeSection === 'calculadoras' && !selectedMedication
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadoras</span>
          </button>

          <button
            onClick={() => setMobileDrawerOpen((o) => !o)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
              mobileDrawerOpen
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menu</span>
          </button>
        </nav>

        {/* Mobile Full Navigation Sheet Drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Módulos Clínicos FARMA360
                  </div>
                  <div className="text-xs text-slate-500">
                    Selecione a ferramenta farmacológica desejada
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SIDEBAR_ITEMS.map((item) => {
                  const isActive = activeSection === item.id && !selectedMedication;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`flex items-center gap-3 px-3.5 py-3 text-xs font-semibold rounded-xl text-left transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quiet Clinical Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <strong>FARMA360</strong> — Plataforma Farmacológica para Profissionais de Saúde · Proveniência Documental ANVISA, RENAME/MS, CONITEC e OMS.
            </div>
            <div>
              <span>Ferramenta de apoio técnico-científico. Não substitui o julgamento clínico individualizado.</span>
            </div>
          </div>
        </footer>

        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
