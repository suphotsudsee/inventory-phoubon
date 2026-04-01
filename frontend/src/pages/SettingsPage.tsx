import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { table10Api, Table10Item, User, usersApi } from '../services/api';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useAuth } from '../contexts/AuthContext';

type Table10FormData = Omit<Table10Item, 'id' | 'createdAt' | 'updatedAt'>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Table10Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [importSummary, setImportSummary] = useState<string>('');

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersApi.getUsers();
      return response.data;
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['table10-groups'],
    queryFn: async () => {
      const response = await table10Api.getGroups();
      return response.data;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['table10-items', searchTerm, selectedGroup],
    queryFn: async () => {
      const response = await table10Api.getItems({
        search: searchTerm || undefined,
        group: selectedGroup || undefined,
      });
      return response.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowUserModal(false);
      alert('สร้างผู้ใช้เรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowUserModal(false);
      setEditingUser(null);
      alert('อัปเดตผู้ใช้เรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('ลบผู้ใช้เรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const importMutation = useMutation({
    mutationFn: table10Api.importFile,
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['table10-items'] });
      queryClient.invalidateQueries({ queryKey: ['table10-groups'] });
      setImportSummary(
        `นำเข้า ${data.imported} รายการ, เพิ่มใหม่ ${data.inserted}, อัปเดต ${data.updated}, ข้าม ${data.skipped}, รวมทั้งหมด ${data.total}`
      );
      alert('นำเข้าไฟล์ table-10 เรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'นำเข้าไฟล์ไม่สำเร็จ');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: table10Api.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table10-items'] });
      queryClient.invalidateQueries({ queryKey: ['table10-groups'] });
      setShowItemModal(false);
      alert('เพิ่มรายการเรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Table10FormData }) => table10Api.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table10-items'] });
      queryClient.invalidateQueries({ queryKey: ['table10-groups'] });
      setShowItemModal(false);
      setEditingItem(null);
      alert('อัปเดตรายการเรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: table10Api.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table10-items'] });
      queryClient.invalidateQueries({ queryKey: ['table10-groups'] });
      alert('ลบรายการเรียบร้อย');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    const fileContentBase64 = await fileToBase64(file);
    await importMutation.mutateAsync({
      fileName: file.name,
      fileContentBase64,
    });
    event.target.value = '';
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleEditItem = (item: Table10Item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  if (usersQuery.isLoading || itemsQuery.isLoading || groupsQuery.isLoading) {
    return <Loading fullScreen message="กำลังโหลด..." />;
  }

  if (usersQuery.error) {
    return <ErrorState message="ไม่สามารถโหลดข้อมูลผู้ใช้" error={usersQuery.error as Error} onRetry={usersQuery.refetch} />;
  }

  if (itemsQuery.error || groupsQuery.error) {
    return <ErrorState message="ไม่สามารถโหลดข้อมูล table-10" error={(itemsQuery.error || groupsQuery.error) as Error} onRetry={() => {
      itemsQuery.refetch();
      groupsQuery.refetch();
    }} />;
  }

  const users = usersQuery.data || [];
  const groups = groupsQuery.data || [];
  const items = itemsQuery.data || [];
  const canManage = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">จัดการผู้ใช้และข้อมูลจากไฟล์ table-10.xlsx</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingUser(null);
              setShowUserModal(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + เพิ่มผู้ใช้
          </button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-xl bg-white shadow">
          <div className="border-b px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-800">จัดการผู้ใช้</h3>
            <p className="mt-1 text-sm text-gray-500">ผู้ใช้ทั้งหมด {users.length} คน</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ชื่อ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">สถานะ</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">จัดการ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                    <td className="px-4 py-3 text-gray-600">{user.fullName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{user.role}</td>
                    <td className="px-4 py-3 text-gray-600">{user.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleEditUser(user)} className="mr-3 text-sm text-blue-600 hover:underline">
                          แก้ไข
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              if (confirm(`ลบผู้ใช้ "${user.username}" ?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            className="text-sm text-red-600 hover:underline"
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
        </section>

        <section className="rounded-xl bg-white shadow">
          <div className="border-b px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">ข้อมูลจาก table-10.xlsx</h3>
                <p className="mt-1 text-sm text-gray-500">รายการทั้งหมด {items.length} รายการ</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-3">
                  <label className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    เลือกไฟล์และนำเข้า
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(event) => {
                        void handleImportFile(event);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setShowItemModal(true);
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    + เพิ่มรายการ
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหา GPUID, ชื่อยา, กลุ่มยา, service plan"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">ทุกกลุ่มยา</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroup('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ล้างตัวกรอง
              </button>
            </div>
            {(selectedFileName || importSummary) && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                {selectedFileName && <div>ไฟล์ล่าสุด: {selectedFileName}</div>}
                {importSummary && <div className="mt-1">{importSummary}</div>}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">GPUID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Drug Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">WachtList</th>
                  {canManage && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">จัดการ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-sm text-gray-500">
                      ยังไม่มีข้อมูล table-10
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.gpuid}</td>
                    <td className="px-4 py-3 text-gray-700">{item.drugName}</td>
                    <td className="px-4 py-3 text-gray-600">{item.dispUnit || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.groupName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.servicePlan || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.wachtList || '-'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleEditItem(item)} className="mr-3 text-sm text-blue-600 hover:underline">
                          แก้ไข
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ลบรายการ "${item.drugName}" ?`)) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          className="text-sm text-red-600 hover:underline"
                        >
                          ลบ
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-800">System Info</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <InfoCard label="ระบบ" value="Inventory Phoubon" />
          <InfoCard label="เวอร์ชัน" value="1.0.0" />
          <InfoCard label="API" value="http://localhost:3002" />
          <InfoCard label="table-10 items" value={String(items.length)} />
        </div>
      </section>

      {showUserModal && (
        <UserModal
          user={editingUser}
          loading={createUserMutation.isPending || updateUserMutation.isPending}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSubmit={async (data) => {
            if (editingUser) {
              await updateUserMutation.mutateAsync({ id: editingUser.id, data });
              return;
            }
            await createUserMutation.mutateAsync(data);
          }}
        />
      )}

      {showItemModal && (
        <Table10ItemModal
          item={editingItem}
          loading={createItemMutation.isPending || updateItemMutation.isPending}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSubmit={async (data) => {
            if (editingItem) {
              await updateItemMutation.mutateAsync({ id: editingItem.id, data });
              return;
            }
            await createItemMutation.mutateAsync(data);
          }}
        />
      )}
    </div>
  );
};

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-gray-900">{value}</div>
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user && !password) {
      alert('กรุณากรอกรหัสผ่าน');
      return;
    }

    await onSubmit({
      username,
      fullName,
      email,
      role,
      password,
      active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">{user ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <Field label="Username *">
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
              disabled={!!user}
            />
          </Field>
          {!user && (
            <Field label="Password *">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </Field>
          )}
          <Field label="ชื่อ">
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as User['role'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="staff">staff</option>
              <option value="viewer">viewer</option>
            </select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Table10ItemModal({
  item,
  onSubmit,
  onClose,
  loading,
}: {
  item: Table10Item | null;
  onSubmit: (data: Table10FormData) => Promise<unknown>;
  onClose: () => void;
  loading: boolean;
}) {
  const [gpuid, setGpuid] = useState(item?.gpuid || '');
  const [drugName, setDrugName] = useState(item?.drugName || '');
  const [dispUnit, setDispUnit] = useState(item?.dispUnit || '');
  const [groupName, setGroupName] = useState(item?.groupName || '');
  const [servicePlan, setServicePlan] = useState(item?.servicePlan || '');
  const [wachtList, setWachtList] = useState(item?.wachtList || '');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      gpuid,
      drugName,
      dispUnit,
      groupName,
      servicePlan,
      wachtList,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">{item ? 'แก้ไขข้อมูล table-10' : 'เพิ่มข้อมูล table-10'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 p-4 md:grid-cols-2">
          <Field label="GPUID *">
            <input
              type="text"
              value={gpuid}
              onChange={(event) => setGpuid(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </Field>
          <Field label="DispUnit">
            <input
              type="text"
              value={dispUnit}
              onChange={(event) => setDispUnit(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="DrugName *">
              <input
                type="text"
                value={drugName}
                onChange={(event) => setDrugName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </Field>
          </div>
          <Field label="Groups">
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Service_plan">
            <input
              type="text"
              value={servicePlan}
              onChange={(event) => setServicePlan(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="WachtList">
              <input
                type="text"
                value={wachtList}
                onChange={(event) => setWachtList(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2 md:col-span-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={loading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export default SettingsPage;
