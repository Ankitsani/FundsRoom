import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  LogOut,
  X,
  UserCheck,
  Warehouse,
  ClipboardList,
  Truck,
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuth();

  const links = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/customers',
      label: 'Customers CRM',
      icon: Users,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/products',
      label: 'Products & Inventory',
      icon: Package,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/challans',
      label: 'Sales Challans',
      icon: Receipt,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/erp/inventory',
      label: 'Multi-Location Stock',
      icon: Warehouse,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/erp/work-orders',
      label: 'Work Orders',
      icon: ClipboardList,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/erp/transfers',
      label: 'Internal Transfers',
      icon: Truck,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      to: '/erp/orders',
      label: 'Reservations',
      icon: ShoppingBag,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
  ];

  const allowedLinks = links.filter((link) => user && link.roles.includes(user.role));

  return (
    <div className="flex flex-col h-full bg-brand-950 text-white w-64 border-r border-brand-900 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-brand-900">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-500 p-2 rounded-xl text-white shadow-md shadow-brand-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide">Fundsroom</h1>
            <p className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase">Operations Portal</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-brand-900 rounded-lg transition-colors text-brand-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info Profile Card */}
      <div className="p-4 mx-4 my-6 bg-brand-900/40 border border-brand-800/40 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center font-bold text-white shadow-inner">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate leading-tight">{user?.name}</h2>
          <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/20 uppercase tracking-wider">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Nav Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {allowedLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/15'
                    : 'text-brand-300 hover:text-white hover:bg-brand-900/60'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Log Out Button */}
      <div className="p-4 border-t border-brand-900">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl text-sm font-medium transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
