import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowRight,
  User,
  MapPin,
  X,
  ArrowLeftRight
} from 'lucide-react';

export const WorkOrders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
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
      const [woData, locData, invData, usrData] = await Promise.all([
        api.erp.workOrders.list(),
        api.erp.locations.list(),
        api.erp.inventory.list(),
        api.erp.users.list(),
      ]);
      setWorkOrders(woData || []);
      setLocations(locData || []);
      setInventory(invData || []);
      setUsers(usrData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load work orders data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
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
      showToast('Work order created successfully', 'success');
      setIsModalOpen(false);
      // Reset form
      setWorkOrderId('');
      setLocationId('');
      setInventoryId('');
      setRequiredQuantity('');
      setAssignedUserId('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create work order', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.erp.workOrders.updateStatus(id, newStatus);
      showToast(`Work order status updated to ${newStatus}`, 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update work order status', 'error');
    }
  };

  // Filter inventory by selected location for dropdown list
  const filteredInventory = inventory.filter((inv) => inv.locationId === locationId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Assigned
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            In Progress
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Assign manufacturing or assembly jobs and track raw materials stock levels.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md shadow-brand-600/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Work Order ID</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6 text-center">Required Qty</th>
                <th className="py-4 px-6 text-center">Shortage</th>
                <th className="py-4 px-6">Assigned User</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{wo.workOrderId}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        {wo.location?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold">{wo.inventory?.item}</td>
                    <td className="py-4 px-6 text-center font-bold">{wo.requiredQuantity}</td>
                    <td className="py-4 px-6 text-center">
                      {wo.shortageQuantity > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {wo.shortageQuantity} Short
                          </span>
                          {(user?.role === 'ADMIN' || user?.role === 'WAREHOUSE') && wo.status !== 'COMPLETED' && (
                            <button
                              onClick={() =>
                                navigate('/erp/transfers', {
                                  state: {
                                    destinationLocationId: wo.locationId,
                                    inventoryItemName: wo.inventory?.item,
                                    quantity: wo.shortageQuantity,
                                    prefill: true,
                                  },
                                })
                              }
                              className="text-[10px] text-brand-600 hover:text-brand-700 font-bold inline-flex items-center gap-0.5 hover:underline"
                            >
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Stock Transfer
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                          No Shortage
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {wo.assignedUser?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(wo.status)}</td>
                    <td className="py-4 px-6 text-right">
                      {user?.role === 'ADMIN' && wo.status !== 'COMPLETED' && (
                        <div className="flex items-center justify-end gap-1.5">
                          {wo.status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleUpdateStatus(wo.id, 'IN_PROGRESS')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-sm"
                            >
                              Start Job
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {wo.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleUpdateStatus(wo.id, 'COMPLETED')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
                            >
                              Complete
                              <CheckCircle className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Work Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Work Order</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Work Order ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WO-2026-0005"
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Manufacturing Location</label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Inventory Item/Material</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                  disabled={!locationId}
                >
                  <option value="">Select Item</option>
                  {filteredInventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.item} ({inv.batch}) — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                    </option>
                  ))}
                </select>
                {!locationId && <p className="text-[10px] text-gray-400 mt-1 font-semibold">Please select a location first.</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 50"
                  value={requiredQuantity}
                  onChange={(e) => setRequiredQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Operator/User</label>
                <select
                  required
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select User</option>
                  {users.map((usr) => (
                    <option key={usr.id} value={usr.id}>
                      {usr.name} ({usr.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md"
                >
                  Create Work Order
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
