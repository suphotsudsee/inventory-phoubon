import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('phoubon_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('phoubon_token');
      localStorage.removeItem('phoubon_user');
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

// ========== Types ==========

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface DashboardSummary {
  totalStockValue: number;
  expiringSoon: number;
  lowStockCount: number;
  pendingApprovals: number;
  recentTransactions: number;
  totalProducts: number;
  productsInStock: number;
  totalSuppliers: number;
}

export interface ExpiryAlert {
  id: string;
  productId: string;
  productName: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  status: 'critical' | 'warning' | 'normal';
  daysUntilExpiry: number;
  location?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minLevel: number;
  maxLevel: number;
  currentStock: number;
  reorderPoint: number;
  unitCost: number;
  supplierId?: string;
  barcode?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  location: string;
  status: 'available' | 'reserved' | 'expired' | 'damaged';
  receivedDate: string;
  unitCost: number;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  location: string;
}

export interface GoodsReceipt {
  id?: string;
  supplierId: string;
  supplierName: string;
  receivedDate: string;
  invoiceNumber?: string;
  items: GoodsReceiptItem[];
  notes?: string;
}

export interface StockAdjustment {
  id?: string;
  productId: string;
  productName: string;
  lotNumber: string;
  previousQty: number;
  newQty: number;
  reason: 'damage' | 'expired' | 'lost' | 'found' | 'count' | 'other';
  reasonDetail: string;
  adjustmentDate: string;
  adjustedBy: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  paymentTerms: string;
  rating: number;
  active: boolean;
  createdAt: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'partial' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
  approvedBy?: string;
  approvedDate?: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  active: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryValuation {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  lotNumber?: string;
  movementType: 'receipt' | 'dispensing' | 'adjustment' | 'transfer_in' | 'transfer_out';
  quantity: number;
  unit: string;
  reference?: string;
  performedBy: string;
  notes?: string;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDelivery: number;
  qualityScore: number;
  avgLeadTime: number;
  totalSpend: number;
  lastOrderDate: string;
  issues: number;
}

// ========== Auth API ==========

export const authApi = {
  login: (data: { username: string; password: string }) => 
    api.post<LoginResponse>('/auth/login', data),
  logout: () => api.post<{ success: boolean }>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
};

// ========== Dashboard API ==========

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getExpiryAlerts: (days?: number) => 
    api.get<ExpiryAlert[]>('/dashboard/expiry-alerts', { params: { days } }),
  getLowStock: () => api.get<Product[]>('/dashboard/low-stock'),
};

// ========== Products API ==========

export const productsApi = {
  getProducts: (params?: { search?: string; category?: string; lowStock?: boolean }) => 
    api.get<Product[]>('/products', { params }),
  getProduct: (id: string) => api.get<Product>(`/products/${id}`),
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => 
    api.post<Product>('/products', data),
  updateProduct: (id: string, data: Partial<Product>) => 
    api.put<Product>(`/products/${id}`, data),
  deleteProduct: (id: string) => 
    api.delete<{ success: boolean }>(`/products/${id}`),
  getCategories: () => api.get<string[]>('/products/categories'),
};

// ========== Stock API ==========

export const stockApi = {
  getItems: (productId?: string) => 
    api.get<StockItem[]>('/stock/items', { params: { productId } }),
  createGoodsReceipt: (data: GoodsReceipt) => 
    api.post<GoodsReceipt>('/stock/goods-receipt', data),
  createAdjustment: (data: StockAdjustment) => 
    api.post<StockAdjustment>('/stock/adjustment', data),
  deductStock: (data: { productId: string; lotNumber: string; quantity: number; notes?: string }) => 
    api.post('/stock/deduct', data),
  scanBarcode: (barcode: string) => 
    api.get<Product & { stockItems: StockItem[] }>(`/stock/scan/${barcode}`),
};

// ========== Purchase Orders API ==========

export const purchaseOrdersApi = {
  getOrders: (params?: { status?: string; supplierId?: string }) => 
    api.get<PurchaseOrder[]>('/purchase-orders', { params }),
  getOrder: (id: string) => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
  createOrder: (data: Omit<PurchaseOrder, 'id' | 'createdAt'>) => 
    api.post<PurchaseOrder>('/purchase-orders', data),
  approveOrder: (id: string) => api.post(`/purchase-orders/${id}/approve`),
  rejectOrder: (id: string, reason: string) => 
    api.post(`/purchase-orders/${id}/reject`, { reason }),
  getPending: () => api.get<PurchaseOrder[]>('/purchase-orders/pending'),
};

// ========== Suppliers API ==========

export const suppliersApi = {
  getSuppliers: () => api.get<Supplier[]>('/suppliers'),
  createSupplier: (data: Omit<Supplier, 'id' | 'createdAt'>) => 
    api.post<Supplier>('/suppliers', data),
  updateSupplier: (id: string, data: Partial<Supplier>) => 
    api.put<Supplier>(`/suppliers/${id}`, data),
  deleteSupplier: (id: string) => 
    api.delete<{ success: boolean }>(`/suppliers/${id}`),
};

// ========== Users API ==========

export const usersApi = {
  getUsers: () => api.get<User[]>('/users'),
  createUser: (data: { username: string; fullName: string; email?: string; role: User['role']; password: string; active: boolean }) => 
    api.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User> & { password?: string }) => 
    api.put<User>(`/users/${id}`, data),
  deleteUser: (id: string) => 
    api.delete<{ success: boolean }>(`/users/${id}`),
};

// ========== Reports API ==========

export const reportsApi = {
  getInventoryValuation: (filter?: { startDate?: string; endDate?: string; category?: string }) => 
    api.get<InventoryValuation[]>('/reports/inventory-valuation', { params: filter }),
  getStockMovements: (filter?: { startDate?: string; endDate?: string; productId?: string }) => 
    api.get<StockMovement[]>('/reports/stock-movements', { params: filter }),
  getExpiryReport: (filter?: { days?: number }) => 
    api.get<ExpiryAlert[]>('/reports/expiry', { params: filter }),
  getSupplierPerformance: (supplierId?: string) => 
    api.get<SupplierPerformance[]>('/reports/supplier-performance', { params: { supplierId } }),
};

export default api;
