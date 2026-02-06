
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
  ChevronRight,
  Menu,
  X,
  DollarSign,
  Layers,
  BarChart3
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
  Cell
} from 'recharts';
import { Product, Sale, AdSpend, AppState, View } from './types';
import { getAIInsights } from './services/geminiService';

// Initial Mock Data
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Premium Coffee Beans', cost: 12.50, price: 29.99, stock: 45, category: 'Food' },
  { id: '2', name: 'Eco-friendly Mug', cost: 4.20, price: 15.00, stock: 120, category: 'Apparel' },
  { id: '3', name: 'Stainless Straw Set', cost: 1.50, price: 8.99, stock: 8, category: 'Accessories' },
];

const INITIAL_SALES: Sale[] = [
  { id: 's1', productId: '1', quantity: 2, date: '2024-05-15', revenue: 59.98 },
  { id: 's2', productId: '2', quantity: 10, date: '2024-05-16', revenue: 150.00 },
  { id: 's3', productId: '1', quantity: 1, date: '2024-05-17', revenue: 29.99 },
];

const INITIAL_ADS: AdSpend[] = [
  { id: 'a1', platform: 'Instagram', amount: 50.00, date: '2024-05-10', reach: 5000 },
  { id: 'a2', platform: 'Google', amount: 120.00, date: '2024-05-12', reach: 12000 },
];

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [ads, setAds] = useState<AdSpend[]>(INITIAL_ADS);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Derived Metrics
  const totalRevenue = useMemo(() => sales.reduce((sum, s) => sum + s.revenue, 0), [sales]);
  const totalAdSpend = useMemo(() => ads.reduce((sum, a) => sum + a.amount, 0), [ads]);
  const totalCostOfGoods = useMemo(() => {
    return sales.reduce((sum, s) => {
      const p = products.find(prod => prod.id === s.productId);
      return sum + (p ? p.cost * s.quantity : 0);
    }, 0);
  }, [sales, products]);
  const netProfit = totalRevenue - totalCostOfGoods - totalAdSpend;
  const lowStockProducts = useMemo(() => products.filter(p => p.stock < 10), [products]);

  const fetchAI = async () => {
    setIsAiLoading(true);
    const result = await getAIInsights({ products, sales, ads });
    setAiInsight(result);
    setIsAiLoading(false);
  };

  const addProduct = (p: Omit<Product, 'id'>) => {
    setProducts([...products, { ...p, id: Date.now().toString() }]);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addSale = (s: Omit<Sale, 'id'>) => {
    const saleId = Date.now().toString();
    setSales([...sales, { ...s, id: saleId }]);
    setProducts(products.map(p => {
      if (p.id === s.productId) return { ...p, stock: p.stock - s.quantity };
      return p;
    }));
  };

  const addAdSpend = (a: Omit<AdSpend, 'id'>) => {
    setAds([...ads, { ...a, id: Date.now().toString() }]);
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard': return <DashboardView metrics={{ totalRevenue, totalAdSpend, netProfit }} sales={sales} ads={ads} products={products} />;
      case 'inventory': return <InventoryView isMobile={isMobile} products={products} onAdd={addProduct} onRemove={removeProduct} />;
      case 'sales': return <SalesView isMobile={isMobile} sales={sales} products={products} onAdd={addSale} />;
      case 'ads': return <AdsView isMobile={isMobile} ads={ads} onAdd={addAdSpend} />;
      case 'ai': return <AIView insight={aiInsight} isLoading={isAiLoading} onFetch={fetchAI} />;
      default: return null;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { id: 'inventory', icon: <Package size={20} />, label: 'Stock' },
    { id: 'sales', icon: <ShoppingCart size={20} />, label: 'Sales' },
    { id: 'ads', icon: <Megaphone size={20} />, label: 'Ads' },
    { id: 'ai', icon: <Sparkles size={20} />, label: 'AI' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      {!isMobile && (
        <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col hidden md:flex`}>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto pb-20 md:pb-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {isMobile && <div className="bg-blue-600 p-1.5 rounded-lg text-white"><TrendingUp size={18} /></div>}
            <h1 className="text-lg font-bold capitalize text-slate-800">
              {isMobile ? navItems.find(i => i.id === view)?.label : view}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lowStockProducts.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full text-xs font-bold">
                <AlertCircle size={14} />
                <span>{lowStockProducts.length}</span>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">
              AD
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Nav - Mobile Only */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-2 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`}
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

// --- Sub-Components ---

const MetricCard: React.FC<{ label: string, value: string | number, sub: string, color: string, icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
    <div className="flex justify-between items-start">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">{label}</p>
      <div className={`p-1.5 rounded-lg opacity-80 ${color.replace('text-', 'bg-').replace('600', '100')}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 16, className: color })}
      </div>
    </div>
    <h3 className={`text-2xl font-black tracking-tight ${color}`}>{value}</h3>
    <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
  </div>
);

const DashboardView: React.FC<{ metrics: any, sales: Sale[], ads: AdSpend[], products: Product[] }> = ({ metrics, sales, ads, products }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();
    return last7Days.map(date => ({
      date: date.split('-').slice(1).join('/'), // Simpler date for mobile
      revenue: sales.filter(s => s.date === date).reduce((sum, s) => sum + s.revenue, 0),
      ads: ads.filter(a => a.date === date).reduce((sum, a) => sum + a.amount, 0),
    }));
  }, [sales, ads]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Revenue" value={`$${metrics.totalRevenue.toFixed(0)}`} sub="Lifetime gross" color="text-slate-900" icon={<DollarSign />} />
        <MetricCard label="Ad Spend" value={`$${metrics.totalAdSpend.toFixed(0)}`} sub="Total marketing" color="text-red-500" icon={<Megaphone />} />
        <MetricCard label="Profit" value={`$${metrics.netProfit.toFixed(0)}`} sub="Net earnings" color="text-emerald-600" icon={<BarChart3 />} />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" /> Performance History
        </h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ads" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const InventoryView: React.FC<{ isMobile: boolean, products: Product[], onAdd: (p: any) => void, onRemove: (id: string) => void }> = ({ isMobile, products, onAdd, onRemove }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', cost: '', price: '', stock: '', category: 'General' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name: formData.name,
      cost: parseFloat(formData.cost),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      category: formData.category
    });
    setFormData({ name: '', cost: '', price: '', stock: '', category: 'General' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h3 className="font-bold text-slate-800">Inventory</h3>
          <p className="text-xs text-slate-500 font-medium">{products.length} Items</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 active:scale-95 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-blue-200"
        >
          {showAdd ? <X size={20} /> : <Plus size={24} />}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <input placeholder="Product Name" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Cost ($)" required type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
            <input placeholder="Price ($)" required type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Initial Stock" required type="number" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option>General</option>
              <option>Food</option>
              <option>Apparel</option>
              <option>Accessories</option>
              <option>Digital</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black tracking-wide shadow-lg shadow-blue-100 uppercase text-sm">Add to Stock</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">{p.category}</span>
                <span className={`text-[10px] font-black uppercase ${p.stock < 10 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {p.stock < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <h4 className="font-bold text-slate-800">{p.name}</h4>
              <p className="text-xs text-slate-400 font-medium">Cost: ${p.cost} | Price: ${p.price}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-black text-slate-800">{p.stock}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Qty</p>
              </div>
              <button onClick={() => onRemove(p.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SalesView: React.FC<{ isMobile: boolean, sales: Sale[], products: Product[], onAdd: (s: any) => void }> = ({ isMobile, sales, products, onAdd }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ productId: '', quantity: '1' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find(prod => prod.id === formData.productId);
    if (!p) return;
    onAdd({
      productId: formData.productId,
      quantity: parseInt(formData.quantity),
      date: new Date().toISOString().split('T')[0],
      revenue: p.price * parseInt(formData.quantity)
    });
    setShowAdd(false);
    setFormData({ productId: '', quantity: '1' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h3 className="font-bold text-slate-800">Sales Log</h3>
          <p className="text-xs text-slate-500 font-medium">{sales.length} Transactions</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 active:scale-95 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200"
        >
          {showAdd ? <X size={20} /> : <Plus size={24} />}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <select required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
            <option value="">Select Product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
          </select>
          <input placeholder="Quantity" required type="number" min="1" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black tracking-wide shadow-lg shadow-emerald-100 uppercase text-sm">Confirm Sale</button>
        </form>
      )}

      <div className="space-y-4">
        {[...sales].reverse().map(s => {
          const p = products.find(prod => prod.id === s.productId);
          return (
            <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{p?.name || 'Item'}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{s.date} • Qty: {s.quantity}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-emerald-600">${s.revenue.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdsView: React.FC<{ isMobile: boolean, ads: AdSpend[], onAdd: (a: any) => void }> = ({ isMobile, ads, onAdd }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ platform: 'Instagram', amount: '', reach: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      platform: formData.platform,
      amount: parseFloat(formData.amount),
      reach: parseInt(formData.reach),
      date: new Date().toISOString().split('T')[0]
    });
    setShowAdd(false);
    setFormData({ platform: 'Instagram', amount: '', reach: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h3 className="font-bold text-slate-800">Ads & Marketing</h3>
          <p className="text-xs text-slate-500 font-medium">{ads.length} Campaigns</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-red-500 active:scale-95 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-red-200"
        >
          {showAdd ? <X size={20} /> : <Plus size={24} />}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-red-100 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
            <option>Instagram</option>
            <option>Facebook</option>
            <option>Google</option>
            <option>TikTok</option>
          </select>
          <input placeholder="Spend Amount ($)" required type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          <input placeholder="Estimated Reach" required type="number" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3" value={formData.reach} onChange={e => setFormData({...formData, reach: e.target.value})} />
          <button type="submit" className="w-full bg-red-500 text-white py-4 rounded-xl font-black tracking-wide shadow-lg shadow-red-100 uppercase text-sm">Record Spend</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {ads.map(a => (
          <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 text-red-500 p-2.5 rounded-xl">
                  <Megaphone size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{a.platform}</p>
                  <h4 className="font-black text-slate-800 text-xl">${a.amount.toFixed(2)}</h4>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">{a.date}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <span className="text-xs text-slate-500 font-medium">Estimated Reach</span>
              <span className="text-xs font-black text-slate-800">{a.reach.toLocaleString()} users</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIView: React.FC<{ insight: string | null, isLoading: boolean, onFetch: () => void }> = ({ insight, isLoading, onFetch }) => {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center px-2">
      {!insight && !isLoading && (
        <div className="space-y-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200 rotate-12">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">AI Business Coach</h2>
          <p className="text-gray-500 text-sm font-medium max-w-xs mx-auto">
            Ready to scale? I'll analyze your stock, sales, and ads to give you the perfect game plan.
          </p>
          <button 
            onClick={onFetch}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black tracking-widest shadow-xl transition-all active:scale-95 uppercase text-xs"
          >
            Generate Report
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-6 flex flex-col items-center">
          <div className="flex space-x-3">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-.1s]"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-.2s]"></div>
          </div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Crunching the numbers...</p>
        </div>
      )}

      {insight && !isLoading && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden text-left animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-blue-400" />
              <h3 className="font-black text-sm uppercase tracking-wider">Strategy Report</h3>
            </div>
            <button onClick={onFetch} className="text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded">
              Recalculate
            </button>
          </div>
          <div className="p-6">
            <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-medium">
              {insight}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
            <AlertCircle size={12} />
            Powered by Gemini AI
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
