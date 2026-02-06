
export interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
  category: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  date: string;
  revenue: number;
}

export interface AdSpend {
  id: string;
  platform: string;
  amount: number;
  date: string;
  reach: number;
}

export interface AppState {
  products: Product[];
  sales: Sale[];
  ads: AdSpend[];
}

export type View = 'dashboard' | 'inventory' | 'sales' | 'ads' | 'ai';
