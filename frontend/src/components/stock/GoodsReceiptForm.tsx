/**
 * Goods Receipt Form
 * ฟอร์มรับสินค้าเข้าคลัง
 */

import React, { useState } from 'react';
import { Supplier, Product, GoodsReceipt } from '../../services/api';

interface GoodsReceiptFormProps {
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (data: GoodsReceipt) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface ReceiptItem {
  productId: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
}

export const GoodsReceiptForm: React.FC<GoodsReceiptFormProps> = ({
  suppliers,
  products,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const [supplierId, setSupplierId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([
    { productId: '', lotNumber: '', expiryDate: '', quantity: 1, unitCost: 0 },
  ]);
  const [error, setError] = useState('');

  const addItem = () => {
    setItems([...items, { productId: '', lotNumber: '', expiryDate: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof ReceiptItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const total = items.reduce((s, item) => s + (item.quantity || 0) * (item.unitCost || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const supplier = safeSuppliers.find(s => s.id === supplierId);
    if (!supplier) { setError('กรุณาเลือกซัพพลายเออร์'); return; }
    if (items.some(i => !i.productId || !i.lotNumber || !i.expiryDate)) {
      setError('กรุณากรอกข้อมูลรายการให้ครบ'); return;
    }

    await onSubmit({
      supplierId,
      supplierName: supplier.name,
      receivedDate,
      invoiceNumber: invoiceNumber || undefined,
      notes: notes || undefined,
      items: items.map(item => {
        const product = safeProducts.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || '',
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unitCost: item.unitCost,
          location: 'MAIN',
        };
      }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ซัพพลายเออร์ *</label>
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">-- เลือกซัพพลายเออร์ --</option>
            {safeSuppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">วันที่รับ *</label>
          <input
            type="date"
            value={receivedDate}
            onChange={e => setReceivedDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบกำกับภาษี</label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={e => setInvoiceNumber(e.target.value)}
            placeholder="INV-2026-001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติม..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800 text-sm">📋 รายการรับเข้า ({items.length})</h4>
          <button
            type="button"
            onClick={addItem}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-600">สินค้า *</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 w-28">Lot No. *</th>
                <th className="px-2 py-2 text-left font-medium text-gray-600 w-32">วันหมดอายุ *</th>
                <th className="px-2 py-2 text-right font-medium text-gray-600 w-24">จำนวน *</th>
                <th className="px-2 py-2 text-right font-medium text-gray-600 w-28">ราคา/หน่วย</th>
                <th className="px-2 py-2 text-right font-medium text-gray-600 w-24">รวม</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <select
                      value={item.productId}
                      onChange={e => updateItem(i, 'productId', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">-- สินค้า --</option>
                      {safeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={item.lotNumber}
                      onChange={e => updateItem(i, 'lotNumber', e.target.value)}
                      placeholder="LOT-001"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      value={item.expiryDate}
                      onChange={e => updateItem(i, 'expiryDate', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 0)}
                      min="1"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={e => updateItem(i, 'unitCost', Number(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-700">
                    ฿{(item.quantity * item.unitCost).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {items.length} รายการ
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">มูลค่ารวม</div>
          <div className="text-2xl font-bold text-blue-700">
            ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'กำลังบันทึก...' : '💾 บันทึกรับเข้า'}
        </button>
      </div>
    </form>
  );
};

export default GoodsReceiptForm;
