
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
  Loader2
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
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from './services/firebase';
import { Product, Sale, AdSpend, View } from './types';
import { getAIInsights } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [ads, setAds] = useState<AdSpend[]>([]);
  
  // AI States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 1. Setup REALTIME Listeners
  useEffect(() => {
    // Listen for Products
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      // Once we have a snapshot (even if empty), we know it's "loaded"
      checkLoadingStatus();
    });

    // Listen for Sales (Ordered by date)
    const salesQuery = query(collection(db, "sales"), orderBy("date", "desc"));
    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      checkLoadingStatus();
    });

    // Listen for Ads (Ordered by date)
    const adsQuery = query(collection(db, "ads"), orderBy("date", "desc"));
    const unsubAds = onSnapshot(adsQuery, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSpend)));
      checkLoadingStatus();
    });

    let loadedCollections = 0;
    function checkLoadingStatus() {
      loadedCollections++;
      if (loadedCollections >= 3) {
        setIsLoading(false);
      }
    }

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // Cleanup listeners on unmount
    return () => {
      unsubProducts();
      unsubSales();
      unsubAds();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handlers for Persistence
  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    try {
      await addDoc(collection(db, "products"), p);
    } catch (e) {
      console.error("Error adding product: ", e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      console.error("Error deleting product: ", e);
    }
  };

  const handleAddSale = async (s: Omit<Sale, 'id'>) => {
    try {
      await addDoc(collection(db, "sales"), s);
      // Update Stock
      const product = products.find(p => p.id === s.productId);
      if (product) {
        const newStock = product.stock - s.quantity;
        await updateDoc(doc(db, "products", s.productId), { stock: newStock });
      }
    } catch (e) {
      console.error("Error recording sale: ", e);
    }
  };

  const handleAddAdSpend = async (a: Omit<AdSpend, 'id'>) => {
    try {
      await addDoc(collection(db, "ads"), a);
    } catch (e) {
      console.error("Error adding ad spend: ", e);
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

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { id: 'inventory', icon: <Package size={20} />, label: 'Stock' },
    { id: 'sales', icon: <ShoppingCart size={20} />, label: 'Sales' },
    { id: 'ads', icon: <Megaphone size={20} />, label: 'Ads' },
    { id: 'ai', icon: <Sparkles size={20} />, label: 'AI' },
  ];

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
        </div>
        <div className="text-center">
            <p className="text-slate-800 font-black text-sm uppercase tracking-[0.2em]">BizPulse</p>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Syncing Live Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
      {!isMobile && (
        <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp size={20} /></div>
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight">BizPulse</span>}
          </div>
          <nav className="flex-1 mt-6 px-4 space-y-2">
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as View)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${view === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
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
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {isMobile && <div className="bg-blue-600 p-1.5 rounded-lg text-white"><TrendingUp size={18} /></div>}
            <h1 className="text-lg font-bold capitalize text-slate-800">{view}</h1>
          </div>
          <div className="flex items-center gap-3">
            {lowStockProducts.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full text-xs font-bold">
                <AlertCircle size={14} />
                <span>{lowStockProducts.length}</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs shadow-inner">AD</div>
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
        <nav className="fixed-bottom fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center justify-center flex-1 h-16 gap-1 transition-all ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`${view === item.id ? 'bg-blue-50 p-2 rounded-xl' : 'p-2'}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

// --- View Sub-Components (Remained similar but now react to the onSnapshot data) ---

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Revenue" value={`$${metrics.totalRevenue.toFixed(0)}`} color="text-slate-900" icon={<DollarSign />} />
        <MetricCard label="Ad Spend" value={`$${metrics.totalAdSpend.toFixed(0)}`} color="text-red-500" icon={<Megaphone />} />
        <MetricCard label="Profit" value={`$${metrics.netProfit.toFixed(0)}`} color="text-emerald-600" icon={<BarChart3 />} />
      </div>
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">Weekly Performance</h4>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Revenue</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Ads</div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ads" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-1">
      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <div className={`${color.replace('text-', 'bg-').replace('600', '100').replace('500', '100').replace('900', '100')} p-1.5 rounded-lg`}>
        {React.cloneElement(icon, { size: 14, className: color })}
      </div>
    </div>
    <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
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
    <div className="space-y-4">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
        {showAdd ? <X size={20} /> : <Plus size={20} />} {showAdd ? 'Cancel' : 'Add Product'}
      </button>
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-lg space-y-3 border border-blue-50">
          <input placeholder="Name" className="w-full p-3 bg-gray-50 rounded-lg outline-none focus:ring-2 ring-blue-500/20" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Cost" type="number" step="0.01" className="w-full p-3 bg-gray-50 rounded-lg outline-none" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} required />
            <input placeholder="Price" type="number" step="0.01" className="w-full p-3 bg-gray-50 rounded-lg outline-none" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
          </div>
          <input placeholder="Stock" type="number" className="w-full p-3 bg-gray-50 rounded-lg outline-none" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          <button className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold active:bg-black">Save Product</button>
        </form>
      )}
      <div className="grid gap-3">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h4 className="font-bold">{p.name}</h4>
              <p className="text-xs text-gray-500">${p.price} • {p.category}</p>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <p className={`text-xl font-black ${p.stock < 10 ? 'text-amber-500' : 'text-slate-900'}`}>{p.stock}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">In Stock</p>
              </div>
              <button onClick={() => onDelete(p.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase">No products yet</p>
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
    await onAdd({ 
      productId: p.id, 
      quantity: qty, 
      date: new Date().toISOString().split('T')[0], 
      revenue: p.price * qty 
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
        {showAdd ? <X size={20} /> : <Plus size={20} />} Record Sale
      </button>
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-lg space-y-3 border border-emerald-50">
          <select className="w-full p-3 bg-gray-50 rounded-lg" value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
            <option value="">Select Item...</option>
            {products.map((p: any) => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} (${p.price}) {p.stock <= 0 ? '(Out of Stock)' : ''}</option>)}
          </select>
          <input placeholder="Quantity" type="number" min="1" className="w-full p-3 bg-gray-50 rounded-lg" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
          <button className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold">Confirm Transaction</button>
        </form>
      )}
      <div className="space-y-2">
        {sales.map((s: any) => (
          <div key={s.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm animate-in slide-in-from-right-2">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                <ShoppingCart size={16} />
              </div>
              <div>
                <p className="text-sm font-bold">{products.find((p: any) => p.id === s.productId)?.name || 'Unknown Item'}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">{s.date} • Qty {s.quantity}</p>
              </div>
            </div>
            <p className="text-emerald-600 font-black">${s.revenue.toFixed(2)}</p>
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
    <div className="space-y-4">
      <button onClick={() => setShowAdd(!showAdd)} className="w-full bg-red-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-100">
        {showAdd ? <X size={20} /> : <Plus size={20} />} Log Ad Spend
      </button>
      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-lg space-y-3 border border-red-50">
          <select className="w-full p-3 bg-gray-50 rounded-lg" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
            <option>Instagram</option><option>Facebook</option><option>TikTok</option><option>Google</option>
          </select>
          <input placeholder="Amount Spent" type="number" step="0.01" className="w-full p-3 bg-gray-50 rounded-lg" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          <input placeholder="People Reached" type="number" className="w-full p-3 bg-gray-50 rounded-lg" value={form.reach} onChange={e => setForm({...form, reach: e.target.value})} required />
          <button className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold">Save Ad Campaign</button>
        </form>
      )}
      <div className="grid gap-3">
        {ads.map((a: any) => (
          <div key={a.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-400">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-gray-400">{a.platform}</span>
              <span className="text-[10px] text-gray-300">{a.date}</span>
            </div>
            <p className="text-xl font-black text-red-500">${a.amount}</p>
            <p className="text-xs text-gray-500 font-medium">{a.reach.toLocaleString()} people reached</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIView = ({ insight, isLoading, onFetch }: any) => (
  <div className="max-w-xl mx-auto py-8 px-2 space-y-8 text-center">
    {!insight && !isLoading ? (
      <>
        <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200 rotate-6 active:rotate-0 transition-transform"><Sparkles size={48}/></div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">AI Business Insights</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">Get a professional analysis of your sales, stock, and ad performance.</p>
        <button onClick={onFetch} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-black">Analyze My Business</button>
      </>
    ) : isLoading ? (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="relative">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin opacity-20" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-500 animate-pulse" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Gemini is Thinking...</p>
      </div>
    ) : (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden text-left animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
                <Sparkles size={18} className="text-blue-400"/>
            </div>
            <h3 className="font-black text-sm uppercase tracking-wide">Business Report</h3>
          </div>
          <button onClick={onFetch} className="text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">Re-run</button>
        </div>
        <div className="p-6 md:p-8 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed prose prose-slate max-w-none">
            {insight}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Google Gemini</p>
        </div>
      </div>
    )}
  </div>
);

export default App;
