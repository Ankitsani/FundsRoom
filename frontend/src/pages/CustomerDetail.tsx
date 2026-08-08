import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  User,
  Plus,
  Send
} from 'lucide-react';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.customers.get(id);
      setCustomer(res);
    } catch (err: any) {
      showToast(err.message || 'Error loading customer details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !id) return;

    setSubmittingNote(true);
    try {
      await api.customers.addNote(id, { noteText: newNote });
      showToast('Follow-up note added successfully', 'success');
      setNewNote('');
      fetchCustomerDetails(); // Reload notes
    } catch (err: any) {
      showToast(err.message || 'Error adding follow-up note', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-200 rounded-2xl lg:col-span-1"></div>
          <div className="h-96 bg-gray-200 rounded-2xl lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center p-12 text-gray-500 flex flex-col items-center justify-center gap-3">
        <FileText className="w-12 h-12 text-gray-300 stroke-[1.5]" />
        <h2 className="text-xl font-bold text-gray-900">Customer Not Found</h2>
        <Link to="/customers" className="text-brand-600 hover:text-brand-700 font-semibold text-sm">
          Return to customer directory
        </Link>
      </div>
    );
  }

  const canAddNote = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Customer Profile Info */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 space-y-6">
            {/* Header / Badges */}
            <div className="text-center border-b border-gray-100 pb-6">
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-inner mb-4">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{customer.name}</h1>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mt-1">{customer.businessName}</p>

              <div className="flex justify-center gap-2 mt-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  customer.customerType === 'RETAIL'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                    : customer.customerType === 'WHOLESALE'
                    ? 'bg-purple-50 text-purple-700 border border-purple-100'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  {customer.customerType}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  customer.status === 'ACTIVE'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : customer.status === 'LEAD'
                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>

            {/* Profile fields details */}
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile Number</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{customer.mobile}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                  <p className="font-semibold text-gray-900 mt-0.5 truncate">{customer.email}</p>
                </div>
              </div>

              {customer.gstNumber && (
                <div className="flex gap-3">
                  <Building className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">GSTIN Number</p>
                    <p className="font-semibold text-gray-900 mt-0.5 uppercase">{customer.gstNumber}</p>
                  </div>
                </div>
              )}

              {customer.followUpDate && (
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Follow-Up Date</p>
                    <p className="font-semibold text-brand-600 mt-0.5">
                      {new Date(customer.followUpDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address Details</p>
                  <p className="font-medium text-gray-600 mt-0.5 whitespace-pre-line leading-relaxed">{customer.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - CRM Timeline logs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Add note card */}
          {canAddNote && (
            <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-brand-600" />
                Add Follow-Up Note
              </h3>
              <form onSubmit={handleAddNote} className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Type a new update log note text..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-250 rounded-xl text-sm bg-gray-50/50 focus:bg-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="inline-flex items-center justify-center p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-brand-600/10 disabled:opacity-50 shrink-0"
                >
                  {submittingNote ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Follow-Up Activity Log
            </h2>

            {customer.followUpNotes && customer.followUpNotes.length > 0 ? (
              <div className="relative border-l-2 border-gray-100 ml-4 pl-6 space-y-6">
                {customer.followUpNotes.map((note: any) => (
                  <div key={note.id} className="relative group">
                    {/* Circle marker */}
                    <div className="absolute -left-[31px] top-1 bg-white border-2 border-brand-500 w-4 h-4 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-brand-500 rounded-full"></div>
                    </div>
                    {/* Log contents */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{note.author.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wider">
                          {note.author.role}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(note.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50/50 border border-gray-100 p-3 rounded-xl leading-relaxed">
                        {note.noteText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-400">
                <MessageSquare className="w-12 h-12 text-gray-300 stroke-[1.5] mx-auto mb-2" />
                <p className="font-semibold text-sm text-gray-500">No logs recorded</p>
                <p className="text-xs text-gray-400 mt-0.5">Start logging follow-ups to track this relationship.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CustomerDetail;
