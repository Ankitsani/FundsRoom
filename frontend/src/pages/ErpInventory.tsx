import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Search,
  Plus,
  AlertTriangle,
  MapPin,
  Warehouse,
  History,
  X,
  RefreshCw
} from 'lucide-react';

export const ErpInventory: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Forms
  const [adjustItem, setAdjustItem] = useState('');
  const [adjustCategory, setAdjustCategory] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [adjustBatch, setAdjustBatch] = useState('');
  const [adjustQty, setAdjustQty] = useState<number | ''>('');

  const [damageInventoryId, setDamageInventoryId] = useState('');
  const [damageQty, setDamageQty] = useState<number | ''>('');

  const [newLocationName, setNewLocationName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invData, locData] = await Promise.all([
        api.erp.inventory.list({
          locationId: selectedLocationId || undefined,
          search: search || undefined,
        }),
        api.erp.locations.list(),
      ]);
      setInventory(invData || []);
      setLocations(locData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocationId, search]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustCategory || !adjustLocationId || !adjustBatch || adjustQty === '') {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await api.erp.inventory.adjust({
        item: adjustItem,
        category: adjustCategory,
        locationId: adjustLocationId,
        batch: adjustBatch,
        physicalQuantity: Number(adjustQty),
      });
      showToast('Inventory adjusted successfully', 'success');
      setIsAdjustModalOpen(false);
      // Reset form
      setAdjustItem('');
      setAdjustCategory('');
      setAdjustLocationId('');
      setAdjustBatch('');
      setAdjustQty('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Inventory adjustment failed', 'error');
    }
  };

  const handleDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageInventoryId || damageQty === '') {
      showToast('Please select an item and quantity', 'error');
      return;
    }

    try {
      await api.erp.inventory.reportDamaged({
        inventoryId: damageInventoryId,
        quantityChanged: Number(damageQty),
      });
      showToast('Damaged stock logged successfully', 'success');
      setIsDamageModalOpen(false);
      setDamageInventoryId('');
      setDamageQty('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to log damaged stock', 'error');
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName) {
      showToast('Location name is required', 'error');
      return;
    }

    try {
      await api.erp.locations.create({ name: newLocationName });
      showToast('Location created successfully', 'success');
      setNewLocationName('');
      setIsLocationModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create location', 'error');
    }
  };

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Multi-Location Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage physical, reserved, and damaged inventory across warehouses.</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 shadow-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              New Location
            </button>
          )}
          {isWarehouseOrAdmin && (
            <>
              <button
                onClick={() => setIsDamageModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-xl text-sm hover:bg-amber-100/50 shadow-sm transition-all"
              >
                <AlertTriangle className="w-4 h-4" />
                Log Damaged
              </button>
              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md shadow-brand-600/10 transition-all"
              >
                <Plus className="w-4 h-4" />
                Adjust Stock
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Banner */}
      <div className="bg-white border border-gray-200/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search item, category, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 text-gray-700 font-medium"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-xl text-sm outline-none text-gray-600 font-semibold transition-all"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="p-2.5 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Inventory Grid Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Batch</th>
                <th className="py-4 px-6 text-center">Physical Qty</th>
                <th className="py-4 px-6 text-center">Reserved Qty</th>
                <th className="py-4 px-6 text-center">Damaged Qty</th>
                <th className="py-4 px-6 text-center">Available Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    Loading inventory details...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    No multi-location stock items found.
                  </td>
                </tr>
              ) : (
                inventory.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-gray-900">{inv.item}</td>
                    <td className="py-4 px-6 font-medium">{inv.category}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                        {inv.location?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">{inv.batch}</td>
                    <td className="py-4 px-6 text-center font-bold text-gray-700">{inv.physicalQuantity}</td>
                    <td className="py-4 px-6 text-center font-semibold text-amber-600">{inv.reservedQuantity}</td>
                    <td className="py-4 px-6 text-center font-semibold text-red-500">{inv.damagedQuantity}</td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                          inv.availableQuantity > 0
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                      >
                        {inv.availableQuantity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Adjust Inventory Stock</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart LED TV 55&quot;"
                  value={adjustItem}
                  onChange={(e) => setAdjustItem(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electronics"
                    value={adjustCategory}
                    onChange={(e) => setAdjustCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Batch Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-TV01"
                    value={adjustBatch}
                    onChange={(e) => setAdjustBatch(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Warehouse Location</label>
                <select
                  required
                  value={adjustLocationId}
                  onChange={(e) => setAdjustLocationId(e.target.value)}
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Quantity Adjustment (use negative to reduce)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50 or -15"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 shadow-md shadow-brand-600/10"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Damaged Stock Modal */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Report Damaged Stock</h2>
              <button onClick={() => setIsDamageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDamageSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Inventory Item</label>
                <select
                  required
                  value={damageInventoryId}
                  onChange={(e) => setDamageInventoryId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Item</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.item} ({inv.batch}) at {inv.location?.name} — Available: {inv.availableQuantity}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Damaged Quantity Change (negative to restore/repair)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5 or -2"
                  value={damageQty}
                  onChange={(e) => setDamageQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl text-sm hover:bg-amber-700 shadow-md"
                >
                  Log Damaged
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Warehouse Location</h2>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Location/Warehouse Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Depot"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-200 focus:border-brand-500 rounded-xl outline-none text-sm transition-all text-gray-700 font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-500 font-semibold rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ErpInventory;
