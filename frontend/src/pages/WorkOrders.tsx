import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Play,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  Warehouse,
  ArrowRight,
  TrendingDown,
  X
} from 'lucide-react';

export const WorkOrders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [workOrderId, setWorkOrderId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState<number | ''>('');
  const [assignedUserId, setAssignedUserId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [woData, locRes, invRes, userRes] = await Promise.all([
        api.erp.workOrders.list(),
        api.erp.locations.list(),
        api.erp.inventory.list(),
        api.erp.users.list(),
      ]);
      setOrders(woData || []);
      setLocations(locRes || []);
      setInventory(invRes || []);
      setUsers(userRes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch work orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderId || !locationId || !inventoryId || requiredQuantity === '' || !assignedUserId) {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await api.erp.workOrders.create({
        workOrderId,
        locationId,
        inventoryId,
        requiredQuantity: Number(requiredQuantity),
        assignedUserId,
      });
      showToast('Work Order registered successfully', 'success');
      setIsModalOpen(false);
      // Reset
      setWorkOrderId('');
      setLocationId('');
      setInventoryId('');
      setRequiredQuantity('');
      setAssignedUserId('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create Work Order', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await api.erp.workOrders.updateStatus(id, newStatus);
      showToast(`Work Order marked as ${newStatus.replace('_', ' ')}`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Status transition failed', 'error');
    }
  };

  // Metrics
  const activeJobsCount = orders.filter(o => o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS').length;
  const shortageJobsCount = orders.filter(o => o.shortageQuantity > 0).length;
  const completedJobsCount = orders.filter(o => o.status === 'COMPLETED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            Assigned
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Manufacturing & Assembly Jobs
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">
            Stage work jobs, assign operators, and track material shortage constraints dynamically.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setWorkOrderId(`WO-${Date.now().toString().slice(-6)}`);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Work Job
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Work Orders</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{activeJobsCount}</h3>
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Material Shortages</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{shortageJobsCount}</h3>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Jobs</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{completedJobsCount}</h3>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid listing */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-5 px-6">Job Reference</th>
                <th className="py-5 px-6">Assigned Operator</th>
                <th className="py-5 px-6">Material Needed</th>
                <th className="py-5 px-6">Assigned Location</th>
                <th className="py-5 px-6 text-center">Required Qty</th>
                <th className="py-5 px-6 text-center">Shortage</th>
                <th className="py-5 px-6">Status</th>
                <th className="py-5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    Loading production jobs...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    No active production jobs assigned.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-gray-900 tracking-tight">{ord.workOrderId}</td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">{ord.assignedUser?.username}</div>
                      <div className="text-[10px] text-gray-400 font-semibold tracking-wider mt-0.5 uppercase">{ord.assignedUser?.role}</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">{ord.inventory?.item}</div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Batch: {ord.inventory?.batch}</div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 bg-gray-100 px-3 py-1 rounded-xl text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                        {ord.location?.name}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-center font-extrabold text-gray-900 text-sm">{ord.requiredQuantity}</td>
                    <td className="py-5 px-6 text-center">
                      {ord.shortageQuantity > 0 ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {ord.shortageQuantity} units short
                          </span>
                          {(user?.role === 'ADMIN' || user?.role === 'WAREHOUSE') && (
                            <button
                              onClick={() => navigate(`/erp/transfers?dest=${ord.locationId}&item=${ord.inventory?.item}`)}
                              className="inline-flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-700 font-bold hover:underline"
                            >
                              Request Transfer
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                          All Stocks Clear
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-6">{getStatusBadge(ord.status)}</td>
                    <td className="py-5 px-6 text-right">
                      {ord.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'IN_PROGRESS')}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl text-xs font-bold transition-all hover:bg-brand-100/60"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Start Job
                        </button>
                      )}
                      {ord.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold transition-all hover:bg-emerald-100/60"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Work Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Work Order</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Work Order Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WO-2026-0005"
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stage Location</label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Material & Batch</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Inventory Row</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.item} ({inv.batch}) at {inv.location?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Required Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 50"
                  value={requiredQuantity}
                  onChange={(e) => setRequiredQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assign Operator</label>
                <select
                  required
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select operator</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
                >
                  Stage Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WorkOrders;
