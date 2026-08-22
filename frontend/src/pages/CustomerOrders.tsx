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
  FileText,
  TrendingUp,
  AlertCircle
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

  // Metrics
  const activeOrdersCount = orders.filter(o => o.status === 'RESERVED').length;
  const totalReservedQty = orders.filter(o => o.status === 'RESERVED').reduce((acc, o) => acc + o.quantity, 0);
  const cancelledOrdersCount = orders.filter(o => o.status === 'CANCELLED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            Reserved
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
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
    <div className="space-y-8 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Customer Stock Reservations
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">
            Lock inventory allocations dynamically to ensure guaranteed client deliveries.
          </p>
        </div>
        {isSalesOrAdmin && (
          <button
            onClick={() => {
              setOrderNumber(`ORD-${Date.now().toString().slice(-6)}`);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Reservation
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative overflow-hidden bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Reservations</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{activeOrdersCount}</h3>
          </div>
          <div className="p-4 bg-brand-50 rounded-2xl text-brand-600 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reserved Stock Quantity</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalReservedQty}</h3>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cancelled Requests</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{cancelledOrdersCount}</h3>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md/50 transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-5 px-6">Order ID</th>
                <th className="py-5 px-6">Customer Profile</th>
                <th className="py-5 px-6">Allocated Item</th>
                <th className="py-5 px-6">Warehouse</th>
                <th className="py-5 px-6 text-center">Reserved Qty</th>
                <th className="py-5 px-6">Status</th>
                <th className="py-5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    Fetching active stock allocations...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    No reservations logged in this session.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-gray-900 tracking-tight">{ord.orderNumber}</td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">{ord.customer?.name}</div>
                      <div className="text-[9px] text-gray-400 font-extrabold uppercase mt-0.5 tracking-wider">{ord.customer?.customerType}</div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">{ord.inventory?.item}</div>
                      <div className="text-[10px] text-gray-400 font-semibold tracking-wider mt-0.5">Batch: {ord.inventory?.batch}</div>
                    </td>
                    <td className="py-5 px-6">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 bg-gray-100 px-3 py-1 rounded-xl text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                        {ord.inventory?.location?.name}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-center font-extrabold text-brand-600 text-base">{ord.quantity}</td>
                    <td className="py-5 px-6">{getStatusBadge(ord.status)}</td>
                    <td className="py-5 px-6 text-right">
                      {isSalesOrAdmin && ord.status === 'RESERVED' && (
                        <button
                          onClick={() => handleCancelOrder(ord.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100/60 border border-rose-100 rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          <XCircle className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Stock Reservation</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Reference ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORD-2026-0005"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Client</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Choose Customer Profile</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.businessName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Warehouse Item & Batch</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Inventory Row</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.item} ({inv.batch}) at {inv.location?.name} — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reservation Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 15"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
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
