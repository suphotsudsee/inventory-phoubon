/**
 * Stock Adjustment Form
 * ฟอร์มปรับสต็อก
 */

import React, { useState } from 'react';
import { Product, StockAdjustment } from '../../services/api';

interface StockAdjustmentFormProps {
  product?: Product;
  onSubmit: (data: StockAdjustment) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const REASONS: { value: StockAdjustment['reason']; label: string }[] = [
  { value: 'count', label: 'ปรับจากการตรวจนับ' },
  { value: 'damage', label: 'สินค้าเสียหาย' },
  { value: 'expired', label: 'หมดอายุ' },
  { value: 'lost', label: 'สินค้าสูญหาย' },
  { value: 'found', label: 'พบสินค้าเพิ่ม' },
  { value: 'other', label: 'อื่นๆ' },
];

export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({
  product,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [lotNumber, setLotNumber] = useState('');
  const [newQty, setNewQty] = useState(product?.currentStock ?? 0);
  const [reason, setReason] = useState<StockAdjustment['reason']>('count');
  const [reasonDetail, setReasonDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const previousQty = product?.currentStock ?? 0;
  const diff = newQty - previousQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!lotNumber.trim()) { setError('กรุณาระบุ Lot No.'); return; }
    if (reason === 'other' && !reasonDetail.trim()) { setError('กรุณาระบุรายละเอียดเหตุผล'); return; }

    await onSubmit({
      productId: product?.id || '',
      productName: product?.name || '',
      lotNumber: lotNumber.trim(),
      previousQty,
      newQty,
      reason,
      reasonDetail: reason === 'other' ? reasonDetail.trim() : '',
      adjustmentDate: new Date().toISOString(),
      adjustedBy: '',
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Product Info */}
      {product && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">รหัสสินค้า</div>
              <div className="font-medium">{product.code}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-500 mb-0.5">ชื่อสินค้า</div>
              <div className="font-medium">{product.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">หน่วย</div>
              <div>{product.unit || '-'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lot No. *</label>
          <input
            type="text"
            value={lotNumber}
            onChange={e => setLotNumber(e.target.value)}
            placeholder="เช่น LOT-2026-001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">สต็อกปัจจุบัน</label>
          <input
            type="number"
            value={previousQty}
            disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนใหม่ *</label>
          <input
            type="number"
            value={newQty}
            onChange={e => setNewQty(Number(e.target.value) || 0)}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        <div className="flex items-end">
          <div className={`text-lg font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {diff >= 0 ? '+' : ''}{diff.toLocaleString('th-TH')} {product?.unit}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลการปรับสต็อก *</label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value as StockAdjustment['reason'])}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        >
          {REASONS.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {reason === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเหตุผล *</label>
          <input
            type="text"
            value={reasonDetail}
            onChange={e => setReasonDetail(e.target.value)}
            placeholder="กรุณาระบุเหตุผล"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {Math.abs(diff) > 100 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          ⚠️ การปรับสต็อกจำนวนมาก ({diff >= 0 ? '+' : ''}{diff.toLocaleString('th-TH')} {product?.unit}) กรุณาตรวจสอบให้แน่ใจก่อนบันทึก
        </div>
      )}

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
          {loading ? 'กำลังบันทึก...' : '💾 บันทึกการปรับสต็อก'}
        </button>
      </div>
    </form>
  );
};

export default StockAdjustmentForm;
