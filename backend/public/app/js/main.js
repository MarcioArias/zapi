import { state, initState } from './modules/state.js';
import { checkConnectionGate, initGateConnection, simulateScan } from './modules/gate.js';
import { showModule, toggleSidebar, goToStep } from './modules/ui.js';
import { handleFileUpload, confirmPhoneColumn } from './modules/file-handler.js';
import { previewCampaign, startCampaign, resumeCampaign } from './modules/campaign.js';
import { loadHistory, viewCampaignDetails, closeDetailsModal, exportCampaignPDF, exportHistory, loadCampaignModel } from './modules/history.js';
import { exportFullDatabase, handleBackupSelect } from './modules/backup-manager.js';
import notifier from './modules/notifier.js';

// Expose to window for HTML event handlers
window.handleFileUpload = handleFileUpload;
window.confirmPhoneColumn = confirmPhoneColumn;
window.previewCampaign = previewCampaign;
window.startCampaign = startCampaign;
window.resumeCampaign = resumeCampaign;
window.initGateConnection = initGateConnection;
window.simulateScan = simulateScan;
window.showModule = showModule;
window.toggleSidebar = toggleSidebar;
window.goToStep = goToStep;
window.viewCampaignDetails = viewCampaignDetails;
window.closeDetailsModal = closeDetailsModal;
window.exportCampaignPDF = exportCampaignPDF;
window.exportHistory = exportHistory;
window.loadCampaignModel = loadCampaignModel;
window.exportFullDatabase = exportFullDatabase;
window.handleBackupSelect = handleBackupSelect;

window.logout = function() {
    localStorage.removeItem('zapi_user');
    window.location.href = '../index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    initState();
    
    try {
        await Promise.race([
            window.db.init(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 3000))
        ]);
    } catch (e) { console.error('DB Init Error:', e); }

    document.getElementById('userName').textContent = state.user.name || 'Operador';
    
    // Campaign Name Auto-Complete Listener
    document.getElementById('campName').addEventListener('input', async function() {
        const val = this.value;
        const opts = document.getElementById('campaignsList').options;
        for(let i=0; i<opts.length; i++) {
            if(opts[i].value === val) {
                const id = opts[i].getAttribute('data-id');
                await loadCampaignModel(id);
                break;
            }
        }
    });

    // Attachment input listener
    document.getElementById('attachmentInput').addEventListener('change', function() {
        if(this.files.length > 0) {
            document.getElementById('currentAttachmentDisplay').style.display = 'none';
            document.getElementById('attachmentName').textContent = this.files[0].name;
            document.getElementById('attachmentName').classList.add('text-emerald-600', 'font-medium');
            state.currentAttachment = null; // Will be set in previewCampaign
        } else {
            document.getElementById('attachmentName').textContent = 'Nenhum arquivo selecionado';
            document.getElementById('attachmentName').classList.remove('text-emerald-600', 'font-medium');
        }
    });

    await checkConnectionGate();

    // Check for interrupted campaigns
    try {
        const campaigns = await window.db.getAll('campaigns');
        const interrupted = campaigns.find(c => c.client_id === state.clientId && c.status === 'sending');
        if(interrupted) {
            if(await notifier.confirm(`A campanha "${interrupted.name}" foi interrompida. Deseja retomar de onde parou (${interrupted.logs.length}/${interrupted.total})?`)) {
                resumeCampaign(interrupted);
            } else {
                interrupted.status = 'stopped';
                await window.db.update('campaigns', interrupted);
            }
        }
    } catch(e) { console.error('Error checking interrupted campaigns:', e); }

    window.addEventListener('beforeunload', (e) => {
        if (state.isSending) {
            e.preventDefault();
            e.returnValue = 'Uma campanha está em andamento. Tem certeza que deseja sair?';
        }
    });
});
