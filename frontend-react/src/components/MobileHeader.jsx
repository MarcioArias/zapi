import React from 'react';

const MobileHeader = ({ setSidebarOpen }) => {
  return (
    <div className="md:hidden flex items-center justify-between bg-white p-4 shadow-sm relative z-30">
      <div className="text-xl font-bold text-gray-800 flex items-center">
        <span className="text-emerald-600 mr-2">⚡</span> ZAPY
      </div>
      <button onClick={() => setSidebarOpen(true)} className="text-gray-600 focus:outline-none">
        <i className="fas fa-bars text-2xl"></i>
      </button>
    </div>
  );
};

export default MobileHeader;
