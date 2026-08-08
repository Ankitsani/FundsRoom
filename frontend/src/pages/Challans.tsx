import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Plus,
  Search,
  Eye,
  X,
  Trash2,
  Receipt,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface LineItemInput {
  productId: string;
  quantity: number;
}

export const Challans: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modal / Form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [challanStatus, setChallanStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([{ productId: '', quantity: 1 }]);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const res = await api.challans.list({
        page,
        limit: 8,
        status: statusFilter || undefined,
        customerId: customerFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setChallans(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Error loading challans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.customers.list({ limit: 100 }),
        api.products.list({ limit: 100 }),
      ]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Error loading dropdown lists', err);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [page, statusFilter, customerFilter, startDate, endDate]);

  useEffect(() => {
    fetchFiltersData();
    // Check if new query param is present
    if (searchParams.get('new') === 'true') {
      setIsCreateOpen(true);
      // Clean query param
      setSearchParams({});
    }
  }, []);

  const openCreateModal = () => {
    setSelectedCustomerId('');
    setChallanStatus('DRAFT');
    setLineItems([{ productId: '', quantity: 1 }]);
    setIsCreateOpen(true);
  };

  const handleAddLine = () => {
    setLineItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof LineItemInput, value: string | number) => {
    setLineItems((prev) => {
      const copy = [...prev];
      if (field === 'productId') {
        copy[index].productId = value as string;
      } else {
        copy[index].quantity = Math.max(1, Number(value));
      }
      return copy;
    });
  };

  // Live Calculations
  const selectedProductMap = new Map(products.map((p) => [p.id, p]));
  let totalQty = 0;
  let totalAmt = 0;
  lineItems.forEach((item) => {
    const p = selectedProductMap.get(item.productId);
    totalQty += item.quantity;
    if (p) {
      totalAmt += item.quantity * p.unitPrice;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    const invalidLine = lineItems.find((item) => !item.productId || item.quantity <= 0);
    if (invalidLine) {
      showToast('Please select valid products and quantities for all lines', 'error');
      return;
    }

    const payload = {
      customerId: selectedCustomerId,
      status: challanStatus,
      lineItems: lineItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      await api.challans.create(payload);
      showToast(`Challan created successfully as ${challanStatus}`, 'success');
      setIsCreateOpen(false);
      fetchChallans();
    } catch (err: any) {
      showToast(err.message || 'Error creating challan', 'error');
    }
  };

  const canCreate = ['ADMIN', 'SALES'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Sales Challans</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage delivery challans, stock allocations, and client billing snapshots.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-600/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Challan
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" />
          Filter Listings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 transition-all font-medium"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 transition-all font-medium"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.businessName})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 transition-all font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-sm">Searching sales transactions...</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <FileText className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <p className="font-semibold text-sm text-gray-500">No Challans Registered</p>
            <p className="text-xs text-gray-400">Generate a new delivery challan or loosen filtering terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Challan No.</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {challans.map((ch) => (
                  <tr key={ch.id} className="hover:bg-gray-50/55 transition-colors">
                    <td className="p-4 pl-6 font-bold text-brand-700 font-mono text-xs">
                      <Link to={`/challans/${ch.id}`} className="hover:underline">
                        {ch.challanNumber}
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{ch.customer.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{ch.customer.businessName}</div>
                    </td>
                    <td className="p-4 font-medium text-gray-600">
                      {new Date(ch.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-bold text-gray-800">{ch.totalQuantity} items</td>
                    <td className="p-4 font-semibold text-gray-950">${ch.totalAmount.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ch.status === 'CONFIRMED'
                          ? 'bg-green-50 text-green-700 border border-green-150'
                          : ch.status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-150'
                          : 'bg-red-50 text-red-700 border border-red-150'
                      }`}>
                        {ch.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <Link
                        to={`/challans/${ch.id}`}
                        title="View Detailed Invoice / Print"
                        className="inline-flex p-1.5 hover:bg-gray-150/60 rounded-lg text-gray-500 hover:text-brand-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
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

      {/* Creation Slideover / Modal Overlay */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={() => setIsCreateOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-3xl w-full z-10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-600" />
                Generate Sales Challan
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer and status row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Select Customer <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 transition-all font-semibold"
                  >
                    <option value="">-- Choose Client Profile --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.businessName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Initial Status <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setChallanStatus('DRAFT')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        challanStatus === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border-amber-250 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Draft (No stock locks)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallanStatus('CONFIRMED')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        challanStatus === 'CONFIRMED'
                          ? 'bg-green-50 text-green-700 border-green-250 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Confirmed (Lock stock)
                    </button>
                  </div>
                </div>
              </div>

              {/* Line items section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-bold text-gray-900">Line Items Snapshots</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item Row
                  </button>
                </div>

                {/* Line rows */}
                <div className="space-y-3">
                  {lineItems.map((line, index) => {
                    const matchedProd = selectedProductMap.get(line.productId);
                    const isLowStock = matchedProd ? matchedProd.currentStock < line.quantity : false;
                    return (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                        {/* Product selection */}
                        <div className="flex-1 min-w-0">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Product</label>
                          <select
                            required
                            value={line.productId}
                            onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:bg-white outline-none focus:border-brand-500 transition-all font-semibold"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (${p.unitPrice} | Stock: {p.currentStock})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-full sm:w-28">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-xs bg-white outline-none focus:border-brand-500 transition-all font-bold ${
                              isLowStock && challanStatus === 'CONFIRMED' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'
                            }`}
                          />
                        </div>

                        {/* Subtotal preview info */}
                        <div className="w-full sm:w-32 self-end text-right pb-2 text-xs font-semibold text-gray-900">
                          {matchedProd ? (
                            <div>
                              <p>${(line.quantity * matchedProd.unitPrice).toFixed(2)}</p>
                              <p className={`text-[9px] mt-0.5 ${isLowStock ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                {isLowStock ? 'Insufficient stock' : `${matchedProd.currentStock} avail.`}
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-300">Choose product</p>
                          )}
                        </div>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          disabled={lineItems.length === 1}
                          className="self-end p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total calculations display */}
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-brand-500 shrink-0" />
                  <span>
                    Summarized Total: <strong className="text-brand-950 font-bold">{totalQty} items</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Estimated Amount</span>
                  <p className="text-2xl font-black text-brand-950 mt-0.5">${totalAmt.toFixed(2)}</p>
                </div>
              </div>

              {/* Save actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-250 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-brand-600/10 flex items-center gap-1.5"
                >
                  Generate Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Challans;
