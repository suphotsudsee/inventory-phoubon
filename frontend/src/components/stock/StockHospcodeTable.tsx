import React, { useMemo, useState } from 'react';
import { StockItem } from '../../services/api';

interface StockHospcodeTableProps {
  items: StockItem[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const StockHospcodeTable: React.FC<StockHospcodeTableProps> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [hospcodeFilter, setHospcodeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const hospcodes = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.location).filter(Boolean))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !term
        || item.productName.toLowerCase().includes(term)
        || item.productCode.toLowerCase().includes(term)
        || item.location.toLowerCase().includes(term);
      const matchesHospcode = !hospcodeFilter || item.location === hospcodeFilter;
      return matchesSearch && matchesHospcode;
    });
  }, [items, search, hospcodeFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);
  const pageItems = filtered.slice(pageStart - 1, pageEnd);

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหา product code, product name, hospcode..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={hospcodeFilter}
              onChange={(e) => {
                setHospcodeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">ทุก hospcode</option>
              {hospcodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setSearch('');
              setHospcodeFilter('');
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            ล้าง
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Hospcode</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lot</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  ไม่พบรายการที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              pageItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.productName}</div>
                    <div className="text-xs text-gray-400">{item.productCode}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.location}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.lotNumber}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {item.quantity.toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.unit || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString('th-TH') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="text-gray-500">
          แสดง {pageStart}-{pageEnd} จาก {totalItems.toLocaleString('th-TH')} รายการ
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
              <option key={s} value={s}>{s} รายการ/หน้า</option>
            ))}
          </select>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span className="text-gray-600">หน้า {currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockHospcodeTable;
