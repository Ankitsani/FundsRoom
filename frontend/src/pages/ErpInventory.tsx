import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Layers,
  Plus,
  Warehouse,
  AlertTriangle,
  RotateCcw,
  Activity,
  Filter,
  CheckCircle,
  HelpCircle,
  X,
  Gauge,
  Boxes
} from 'lucide-react';

export const ErpInventory: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [inventory, setInventory] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);

  // Form states
  const [adjustItem, setAdjustItem] = useState('');
  const [adjustCategory, setAdjustCategory] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [adjustBatch, setAdjustBatch] = useState('');
  const [adjustPhysicalQty, setAdjustPhysicalQty] = useState<number | ''>('');

  const [damageInventoryId, setDamageInventoryId] = useState('');
  const [damageQtyChanged, setDamageQtyChanged] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invData, locData] = await Promise.all([
        api.erp.inventory.list(),
        api.erp.locations.list(),
      ]);
      setInventory(invData || []);
      setLocations(locData || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustCategory || !adjustLocationId || !adjustBatch || adjustPhysicalQty === '') {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await api.erp.inventory.adjust({
        item: adjustItem,
        category: adjustCategory,
        locationId: adjustLocationId,
        batch: adjustBatch,
        physicalQuantity: Number(adjustPhysicalQty),
      });
      showToast('Stock level updated successfully', 'success');
      setIsAdjustModalOpen(false);
      // Reset
      setAdjustItem('');
      setAdjustCategory('');
      setAdjustLocationId('');
      setAdjustBatch('');
      setAdjustPhysicalQty('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  const handleLogDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageInventoryId || damageQtyChanged === '') {
      showToast('All fields are required', 'error');
      return;
    }

    try {
      await api.erp.inventory.reportDamaged({
        inventoryId: damageInventoryId,
        quantityChanged: Number(damageQtyChanged),
      });
      showToast('Damaged stock logged successfully', 'success');
      setIsDamageModalOpen(false);
      setDamageInventoryId('');
      setDamageQtyChanged('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to log damage', 'error');
    }
  };

  // Filtered inventory
  const filteredInventory = inventory.filter((inv) => {
    const matchLoc = !selectedLocation || inv.locationId === selectedLocation;
    const matchSearch =
      !searchQuery ||
      inv.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLoc && matchSearch;
  });

  const isWarehouseOrAdmin = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  // Metrics calculations
  const totalPhysicalItems = inventory.reduce((sum, item) => sum + item.physicalQuantity, 0);
  const totalReservedItems = inventory.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const totalDamagedItems = inventory.reduce((sum, item) => sum + item.damagedQuantity, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Multi-Location Inventory Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium">
            Monitor real-time physical, reserved, and damaged quantities across all warehouse points.
          </p>
        </div>
        {isWarehouseOrAdmin && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsDamageModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 text-rose-700 border border-rose-200 font-bold rounded-2xl text-sm shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Log Damage
            </button>
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl text-sm shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Adjust Stock Level
            </button>
          </div>
        )}
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Warehouses</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{locations.length}</h3>
          </div>
          <div className="p-4 bg-brand-50 rounded-2xl text-brand-600 group-hover:scale-110 transition-transform">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Physical Inventory</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalPhysicalItems}</h3>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Reservations</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalReservedItems}</h3>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Damaged Stock</span>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalDamagedItems}</h3>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Table wrapper */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              Filter By Location
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-200 bg-gray-50/50 hover:bg-white rounded-xl text-xs font-bold text-gray-600 outline-none transition-all"
            >
              <option value="">All Warehouses</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search item, batch, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-72 px-4 py-2 border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-brand-500 rounded-xl outline-none text-xs font-semibold transition-all text-gray-700"
          />
        </div>

        {/* Inventory grid */}
        <div className="overflow-x-auto border-t border-gray-100 pt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Material details</th>
                <th className="py-4 px-6">Batch ID</th>
                <th className="py-4 px-6">Warehouse Location</th>
                <th className="py-4 px-6 text-center">Physical Qty</th>
                <th className="py-4 px-6 text-center">Reserved</th>
                <th className="py-4 px-6 text-center">Damaged</th>
                <th className="py-4 px-6 text-center">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    Loading warehouse stock logs...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 font-bold tracking-wide">
                    No matching inventory records found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const available = item.physicalQuantity - item.reservedQuantity - item.damagedQuantity;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{item.item}</div>
                        <div className="text-[10px] text-gray-400 font-semibold tracking-wider mt-0.5">{item.category}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-700">{item.batch}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-gray-700 bg-gray-100 px-3 py-1 rounded-xl text-xs font-semibold">
                          <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                          {item.location?.name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-gray-900">{item.physicalQuantity}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${item.reservedQuantity > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'text-gray-400 bg-gray-50'}`}>
                          {item.reservedQuantity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${item.damagedQuantity > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'text-gray-400 bg-gray-50'}`}>
                          {item.damagedQuantity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm ${available <= 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : available <= 5 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {available <= 0 ? 'Out of stock' : `${available} Available`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Level Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Adjust Physical Stock</h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Office Chair"
                  value={adjustItem}
                  onChange={(e) => setAdjustItem(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Furniture"
                  value={adjustCategory}
                  onChange={(e) => setAdjustCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Warehouse Location</label>
                <select
                  required
                  value={adjustLocationId}
                  onChange={(e) => setAdjustLocationId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm text-gray-600 font-semibold transition-all"
                >
                  <option value="">Select Warehouse</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Batch identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-CH01"
                  value={adjustBatch}
                  onChange={(e) => setAdjustBatch(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Physical Stock Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 100"
                  value={adjustPhysicalQty}
                  onChange={(e) => setAdjustPhysicalQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
                >
                  Apply Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Damaged Stock Modal */}
      {isDamageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-gray-100 shadow-2xl overflow-hidden transform scale-100 transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Log Damaged Stock</h2>
              <button
                onClick={() => setIsDamageModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogDamage} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Select Item & Batch</label>
                <select
                  required
                  value={damageInventoryId}
                  onChange={(e) => setDamageInventoryId(e.target.value)}
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Damaged Stock Amount</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 5"
                  value={damageQtyChanged}
                  onChange={(e) => setDamageQtyChanged(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-500 focus:bg-white rounded-2xl outline-none text-sm transition-all text-gray-700 font-semibold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
                >
                  Log Damaged
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
