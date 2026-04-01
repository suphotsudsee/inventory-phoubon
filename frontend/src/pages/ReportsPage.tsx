/**
 * Reports Page
 * หน้ารายงาน
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../services/api';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';

type TabType = 'valuation' | 'movements' | 'expiry' | 'supplier';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('valuation');
  const [expiryDays, setExpiryDays] = useState(90);

  const { data: valuation = [], isLoading: valuationLoading, error: valuationError } = useQuery({
    queryKey: ['report-valuation'],
    queryFn: async () => {
      const response = await reportsApi.getInventoryValuation();
      return response.data;
    },
    enabled: activeTab === 'valuation',
  });

  const { data: movements = [], isLoading: movementsLoading, error: movementsError } = useQuery({
    queryKey: ['report-movements'],
    queryFn: async () => {
      const response = await reportsApi.getStockMovements();
      return response.data;
    },
    enabled: activeTab === 'movements',
  });

  const { data: expiry = [], isLoading: expiryLoading, error: expiryError } = useQuery({
    queryKey: ['report-expiry', expiryDays],
    queryFn: async () => {
      const response = await reportsApi.getExpiryReport({ days: expiryDays });
      return response.data;
    },
    enabled: activeTab === 'expiry',
  });

  const { data: supplierPerf = [], isLoading: supplierLoading, error: supplierError } = useQuery({
    queryKey: ['report-supplier'],
    queryFn: async () => {
      const response = await reportsApi.getSupplierPerformance();
      return response.data;
    },
    enabled: activeTab === 'supplier',
  });

  const tabs = [
    { id: 'valuation' as TabType, label: '💰 มูลค่าสต็อก' },
    { id: 'movements' as TabType, label: '📊 การเคลื่อนไหว' },
    { id: 'expiry' as TabType, label: '⚠️ รายงานหมดอายุ' },
    { id: 'supplier' as TabType, label: '🏭 ซัพพลายเออร์' },
  ];

  const totalValue = (valuation as any[]).reduce((s: number, r: any) => s + Number(r.totalValue || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">📈 รายงาน</h2>

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

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow p-6">

        {/* === Valuation Report === */}
        {activeTab === 'valuation' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">รายงานมูลค่าสต็อก</h3>
              <div className="text-right">
                <div className="text-sm text-gray-500">มูลค่ารวมทั้งหมด</div>
                <div className="text-2xl font-bold text-blue-600">
                  ฿{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            {valuationLoading && <Loading message="กำลังโหลด..." />}
            {valuationError && <ErrorState message="ไม่สามารถโหลดรายงาน" error={valuationError as Error} />}
            {(valuation as any[]).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">หมวดหมู่</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวนรายการ</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวนรวม</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">มูลค่า</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">สัดส่วน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(valuation as any[]).map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.category}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(row.itemCount || 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(row.totalQuantity || 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">฿{Number(row.totalValue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(row.percentage || 0).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
            )}
          </>
        )}

        {/* === Movements Report === */}
        {activeTab === 'movements' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">รายงานการเคลื่อนไหวสต็อก</h3>
            {movementsLoading && <Loading message="กำลังโหลด..." />}
            {movementsError && <ErrorState message="ไม่สามารถโหลดรายงาน" error={movementsError as Error} />}
            {(movements as any[]).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(movements as any[]).slice(0, 100).map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.date ? new Date(row.date).toLocaleDateString('th-TH') : '-'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                            row.movementType === 'receipt' ? 'bg-green-100 text-green-800' :
                            row.movementType === 'deduct' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {row.movementType === 'receipt' ? 'รับเข้า' :
                             row.movementType === 'deduct' ? 'ตัดสต็อก' :
                             row.movementType === 'adjustment' ? 'ปรับสต็อก' : row.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{Number(row.quantity).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">ไม่มีข้อมูลการเคลื่อนไหว</div>
            )}
          </>
        )}

        {/* === Expiry Report === */}
        {activeTab === 'expiry' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">รายงานยาใกล้หมดอายุ</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">ดูยาที่จะหมดอายุภายใน</label>
                <select
                  value={expiryDays}
                  onChange={e => setExpiryDays(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={30}>30 วัน</option>
                  <option value={60}>60 วัน</option>
                  <option value={90}>90 วัน</option>
                  <option value={180}>180 วัน</option>
                </select>
              </div>
            </div>
            {expiryLoading && <Loading message="กำลังโหลด..." />}
            {expiryError && <ErrorState message="ไม่สามารถโหลดรายงาน" error={expiryError as Error} />}
            {(expiry as any[]).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สินค้า</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lot No.</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันหมดอายุ</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">เหลือ (วัน)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(expiry as any[]).map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.lotNumber}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(row.quantity || 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-gray-600">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('th-TH') : '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{Number(row.daysUntilExpiry || 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                            row.status === 'critical' ? 'bg-red-100 text-red-800' :
                            row.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {row.status === 'critical' ? '⚠️ วิกฤต' :
                             row.status === 'warning' ? '⚡ เตือน' : '✅ ปกติ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">ไม่มีรายการใกล้หมดอายุ</div>
            )}
          </>
        )}

        {/* === Supplier Performance === */}
        {activeTab === 'supplier' && (
          <>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">รายงานผลการทำงานของซัพพลายเออร์</h3>
            {supplierLoading && <Loading message="กำลังโหลด..." />}
            {supplierError && <ErrorState message="ไม่สามารถโหลดรายงาน" error={supplierError as Error} />}
            {(supplierPerf as any[]).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">จำนวน PO</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">ส่งตรงเวลา</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">มูลค่ารวม</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วันที่สั่งล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(supplierPerf as any[]).map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.supplierName}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{Number(row.totalOrders || 0).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-green-600 font-medium">{Number(row.onTimeDelivery || 0).toLocaleString('th-TH')}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">฿{Number(row.totalSpend || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-gray-600">{row.lastOrderDate ? new Date(row.lastOrderDate).toLocaleDateString('th-TH') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">ไม่มีข้อมูลซัพพลายเออร์</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
