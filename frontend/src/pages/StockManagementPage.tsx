/**
 * Stock Management Page
 * หน้าจัดการสต็อก
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi, productsApi, suppliersApi, Product, StockItem } from '../services/api';
import { StockTable } from '../components/stock/StockTable';
import { StockHospcodeTable } from '../components/stock/StockHospcodeTable';
import { GoodsReceiptForm } from '../components/stock/GoodsReceiptForm';
import { StockAdjustmentForm } from '../components/stock/StockAdjustmentForm';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';

type TabType = 'stock' | 'receive' | 'adjust';

export const StockManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('stock');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const queryClient = useQueryClient();
  const stockHash = window.location.hash || '#/stock';
  const stockFilterMode = stockHash.includes('?')
    ? new URLSearchParams(stockHash.split('?')[1] || '').get('mode')
    : null;

  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await productsApi.getProducts();
      return res.data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await suppliersApi.getSuppliers();
      return res.data;
    },
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items'],
    queryFn: async () => {
      const res = await stockApi.getItems();
      return res.data;
    },
    enabled: activeTab === 'stock' && stockFilterMode === 'in-stock-by-hospcode',
  });

  const receiptMutation = useMutation({
    mutationFn: stockApi.createGoodsReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert('รับสินค้าเข้าเรียบร้อยแล้ว');
      setActiveTab('stock');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: stockApi.createAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert('ปรับสต็อกเรียบร้อยแล้ว');
      setActiveTab('stock');
      setSelectedProduct(undefined);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const handleReceive = () => setActiveTab('receive');
  const handleAdjust = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('adjust');
  };

  if (isLoading && !products.length) return <Loading fullScreen message="กำลังโหลดข้อมูล..." />;
  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลสต็อก" error={error as Error} onRetry={refetch} />;

  const tabs = [
    { id: 'stock' as TabType, label: '📦 สต็อกคงเหลือ' },
    { id: 'receive' as TabType, label: '📥 รับสินค้าเข้า' },
    { id: 'adjust' as TabType, label: '🔧 ปรับสต็อก' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📦 จัดการสต็อก</h2>
        <button
          onClick={handleReceive}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          + รับสินค้าเข้า
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'stock' && (
        stockFilterMode === 'in-stock-by-hospcode' ? (
          <StockHospcodeTable items={stockItems as StockItem[]} />
        ) : (
          <StockTable
            key={`stock-table-${stockFilterMode || 'all'}`}
            products={products}
            onReceive={handleReceive}
            onAdjust={handleAdjust}
            defaultInStockOnly={stockFilterMode === 'in-stock'}
          />
        )
      )}

      {activeTab === 'receive' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📥 รับสินค้าเข้าคลัง</h3>
          <GoodsReceiptForm
            suppliers={suppliers}
            products={products}
            onSubmit={async (data) => {
              await receiptMutation.mutateAsync(data);
            }}
            onCancel={() => setActiveTab('stock')}
            loading={receiptMutation.isPending}
          />
        </div>
      )}

      {activeTab === 'adjust' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 ปรับสต็อก</h3>
          {selectedProduct ? (
            <StockAdjustmentForm
              product={selectedProduct}
              onSubmit={async (data) => {
                await adjustmentMutation.mutateAsync(data);
              }}
              onCancel={() => { setActiveTab('stock'); setSelectedProduct(undefined); }}
              loading={adjustmentMutation.isPending}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>กรุณาเลือกสินค้าจากแท็บ "สต็อกคงเหลือ" ก่อน</p>
              <button
                onClick={() => setActiveTab('stock')}
                className="mt-3 text-blue-600 hover:underline text-sm"
              >
                ไปยังสต็อกคงเหลือ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockManagementPage;
