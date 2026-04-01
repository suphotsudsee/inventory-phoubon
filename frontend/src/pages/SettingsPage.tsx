/**
 * Settings Page
 * หน้าตั้งค่าระบบ - จัดการผู้ใช้
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, User } from '../services/api';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersApi.getUsers();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      alert('สร้างผู้ใช้เรียบร้อยแล้ว');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setEditingUser(null);
      alert('อัปเดตผู้ใช้เรียบร้อยแล้ว');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('ลบผู้ใช้เรียบร้อยแล้ว');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  if (isLoading) return <Loading fullScreen message="กำลังโหลด..." />;
  if (error) return <ErrorState message="ไม่สามารถโหลดข้อมูลผู้ใช้" error={error as Error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">⚙️ ตั้งค่าระบบ</h2>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            + เพิ่มผู้ใช้ใหม่
          </button>
        )}
      </div>

      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">👥 จัดการผู้ใช้งาน</h3>
          <p className="text-sm text-gray-500 mt-1">จำนวนผู้ใช้ทั้งหมด: {users.length} คน</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สิทธิ์</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เข้าใช้ล่าสุด</th>
                {currentUser?.role === 'admin' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(users as User[]).map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                  <td className="px-4 py-3 text-gray-600">{user.fullName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'staff' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('th-TH') : '-'}
                  </td>
                  {currentUser?.role === 'admin' && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:underline text-sm mr-2"
                      >
                        แก้ไข
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            if (confirm(`ลบผู้ใช้ "${user.username}" ?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="text-red-600 hover:underline text-sm"
                        >
                          ลบ
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">ℹ️ ข้อมูลระบบ</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500">ชื่อระบบ</div>
            <div className="font-medium">ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500">เวอร์ชัน</div>
            <div className="font-medium">1.0.0</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500">สถานะ</div>
            <div className="font-medium text-green-600">🟢 ระบบทำงานปกติ</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500">API Server</div>
            <div className="font-medium">http://localhost:3002</div>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          onSubmit={async (data) => {
            if (editingUser) {
              await updateMutation.mutateAsync({ id: editingUser.id, data });
            } else {
              await createMutation.mutateAsync(data as any);
            }
          }}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function UserModal({
  user,
  onSubmit,
  onClose,
  loading,
}: {
  user: User | null;
  onSubmit: (data: any) => Promise<unknown>;
  onClose: () => void;
  loading: boolean;
}) {
  const [username, setUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<User['role']>(user?.role || 'staff');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !password) { alert('กรุณากรอกรหัสผ่าน'); return; }
    await onSubmit({ username, fullName, email, role, password, active: true });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{user ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
              disabled={!!user}
            />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required={!user}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สิทธิ์</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as User['role'])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;
