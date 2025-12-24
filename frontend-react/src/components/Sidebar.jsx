import React from 'react';

const Sidebar = ({ activeModule, setActiveModule, sidebarOpen, setSidebarOpen, user }) => {
  const menuItems = [
    { id: 'campaigns', label: 'Nova Campanha', icon: 'fa-paper-plane' },
    { id: 'history', label: 'Histórico', icon: 'fa-history' },
    { id: 'instances', label: 'Minha Conexão', icon: 'fa-wifi' },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:relative'}`}
    >
      <div className="p-6 border-b border-gray-100 flex items-center">
        <span className="text-2xl mr-2">⚡</span>
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-wide">ZAPY</h1>
          <p className="text-xs text-gray-500">Painel do Operador</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveModule(item.id);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-colors group font-medium
              ${activeModule === item.id 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'}`}
          >
            <i className={`fas ${item.icon} w-6 text-center mr-2`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold mr-3 text-lg">
            <i className="fas fa-user"></i>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-800 truncate">
              {user ? user.name : 'Operador'}
            </p>
            <p className="text-xs text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('zapi_user');
            window.location.href = '/';
          }}
          className="w-full flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-100"
        >
          <i className="fas fa-sign-out-alt mr-2"></i> Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
