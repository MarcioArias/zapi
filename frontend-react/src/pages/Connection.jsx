import React, { useState, useEffect } from 'react';
import { getClientId, API_URL } from '../utils/api';

const Connection = () => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const clientId = getClientId();

  const fetchInstances = async () => {
    try {
      const res = await fetch(`${API_URL}/instances?client_id=${clientId}`);
      if (!res.ok) throw new Error('Falha ao buscar instâncias');
      const data = await res.json();
      setInstances(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateInstance = async () => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          name: 'Nova Conexão'
        })
      });
      fetchInstances();
    } catch (err) {
      alert('Erro ao criar conexão');
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Deseja realmente desconectar?')) return;
    try {
      await fetch(`${API_URL}/instances/${id}`, { method: 'DELETE' });
      fetchInstances();
    } catch (err) {
      alert('Erro ao desconectar');
    }
  };

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Minha Conexão</h2>
          <p className="text-gray-500">Gerencie o status do seu WhatsApp.</p>
        </div>
        <button 
          onClick={handleCreateInstance}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
        >
          <i className="fas fa-plus mr-2"></i> Nova Conexão
        </button>
      </div>

      {loading && instances.length === 0 && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Carregando conexões...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 flex items-center">
          <i className="fas fa-exclamation-circle mr-3 text-xl"></i>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instances.map((inst) => (
          <div key={inst.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4
                    ${inst.status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    <i className={`fas ${inst.status === 'connected' ? 'fa-check' : 'fa-qrcode'}`}></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{inst.name}</h3>
                    <p className={`text-sm font-medium flex items-center
                      ${inst.status === 'connected' ? 'text-emerald-600' : 'text-orange-500'}`}>
                      <span className={`w-2 h-2 rounded-full mr-2
                        ${inst.status === 'connected' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                      {inst.status === 'connected' ? 'Conectado' : 'Aguardando Leitura'}
                    </p>
                  </div>
                </div>
                {inst.status === 'connected' && (
                  <button 
                    onClick={() => handleDisconnect(inst.id)}
                    className="text-red-400 hover:text-red-600 p-2" 
                    title="Desconectar"
                  >
                    <i className="fas fa-power-off"></i>
                  </button>
                )}
              </div>

              {inst.status === 'connecting' && inst.qr_code && (
                <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center border border-gray-200">
                  <img src={inst.qr_code} alt="QR Code" className="w-48 h-48 object-contain mb-3 mix-blend-multiply" />
                  <p className="text-xs text-gray-500 text-center">
                    Abra o WhatsApp > Menu > Aparelhos conectados > Conectar um aparelho
                  </p>
                </div>
              )}

              {inst.status === 'connected' && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between text-sm text-emerald-800 mb-2">
                    <span>Bateria</span>
                    <span className="font-bold">85%</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
              <span>ID: {inst.id}</span>
              <button className="text-emerald-600 hover:underline">Ver Logs</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Connection;
