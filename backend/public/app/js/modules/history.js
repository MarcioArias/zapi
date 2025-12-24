import { state } from './state.js';
import { renderVariableTags } from './ui.js';
import notifier from './notifier.js';

export async function loadHistory() {
    const campaigns = await window.db.getAll('campaigns');
    const myCampaigns = campaigns.filter(c => c.client_id === state.clientId).reverse();
    
    // Populate Datalist for Auto-Complete
    const datalist = document.getElementById('campaignsList');
    if(datalist) {
        datalist.innerHTML = myCampaigns.map(c => `<option value="${c.name}" data-id="${c.id}"></option>`).join('');
    }

    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arquivo</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucesso</th>
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${myCampaigns.map(c => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${new Date(c.date).toLocaleDateString()}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${c.name}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div class="flex items-center">
                                <i class="fas fa-file-excel text-emerald-500 mr-2"></i>
                                ${c.file_name || '-'}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                ${c.total}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                ${c.success}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="window.viewCampaignDetails('${c.id}')" class="text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors" title="Ver Detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

export async function viewCampaignDetails(id) {
    const campaigns = await window.db.getAll('campaigns');
    const c = campaigns.find(x => x.id === id);
    if(!c) return;

    const mediaInfo = c.media ? (c.media.name || 'Sim') : 'Não';
    const consentInfo = c.consent_column ? `${c.consent_column} = "${c.consent_value}"` : 'Não aplicado';
    
    // Build Detailed Table
    let logsHtml = '<div class="text-center text-gray-500 py-8">Nenhum detalhe registrado para esta campanha.</div>';
    if (c.logs && c.logs.length > 0) {
        logsHtml = `
            <div class="overflow-x-auto border border-gray-200 rounded-lg mt-6">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensagem</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${c.logs.map(log => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${new Date(log.date).toLocaleTimeString()}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    ${log.name}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${log.phone}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${log.status === 'success' ? 'Enviado' : 'Falha'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title="${log.message}">
                                    ${log.message}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    const content = `
        <div class="grid grid-cols-2 gap-6 mb-6">
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Nome:</strong> ${c.name}</p>
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Data:</strong> ${new Date(c.date).toLocaleString()}</p>
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Arquivo:</strong> ${c.file_name || 'N/A'}</p>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Total:</strong> ${c.total}</p>
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Sucesso:</strong> <span class="text-green-600 font-bold">${c.success}</span></p>
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Mídia:</strong> ${mediaInfo}</p>
                <p class="text-sm text-gray-600"><strong class="font-medium text-gray-900">Filtro Opt-in:</strong> ${consentInfo}</p>
            </div>
        </div>
        
        <div class="mb-6">
            <strong class="block text-sm font-medium text-gray-900 mb-2">Mensagem Modelo:</strong>
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono">${c.template}</div>
        </div>

        <div>
            <div class="flex justify-between items-center mb-4">
                <strong class="text-lg font-medium text-gray-900">Detalhamento de Envios</strong>
                <button onclick="window.exportCampaignPDF('${c.id}')" class="flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                    <i class="fas fa-file-pdf mr-2"></i> Baixar PDF
                </button>
            </div>
            ${logsHtml}
        </div>
    `;

    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('detailsModal').style.display = 'flex';
}

export function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

export async function exportCampaignPDF(id) {
    const campaigns = await window.db.getAll('campaigns');
    const c = campaigns.find(x => x.id === id);
    if(!c) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 168, 132); // WhatsApp Green
    doc.text(`Relatório de Campanha: ${c.name}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date(c.date).toLocaleString()}`, 14, 30);
    doc.text(`Arquivo: ${c.file_name || 'N/A'}`, 14, 36);
    doc.text(`Total: ${c.total} | Sucesso: ${c.success} | Falha: ${c.failed}`, 14, 42);

    // Table Data
    const tableColumn = ["Hora", "Nome", "Telefone", "Status", "Mensagem"];
    const tableRows = [];

    if(c.logs && c.logs.length > 0) {
        c.logs.forEach(log => {
            const row = [
                new Date(log.date).toLocaleTimeString(),
                log.name,
                log.phone,
                log.status === 'success' ? 'Enviado' : 'Falha',
                log.message
            ];
            tableRows.push(row);
        });
    }

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 168, 132] }
    });

    doc.save(`relatorio_${c.name.replace(/\s+/g, '_')}.pdf`);
}

export async function loadCampaignModel(id) {
    // Prevent accidental triggers or confirm action
    const campaigns = await window.db.getAll('campaigns');
    const c = campaigns.find(x => x.id === id);
    if(!c) return;

    if(!(await notifier.confirm(`Deseja carregar o modelo da campanha "${c.name}"?`))) return;

    state.loadedCampaignId = c.id; // Mark as loaded/reused

    // Restore Form Data (Message)
    document.getElementById('campMessage').value = c.template;
    
    // Restore Media
    if(c.media) {
        state.currentAttachment = c.media;
        const display = document.getElementById('currentAttachmentDisplay');
        display.style.display = 'block';
        display.textContent = `📎 Mídia recuperada: ${c.media.name || 'Anexo'}`;
        document.getElementById('attachmentInput').value = ''; // Clear input
    } else {
        state.currentAttachment = null;
        document.getElementById('currentAttachmentDisplay').style.display = 'none';
    }

    // Restore Contacts?
    if(c.contacts && c.contacts.length > 0) {
        if(await notifier.confirm(`Esta campanha possui ${c.total} contatos salvos. Deseja usar esta lista também?`)) {
            state.currentContacts = c.contacts;
            state.currentFileName = c.file_name || 'Lista Recuperada';
            
            // Restore Columns (guess from first contact)
            state.currentColumns = Object.keys(state.currentContacts[0]);
            
            if(c.phone_column) {
                state.selectedPhoneColumn = c.phone_column;
            } else {
                state.selectedPhoneColumn = '';
            }

            state.selectedConsentColumn = c.consent_column || '';
            state.consentValue = c.consent_value || '';
            
            // Update UI
            document.getElementById('fileName').textContent = `Arquivo: ${state.currentFileName} (Recuperado)`;
            document.getElementById('countContacts').textContent = state.currentContacts.length;
            renderVariableTags();
            
            // Note: We are already in Step 2, so UI for step 1 won't be visible unless we go back.
            // But we update the elements so if user goes back, it's there.
            // Also update preview counts
            document.getElementById('previewCount').textContent = state.currentContacts.length;
        }
    }
}

export async function exportHistory() {
    const campaigns = await window.db.getAll('campaigns');
    const myCampaigns = campaigns.filter(c => c.client_id === state.clientId);
    
    const data = myCampaigns.map(c => ({
        Data: new Date(c.date).toLocaleDateString(),
        Hora: new Date(c.date).toLocaleTimeString(),
        Nome: c.name,
        Arquivo: c.file_name || '-',
        Mensagem: c.template,
        Total: c.total,
        Sucesso: c.success,
        Falha: c.failed
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, "historico_campanhas.xlsx");
}
