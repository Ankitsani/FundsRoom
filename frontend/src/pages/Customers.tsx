import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Search,
  Plus,
  Edit2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  UserPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [customerType, setCustomerType] = useState('RETAIL');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('LEAD');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.customers.list({ page, limit: 8, search });
      setCustomers(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotal(res.meta?.total || 0);
    } catch (err: any) {
      showToast(err.message || 'Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const openAddModal = () => {
    setSelectedCustomer(null);
    setName('');
    setMobile('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setCustomerType('RETAIL');
    setAddress('');
    setStatus('LEAD');
    setFollowUpDate('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setSelectedCustomer(c);
    setName(c.name);
    setMobile(c.mobile);
    setEmail(c.email);
    setBusinessName(c.businessName);
    setGstNumber(c.gstNumber || '');
    setCustomerType(c.customerType);
    setAddress(c.address);
    setStatus(c.status);
    setFollowUpDate(c.followUpDate ? c.followUpDate.split('T')[0] : '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!name || !mobile || !email || !businessName || !address) {
      showToast('All required fields must be filled', 'error');
      return;
    }

    const payload = {
      name,
      mobile,
      email,
      businessName,
      gstNumber: gstNumber || null,
      customerType,
      address,
      status,
      followUpDate: followUpDate || null,
      notes: notes || null,
    };

    try {
      if (selectedCustomer) {
        await api.customers.update(selectedCustomer.id, payload);
        showToast('Customer updated successfully', 'success');
      } else {
        await api.customers.create(payload);
        showToast('Customer created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.message || 'Error saving customer details', 'error');
    }
  };

  const canEdit = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customer CRM</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage customer directory, pipelines, and logs.</p>
        </div>
        {canEdit && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-brand-600/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile or business name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
        <div className="text-xs font-semibold text-gray-400">
          Showing {customers.length} of {total} customers
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-sm">Searching customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <FileText className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <p className="font-semibold text-sm text-gray-500">No Customers Found</p>
            <p className="text-xs text-gray-400">Try modifying your search queries or register a new customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Client Name</th>
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Mobile & Email</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/55 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-gray-900">
                      <Link to={`/customers/${c.id}`} className="hover:text-brand-600 transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-4 font-medium text-gray-600">{c.businessName}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{c.mobile}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.customerType === 'RETAIL'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : c.customerType === 'WHOLESALE'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : c.status === 'LEAD'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 space-x-2 shrink-0">
                      <Link
                        to={`/customers/${c.id}`}
                        title="View Details"
                        className="inline-flex p-1.5 hover:bg-gray-150/60 rounded-lg text-gray-500 hover:text-brand-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Details"
                          className="inline-flex p-1.5 hover:bg-gray-150/60 rounded-lg text-gray-500 hover:text-brand-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full z-10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                {selectedCustomer ? 'Edit Customer Details' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aman Gupta"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Business Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Aman Retailers Ltd"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aman@gmail.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Customer Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Customer Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* GSTIN (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    GST Number <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 07AAAAA1111A1Z1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Follow Up Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Follow-Up Date <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Billing/Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
                  ></textarea>
                </div>

                {/* Notes (Only for Create) */}
                {!selectedCustomer && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      CRM Notes <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add initial customer notes/details..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
                    ></textarea>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
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
                  {selectedCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Customers;
