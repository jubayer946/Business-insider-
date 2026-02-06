
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
  Trash2, 
  DollarSign, 
  BarChart3, 
  Menu, 
  X, 
  Loader2,
  CloudCheck,
  CloudOff,
  CloudLightning,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ads, setAds] = useState<AdSpend[]>([]);
  
  // AI States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 1. Initial Load from LocalStorage (Instant UX)
  useEffect(() => {
    const localProds = localStorage.getItem('biz_products_v2');
    const localSales = localStorage.getItem('biz_sales_v2');
    const localAds = localStorage.getItem('biz_ads_v2');
    
    if (localProds) setProducts(JSON.parse(localProds));
    if (localSales) setSales(JSON.parse(localSales));
    if (localAds) setAds(JSON.parse(localAds));
  }, []);

  // 2. Realtime Database Subscription
  useEffect(() => {
    const prodsRef = ref(db, 'products');
    const salesRef = ref(db, 'sales');
    const adsRef = ref(db, 'ads');

    const unsubscribeProds = onValue(prodsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setProducts(list);
      localStorage.setItem('biz_products_v2', JSON.stringify(list));
      setIsLoading(false);
    }, (error) => setSyncError(error.message));

    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      // Sort by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(list);
      localStorage.setItem('biz_sales_v2', JSON.stringify(list));
    });

    const unsubscribeAds = onValue(adsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAds(list);
      localStorage.setItem('biz_ads_v2', JSON.stringify(list));
    });

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- Persistence Handlers ---

  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    setIsSyncing(true);
    try {
      const newRef = push(ref(db, 'products'));
      await set(newRef, p);
    } catch (e: any) {
      alert("Cloud save failed. Check your Database Rules! " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete product?")) return;
    setIsSyncing(true);
    try {
      await remove(ref(db, `products/${id}`));
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSale = async (s: Omit<Sale, 'id'>) => {
    setIsSyncing(true);
    try {
      const product = products.find(p => p.id === s.productId);
      if (!product) throw new Error("Product not found");

      // Push Sale
      const saleRef = push(ref(db, 'sales'));
      await set(saleRef, s);

      // Update Stock
      await update(ref(db, `products/${s.productId}`), {
        stock: product.stock - s.quantity
      });
    } catch (e: any) {
      alert("Sale failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddAdSpend = async (a: Omit<AdSpend, 'id'>) => {
    setIsSyncing(true);
    try {
      const adRef = push(ref(db, 'ads'));
      await set(adRef, a);
    } catch (e: any) {
      alert("Ad log failed: " + e.message);
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
    return {
      totalRevenue,
      totalAdSpend,
      netProfit: totalRevenue - totalCostOfGoods - totalAdSpend
    };
  }, [sales, products, ads]);

  const lowStockProducts = useMemo(() => products.filter(p => p.stock < 10), [products]);

  const fetchAI = async () => {
    setIsAiLoading(true);
    const result = await getAIInsights({ products, sales, ads });
    setAiInsight(result);
    setIsAiLoading(false);
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Connecting to Cloud DB...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
      {!isMobile && (
        <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col shadow-2xl`}>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20"><TrendingUp size={20} /></div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">BizPulse</span>}
          </div>
          <nav className="flex-1 mt-6 px-4 space-y-2">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {item.icon}
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-4 flex items-center justify-center hover:bg-slate-800 border-t border-slate-800">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-auto pb-20 md:pb-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-6 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {isMobile && <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-md"><TrendingUp size={18} /></div>}
            <h1 className="text-lg font-black capitalize text-slate-800 tracking-tight">{view}</h1>
            
            <div className="flex items-center gap-2 ml-4">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <CloudLightning size={12} />
                  <span>Syncing</span>
                </div>
              ) : syncError ? (
                <div className="flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <CloudOff size={12} />
                  <span>Offline</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <CloudCheck size={12} />
                  <span>Cloud Live</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lowStockProducts.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
                <AlertCircle size={14} />
                <span>{lowStockProducts.length} items low</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 text-xs">USER</div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && <DashboardView metrics={metrics} sales={sales} ads={ads} />}
          {view === 'inventory' && <InventoryView products={products} onAdd={handleAddProduct} onDelete={handleDeleteProduct} />}
          {view === 'sales' && <SalesView sales={sales} onAdd={handleAddSale} products={products} />}
          {view === 'ads' && <AdsView ads={ads} onAdd={handleAddAdSpend} />}
          {view === 'ai' && <AIView insight={aiInsight} isLoading={isAiLoading} onFetch={fetchAI} />}
        </div>
      </main>

      {isMobile && (
        <nav className="fixed-bottom fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 flex items-center justify-around px-2 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center justify-center flex-1 h-16 gap-1.5 transition-all ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`p-2.5 rounded-2xl transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-1' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${view === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

// --- Sub-Views ---

const DashboardView = ({ metrics, sales, ads }: any) => {
  const chartData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    return dates.map(date => ({
      date: date.split('-').slice(1).join('/'),
      revenue: sales.filter((s: any) => s.date === date).reduce((sum: number, s: any) => sum + s.revenue, 0),
      ads: ads.filter((a: any) => a.date === date).reduce((sum: number, a: any) => sum + a.amount, 0),
    }));
  }, [sales, ads]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Revenue" value={`$${metrics.totalRevenue.toLocaleString()}`} color="text-slate-900" icon={<DollarSign />} bg="bg-white" />
        <MetricCard label="Marketing" value={`$${metrics.totalAdSpend.toLocaleString()}`} color="text-red-500" icon={<Megaphone />} bg="bg-white" />
        <MetricCard label="Net Profit" value={`$${metrics.netProfit.toLocaleString()}`} color="text-emerald-600" icon={<BarChart3 />} bg="bg-white" />
      </div>
      
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600"/>
            Growth Trends
          </h4>
          <div className="flex gap-4">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Sales</span></div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Ads</span></div>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }} 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="ads" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color, icon, bg }: any) => (
  <div className={`${bg} p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-default`}>
    <div className="flex justify-between items-start mb-2">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
      <div className={`${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50').replace('900', '50')} p-2 rounded-xl`}>
        {React.cloneElement(icon, { size: 16, className: color })}
      </div>
    </div>
    <h3 className={`text-3xl font-black ${color} tracking-tighter`}>{value}</h3>
  </div>
);

const InventoryView = ({ products, onAdd, onDelete }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', cost: '', price: '', stock: '', category: 'General' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd({ 
      ...form, 
      cost: Number(form.cost), 
      price: Number(form.price), 
      stock: Number(form.stock) 
    });
    setShowAdd(false);
    setForm({ name: '', cost: '', price: '', stock: '', category: 'General' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3">
        {showAdd ? <X size={20} /> : <Plus size={20} />}
        {showAdd ? 'Close Editor' : 'Register New Item'}
      </button>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-50 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Label / Title</label>
            <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 transition-all font-medium border border-transparent focus:border-blue-100" placeholder="e.g. Premium Coffee Beans" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Your Cost ($)</label>
              <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-100 font-medium" placeholder="0.00" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Sale Price ($)</label>
              <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-100 font-medium" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Opening Stock</label>
            <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-100 font-medium" placeholder="How many on hand?" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          </div>
          <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all">Add to Inventory</button>
        </form>
      )}

      <div className="space-y-3">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
            <div className="space-y-1">
              <h4 className="font-black text-slate-800 text-lg tracking-tight">{p.name}</h4>
              <div className="flex gap-4">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Price: <span className="text-emerald-600">${p.price}</span></p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cost: <span className="text-red-400">${p.cost}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className={`text-2xl font-black tracking-tighter ${p.stock < 10 ? 'text-amber-500 animate-pulse' : 'text-slate-900'}`}>{p.stock}</p>
                <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Available</p>
              </div>
              <button onClick={() => onDelete(p.id)} className="text-slate-200 hover:text-red-500 p-3 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="py-24 text-center text-slate-400 space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto opacity-40"><Package size={40}/></div>
            <p className="text-sm font-black uppercase tracking-widest">Inventory is empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SalesView = ({ sales, onAdd, products }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ productId: '', quantity: '1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find((x: any) => x.id === form.productId);
    if (!p) return;
    const qty = Number(form.quantity);
    if (qty > p.stock) return alert("Insufficient stock for this transaction!");
    
    await onAdd({ 
      productId: p.id, 
      quantity: qty, 
      date: new Date().toISOString().split('T')[0], 
      revenue: p.price * qty 
    });
    setShowAdd(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
        {showAdd ? <X size={20} /> : <ShoppingCart size={20} />}
        Record Sale
      </button>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-2xl border border-emerald-50 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Item Selection</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border border-transparent focus:border-emerald-100 transition-all" value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
              <option value="">Choose item...</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantity Sold</label>
            <input type="number" min="1" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium" placeholder="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
          </div>
          <button className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">Finalize Sale</button>
        </form>
      )}

      <div className="space-y-3">
        {sales.map((s: any) => (
          <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group border-l-[6px] border-l-emerald-500 hover:translate-x-1 transition-all">
            <div className="space-y-1">
              <p className="font-black text-slate-800 tracking-tight">{products.find((p: any) => p.id === s.productId)?.name || 'Retired Item'}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">{s.date} • Unit Qty: {s.quantity}</p>
            </div>
            <div className="text-right">
               <p className="text-2xl font-black text-emerald-600 tracking-tighter">+${s.revenue.toFixed(0)}</p>
               <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Revenue</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdsView = ({ ads, onAdd }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ platform: 'Instagram', amount: '', reach: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd({ 
      ...form, 
      amount: Number(form.amount), 
      reach: Number(form.reach), 
      date: new Date().toISOString().split('T')[0] 
    });
    setShowAdd(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-red-500 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-600 transition-all flex items-center justify-center gap-3">
        {showAdd ? <X size={20} /> : <Megaphone size={20} />}
        Log Marketing Cost
      </button>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-2xl border border-red-50 space-y-6 animate-in zoom-in-95">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Network / Platform</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border border-transparent focus:border-red-100 transition-all" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
              <option>Instagram</option><option>Facebook</option><option>TikTok</option><option>Google</option><option>Physical Ads</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Daily / Total Spend ($)</label>
            <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium" placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Reach / Impressions (Approx)</label>
            <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium" placeholder="Approx number" value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} />
          </div>
          <button className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Submit Ad Log</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-3">
        {ads.map((a: any) => (
          <div key={a.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center border-l-[6px] border-l-red-500 hover:shadow-lg transition-all">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">{a.platform}</span>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">${a.amount}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{a.date}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-400 tracking-tighter">{a.reach ? a.reach.toLocaleString() : '0'}</p>
              <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Total Reach</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIView = ({ insight, isLoading, onFetch }: any) => (
  <div className="max-w-xl mx-auto py-12 px-4 space-y-10 text-center animate-in fade-in duration-700">
    {!insight && !isLoading ? (
      <>
        <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl rotate-12 active:rotate-0 transition-transform shadow-blue-500/30">
          <Sparkles size={64}/>
        </div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Expert Strategy</h2>
          <p className="text-slate-500 text-base max-w-sm mx-auto font-medium">Get a personalized AI analysis of your costs, stock, and ad effectiveness powered by Gemini 3.</p>
        </div>
        <button onClick={onFetch} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all hover:shadow-2xl hover:bg-black">Analyze Performance</button>
      </>
    ) : isLoading ? (
      <div className="flex flex-col items-center gap-8 py-20">
        <div className="relative">
            <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />
            <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-black uppercase tracking-[0.4em] text-blue-600 animate-pulse">Running Logic Engines</p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">Verifying Profit Margins & ROI...</p>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden text-left animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl"><Sparkles size={20} className="text-white"/></div>
            <h3 className="font-black text-sm uppercase tracking-widest">Growth Blueprint</h3>
          </div>
          <button onClick={onFetch} className="text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl transition-all border border-white/5">Regenerate</button>
        </div>
        <div className="p-10 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed max-h-[60vh] overflow-auto custom-scrollbar font-medium">
          {insight}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Insights calibrated for small-medium enterprise</p>
        </div>
      </div>
    )}
  </div>
);

const navItems = [
  { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Stats' },
  { id: 'inventory', icon: <Package size={20} />, label: 'Stock' },
  { id: 'sales', icon: <ShoppingCart size={20} />, label: 'Sales' },
  { id: 'ads', icon: <Megaphone size={20} />, label: 'Ads' },
  { id: 'ai', icon: <Sparkles size={20} />, label: 'Coach' },
];

export default App;
