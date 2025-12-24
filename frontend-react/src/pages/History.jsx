import React, { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const History = () => {
  // Mock data - In real app, fetch from API
  const [campaigns] = useState([
    { id: 1, name: 'Promoção Natal', date: '2023-12-19 14:30', total: 150, success: 145, fail: 5, status: 'completed' },
    { id: 2, name: 'Aviso Vencimento', date: '2023-12-18 09:00', total: 50, success: 40, fail: 10, status: 'completed' },
    { id: 3, name: 'Welcome Message', date: '2023-12-17 11:15', total: 300, success: 300, fail: 0, status: 'completed' },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Chart Data
  const totalSuccess = campaigns.reduce((acc, curr) => acc + curr.success, 0);
  const totalFail = campaigns.reduce((acc, curr) => acc + curr.fail, 0);

  const chartData = {
    labels: ['Enviados', 'Falhas'],
    datasets: [
      {
        data: [totalSuccess, totalFail],
        backgroundColor: ['#10B981', '#EF4444'],
        hoverBackgroundColor: ['#059669', '#DC2626'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Histórico de Campanhas</h2>
        <p className="text-gray-500">Analise o desempenho dos seus envios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Desempenho Geral</h3>
          <div className="h-64 flex items-center justify-center">
            <Pie data={chartData} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>
              <span className="text-gray-600">Sucesso ({((totalSuccess / (totalSuccess + totalFail)) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-600">Falhas ({((totalFail / (totalSuccess + totalFail)) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
            <div className="text-emerald-600 text-sm font-bold uppercase mb-2">Total de Envios</div>
            <div className="text-4xl font-bold text-emerald-800">{totalSuccess + totalFail}</div>
            <p className="text-emerald-600 text-sm mt-2"><i className="fas fa-arrow-up mr-1"></i> 12% vs mês anterior</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <div className="text-blue-600 text-sm font-bold uppercase mb-2">Campanhas Realizadas</div>
            <div className="text-4xl font-bold text-blue-800">{campaigns.length}</div>
            <p className="text-blue-600 text-sm mt-2">Última: {campaigns[0].date}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4 cursor-pointer hover:bg-gray-100">Nome <i className="fas fa-sort ml-1"></i></th>
                <th className="p-4 cursor-pointer hover:bg-gray-100">Data <i className="fas fa-sort ml-1"></i></th>
                <th className="p-4 text-center">Progresso</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{camp.name}</td>
                  <td className="p-4 text-gray-500">{camp.date}</td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full mr-2">
                        <div 
                          className="h-2 bg-emerald-500 rounded-full" 
                          style={{ width: `${(camp.success / camp.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{camp.success}/{camp.total}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-400 hover:text-emerald-600 mx-1" title="Ver Detalhes">
                      <i className="fas fa-eye"></i>
                    </button>
                    <button className="text-gray-400 hover:text-blue-600 mx-1" title="Exportar Relatório">
                      <i className="fas fa-download"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">1</span> a <span className="font-medium">{campaigns.length}</span> de <span className="font-medium">{campaigns.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Anterior</span>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Próximo</span>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
