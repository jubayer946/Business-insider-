
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Megaphone, 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  Minus,
  Trash2, 
  DollarSign, 
  BarChart3, 
  Menu, 
  X, 
  Loader2,
  CloudCheck,
  Download,
  Award,
  ArrowUpRight,
  PieChart as PieChartIcon,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  ref, 
  push, 
  onValue, 
  remove, 
  update, 
  set 
} from "firebase/database";
import { db } from './services/firebase';
import { Product, Sale, AdSpend, View } from './types';
import { getAIInsights } from './services/geminiService';

const COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ads, setAds] = useState<AdSpend[]>([]);
  
  // Feedback States
  const [toasts, setToasts] = useState<{id: string, msg: string, type: 'success' | 'error'}[]>([]);

  // AI States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const prodsRef = ref(db, 'products');
    const salesRef = ref(db, 'sales');
    const adsRef = ref(db, 'ads');

    const unsubscribeProds = onValue(prodsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setProducts(list);
      setIsLoading(false);
    });

    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(list);
    });

    const unsubscribeAds = onValue(adsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAds(list);
    });

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeProds();
      unsubscribeSales();
      unsubscribeAds();
    };
  }, []);

  const handleUpdateStock = async (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stock + delta);
    try {
      await update(ref(db, `products/${id}`), { stock: newStock });
      addToast(`Inventory adjusted: ${product.name}`);
    } catch (e) {
      addToast("Failed to update stock", "error");
    }
  };

  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    setIsSyncing(true);
    try {
      const newRef = push(ref(db, 'products'));
      await set(newRef, p);
      addToast(`New asset registered: ${p.name}`);
    } catch (e) {
      addToast("Connection error", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure? This will remove all records of this product.")) return;
    try {
      await remove(ref(db, `products/${id}`));
      addToast("Product purged");
    } catch (e) {
      addToast("Action failed", "error");
    }
  };

  const handleAddSale = async (s: Omit<Sale, 'id'>) => {
    setIsSyncing(true);
    try {
      const product = products.find(p => p.id === s.productId);
      if (!product) throw new Error("Product missing");
      if (product.stock < s.quantity) {
        addToast("Insufficient stock!", "error");
        return;
      }
      const saleRef = push(ref(db, 'sales'));
      await set(saleRef, s);
      await update(ref(db, `products/${s.productId}`), {
        stock: product.stock - s.quantity
      });
      addToast("Transaction successful");
    } catch (e) {
      addToast("Sync error", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddAdSpend = async (a: Omit<AdSpend, 'id'>) => {
    setIsSyncing(true);
    try {
      const adRef = push(ref(db, 'ads'));
      await set(adRef, a);
      addToast("Marketing log saved");
    } catch (e) {
      addToast("Failed to sync", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const metrics = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
    const totalAdSpend = ads.reduce((sum, a) => sum + a.amount, 0);
    const totalCostOfGoods = sales.reduce((sum, s) => {
      const p = products.find(prod => prod.id === s.productId);
      return sum + (p ? p.cost * s.quantity : 0);
    }, 0);
    const netProfit = totalRevenue - totalCostOfGoods - totalAdSpend;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    
    return { 
      totalRevenue, 
      totalAdSpend, 
      totalCostOfGoods, 
      netProfit, 
      margin, 
      roas 
    };
  }, [sales, products, ads]);

  const fetchAI = async () => {
    setIsAiLoading(true);
    const result = await getAIInsights({ products, sales, ads });
    setAiInsight(result);
    setIsAiLoading(false);
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Hydrating Core Systems...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] flex-col md:flex-row">
      {/* Toast Layer */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border ${t.type === 'success' ? 'bg-slate-900 text-white border-slate-800' : 'bg-red-600 text-white border-red-500'}`}>
            {t.type === 'success' ? <Zap size={16} className="text-blue-400" /> : <AlertCircle size={16} />}
            <span className="text-xs font-bold uppercase tracking-wide">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      {!isMobile && (
        <aside className={`bg-[#0f172a] text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-slate-800`}>
          <div className="p-6 flex items-center justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <TrendingUp size={20} />
            </div>
          </div>
          <nav className="flex-1 mt-6 px-3 space-y-2">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all relative group ${view === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {item.icon}
                {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-6 flex items-center justify-center text-slate-500 hover:text-white transition-colors border-t border-slate-800">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto pb-24 md:pb-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 md:px-12 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight capitalize">{view}</h1>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full text-[9px] font-black text-emerald-600 uppercase">
              <CloudCheck size={12}/> Live
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Owner</p>
               <p className="text-xs font-bold text-slate-900">Enterprise Dashboard</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner border border-white">HQ</div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && <DashboardView metrics={metrics} sales={sales} ads={ads} products={products} />}
          {view === 'inventory' && <InventoryView products={products} onAdd={handleAddProduct} onDelete={handleDeleteProduct} onUpdateStock={handleUpdateStock} />}
          {view === 'sales' && <SalesView sales={sales} onAdd={handleAddSale} products={products} />}
          {view === 'ads' && <AdsView ads={ads} onAdd={handleAddAdSpend} />}
          {view === 'ai' && <AIView insight={aiInsight} isLoading={isAiLoading} onFetch={fetchAI} />}
        </div>
      </main>

      {/* Mobile Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center justify-around px-4 z-50 h-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id as View)} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`p-2 rounded-xl transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : ''}`}>
                {React.cloneElement(item.icon, { size: 18 })}
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

// --- Dashboard View Components ---
const DashboardView = ({ metrics, sales, ads, products }: any) => {
  const chartData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    return dates.map(date => {
      const daySales = sales.filter((s: any) => s.date === date);
      const rev = daySales.reduce((sum: number, s: any) => sum + s.revenue, 0);
      const spend = ads.filter((a: any) => a.date === date).reduce((sum: number, a: any) => sum + a.amount, 0);
      return { date: date.split('-').slice(1).join('/'), revenue: rev, ads: spend };
    });
  }, [sales, ads]);

  const costBreakdown = [
    { name: 'COGS', value: metrics.totalCostOfGoods },
    { name: 'Ad Spend', value: metrics.totalAdSpend },
    { name: 'Net Profit', value: Math.max(0, metrics.netProfit) }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} icon={<DollarSign/>} color="blue" />
        <MetricCard label="Ad Spend" value={`$${metrics.totalAdSpend.toLocaleString()}`} icon={<Megaphone/>} color="red" />
        <MetricCard label="Net Profit" value={`$${metrics.netProfit.toLocaleString()}`} icon={<TrendingUp/>} color="emerald" highlight />
        <MetricCard label="ROAS" value={`${metrics.roas.toFixed(2)}x`} icon={<ArrowUpRight/>} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-600"/> Growth Trajectory
            </h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-blue-600"/> Revenue
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-red-400"/> Ad Cost
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="ads" fill="#f87171" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
            <PieChartIcon size={14} className="text-indigo-600"/> Cost Distribution
          </h4>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {costBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, color, highlight }: any) => {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    indigo: 'text-indigo-600 bg-indigo-50'
  };
  return (
    <div className={`bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${highlight ? 'ring-2 ring-emerald-100' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
        <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
          {React.cloneElement(icon, { size: 16 })}
        </div>
      </div>
      <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
      <div className="mt-2 flex items-center gap-1.5">
        <div className={`w-1 h-1 rounded-full ${highlight ? 'bg-emerald-500' : 'bg-slate-200'}`} />
        <span className="text-[9px] font-bold text-slate-400 uppercase">Platform Analytics</span>
      </div>
    </div>
  );
};

// --- Inventory View ---
const InventoryView = ({ products, onAdd, onDelete, onUpdateStock }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', cost: '', price: '', stock: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, cost: Number(form.cost), price: Number(form.price), stock: Number(form.stock), category: 'Standard' });
    setForm({ name: '', cost: '', price: '', stock: '' });
    setShowAdd(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Stock Logistics</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage Unit Costs & Pricing</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${showAdd ? 'bg-red-50 text-red-600' : 'bg-slate-900 text-white hover:bg-black shadow-lg'}`}>
          {showAdd ? <X size={16}/> : <Plus size={16}/>}
          {showAdd ? 'Cancel' : 'New SKU'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[2.5rem] shadow-2xl space-y-6 border border-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Product Identity</label>
              <input className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-200 transition-all font-bold text-slate-800" placeholder="e.g. Wireless Pro Headset" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Current Stock Level</label>
              <input type="number" className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-200 transition-all font-bold text-slate-800" placeholder="Initial Count" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Acquisition Cost ($)</label>
              <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-200 transition-all font-bold text-slate-800" placeholder="COGS per unit" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Sale Price ($)</label>
              <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-200 transition-all font-bold text-slate-800" placeholder="Retail Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
          </div>
          <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Archive Into Database</button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {products.map((p: any) => {
          const margin = ((p.price - p.cost) / p.price) * 100;
          const isLowStock = p.stock < 10;
          return (
            <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:border-blue-200 transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">{p.name}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Unit Cost: ${p.cost}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200"/>
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Price: ${p.price}</span>
                  </div>
                </div>
                <button onClick={() => onDelete(p.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit Margin</p>
                  <p className="text-lg font-black text-slate-900">{margin.toFixed(1)}%</p>
                </div>
                <div className={`${isLowStock ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'} p-4 rounded-2xl border`}>
                  <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isLowStock ? 'text-red-400' : 'text-blue-400'}`}>Availability</p>
                  <p className={`text-lg font-black ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>{p.stock} units</p>
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => onUpdateStock(p.id, -1)} className="flex-1 flex items-center justify-center py-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 active:scale-95 transition-all"><Minus size={18}/></button>
                <button onClick={() => onUpdateStock(p.id, 1)} className="flex-1 flex items-center justify-center py-3 bg-slate-900 text-white rounded-xl hover:bg-black active:scale-95 transition-all"><Plus size={18}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Sales View ---
const SalesView = ({ sales, onAdd, products }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: '1' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x: any) => x.id === form.productId);
    if (!p) return;
    onAdd({ productId: p.id, quantity: Number(form.quantity), date: new Date().toISOString().split('T')[0], revenue: p.price * Number(form.quantity) });
    setShowAdd(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6">
         <button onClick={() => setShowAdd(!showAdd)} className={`w-full p-8 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-2xl transition-all ${showAdd ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'}`}>
            {showAdd ? <X size={20} /> : <ShoppingCart size={20} />}
            {showAdd ? 'Abort Transaction' : 'Record New Sale'}
         </button>

         {showAdd && (
           <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] shadow-2xl border border-emerald-50 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Product SKU</label>
                <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-transparent focus:border-emerald-200 transition-all outline-none text-slate-800" value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
                  <option value="">Select Target Asset...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} — ${p.price} ({p.stock} in stock)</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantity Dispatched</label>
                <input type="number" min="1" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-transparent focus:border-emerald-200 transition-all outline-none text-slate-800" placeholder="Units Sold" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
              </div>
              <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-black transition-all text-[10px] shadow-xl shadow-slate-900/10">Authorize Transaction</button>
           </form>
         )}
      </div>

      <div className="space-y-4">
        {sales.map((s: any) => {
          const product = products.find((p: any) => p.id === s.productId);
          const profit = product ? s.revenue - (product.cost * s.quantity) : 0;
          return (
            <div key={s.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-6 group hover:translate-x-1 transition-all border-l-8 border-l-emerald-500">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <p className="font-black text-slate-900 text-lg tracking-tight">{product?.name || 'Decommissioned SKU'}</p>
                  <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md tracking-widest">{s.date}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Qty: {s.quantity} units dispensed</p>
              </div>
              <div className="flex items-center gap-8 text-right">
                <div className="hidden sm:block">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Net Profit</p>
                  <p className="text-sm font-bold text-emerald-600 tracking-tighter">+${profit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Revenue</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">${s.revenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Ads View ---
const AdsView = ({ ads, onAdd }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: 'Instagram', amount: '', reach: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...form, amount: Number(form.amount), reach: Number(form.reach), date: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
    setForm({ platform: 'Instagram', amount: '', reach: '' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setShowAdd(!showAdd)} className={`w-full p-8 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-3 shadow-2xl transition-all ${showAdd ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}>
        {showAdd ? <X size={20} /> : <Megaphone size={20} />}
        {showAdd ? 'Halt Campaign' : 'Log Ad Deployment'}
      </button>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] shadow-2xl space-y-6 border border-red-50">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Deployment Platform</label>
            <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none text-slate-800" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
              <option>Instagram</option><option>Facebook</option><option>TikTok</option><option>Google Ads</option><option>Snapchat</option><option>Pinterest</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Spend Amount ($)</label>
                <input type="number" step="0.01" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none text-slate-800" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Total Reach/Impressions</label>
                <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none text-slate-800" placeholder="Optional" value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
             </div>
          </div>
          <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.3em] hover:bg-black transition-all text-[10px]">Deploy Logistics</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ads.map((a: any) => (
          <div key={a.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between border-l-8 border-l-red-500 hover:shadow-lg transition-all h-full min-h-[220px]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">{a.platform}</span>
                <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md tracking-widest">{a.date}</span>
              </div>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">${a.amount.toLocaleString()}</h3>
            </div>
            <div className="flex justify-between items-end mt-8 pt-4 border-t border-slate-50">
              <div>
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Asset Reach</p>
                 <p className="text-lg font-black text-slate-900 tracking-tighter">{a.reach ? a.reach.toLocaleString() : '---'}</p>
              </div>
              <div className="bg-red-50 p-2.5 rounded-xl text-red-500">
                <BarChart3 size={18}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- AI View ---
const AIView = ({ insight, isLoading, onFetch }: any) => (
  <div className="max-w-3xl mx-auto py-8 text-center animate-in fade-in duration-700">
    {!insight && !isLoading ? (
      <div className="py-12 px-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl mb-8 group hover:scale-110 transition-all cursor-pointer" onClick={onFetch}>
          <Sparkles size={40} className="group-hover:rotate-12 transition-all"/>
        </div>
        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Strategic Intelligence</h2>
        <p className="text-slate-500 text-lg mb-10 max-w-lg mx-auto font-medium">Connect inventory turnover, marketing burn, and sales margins into an AI-powered growth blueprint.</p>
        <button onClick={onFetch} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:shadow-2xl transition-all active:scale-[0.98]">Synthesize Performance Data</button>
      </div>
    ) : isLoading ? (
      <div className="flex flex-col items-center gap-8 py-32">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl animate-pulse"/>
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin relative" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 animate-pulse">Running Diagnostic Core...</p>
      </div>
    ) : (
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-700">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-blue-400" />
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">Enterprise Growth Blueprint</h3>
          </div>
          <button onClick={onFetch} className="flex items-center gap-2 text-[9px] font-black uppercase bg-white/10 px-4 py-2 rounded-xl border border-white/5 hover:bg-white/20 transition-all">
            <RefreshCcw size={12}/> Regenerate
          </button>
        </div>
        <div className="p-10 md:p-14 whitespace-pre-wrap text-slate-700 text-sm md:text-base leading-relaxed max-h-[70vh] overflow-auto prose prose-slate">
          {insight}
        </div>
      </div>
    )}
  </div>
);

const navItems = [
  { id: 'dashboard', icon: <LayoutDashboard />, label: 'Stats' },
  { id: 'inventory', icon: <Package />, label: 'Stock' },
  { id: 'sales', icon: <ShoppingCart />, label: 'Sales' },
  { id: 'ads', icon: <Megaphone />, label: 'Ads' },
  { id: 'ai', icon: <Sparkles />, label: 'Consultant' },
];

export default App;
