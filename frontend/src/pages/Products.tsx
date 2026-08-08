import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Search,
  Plus,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  AlertTriangle,
  History,
  TrendingDown,
  Warehouse
} from 'lucide-react';

export const Products: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  // Stock Logs Modal
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logsProduct, setLogsProduct] = useState<any | null>(null);
  const [stockLogs, setStockLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [currentStock, setCurrentStock] = useState<number | ''>('');
  const [minimumStockAlertQty, setMinimumStockAlertQty] = useState<number | ''>('');
  const [location, setLocation] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.list({
        page,
        limit: 8,
        search,
        category,
        lowStock: lowStock || undefined,
      });
      setProducts(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, category, lowStock]);

  const openAddModal = () => {
    setSelectedProduct(null);
    setName('');
    setSku('');
    setFormCategory('');
    setUnitPrice('');
    setCurrentStock('');
    setMinimumStockAlertQty('');
    setLocation('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setSelectedProduct(p);
    setName(p.name);
    setSku(p.sku);
    setFormCategory(p.category);
    setUnitPrice(p.unitPrice);
    setCurrentStock(p.currentStock);
    setMinimumStockAlertQty(p.minimumStockAlertQty);
    setLocation(p.location);
    setIsModalOpen(true);
  };

  const openLogsModal = async (p: any) => {
    setLogsProduct(p);
    setIsLogsModalOpen(true);
    setLoadingLogs(true);
    try {
      const res = await api.products.get(p.id);
      setStockLogs(res.stockMovements || []);
    } catch (err: any) {
      showToast(err.message || 'Error loading stock movements log', 'error');
      setIsLogsModalOpen(false);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !sku || !formCategory || unitPrice === '' || currentStock === '' || minimumStockAlertQty === '' || !location) {
      showToast('All fields are required', 'error');
      return;
    }

    const payload = {
      name,
      sku,
      category: formCategory,
      unitPrice: Number(unitPrice),
      currentStock: Number(currentStock),
      minimumStockAlertQty: Number(minimumStockAlertQty),
      location,
    };

    try {
      if (selectedProduct) {
        await api.products.update(selectedProduct.id, payload);
        showToast('Product updated successfully', 'success');
      } else {
        await api.products.create(payload);
        showToast('Product created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Error saving product details', 'error');
    }
  };

  const canEdit = ['ADMIN', 'WAREHOUSE'].includes(user?.role || '');

  // Unique list of categories in the table for quick dropdown filtering
  const categoriesList = ['Electronics', 'Furniture', 'Home Decor', 'Office Supplies', 'Apparel'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Products & Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">Control warehouse stock levels, locations, and audit trails.</p>
        </div>
        {canEdit && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-600/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3 my-auto w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or SKU/code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Category select */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          >
            <option value="">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Low stock filter check */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setLowStock(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
          />
          Low Stock Alert Only
        </label>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-sm">Searching inventory logs...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <FileText className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <p className="font-semibold text-sm text-gray-500">No Products Registered</p>
            <p className="text-xs text-gray-400">Try modifying search tags or add a new product code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Product Details</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Warehouse Location</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {products.map((p) => {
                  const isLowStock = p.currentStock <= p.minimumStockAlertQty;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/55 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-gray-900">{p.name}</td>
                      <td className="p-4 font-mono text-xs font-bold text-gray-500 uppercase">{p.sku}</td>
                      <td className="p-4 font-medium text-gray-600">{p.category}</td>
                      <td className="p-4 font-semibold text-gray-950">${p.unitPrice.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {p.currentStock}
                          </span>
                          {isLowStock && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-150 uppercase tracking-wide leading-none animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Alert threshold: {p.minimumStockAlertQty}</p>
                      </td>
                      <td className="p-4 font-medium text-gray-600">{p.location}</td>
                      <td className="p-4 text-right pr-6 space-x-1 shrink-0">
                        <button
                          onClick={() => openLogsModal(p)}
                          title="View Stock Movement Audit Logs"
                          className="inline-flex p-1.5 hover:bg-gray-150/60 rounded-lg text-gray-500 hover:text-brand-600 transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product & Adjust Stock"
                            className="inline-flex p-1.5 hover:bg-gray-150/60 rounded-lg text-gray-500 hover:text-brand-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-gray-50/70 border-t border-gray-150">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="text-xs text-gray-500 font-semibold">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full z-10 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-brand-600" />
                {selectedProduct ? 'Adjust Stock & Details' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Smart LED TV 55"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    SKU / Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. TV-SMART-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all uppercase"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Unit Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="450.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Aisle/Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Aisle A-1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Current Stock */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Current Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="15"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Alert Quantity */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Stock Alert Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={minimumStockAlertQty}
                    onChange={(e) => setMinimumStockAlertQty(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-250 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-brand-600/10"
                >
                  {selectedProduct ? 'Save Adjustments' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Movement logs Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={() => setIsLogsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full z-10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  Stock Audit logs
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 font-bold uppercase tracking-wider">SKU: {logsProduct?.sku} | {logsProduct?.name}</p>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingLogs ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-semibold text-xs mt-1">Loading audit logs...</p>
                </div>
              ) : stockLogs.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  <History className="w-12 h-12 text-gray-300 stroke-[1.5] mx-auto mb-2" />
                  <p className="font-semibold text-sm text-gray-500">No stock movements logged</p>
                  <p className="text-xs text-gray-400 mt-0.5">This product has not undergone any stock changes yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stockLogs.map((log) => {
                    const isIncoming = log.movementType === 'IN';
                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 border rounded-xl flex items-center justify-between gap-4 ${
                          isIncoming
                            ? 'bg-green-50/30 border-green-100'
                            : 'bg-red-50/30 border-red-100'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight">
                            {log.reason}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1 font-medium">
                            By {log.createdBy.name} ({log.createdBy.role}) | {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2.5 py-1.5 rounded-lg text-xs font-bold leading-none ${
                            isIncoming
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isIncoming ? '+' : '-'}{log.qtyChanged} units
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-4 py-2 border border-gray-250 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Products;
