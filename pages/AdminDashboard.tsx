import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/api';
import { Appointment, Service, Barber, Product, ProductSale, User, Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { DollarSign, Calendar, Users, TrendingUp, Package, Plus, Trash2, Edit, ShoppingCart, Shield, User as UserIcon, Check, X, Scissors, Star, Gift, Upload, Clock, Search, Wallet, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'inventory' | 'users' | 'barbers' | 'financial'>('dashboard');

  // --- Data States ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // --- Dashboard Metrics & Filters ---
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [barberPerformanceData, setBarberPerformanceData] = useState<any[]>([]);

  // --- Search States ---
  const [searchTermAgenda, setSearchTermAgenda] = useState('');
  const [searchTermInventory, setSearchTermInventory] = useState('');
  const [searchTermUsers, setSearchTermUsers] = useState('');

  // --- Inventory UI States ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedProductToSell, setSelectedProductToSell] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);

  // --- Service UI States ---
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // --- Barber UI States ---
  const [isBarberModalOpen, setIsBarberModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formBarberRating, setFormBarberRating] = useState('5.0');

  // --- Expense UI States ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseCategory, setExpenseCategory] = useState<'fixed' | 'variable'>('fixed');

  // --- Admin Appointment UI States ---
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [newApptClientId, setNewApptClientId] = useState('');
  const [newApptServiceId, setNewApptServiceId] = useState('');
  const [newApptBarberId, setNewApptBarberId] = useState('');
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('');
  const [adminAvailableSlots, setAdminAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // --- Completion Modal State ---
  const [completionModal, setCompletionModal] = useState<{ isOpen: boolean, appId: string | null }>({ isOpen: false, appId: null });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'debit_card' | 'pix' | 'cash'>('cash');

  // Form States (Generic)
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState(''); // Used for product description OR service image URL OR barber Avatar
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState(''); // Used for product stock OR service duration

  const refreshData = async () => {
    const [allApps, allServs, allBarbs, allProds, allSales, allUsers, allExpenses] = await Promise.all([
      db.getAppointments(),
      db.getServices(),
      db.getBarbers(),
      db.getProducts(),
      db.getProductSales(),
      db.getUsers(),
      db.getExpenses()
    ]);
    setAppointments(allApps);
    setServices(allServs);
    setBarbers(allBarbs);
    setProducts(allProds);
    setProductSales(allSales);
    setUsers(allUsers);
    setExpenses(allExpenses);
    processMetrics(allApps, allSales, allBarbs, allExpenses);
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate]); // Re-run when date changes

  // Watch for changes in appointment modal fields to fetch slots
  useEffect(() => {
    if (newApptBarberId && newApptServiceId && newApptDate) {
      const service = services.find(s => s.id === newApptServiceId);
      if (service) {
        setLoadingSlots(true);
        setAdminAvailableSlots([]);
        setNewApptTime('');
        db.getAvailableSlots(newApptDate, newApptBarberId, service.durationMinutes)
          .then(slots => {
            setAdminAvailableSlots(slots);
            setLoadingSlots(false);
          });
      }
    }
  }, [newApptBarberId, newApptServiceId, newApptDate, services]);

  const processMetrics = (apps: Appointment[], sales: ProductSale[], barbs: Barber[], expensesList: Expense[]) => {
    const activeApps = apps.filter(a => a.status !== 'cancelled');
    const todayStr = new Date().toISOString().split('T')[0];

    // --- REVENUE CALCULATION ---
    const serviceRevenue = activeApps.reduce((acc, curr) => acc + curr.priceAtBooking, 0);
    const productsRevenue = sales.reduce((acc, curr) => acc + (curr.salePrice * curr.quantity), 0);
    const totalRev = serviceRevenue + productsRevenue;

    // --- EXPENSES CALCULATION ---
    const totalExp = expensesList.reduce((acc, curr) => acc + curr.amount, 0);

    setTotalRevenue(totalRev);
    setTotalExpenses(totalExp);
    setNetProfit(totalRev - totalExp);

    // --- TODAY'S METRICS ---
    const todayApps = activeApps.filter(a => a.date.startsWith(todayStr));
    const todayServiceRev = todayApps.reduce((acc, curr) => acc + curr.priceAtBooking, 0);

    const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
    const todayProductRev = todaySales.reduce((acc, curr) => acc + (curr.salePrice * curr.quantity), 0);

    setTodayRevenue(todayServiceRev + todayProductRev);

    // --- FILTERED APPOINTMENTS (For Agenda View) ---
    // Includes cancelled ones to show history
    const filteredApps = apps.filter(a => a.date.startsWith(selectedDate));
    setFilteredAppointments(filteredApps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    // --- CHART DATA (Revenue) ---
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];

      const dailyServiceRev = activeApps
        .filter(a => a.date.startsWith(dStr))
        .reduce((acc, curr) => acc + curr.priceAtBooking, 0);

      const dailyProductRev = sales
        .filter(s => s.createdAt.startsWith(dStr))
        .reduce((acc, curr) => acc + (curr.salePrice * curr.quantity), 0);

      last7Days.push({
        name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        receita: dailyServiceRev + dailyProductRev,
        servicos: dailyServiceRev,
        produtos: dailyProductRev
      });
    }
    setChartData(last7Days);

    // --- CHART DATA (Barber Performance - Revenue) ---
    const barberStats = barbs.map(barber => {
      // Calculate Revenue for completed appointments
      const revenueCompleted = activeApps
        .filter(a => a.barberId === barber.id && a.status === 'completed')
        .reduce((acc, curr) => acc + curr.priceAtBooking, 0);

      // Calculate Revenue for scheduled (confirmed) appointments
      const revenueScheduled = activeApps
        .filter(a => a.barberId === barber.id && a.status === 'confirmed')
        .reduce((acc, curr) => acc + curr.priceAtBooking, 0);

      return {
        name: barber.name.split(' ')[0], // First name
        Concluidos: revenueCompleted,
        Agendados: revenueScheduled
      };
    });
    setBarberPerformanceData(barberStats);
  };

  // --- MEMOIZED FILTERED LISTS ---
  const displayAppointments = useMemo(() => {
    if (!searchTermAgenda) return filteredAppointments;
    const lower = searchTermAgenda.toLowerCase();
    return filteredAppointments.filter(app =>
      app.userName?.toLowerCase().includes(lower) ||
      services.find(s => s.id === app.serviceId)?.name.toLowerCase().includes(lower)
    );
  }, [filteredAppointments, searchTermAgenda, services]);

  const displayProducts = useMemo(() => {
    if (!searchTermInventory) return products;
    const lower = searchTermInventory.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower));
  }, [products, searchTermInventory]);

  const displayUsers = useMemo(() => {
    if (!searchTermUsers) return users;
    const lower = searchTermUsers.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
  }, [users, searchTermUsers]);


  // --- APPOINTMENT ACTIONS ---
  const handleUpdateStatus = async (id: string, status: 'cancelled') => {
    if (confirm(`Deseja cancelar este agendamento?`)) {
      try {
        await db.updateAppointmentStatus(id, status);
        refreshData();
        alert('Status atualizado com sucesso!');
      } catch (error: any) {
        alert('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const openCompletionModal = (id: string) => {
    setCompletionModal({ isOpen: true, appId: id });
    setSelectedPaymentMethod('cash');
  };

  const confirmCompletion = async () => {
    if (completionModal.appId) {
      try {
        await db.updateAppointmentStatus(completionModal.appId, 'completed', selectedPaymentMethod);
        setCompletionModal({ isOpen: false, appId: null });
        refreshData();
        alert('Atendimento concluído com sucesso!');
      } catch (error: any) {
        alert('Erro ao concluir atendimento: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const handleOpenApptModal = () => {
    setNewApptClientId('');
    setNewApptServiceId('');
    setNewApptBarberId('');
    setNewApptDate('');
    setNewApptTime('');
    setAdminAvailableSlots([]);
    setIsApptModalOpen(true);
  };

  const handleCreateAdminAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptClientId || !newApptServiceId || !newApptBarberId || !newApptDate || !newApptTime) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      const client = users.find(u => u.id === newApptClientId);
      const isoDate = `${newApptDate}T${newApptTime}:00`;

      await db.createAppointment({
        userId: newApptClientId,
        userName: client?.name || 'Cliente',
        barberId: newApptBarberId,
        serviceId: newApptServiceId,
        date: isoDate
      });

      alert("Agendamento criado com sucesso!");
      setIsApptModalOpen(false);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- FILE UPLOAD HANDLER ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormDesc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SERVICE HANDLERS ---
  const handleOpenServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormName(service.name);
      setFormPrice(service.price.toString());
      setFormStock(service.durationMinutes.toString()); // reusing stock state for duration
      setFormDesc(service.image); // reusing desc state for image URL
    } else {
      setEditingService(null);
      setFormName('');
      setFormPrice('');
      setFormStock('');
      setFormDesc('');
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const newService: Service = {
      id: editingService ? editingService.id : Math.random().toString(36).substr(2, 9),
      name: formName,
      price: parseFloat(formPrice),
      durationMinutes: parseInt(formStock),
      image: formDesc || 'https://via.placeholder.com/200'
    };
    await db.saveService(newService);
    setIsServiceModalOpen(false);
    refreshData();
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      await db.deleteService(id);
      refreshData();
    }
  };

  // --- BARBER HANDLERS ---
  const handleOpenBarberModal = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormName(barber.name);
      setFormDesc(barber.avatarUrl);
      setFormBarberRating((barber.rating || 5.0).toString());
    } else {
      setEditingBarber(null);
      setFormName('');
      setFormDesc('');
      setFormBarberRating('5.0');
    }
    setIsBarberModalOpen(true);
  };

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBarber: Barber = {
      id: editingBarber ? editingBarber.id : Math.random().toString(36).substr(2, 9),
      name: formName,
      avatarUrl: formDesc || `https://i.pravatar.cc/150?u=${Math.random()}`,
      rating: parseFloat(formBarberRating)
    };
    await db.saveBarber(newBarber);
    setIsBarberModalOpen(false);
    refreshData();
  };

  const handleDeleteBarber = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este barbeiro da equipe?')) {
      await db.deleteBarber(id);
      refreshData();
    }
  };


  // --- PRODUCT HANDLERS ---
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormDesc(product.description);
      setFormPrice(product.price.toString());
      setFormStock(product.stockQuantity.toString());
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormDesc('');
      setFormPrice('');
      setFormStock('');
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : Math.random().toString(36).substr(2, 9),
      name: formName,
      description: formDesc,
      price: parseFloat(formPrice),
      stockQuantity: parseInt(formStock)
    };
    await db.saveProduct(newProduct);
    setIsProductModalOpen(false);
    refreshData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await db.deleteProduct(id);
      refreshData();
    }
  };

  const handleOpenSellModal = (product: Product) => {
    setSelectedProductToSell(product);
    setSellQuantity(1);
    setIsSellModalOpen(true);
  };

  const handleSellProduct = async () => {
    if (!selectedProductToSell || !user) return;
    try {
      await db.createProductSale(selectedProductToSell.id, sellQuantity, user.id);
      setIsSellModalOpen(false);
      refreshData();
      alert('Venda registrada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- EXPENSE HANDLERS ---
  const handleOpenExpenseModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormName(expense.description);
      setFormPrice(expense.amount.toString());
      setExpenseCategory(expense.category);
    } else {
      setEditingExpense(null);
      setFormName('');
      setFormPrice('');
      setExpenseCategory('fixed');
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      id: editingExpense ? editingExpense.id : Math.random().toString(36).substr(2, 9),
      description: formName,
      amount: parseFloat(formPrice),
      date: editingExpense ? editingExpense.date : new Date().toISOString(),
      category: expenseCategory
    };
    await db.saveExpense(newExpense);
    setIsExpenseModalOpen(false);
    refreshData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta despesa?')) {
      await db.deleteExpense(id);
      refreshData();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-white">Dashboard Administrativo</h2>
        <div className="flex bg-brand-800 rounded-lg p-1 border border-white/5 overflow-x-auto max-w-full">
          {[
            { id: 'dashboard', label: 'Visão Geral' },
            { id: 'services', label: 'Serviços' },
            { id: 'barbers', label: 'Equipe' },
            { id: 'inventory', label: 'Estoque' },
            { id: 'financial', label: 'Financeiro' },
            { id: 'users', label: 'Clientes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-brand-500 text-brand-900 shadow' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-500/20 p-3 rounded-full text-green-500"><DollarSign size={24} /></div>
                <span className="text-green-500 text-sm font-bold">+12%</span>
              </div>
              <p className="text-gray-400 text-sm">Faturamento Hoje</p>
              <h3 className="text-2xl font-bold text-white">R$ {todayRevenue.toFixed(2)}</h3>
            </div>

            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-brand-500/20 p-3 rounded-full text-brand-500"><TrendingUp size={24} /></div>
              </div>
              <p className="text-gray-400 text-sm">Receita Total</p>
              <h3 className="text-2xl font-bold text-white">R$ {totalRevenue.toFixed(2)}</h3>
            </div>

            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  <Wallet size={24} />
                </div>
              </div>
              <p className="text-gray-400 text-sm">Lucro Líquido</p>
              <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>R$ {netProfit.toFixed(2)}</h3>
            </div>

            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-500/20 p-3 rounded-full text-purple-500"><Users size={24} /></div>
              </div>
              <p className="text-gray-400 text-sm">Barbeiros Ativos</p>
              <h3 className="text-2xl font-bold text-white">{barbers.length}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart Section: Revenue */}
            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6">Receita Semanal</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff' }}
                      itemStyle={{ color: '#d4af37' }}
                      cursor={{ fill: '#ffffff10' }}
                    />
                    <Legend />
                    <Bar name="Total" dataKey="receita" fill="#d4af37" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart Section: Barber Performance */}
            <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6">Faturamento da Equipe (Serviços)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barberPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                    <XAxis type="number" stroke="#888" tick={{ fill: '#888' }} />
                    <YAxis dataKey="name" type="category" stroke="#888" tick={{ fill: '#fff' }} width={80} />
                    <Tooltip
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff' }}
                      cursor={{ fill: '#ffffff10' }}
                    />
                    <Legend />
                    <Bar name="Concluídos" dataKey="Concluidos" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar name="Agendados" dataKey="Agendados" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Schedule List (Enhanced) */}
          <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg flex flex-col">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold text-white whitespace-nowrap">Agenda Diária</h3>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchTermAgenda}
                    onChange={(e) => setSearchTermAgenda(e.target.value)}
                    className="w-full sm:w-48 bg-brand-900 border border-gray-600 rounded pl-8 pr-2 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto bg-brand-900 border border-gray-600 rounded p-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleOpenApptModal}
                  className="w-full sm:w-auto bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Plus size={16} /> Novo
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 max-h-[400px]">
              {displayAppointments.length === 0 ? (
                <p className="text-gray-500 text-center py-10">
                  {searchTermAgenda ? 'Nenhum agendamento encontrado para esta busca.' : 'Sem agendamentos para esta data.'}
                </p>
              ) : (
                displayAppointments.map(app => {
                  const service = services.find(s => s.id === app.serviceId);
                  const barber = barbers.find(b => b.id === app.barberId);
                  const isCancelled = app.status === 'cancelled';
                  const isCompleted = app.status === 'completed';

                  // Calculate End Time
                  const startDate = new Date(app.date);
                  const duration = service?.durationMinutes || 30;
                  const endDate = new Date(startDate.getTime() + duration * 60000);

                  return (
                    <div key={app.id} className={`p-3 rounded border-l-4 flex flex-col gap-2 ${isCancelled ? 'bg-red-900/10 border-red-500 opacity-70' :
                      isCompleted ? 'bg-green-900/10 border-green-500' :
                        'bg-brand-900 border-brand-500'
                      }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-white font-bold text-lg">
                              <Clock size={16} className="text-brand-500" />
                              {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="text-gray-500 text-xs font-normal mx-1">-</span>
                              {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {isCancelled && <span className="text-xs text-red-400 font-bold uppercase ml-2 px-2 py-0.5 bg-red-500/10 rounded">Cancelado</span>}
                            {isCompleted && <span className="text-xs text-green-400 font-bold uppercase ml-2 px-2 py-0.5 bg-green-500/10 rounded">Concluído</span>}
                            {isCompleted && app.paymentMethod && (
                              <span className="text-xs text-gray-400 ml-2 border border-gray-600 px-2 py-0.5 rounded capitalize">
                                {app.paymentMethod.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-200 mt-1 font-medium">{app.userName}</p>
                          <p className="text-xs text-gray-500">{service?.name} com {barber?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-brand-400">R$ {app.priceAtBooking.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Action Buttons for Pending Appointments */}
                      {app.status === 'confirmed' && (
                        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                            className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded text-xs flex items-center gap-1 transition-colors"
                            title="Cancelar Agendamento"
                          >
                            <X size={14} /> Cancelar
                          </button>
                          <button
                            onClick={() => openCompletionModal(app.id)}
                            className="px-2 py-1 text-green-400 hover:bg-green-500/10 rounded text-xs flex items-center gap-1 transition-colors"
                            title="Marcar como Concluído"
                          >
                            <Check size={14} /> Concluir
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* NEW: Financial Tab */}
      {activeTab === 'financial' && (
        <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="text-brand-500" />
              <h3 className="text-xl font-bold text-white">Gestão Financeira</h3>
            </div>
            <button
              onClick={() => handleOpenExpenseModal()}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors"
            >
              <TrendingDown size={18} /> Nova Despesa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-brand-900 p-4 rounded border border-gray-700">
              <p className="text-gray-400 text-sm">Receita Total</p>
              <p className="text-2xl font-bold text-green-400">R$ {totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-brand-900 p-4 rounded border border-gray-700">
              <p className="text-gray-400 text-sm">Despesas Totais</p>
              <p className="text-2xl font-bold text-red-400">R$ {totalExpenses.toFixed(2)}</p>
            </div>
            <div className="bg-brand-900 p-4 rounded border border-gray-700">
              <p className="text-gray-400 text-sm">Lucro Líquido</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-500'}`}>R$ {netProfit.toFixed(2)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
              <thead className="text-xs text-gray-500 uppercase bg-brand-900/50">
                <tr>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-brand-900/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{exp.description}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${exp.category === 'fixed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {exp.category === 'fixed' ? 'Fixo' : 'Variável'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-400 font-bold">- R$ {exp.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenExpenseModal(exp)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-8 text-gray-500">Nenhuma despesa registrada.</div>
            )}
          </div>
        </div>
      )}

      {/* NEW: Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Scissors className="text-brand-500" />
              <h3 className="text-xl font-bold text-white">Gestão de Serviços</h3>
            </div>
            <button
              onClick={() => handleOpenServiceModal()}
              className="bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Novo Serviço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <div key={service.id} className="bg-brand-900 rounded-lg p-4 border border-gray-700 flex gap-4">
                <img src={service.image} alt={service.name} className="w-20 h-20 object-cover rounded" />
                <div className="flex-grow">
                  <h4 className="font-bold text-white text-lg">{service.name}</h4>
                  <p className="text-gray-400 text-sm">{service.durationMinutes} min</p>
                  <p className="text-brand-500 font-bold">R$ {service.price.toFixed(2)}</p>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={() => handleOpenServiceModal(service)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Barbers Tab */}
      {activeTab === 'barbers' && (
        <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-brand-500" />
              <h3 className="text-xl font-bold text-white">Equipe de Barbeiros</h3>
            </div>
            <button
              onClick={() => handleOpenBarberModal()}
              className="bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Novo Barbeiro
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map(barber => (
              <div key={barber.id} className="bg-brand-900 rounded-lg p-6 border border-gray-700 flex flex-col items-center text-center">
                <img src={barber.avatarUrl} alt={barber.name} className="w-24 h-24 rounded-full border-4 border-brand-800 mb-4 object-cover" />
                <h4 className="font-bold text-white text-xl">{barber.name}</h4>
                <div className="flex items-center gap-1 my-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} size={16} className={`${(barber.rating || 0) >= star ? 'text-brand-500 fill-brand-500' : 'text-gray-600'}`} />
                  ))}
                  <span className="text-gray-400 text-sm ml-2">{(barber.rating || 0).toFixed(1)}</span>
                </div>

                <div className="flex gap-3 mt-4 w-full">
                  <button
                    onClick={() => handleOpenBarberModal(barber)}
                    className="flex-1 bg-brand-800 hover:bg-brand-700 text-blue-400 py-2 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteBarber(barber.id)}
                    className="flex-1 bg-brand-800 hover:bg-brand-700 text-red-400 py-2 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Package className="text-brand-500" />
              <h3 className="text-xl font-bold text-white">Gestão de Estoque</h3>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2 top-2.5 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={searchTermInventory}
                  onChange={(e) => setSearchTermInventory(e.target.value)}
                  className="w-full md:w-64 bg-brand-900 border border-gray-600 rounded pl-8 pr-2 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <button
                onClick={() => handleOpenProductModal()}
                className="bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Plus size={18} /> Novo Produto
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
              <thead className="text-xs text-gray-500 uppercase bg-brand-900/50">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3 text-center">Estoque</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayProducts.map(product => (
                  <tr key={product.id} className="hover:bg-brand-900/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{product.name}</td>
                    <td className="px-4 py-3 text-sm">{product.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-brand-400">R$ {product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${product.stockQuantity < 5 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {product.stockQuantity} unid.
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenSellModal(product)}
                        title="Registrar Venda"
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded"
                      >
                        <ShoppingCart size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenProductModal(product)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTermInventory ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-brand-800 p-6 rounded-lg border border-white/5 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Users className="text-brand-500" />
              <h3 className="text-xl font-bold text-white">Clientes Cadastrados</h3>
            </div>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-2 top-2.5 text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTermUsers}
                onChange={(e) => setSearchTermUsers(e.target.value)}
                className="w-full md:w-64 bg-brand-900 border border-gray-600 rounded pl-8 pr-2 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-300">
              <thead className="text-xs text-gray-500 uppercase bg-brand-900/50">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Fidelidade</th>
                  <th className="px-4 py-3">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayUsers.map(u => (
                  <tr key={u.id} className="hover:bg-brand-900/30 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="bg-brand-700 p-2 rounded-full">
                        <UserIcon size={16} className="text-gray-300" />
                      </div>
                      <span className="font-medium text-white">{u.name}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const completedApps = appointments.filter(a => a.userId === u.id && a.status === 'completed').length;
                        const progress = completedApps % 10;
                        const rewards = Math.floor(completedApps / 10);

                        return (
                          <div className="flex flex-col max-w-[120px]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-brand-500">{progress}/10</span>
                              {rewards > 0 && <Gift size={12} className="text-green-400 animate-pulse" />}
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${progress * 10}%` }}></div>
                            </div>
                            {rewards > 0 && (
                              <span className="text-[10px] text-green-400 font-bold mt-1">
                                {rewards} Cortesia(s)!
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {u.role === 'admin' && <Shield size={12} />}
                        {u.role === 'admin' ? 'Admin' : 'Cliente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTermUsers ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Completion Modal */}
      {completionModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-sm border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Finalizar Atendimento</h3>
            <p className="text-gray-400 mb-4">Selecione a forma de pagamento:</p>

            <div className="space-y-2 mb-6">
              {[
                { id: 'cash', label: 'Dinheiro', icon: <DollarSign size={16} /> },
                { id: 'pix', label: 'Pix', icon: <TrendingUp size={16} /> },
                { id: 'credit_card', label: 'Cartão de Crédito', icon: <Wallet size={16} /> },
                { id: 'debit_card', label: 'Cartão de Débito', icon: <Wallet size={16} /> }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id as any)}
                  className={`w-full p-3 rounded flex items-center gap-3 border transition-colors ${selectedPaymentMethod === method.id
                    ? 'bg-brand-500 text-brand-900 border-brand-500 font-bold'
                    : 'bg-brand-900 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCompletionModal({ isOpen: false, appId: null })}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCompletion}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" placeholder="Ex: Conta de Luz" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Valor (R$)</label>
                <input required type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoria</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                >
                  <option value="fixed">Custo Fixo (Aluguel, Salários...)</option>
                  <option value="variable">Custo Variável (Insumos, Comissões...)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
                <button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Creation Modal (Admin) */}
      {isApptModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-lg border border-gray-700 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-brand-500" /> Novo Agendamento
            </h3>
            <form onSubmit={handleCreateAdminAppointment} className="space-y-4">
              {/* Client Select */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Selecione o Cliente</label>
                <select
                  required
                  value={newApptClientId}
                  onChange={(e) => setNewApptClientId(e.target.value)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                >
                  <option value="">-- Selecione --</option>
                  {users.filter(u => u.role === 'client').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Service Select */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Serviço</label>
                <select
                  required
                  value={newApptServiceId}
                  onChange={(e) => setNewApptServiceId(e.target.value)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                >
                  <option value="">-- Selecione --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)} ({s.durationMinutes} min)</option>
                  ))}
                </select>
              </div>

              {/* Barber Select */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Barbeiro</label>
                <select
                  required
                  value={newApptBarberId}
                  onChange={(e) => setNewApptBarberId(e.target.value)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                >
                  <option value="">-- Selecione --</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Select */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data</label>
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newApptDate}
                  onChange={(e) => setNewApptDate(e.target.value)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                />
              </div>

              {/* Time Slot Selection */}
              {newApptDate && newApptBarberId && newApptServiceId && (
                <div className="bg-brand-900/50 p-3 rounded border border-gray-700">
                  <label className="block text-sm text-gray-400 mb-2">Horários Disponíveis</label>

                  {loadingSlots ? (
                    <div className="text-brand-500 text-sm animate-pulse">Buscando horários...</div>
                  ) : adminAvailableSlots.length === 0 ? (
                    <div className="text-red-400 text-sm">Nenhum horário disponível para esta combinação.</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {adminAvailableSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewApptTime(slot)}
                          className={`text-sm py-1 px-2 rounded border ${newApptTime === slot
                            ? 'bg-brand-500 text-brand-900 border-brand-500 font-bold'
                            : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-700 mt-4">
                <button type="button" onClick={() => setIsApptModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
                <button
                  type="submit"
                  disabled={!newApptTime}
                  className="flex-1 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Produto</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Estoque</label>
                  <input required type="number" value={formStock} onChange={e => setFormStock(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
                <button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Form Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome do Serviço</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Imagem do Serviço</label>
                <div className="flex flex-col gap-2">
                  {formDesc && (
                    <div className="w-20 h-20 rounded overflow-hidden border border-gray-600">
                      <img src={formDesc} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-brand-900 hover:file:bg-brand-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Ou use uma URL (opcional):</p>
                  <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="https://..." className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duração (min)</label>
                  <input required type="number" value={formStock} onChange={e => setFormStock(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
                <button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barber Form Modal */}
      {isBarberModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
            </h3>
            <form onSubmit={handleSaveBarber} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Foto do Avatar</label>
                <div className="flex flex-col gap-2">
                  {formDesc && (
                    <img src={formDesc} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-brand-500" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-brand-900 hover:file:bg-brand-400"
                  />
                  <p className="text-xs text-gray-500">Ou use uma URL (opcional):</p>
                  <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="https://..." className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Avaliação Inicial (Estrelas)</label>
                <select
                  value={formBarberRating}
                  onChange={e => setFormBarberRating(e.target.value)}
                  className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
                >
                  <option value="5.0">5.0 - Excelente</option>
                  <option value="4.5">4.5 - Muito Bom</option>
                  <option value="4.0">4.0 - Bom</option>
                  <option value="3.5">3.5 - Regular</option>
                  <option value="3.0">3.0 - Médio</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsBarberModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
                <button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-400 text-brand-900 font-bold py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {isSellModalOpen && selectedProductToSell && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 p-6 rounded-lg w-full max-w-sm border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Registrar Venda</h3>
            <p className="text-gray-400 text-sm mb-4">
              Produto: <span className="text-white font-medium">{selectedProductToSell.name}</span> <br />
              Preço Unit.: <span className="text-brand-500">R$ {selectedProductToSell.price.toFixed(2)}</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                max={selectedProductToSell.stockQuantity}
                value={sellQuantity}
                onChange={e => setSellQuantity(parseInt(e.target.value))}
                className="w-full bg-brand-900 border border-gray-600 rounded p-2 text-white focus:border-brand-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1 text-right">Disponível: {selectedProductToSell.stockQuantity}</p>
            </div>

            <div className="bg-brand-900/50 p-3 rounded mb-6 flex justify-between items-center border border-gray-700">
              <span className="text-gray-300">Total da Venda:</span>
              <span className="text-xl font-bold text-green-400">R$ {(selectedProductToSell.price * sellQuantity).toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setIsSellModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">Cancelar</button>
              <button onClick={handleSellProduct} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded">Confirmar Venda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};