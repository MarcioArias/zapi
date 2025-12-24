import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const NewCampaign = () => {
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [phoneColumn, setPhoneColumn] = useState('');
  const [progress, setProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (json.length > 0) {
        setContacts(json);
        const cols = Object.keys(json[0]);
        setColumns(cols);
        // Auto-detect phone column
        const likelyPhone = cols.find(c => /tel|cel|phone|wpp|whats/i.test(c));
        if (likelyPhone) setPhoneColumn(likelyPhone);
        else setPhoneColumn(cols[0]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const insertVariable = (variable) => {
    setMessage(prev => prev + `{{${variable}}}`);
  };

  const startSending = () => {
    setIsSending(true);
    let sent = 0;
    const interval = setInterval(() => {
      sent += 1;
      const pct = Math.min(100, Math.round((sent / contacts.length) * 100));
      setProgress(pct);
      if (sent >= contacts.length) {
        clearInterval(interval);
        setIsSending(false);
        alert('Campanha enviada com sucesso!');
      }
    }, 100);
  };

  return (
    <div className="fade-in max-w-4xl mx-auto">
      {/* Wizard Progress Bar */}
      <div className="mb-8 relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-emerald-500 -z-10 transition-all duration-500" 
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center bg-gray-50 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-gray-50 transition-colors
                ${step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                {s}
              </div>
              <span className={`text-xs font-medium mt-1 ${step >= s ? 'text-emerald-700' : 'text-gray-500'}`}>
                {['Importar', 'Mensagem', 'Revisão', 'Envio'][s-1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Import */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Importar Contatos</h2>
          <p className="text-gray-500 mb-8">Carregue sua planilha Excel (.xlsx) com os contatos.</p>

          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current.click()}
          >
            <i className="fas fa-cloud-upload-alt text-5xl text-emerald-500 mb-4"></i>
            <p className="font-medium text-gray-700">Clique para selecionar ou arraste o arquivo</p>
            <p className="text-sm text-gray-400 mt-2">Suporta .xlsx, .csv</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.csv" 
              onChange={handleFileUpload}
            />
          </div>

          {fileName && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg flex items-center justify-between animate-fade-in-up">
              <div className="flex items-center">
                <i className="fas fa-file-excel text-emerald-600 text-xl mr-3"></i>
                <div className="text-left">
                  <p className="font-bold text-gray-800">{fileName}</p>
                  <p className="text-xs text-emerald-600">{contacts.length} contatos encontrados</p>
                </div>
              </div>
              <button onClick={() => setFileName('')} className="text-red-400 hover:text-red-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="mt-6 text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Coluna de Telefone</label>
              <select 
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2 border"
              >
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button 
              disabled={contacts.length === 0}
              onClick={() => setStep(2)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo Passo <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Message */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Editor de Mensagem</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sua Mensagem</label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Olá {{nome}}, temos uma oferta para você..."
                ></textarea>
                <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                  {message.length} caracteres
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Variáveis Disponíveis (Clique para inserir):</p>
                <div className="flex flex-wrap gap-2">
                  {columns.map(col => (
                    <button
                      key={col}
                      onClick={() => insertVariable(col)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-gray-200"
                    >
                      {`{{${col}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-100 rounded-xl p-4 h-full border-4 border-gray-800" style={{ maxWidth: '300px', margin: '0 auto' }}>
                <div className="bg-white h-full rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-emerald-600 p-3 text-white text-sm font-bold flex items-center">
                    <i className="fas fa-chevron-left mr-2"></i> Preview
                  </div>
                  <div className="flex-1 bg-[#e5ddd5] p-3 overflow-y-auto">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-sm mb-2 rounded-tl-none max-w-[85%]">
                      {message || 'Sua mensagem aparecerá aqui...'}
                      <div className="text-[10px] text-gray-400 text-right mt-1">10:45</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-500 font-medium hover:text-gray-700">
              Voltar
            </button>
            <button 
              disabled={!message}
              onClick={() => setStep(3)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Revisar Campanha <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Schedule */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Agendar e Revisar</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h3 className="text-blue-800 font-bold mb-4">Resumo da Campanha</h3>
              <ul className="space-y-3 text-blue-900">
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Total de Contatos:</span>
                  <span className="font-bold">{contacts.length}</span>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Coluna de Telefone:</span>
                  <span className="font-bold">{phoneColumn}</span>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Tempo Estimado:</span>
                  <span className="font-bold">~{Math.ceil(contacts.length * 5 / 60)} minutos</span>
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agendamento (Opcional)</label>
              <p className="text-xs text-gray-500 mb-3">Deixe em branco para enviar imediatamente.</p>
              <input 
                type="datetime-local" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              
              <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <div className="flex items-start">
                  <i className="fas fa-lightbulb text-yellow-600 mt-1 mr-3"></i>
                  <p className="text-sm text-yellow-800">
                    <strong>Dica:</strong> Agende campanhas para horários comerciais para aumentar a taxa de resposta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-gray-500 font-medium hover:text-gray-700">
              Voltar
            </button>
            <button 
              onClick={() => setStep(4)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              <i className="fas fa-paper-plane mr-2"></i> Confirmar Envio
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Sending */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
          {!isSending && progress === 0 && (
             <div className="py-10">
               <h2 className="text-2xl font-bold text-gray-800 mb-4">Pronto para Enviar!</h2>
               <button 
                 onClick={startSending}
                 className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-700 transition-transform transform hover:scale-105 shadow-xl"
               >
                 COMEÇAR AGORA
               </button>
             </div>
          )}

          {(isSending || progress > 0) && (
            <div className="py-8">
              <div className="w-40 h-40 mx-auto mb-6 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-200" />
                  <circle 
                    cx="80" cy="80" r="70" 
                    stroke="currentColor" strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={440} 
                    strokeDashoffset={440 - (440 * progress) / 100} 
                    className="text-emerald-500 transition-all duration-300 ease-linear" 
                  />
                </svg>
                <span className="absolute text-3xl font-bold text-emerald-600">{progress}%</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-2">Enviando mensagens...</h3>
              <p className="text-gray-500">Por favor, mantenha esta janela aberta.</p>
              
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{Math.round((contacts.length * progress) / 100)}</div>
                  <div className="text-xs text-emerald-800">Enviados</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-xs text-red-800">Falhas</div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{contacts.length}</div>
                  <div className="text-xs text-gray-800">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewCampaign;
