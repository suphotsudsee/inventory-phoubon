/**
 * Procurement Page
 * หน้าจัดซื้อจัดจ้าง
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi, suppliersApi, productsApi } from '../services/api';
import { Product, PurchaseOrder, Supplier } from '../services/api';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';

type TabType = 'orders' | 'create';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'แนวคิด', color: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-800' },
  ordered: { label: 'สั่งซื้อแล้ว', color: 'bg-blue-100 text-blue-800' },
  partial: { label: 'รับบางส่วน', color: 'bg-orange-100 text-orange-800' },
  received: { label: 'รับครบแล้ว', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800' },
};

export const ProcurementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await purchaseOrdersApi.getOrders();
      return response.data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await suppliersApi.getSuppliers();
      return response.data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await productsApi.getProducts();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: purchaseOrdersApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      alert('สร้างใบสั่งซื้อเรียบร้อยแล้ว');
      setActiveTab('orders');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.approveOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      alert('อนุมัติใบสั่งซื้อเรียบร้อยแล้ว');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  if (isLoading) return <Loading fullScreen message="กำลังโหลดข้อมูล..." />;
  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูล" error={error as Error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">🛒 จัดซื้อจัดจ้าง</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'orders' as TabType, label: '📋 รายการใบสั่งซื้อ' },
            { id: 'create' as TabType, label: '➕ สร้างใบสั่งซื้อ' },
          ].map(tab => (
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

      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">📋</p>
              <p>ยังไม่มีใบสั่งซื้อ</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-3 text-blue-600 hover:underline text-sm"
              >
                สร้างใบสั่งซื้อใหม่
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เลขที่ PO</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สั่ง</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">มูลค่า</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map(order => {
                    const status = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.poNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.supplierName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.orderDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          ฿{Number(order.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-600 hover:underline mr-2"
                          >
                            ดู
                          </button>
                          {order.status === 'pending_approval' && (
                            <button
                              onClick={() => approveMutation.mutate(order.id!)}
                              className="text-green-600 hover:underline"
                            >
                              อนุมัติ
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ สร้างใบสั่งซื้อใหม่</h3>
          <CreatePOForm
            suppliers={suppliers}
            products={products}
            onSubmit={createMutation.mutateAsync}
            onCancel={() => setActiveTab('orders')}
            loading={createMutation.isPending}
          />
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">รายละเอียดใบสั่งซื้อ {selectedOrder.poNumber}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">ซัพพลายเออร์:</span> {selectedOrder.supplierName}</div>
                <div><span className="text-gray-500">วันที่:</span> {selectedOrder.orderDate}</div>
                <div><span className="text-gray-500">มูลค่า:</span> ฿{Number(selectedOrder.totalAmount).toLocaleString('th-TH')}</div>
                <div>
                  <span className="text-gray-500">สถานะ:</span>{' '}
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                    STATUS_LABELS[selectedOrder.status]?.color || 'bg-gray-100 text-gray-700'
                  }`}>
                    {STATUS_LABELS[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
              </div>
              {selectedOrder.notes && (
                <div className="text-sm"><span className="text-gray-500">หมายเหตุ:</span> {selectedOrder.notes}</div>
              )}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">รายการสั่งซื้อ ({selectedOrder.items?.length || 0} รายการ)</h4>
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">สินค้า</th>
                      <th className="p-2 text-right">จำนวน</th>
                      <th className="p-2 text-right">ราคา/หน่วย</th>
                      <th className="p-2 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{item.productName}</td>
                        <td className="p-2 text-right">{item.quantity.toLocaleString('th-TH')}</td>
                        <td className="p-2 text-right">฿{Number(item.unitPrice).toLocaleString('th-TH')}</td>
                        <td className="p-2 text-right font-medium">฿{Number(item.totalPrice).toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline Create PO Form */
function CreatePOForm({
  suppliers,
  products,
  onSubmit,
  onCancel,
  loading,
}: {
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (data: Omit<PurchaseOrder, 'id' | 'createdAt'>) => Promise<unknown>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) { alert('กรุณาเลือกซัพพลายเออร์'); return; }
    if (!items.length || items.some(i => !i.productId)) { alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ'); return; }

    await onSubmit({
      poNumber: '',
      supplierId,
      supplierName: supplier.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate,
      status: 'draft',
      notes,
      totalAmount: total,
      items: items.map(item => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || '',
          unit: product?.unit || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        };
      }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ซัพพลายเออร์ *</label>
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="">-- เลือกซัพพลายเออร์ --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">วันที่คาดว่าจะได้รับ</label>
          <input
            type="date"
            value={expectedDate}
            onChange={e => setExpectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รายการสั่งซื้อ</label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2 items-end">
            <select
              value={item.productId}
              onChange={e => updateItem(i, 'productId', e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">-- เลือกสินค้า --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
            <input
              type="number"
              value={item.quantity}
              onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
              placeholder="จำนวน"
              min="1"
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="number"
              value={item.unitPrice}
              onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
              placeholder="ราคา/หน่วย"
              min="0"
              step="0.01"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-sm">
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-blue-600 hover:underline text-sm">
          + เพิ่มรายการ
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-right text-lg font-bold">
          มูลค่ารวม: ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'กำลังบันทึก...' : 'สร้างใบสั่งซื้อ'}
        </button>
      </div>
    </form>
  );
}

export default ProcurementPage;
