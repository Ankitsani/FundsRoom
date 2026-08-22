import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  Truck,
  CheckCircle,
  Clock,
  Warehouse,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';

export const InternalTransfers: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Form states
  const [transferId, setTransferId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const [selectedTransferId, setSelectedTransferId] = useState('');
  const [receiveQty, setReceiveQty] = useState<number | ''>('');
  const [maxReceiveQty, setMaxReceiveQty] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transData, locRes, invRes] = await Promise.all([
        api.erp.transfers.list(),
        api.erp.locations.list(),
        api.erp.inventory.list(),
      ]);
      setTransfers(transData || []);
      setLocations(locRes || []);
      setInventory(invRes || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch stock transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Prefill form fields if coming from shortcut
    const dest = searchParams.get('dest');
    const item = searchParams.get('item');
    if (dest || item) {
      setTransferId(`TR-${Date.now().toString().slice(-6)}`);
      setDestinationLocationId(dest || '');
      // Try to find matching item to prefill source location
      if (item) {
        const found = inventory.find((inv) => inv.item.toLowerCase() === item.toLowerCase() && (inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity) > 0);
        if (found) {
          setSourceLocationId(found.locationId);
          setInventoryId(found.id);
        }
      }
      setIsRequestModalOpen(true);
    }
  }, [searchParams, inventory.length]);

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !sourceLocationId || !destinationLocationId || !inventoryId || quantity === '') {
      showToast('All fields are required', 'error');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      showToast('Source and destination cannot be the same', 'error');
      return;
    }

    try {
      await api.erp.transfers.create({
        transferId,
        sourceLocationId,
        destinationLocationId,
        inventoryId,
        quantity: Number(quantity),
      });
      showToast('Stock transfer request created successfully', 'success');
      setIsRequestModalOpen(false);
      // Reset
      setTransferId('');
      setSourceLocationId('');
      setDestinationLocationId('');
      setInventoryId('');
      setQuantity('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create transfer request', 'error');
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.erp.transfers.dispatch(id);
      showToast('Stock transfer dispatched', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Dispatch failed', 'error');
    }
  };

  const handleOpenReceiveModal = (t: any) => {
    setSelectedTransferId(t.id);
    const max = t.quantity - t.receivedQuantity;
    setMaxReceiveQty(max);
    setReceiveQty(max);
    setIsReceiveModalOpen(true);
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferId || receiveQty === '') {
      showToast('Please specify a received quantity', 'error');
      return;
    }

    try {
      await api.erp.transfers.receive(selectedTransferId, { receivedQty: Number(receiveQty) });
      showToast('Stock receipt registered successfully', 'success');
      setIsReceiveModalOpen(false);
      setSelectedTransferId('');
      setReceiveQty('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Receipt failed', 'error');
    }
  };

  // Metrics
  const activeTransfersCount = transfers.filter(t => t.status === 'REQUESTED' || t.status === 'DISPATCHED' || t.status === 'PARTIALLY_RECEIVED').length;
  const transitQty = transfers.filter(t => t.status === 'DISPATCHED' || t.status === 'PARTIALLY_RECEIVED').reduce((sum, t) => sum + (t.quantity - t.receivedQuantity), 0);
  const completedCount = transfers.filter(t => t.status === 'RECEIVED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            Requested
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
            Dispatched
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Partially Received
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Received
          </span>
        );
      default:
        return null;
    }
  };

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Warehouse Stock Transfers
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">
            Dispatch, track, and partially receive stock movements between physical warehouse locations.
          </p>
        </div>
        {isWarehouseOrAdmin && (
          <button
            onClick={() => {
              setTransferId(`TR-${Date.now().toString().slice(-6)}`);
              setIsRequestModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Request Transfer
          </button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Shipments</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{activeTransfersCount}</h3>
          </div>
          <div className="p-4 bg-brand-50 rounded-2xl text-brand-600 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-semibold">Total Stock In-Transit</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{transitQty}</h3>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Transfers</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{completedCount}</h3>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid listing */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-5 px-6">Transfer Code</th>
                <th className="py-5 px-6">Source (From)</th>
                <th className="py-5 px-6">Destination (To)</th>
                <th className="py-5 px-6">Item Description</th>
                <th className="py-5 px-6 text-center">Transferred</th>
                <th className="py-5 px-6 text-center">Received Qty</th>
                <th className="py-5 px-6">Status</th>
                <th className="py-5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    Loading transfers logs...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    No stock transfers scheduled.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-5 px-6 font-bold text-gray-900 tracking-tight">{t.transferId}</td>
                    <td className="py-5 px-6 font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                        {t.sourceLocation?.name}
                      </span>
                    </td>
                    <td className="py-5 px-6 font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                        {t.destinationLocation?.name}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="font-bold text-gray-900">{t.inventory?.item}</div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Batch: {t.inventory?.batch}</div>
                    </td>
                    <td className="py-5 px-6 text-center font-bold text-gray-900">{t.quantity}</td>
                    <td className="py-5 px-6 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-extrabold ${t.receivedQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-gray-400 bg-gray-50'}`}>
                        {t.receivedQuantity}
                      </span>
                    </td>
                    <td className="py-5 px-6">{getStatusBadge(t.status)}</td>
                    <td className="py-5 px-6 text-right">
                      {isWarehouseOrAdmin && t.status === 'REQUESTED' && (
                        <button
                          onClick={() => handleDispatch(t.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/60 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          Dispatch
                        </button>
                      )}
                      {isWarehouseOrAdmin && (t.status === 'DISPATCHED' || t.status === 'PARTIALLY_RECEIVED') && (
                        <button
                          onClick={() => handleOpenReceiveModal(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/60 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Receive Stock
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

      {/* Request Stock Transfer Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Request Stock Transfer</h2>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRequestTransfer} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Transfer Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TR-2026-0005"
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Source Warehouse (From)</label>
                <select
                  required
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select source warehouse</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Destination Location (To)</label>
                <select
                  required
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select destination location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Item & Batch</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Inventory</option>
                  {inventory
                    .filter((inv) => !sourceLocationId || inv.locationId === sourceLocationId)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.item} ({inv.batch}) — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Transfer Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Acknowledge Receipt</h2>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReceiveStock} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quantity Received</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={maxReceiveQty}
                  placeholder={`Max ${maxReceiveQty}`}
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 font-semibold">
                  You can specify partial units received. Max remaining in-transit: {maxReceiveQty} units.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
                >
                  Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InternalTransfers;
