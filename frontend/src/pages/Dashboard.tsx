import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Package,
  Receipt,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  PackageOpen,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalCustomers: number;
  lowStockCount: number;
  draftChallans: number;
  confirmedChallans: number;
  totalSalesValue: number;
  lowStockProducts: any[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [custRes, prodRes, challanRes, lowStockRes] = await Promise.all([
          api.customers.list({ limit: 1 }),
          api.products.list({ limit: 1 }),
          api.challans.list({ limit: 50 }),
          api.products.list({ lowStock: true, limit: 5 }),
        ]);

        const allChallans = challanRes.data || [];
        const draft = allChallans.filter((c: any) => c.status === 'DRAFT').length;
        const confirmed = allChallans.filter((c: any) => c.status === 'CONFIRMED').length;
        const confirmedSales = allChallans
          .filter((c: any) => c.status === 'CONFIRMED')
          .reduce((acc: number, cur: any) => acc + cur.totalAmount, 0);

        setStats({
          totalCustomers: custRes.meta?.total || 0,
          lowStockCount: lowStockRes.meta?.total || 0,
          draftChallans: draft,
          confirmedChallans: confirmed,
          totalSalesValue: confirmedSales,
          lowStockProducts: lowStockRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-gray-200 rounded-2xl lg:col-span-2"></div>
          <div className="h-96 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-500 mt-1">Here is a quick snapshot of your business operations today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Customers Stat */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Customers</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalCustomers}</h3>
          </div>
        </div>

        {/* Low Stock Alert Stat */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className={`p-3 rounded-xl ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {stats?.lowStockCount && stats.lowStockCount > 0 ? (
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            ) : (
              <Package className="w-6 h-6" />
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock Products</span>
            <h3 className={`text-2xl font-bold mt-1 ${stats?.lowStockCount && stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats?.lowStockCount}
            </h3>
          </div>
        </div>

        {/* Challans Count */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Draft / Confirmed</span>
            <h3 className="text-xl font-bold text-gray-900 mt-1 truncate">
              {stats?.draftChallans} <span className="text-gray-300 text-sm font-medium">/</span> {stats?.confirmedChallans}
            </h3>
          </div>
        </div>

        {/* Sales Value */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="bg-green-50 text-green-600 p-3 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Confirmed Revenue</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">${stats?.totalSalesValue.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side - Shortcut Panel & Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['ADMIN', 'SALES'].includes(user?.role || '') && (
                <Link
                  to="/challans?new=true"
                  className="flex items-center justify-between p-4 bg-brand-50 hover:bg-brand-100/70 border border-brand-100 rounded-xl group transition-all"
                >
                  <div>
                    <h3 className="font-semibold text-brand-900 text-sm">Create New Challan</h3>
                    <p className="text-xs text-brand-600 mt-0.5">Generate sales challans & invoices</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-brand-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              {['ADMIN', 'SALES', 'ACCOUNTS'].includes(user?.role || '') && (
                <Link
                  to="/customers"
                  className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 rounded-xl group transition-all"
                >
                  <div>
                    <h3 className="font-semibold text-blue-900 text-sm">Add CRM Customer</h3>
                    <p className="text-xs text-blue-600 mt-0.5">Register new leads and wholesales</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              {['ADMIN', 'WAREHOUSE'].includes(user?.role || '') && (
                <Link
                  to="/products"
                  className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100/70 border border-purple-100 rounded-xl group transition-all"
                >
                  <div>
                    <h3 className="font-semibold text-purple-900 text-sm">Add New Product</h3>
                    <p className="text-xs text-purple-600 mt-0.5">Add to inventory & set locations</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <Link
                to="/challans"
                className="flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100/70 border border-amber-100 rounded-xl group transition-all"
              >
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm">View Sales Challans</h3>
                  <p className="text-xs text-amber-600 mt-0.5">Review, print or cancel challans</p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Low Stock Banner list */}
        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Stock Alerts
          </h2>
          
          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {stats.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 bg-red-50/40 border border-red-100 rounded-xl"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{p.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">SKU: {p.sku} | Loc: {p.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg leading-none">
                      {p.currentStock} left
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Alert threshold: {p.minimumStockAlertQty}</p>
                  </div>
                </div>
              ))}
              <div className="pt-2 text-center">
                <Link to="/products?lowStock=true" className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center justify-center gap-1">
                  View All Low Stock
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <PackageOpen className="w-12 h-12 text-gray-300 stroke-[1.5] mb-2" />
              <p className="font-medium text-sm text-gray-500">All stocks healthy</p>
              <p className="text-xs text-gray-400 mt-1">No products are currently under their minimum thresholds.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
