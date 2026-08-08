import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Building,
  User,
  Package
} from 'lucide-react';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [challan, setChallan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchChallanDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.challans.get(id);
      setChallan(res);
    } catch (err: any) {
      showToast(err.message || 'Error loading challan details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallanDetails();
  }, [id]);

  const handleUpdateStatus = async (status: 'CONFIRMED' | 'CANCELLED') => {
    if (!id) return;
    const confirmMsg =
      status === 'CONFIRMED'
        ? 'Are you sure you want to CONFIRM this challan? This will lock and decrement product stock.'
        : 'Are you sure you want to CANCEL this challan? This will restock all confirmed quantities.';
    
    if (!window.confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      await api.challans.updateStatus(id, status);
      showToast(`Challan successfully ${status.toLowerCase()}`, 'success');
      fetchChallanDetails();
    } catch (err: any) {
      showToast(err.message || `Error updating status to ${status}`, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="text-center p-12 text-gray-500 flex flex-col items-center justify-center gap-3">
        <FileText className="w-12 h-12 text-gray-300 stroke-[1.5]" />
        <h2 className="text-xl font-bold text-gray-900">Challan Not Found</h2>
        <Link to="/challans" className="text-brand-600 hover:text-brand-700 font-semibold text-sm">
          Return to Sales Challans
        </Link>
      </div>
    );
  }

  const canModify = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Back button and header options */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          to="/challans"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Challans
        </Link>
        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-250 hover:bg-gray-50 rounded-lg text-sm font-semibold text-gray-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
      </div>

      {/* Main Invoice Card */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden p-8 sm:p-12 max-w-4xl mx-auto print:border-0 print:shadow-none print:p-0 print:m-0">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-100 pb-8">
          {/* Company details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-600">
              <Package className="w-7 h-7 shrink-0 fill-brand-100" />
              <span className="font-extrabold text-2xl tracking-tight text-gray-900">Fundsroom</span>
            </div>
            <p className="text-xs text-gray-500 leading-normal max-w-xs">
              Fundsroom Wholesale & Distribution Ltd.<br />
              15th floor, Tech Park Phase-II, Sector-62,<br />
              Noida, Uttar Pradesh, India - 201301
            </p>
          </div>

          {/* Invoice ID/Status */}
          <div className="md:text-right space-y-1.5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">SALES CHALLAN</h2>
            <p className="font-mono text-sm font-bold text-brand-600 uppercase mt-1">{challan.challanNumber}</p>
            <div className="md:justify-end flex">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                challan.status === 'CONFIRMED'
                  ? 'bg-green-50 text-green-700 border border-green-150'
                  : challan.status === 'DRAFT'
                  ? 'bg-amber-50 text-amber-700 border border-amber-150'
                  : 'bg-red-50 text-red-700 border border-red-150'
              }`}>
                {challan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 text-sm text-gray-600">
          {/* Billed To Customer */}
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Billed & Shipped To</span>
            <div className="space-y-1">
              <p className="font-bold text-gray-900 text-base">{challan.customer.name}</p>
              <p className="font-semibold text-gray-700">{challan.customer.businessName}</p>
              {challan.customer.gstNumber && (
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 mt-1">
                  GSTIN: {challan.customer.gstNumber}
                </p>
              )}
              <p className="text-xs text-gray-500 whitespace-pre-line mt-2 leading-relaxed">
                {challan.customer.address}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="sm:text-right space-y-3">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Issue Date</span>
              <p className="font-bold text-gray-800">
                {new Date(challan.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Created By User</span>
              <p className="font-bold text-gray-800">
                {challan.createdBy.name} <span className="text-xs text-gray-400 font-semibold uppercase">({challan.createdBy.role})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Lines Table */}
        <div className="border border-gray-150 rounded-xl overflow-hidden mt-8">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-3 pl-5">#</th>
                <th className="p-3">Product snapshot description</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right pr-5">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-gray-700">
              {challan.lineItems.map((line: any, index: number) => (
                <tr key={line.id}>
                  <td className="p-3 pl-5 font-bold text-gray-400">{index + 1}</td>
                  <td className="p-3">
                    <p className="font-semibold text-gray-900">{line.productName}</p>
                    <p className="text-[10px] font-mono font-bold text-gray-400 uppercase mt-0.5">SKU: {line.productSku}</p>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-800">{line.quantity} units</td>
                  <td className="p-3 text-right font-medium">${line.priceAtSale.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-gray-950 pr-5">
                    ${(line.quantity * line.priceAtSale).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col sm:flex-row items-end justify-between gap-6 mt-8 border-t border-gray-100 pt-6 text-sm">
          {/* Notes */}
          <div className="max-w-xs text-xs text-gray-400 italic leading-relaxed">
            Note: This challan is generated automatically. Confirmed status allocates stock directly from warehouse. Draft status does not allocate inventory.
          </div>

          {/* Pricing summary */}
          <div className="w-full sm:w-64 space-y-2 text-right text-gray-600">
            <div className="flex justify-between font-semibold">
              <span>Total Quantity:</span>
              <span className="text-gray-900">{challan.totalQuantity} items</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-150 pt-2 text-gray-900">
              <span>Grand Total:</span>
              <span className="text-2xl font-black text-brand-950">${challan.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Only for non-print / authorized users) */}
        {canModify && challan.status !== 'CANCELLED' && (
          <div className="mt-12 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-end gap-3 print:hidden">
            {challan.status === 'DRAFT' && (
              <button
                onClick={() => handleUpdateStatus('CONFIRMED')}
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-600/10 disabled:opacity-55"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Challan (Lock stock)
              </button>
            )}
            <button
              onClick={() => handleUpdateStatus('CANCELLED')}
              disabled={updating}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-55"
            >
              <XCircle className="w-4 h-4" />
              Cancel Challan (Restock)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChallanDetail;
