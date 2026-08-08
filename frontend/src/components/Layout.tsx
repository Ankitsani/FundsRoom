import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, LogOut, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile Backdrop Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>

          {/* Drawer Panel */}
          <div className="relative z-50 flex flex-col max-w-xs w-full animate-slide-right-to-left">
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between lg:justify-end h-16 px-6 bg-white border-b border-gray-200/80 shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              <Package className="w-5 h-5 text-brand-600" />
              <span className="font-bold text-sm text-gray-900">Fundsroom ERP</span>
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-700 leading-none">{user?.name}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{user?.role}</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default Layout;
