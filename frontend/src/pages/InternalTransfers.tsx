import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  Plus,
  Send,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  Warehouse,
  X,
  FileText,
  Truck
} from 'lucide-react';

export const InternalTransfers: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const locationState = useLocation();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<any | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number | ''>('');

  // Form states
  const [transferId, setTransferId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trData, locData, invData] = await Promise.all([
        api.erp.transfers.list(),
        api.erp.locations.list(),
        api.erp.inventory.list(),
      ]);
      setTransfers(trData || []);
      setLocations(locData || []);
      setInventory(invData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load stock transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Check if we navigated here with prefilled data from a Work Order shortage
    const stateObj = locationState.state as any;
    if (stateObj && stateObj.prefill) {
      setDestinationLocationId(stateObj.destinationLocationId || '');
      setQuantity(stateObj.quantity || '');
      // Autofill details
      setTransferId(`TR-AUTO-${Date.now().toString().slice(-6)}`);
      setIsModalOpen(true);
      // Clean location state so it doesn't open again on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !sourceLocationId || !destinationLocationId || !inventoryId || quantity === '') {
      showToast('All fields are required', 'error');
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
      showToast('Transfer request created successfully', 'success');
      setIsModalOpen(false);
      // Reset forms
      setTransferId('');
      setSourceLocationId('');
      setDestinationLocationId('');
      setInventoryId('');
      setQuantity('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to request transfer', 'error');
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.erp.transfers.dispatch(id);
      showToast('Stock transfer dispatched successfully (source stock reduced)', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch transfer', 'error');
    }
  };

  const handleOpenReceiveModal = (tr: any) => {
    setReceivingTransfer(tr);
    const totalDispatched = tr.dispatchedQuantity || tr.quantity;
    const remaining = totalDispatched - tr.receivedQuantity;
    setReceivedQtyInput(remaining);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingTransfer || receivedQtyInput === '') return;

    try {
      await api.erp.transfers.receive(receivingTransfer.id, {
        receivedQty: Number(receivedQtyInput),
      });
      showToast('Stock received successfully (destination stock increased)', 'success');
      setReceivingTransfer(null);
      setReceivedQtyInput('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to receive stock', 'error');
    }
  };

  // Filter inventory by selected source location
  const filteredSourceInventory = inventory.filter((inv) => inv.locationId === sourceLocationId);

  // If a prefilled item name was passed, find matches in source inventory
  const prefilledItemName = (locationState.state as any)?.inventoryItemName;
  const recommendedInventory = prefilledItemName
    ? filteredSourceInventory.filter((inv) => inv.item.toLowerCase().includes(prefilledItemName.toLowerCase()))
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Requested
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
            <Send className="w-3.5 h-3.5" />
            Dispatched (In Transit)
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Partially Received
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Received
          </span>
        );
      default:
        return null;
    }
  };

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Internal Transfers</h1>
          <p className="text-sm text-gray-500 mt-1">Request, dispatch, and track inventory movements between locations.</p>
        </div>
        {isWarehouseOrAdmin && (
          <button
            onClick={() => {
              setTransferId(`TR-${Date.now().toString().slice(-6)}`);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md shadow-brand-600/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            Request Transfer
          </button>
        )}
      </div>

      {/* Transfers Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Transfer ID</th>
                <th className="py-4 px-6">Source Location</th>
                <th className="py-4 px-6">Destination Location</th>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6 text-center">Qty Requested</th>
                <th className="py-4 px-6 text-center">Qty Received</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    No stock transfers found.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-900">{tr.transferId}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                        {tr.sourceLocation?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-brand-500" />
                        {tr.destinationLocation?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{tr.inventory?.item}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {tr.inventory?.batch}</div>
                    </td>
                    <td className="py-4 px-6 text-center font-bold">{tr.quantity}</td>
                    <td className="py-4 px-6 text-center font-bold text-gray-700">
                      {tr.receivedQuantity} / {tr.dispatchedQuantity || tr.quantity}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(tr.status)}</td>
                    <td className="py-4 px-6 text-right">
                      {isWarehouseOrAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          {tr.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleDispatch(tr.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all shadow-sm"
                            >
                              <Send className="w-3 h-3" />
                              Dispatch
                            </button>
                          )}
                          {(tr.status === 'DISPATCHED' || tr.status === 'PARTIALLY_RECEIVED') && (
                            <button
                              onClick={() => handleOpenReceiveModal(tr)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all shadow-sm"
                            >
                              <Download className="w-3 h-3" />
                              Receive
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

      {/* Request Stock Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Request Stock Transfer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
              {prefilledItemName && (
                <div className="bg-brand-50 border border-brand-100 text-brand-800 p-3.5 rounded-xl text-xs font-medium leading-relaxed">
                  <span className="font-bold">Work Order Shortage Alert:</span> Resolving shortage of{' '}
                  <span className="underline font-bold">{prefilledItemName}</span> (Shortage: {quantity}). Please select
                  a source warehouse location that has available stock to dispatch.
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transfer Reference ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TR-2026-0005"
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Source Warehouse</label>
                  <select
                    required
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                  >
                    <option value="">Select Source</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dest Warehouse</label>
                  <select
                    required
                    value={destinationLocationId}
                    onChange={(e) => setDestinationLocationId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                  >
                    <option value="">Select Destination</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Stock Item to Move</label>
                <select
                  required
                  value={inventoryId}
                  onChange={(e) => setInventoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                  disabled={!sourceLocationId}
                >
                  <option value="">Select Stock</option>
                  {/* Prefil recommendation highlights if available */}
                  {prefilledItemName && recommendedInventory.length > 0 && (
                    <optgroup label="Recommended Stocks (Matches shortage item)">
                      {recommendedInventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          ⭐ {inv.item} ({inv.batch}) — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Source Stocks">
                    {filteredSourceInventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.item} ({inv.batch}) — Available: {inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {!sourceLocationId && <p className="text-[10px] text-gray-400 mt-1 font-semibold">Please select source warehouse first.</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity to Transfer</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 10"
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
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md animate-pulse-once"
                >
                  Request Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal (Partial receipt - Scenario 2) */}
      {receivingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Receive Stock Transfer</h2>
              <button onClick={() => setReceivingTransfer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
              <div className="text-xs text-gray-500">
                <p className="font-semibold">Transfer Ref: {receivingTransfer.transferId}</p>
                <p className="mt-1">Item: {receivingTransfer.inventory?.item}</p>
                <p className="mt-1">
                  Dispatched: {receivingTransfer.dispatchedQuantity || receivingTransfer.quantity} | Already Received:{' '}
                  {receivingTransfer.receivedQuantity}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity Received Now</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={(receivingTransfer.dispatchedQuantity || receivingTransfer.quantity) - receivingTransfer.receivedQuantity}
                  value={receivedQtyInput}
                  onChange={(e) => setReceivedQtyInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setReceivingTransfer(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-xl text-sm hover:bg-green-700 shadow-md"
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
