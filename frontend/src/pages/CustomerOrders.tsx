import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ShoppingBag,
  Plus,
  XCircle,
  CheckCircle,
  Clock,
  User,
  X,
  Warehouse,
  FileText
} from 'lucide-react';

export const CustomerOrders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordData, custRes, invData] = await Promise.all([
        api.erp.orders.list(),
        api.customers.list({ limit: 100 }), // Fetch CRM customers
        api.erp.inventory.list(),
      ]);
      setOrders(ordData || []);
      setCustomers(custRes.data || []);
      setInventory(invData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load customer orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !customerId || !inventoryId || quantity === '') {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await api.erp.orders.create({
        orderNumber,
        customerId,
        inventoryId,
        quantity: Number(quantity),
      });
      showToast('Stock reserved successfully for order', 'success');
      setIsModalOpen(false);
      // Reset forms
      setOrderNumber('');
      setCustomerId('');
      setInventoryId('');
      setQuantity('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Stock reservation failed', 'error');
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this order reservation and release the stock?')) {
      return;
    }

    try {
      await api.erp.orders.cancel(id);
      showToast('Order cancelled and reserved stock released', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Reserved
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const isSalesOrAdmin = user?.role === 'ADMIN' || user?.role === 'SALES';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Stock Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">Create sales orders and allocate/reserve stock from available warehouse inventory.</p>
        </div>
        {isSalesOrAdmin && (
          <button
            onClick={() => {
              setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md shadow-brand-600/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Order Number</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Reserved Item</th>
                <th className="py-4 px-6">Warehouse</th>
                <th className="py-4 px-6 text-center">Reserved Qty</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                    Loading customer order reservations...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                    No sales orders or stock reservations found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{ord.orderNumber}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{ord.customer?.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{ord.customer?.customerType}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{ord.inventory?.item}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {ord.inventory?.batch}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                        {ord.inventory?.location?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-brand-600">{ord.quantity}</td>
                    <td className="py-4 px-6">{getStatusBadge(ord.status)}</td>
                    <td className="py-4 px-6 text-right">
                      {isSalesOrAdmin && ord.status === 'RESERVED' && (
                        <button
                          onClick={() => handleCancelOrder(ord.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-100 text-xs font-bold rounded-lg hover:bg-red-100/50 transition-all shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
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

      {/* New Reservation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Stock Reservation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORD-2026-0005"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CRM Customer</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Customer</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.businessName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Inventory Item to Reserve</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Stock</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.item} ({inv.batch}) at {inv.location?.name} — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity to Reserve</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
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
                  Reserve Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerOrders;
