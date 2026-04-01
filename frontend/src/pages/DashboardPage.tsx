import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, ExpiryAlert } from '../services/api';
import { ErrorState } from '../components/common/ErrorState';
import { Loading } from '../components/common/Loading';
import { Modal } from '../components/common/Modal';

export const DashboardPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedExpiryAlert, setSelectedExpiryAlert] = useState<ExpiryAlert | null>(null);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['dashboard-summary', refreshKey],
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const {
    data: expiryAlerts,
    isLoading: alertsLoading,
  } = useQuery({
    queryKey: ['expiry-alerts', refreshKey],
    queryFn: async () => {
      const response = await dashboardApi.getExpiryAlerts(90);
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock', refreshKey],
    queryFn: async () => {
      const response = await dashboardApi.getLowStock();
      return response.data;
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  if (summaryLoading && !summary) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  if (summaryError) {
    return (
      <ErrorState
        message="Unable to load dashboard"
        error={summaryError as Error}
        onRetry={() => refetchSummary()}
      />
    );
  }

  const statsCards = [
    {
      title: 'Total Stock Value',
      value: summary ? `฿${summary.totalStockValue.toLocaleString('th-TH')}` : '฿0',
      color: 'blue',
      icon: 'V',
      hash: '#/stock',
    },
    {
      title: 'Low Stock',
      value: summary?.lowStockCount || 0,
      subtitle: 'Need reorder',
      color: 'yellow',
      icon: 'L',
      hash: '#/stock',
    },
    {
      title: 'Expiring Soon',
      value: summary?.expiringSoon || 0,
      subtitle: 'Items',
      color: 'red',
      icon: 'E',
      hash: '#/reports',
    },
    {
      title: 'Pending PO',
      value: summary?.pendingApprovals || 0,
      subtitle: 'Orders',
      color: 'purple',
      icon: 'P',
      hash: '#/procurement',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">
            Updated: {new Date().toLocaleString('th-TH')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              window.location.hash = card.hash;
            }}
            className={`rounded-lg border-l-4 bg-white p-6 text-left shadow transition-shadow hover:shadow-md ${
              card.color === 'blue'
                ? 'border-l-blue-500'
                : card.color === 'yellow'
                  ? 'border-l-yellow-500'
                  : card.color === 'red'
                    ? 'border-l-red-500'
                    : 'border-l-purple-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                {card.subtitle && <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>}
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Total Products</div>
          <div className="text-xl font-bold text-gray-900">{summary?.totalProducts || 0}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/stock?mode=in-stock-by-hospcode';
          }}
          className="rounded-lg bg-white p-4 text-left shadow transition-shadow hover:shadow-md"
        >
          <div className="text-sm text-gray-500">Products In Stock</div>
          <div className="text-xl font-bold text-gray-900">{summary?.productsInStock || 0}</div>
        </button>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Suppliers</div>
          <div className="text-xl font-bold text-gray-900">{summary?.totalSuppliers || 0}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm text-gray-500">Transactions Today</div>
          <div className="text-xl font-bold text-gray-900">{summary?.recentTransactions || 0}</div>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Expiring Soon</h3>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/reports';
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>

          {alertsLoading ? (
            <Loading message="Loading..." />
          ) : expiryAlerts && expiryAlerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lot No.</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expiry Date</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Days Left</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {expiryAlerts.slice(0, 5).map((alert) => (
                    <tr
                      key={alert.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedExpiryAlert(alert)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{alert.productName}</div>
                        <div className="text-xs text-gray-400">{alert.productId}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">{alert.lotNumber}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {new Date(alert.expiryDate).toLocaleDateString('th-TH')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {alert.quantity.toLocaleString('th-TH')} {alert.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span className={`font-medium ${alert.daysUntilExpiry <= 30 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {alert.daysUntilExpiry} days
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            alert.status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : alert.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No expiring items in the next 90 days</div>
          )}
        </div>
      </div>

      {lowStockItems && lowStockItems.length > 0 && (
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Low Stock Items</h3>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/stock';
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Current Stock</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Min Level</th>
                    <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.code}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                        {item.currentStock.toLocaleString('th-TH')} {item.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                        {item.minLevel.toLocaleString('th-TH')} {item.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">low</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedExpiryAlert}
        onClose={() => setSelectedExpiryAlert(null)}
        title={selectedExpiryAlert ? `Details ${selectedExpiryAlert.productName}` : 'Details'}
        size="lg"
      >
        {selectedExpiryAlert && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Product Code</div>
                <div className="font-medium text-gray-900">{selectedExpiryAlert.productId}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Lot No.</div>
                <div className="font-medium text-gray-900">{selectedExpiryAlert.lotNumber}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Expiry Date</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedExpiryAlert.expiryDate).toLocaleDateString('th-TH')}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Quantity</div>
                <div className="font-medium text-gray-900">
                  {selectedExpiryAlert.quantity.toLocaleString('th-TH')} {selectedExpiryAlert.unit}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Status</div>
                <div className="font-medium text-gray-900">{selectedExpiryAlert.status}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-500">Days Left</div>
                <div className="font-medium text-gray-900">{selectedExpiryAlert.daysUntilExpiry} days</div>
              </div>
            </div>

            {selectedExpiryAlert.location && (
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Location</div>
                <div className="mt-1 font-medium text-gray-900">{selectedExpiryAlert.location}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DashboardPage;
