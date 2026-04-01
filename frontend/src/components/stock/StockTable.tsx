/**
 * Stock Table Component
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Product } from '../../services/api';

interface StockTableProps {
  products: Product[];
  onReceive?: (product: Product) => void;
  onAdjust?: (product: Product) => void;
  defaultInStockOnly?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const StockTable: React.FC<StockTableProps> = ({
  products,
  onReceive,
  onAdjust,
  defaultInStockOnly = false,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(defaultInStockOnly);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setInStockOnly(defaultInStockOnly);
    setCurrentPage(1);
  }, [defaultInStockOnly]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(s) ||
        p.code?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s)
      );
    }

    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
    }

    if (inStockOnly) {
      list = list.filter((p) => p.currentStock > 0);
    }

    if (lowStockOnly) {
      list = list.filter((p) => p.currentStock <= p.minLevel);
    }

    return list;
  }, [products, search, categoryFilter, inStockOnly, lowStockOnly]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);
  const pageItems = filtered.slice(pageStart - 1, pageEnd);

  const getStockLevel = (p: Product) => {
    const pct = p.maxLevel > 0 ? (p.currentStock / p.maxLevel) * 100 : 0;
    if (p.currentStock === 0) return { label: 'หมด', color: 'bg-red-100 text-red-800' };
    if (p.currentStock <= p.minLevel) return { label: 'ต่ำ', color: 'bg-yellow-100 text-yellow-800' };
    if (pct <= 30) return { label: 'ต่ำ', color: 'bg-yellow-100 text-yellow-800' };
    if (pct <= 70) return { label: 'ปกติ', color: 'bg-green-100 text-green-800' };
    return { label: 'สูง', color: 'bg-blue-100 text-blue-800' };
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-3">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                placeholder="ค้นหาชื่อสินค้า, รหัส หรือบาร์โค้ด..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">มีสต็อก</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">สต็อกต่ำ</span>
            </label>

            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setInStockOnly(false);
                setLowStockOnly(false);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ล้าง
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">รายการ</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">หมวดหมู่</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">หน่วย</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">สต็อก</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">ขั้นต่ำ</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">ราคา/หน่วย</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">สถานะ</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <div className="mb-2 text-3xl">H</div>
                  ไม่พบรายการที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              pageItems.map((product) => {
                const level = getStockLevel(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-400">{product.code}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{product.category || '-'}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{product.unit || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">
                        {product.currentStock.toLocaleString('th-TH')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {product.minLevel.toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">
                      {product.unitCost > 0
                        ? `฿${product.unitCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${level.color}`}>
                        {level.label}
                      </span>
                      {product.currentStock <= product.reorderPoint && (
                        <div className="mt-0.5 text-xs text-red-500">ต้องสั่งซื้อ</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {onReceive && (
                          <button
                            onClick={() => onReceive(product)}
                            className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            รับเข้า
                          </button>
                        )}
                        {onAdjust && (
                          <button
                            onClick={() => onAdjust(product)}
                            className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          >
                            ปรับสต็อก
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="text-gray-500">
          แสดง {pageStart}-{pageEnd} จาก {totalItems.toLocaleString('th-TH')} รายการ
          {filtered.length < products.length && (
            <span className="ml-1 text-blue-600">
              (กรองจาก {products.length.toLocaleString('th-TH')} รายการ)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} รายการ/หน้า
              </option>
            ))}
          </select>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span className="text-gray-600">
            หน้า {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockTable;
