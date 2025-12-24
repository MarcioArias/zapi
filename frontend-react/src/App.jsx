import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import NewCampaign from './pages/NewCampaign';
import History from './pages/History';
import Connection from './pages/Connection';
import { getUser } from './utils/api';

const App = () => {
  const [activeModule, setActiveModule] = useState('campaigns');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = getUser();

  const renderModule = () => {
    switch (activeModule) {
      case 'campaigns': return <NewCampaign />;
      case 'history': return <History />;
      case 'instances': return <Connection />;
      default: return <NewCampaign />;
    }
  };

  return (
    <div className="bg-gray-50 font-sans text-gray-800 min-h-screen flex flex-col md:flex-row overflow-hidden">
      <MobileHeader setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 h-screen overflow-hidden relative">
        <Sidebar 
          activeModule={activeModule} 
          setActiveModule={setActiveModule}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          user={user}
        />

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-8 w-full">
          {renderModule()}
        </main>
      </div>
    </div>
  );
};

export default App;
