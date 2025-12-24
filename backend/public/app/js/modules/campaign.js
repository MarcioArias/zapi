import { state } from './state.js';
import { sendMessage, fetchInstances } from './api.js';
import { goToStep } from './ui.js';
import { loadHistory } from './history.js';
import { readFileAsBase64 } from './utils.js';
import notifier from './notifier.js';

export async function checkConnection() {
    try {
        const instances = await fetchInstances();
        
        // If we have a current ID, check its specific status
        if (state.currentInstanceId) {
            const instance = instances.find(i => i.id === state.currentInstanceId);
            if (instance && instance.status === 'connected') {
                return { ok: true };
            }
        }
        
        // If not connected or no ID, try to find ANY connected instance
        const connected = instances.find(i => i.status === 'connected');
        if (connected) {
            state.currentInstanceId = connected.id; // Auto-recover
            return { ok: true };
        }

        return { ok: false, reason: 'WhatsApp desconectado' };
    } catch (e) {
        return { ok: false, reason: 'Erro de rede' };
    }
}

export async function previewCampaign() {
    const name = document.getElementById('campName').value;
    const msg = document.getElementById('campMessage').value;
    const fileInput = document.getElementById('attachmentInput');
    const file = fileInput.files[0];

    if (!name || !msg) return notifier.warning('Preencha o nome e a mensagem.');
    
    // Check for duplicate name
    try {
        const campaigns = await window.db.getAll('campaigns');
        const duplicates = campaigns.filter(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
        
        if (duplicates.length > 0) {
            // If we have a loaded campaign, check if it's one of the duplicates
            const isReusing = state.loadedCampaignId && duplicates.some(d => d.id === state.loadedCampaignId);
            
            if (!isReusing) {
                 return notifier.warning('Já existe uma campanha com este nome. Por favor, escolha outro.');
            }
        }
    } catch (e) {
        console.error('Error checking for duplicate campaign:', e);
    }

    // Store attachment
    if (file) {
        try {
            const base64 = await readFileAsBase64(file);
            state.currentAttachment = {
                name: file.name,
                type: file.type,
                data: base64
            };
        } catch(e) {
            console.error(e);
            notifier.error('Erro ao ler arquivo de mídia.');
            return;
        }
    } else if (!state.currentAttachment && document.getElementById('currentAttachmentDisplay').style.display === 'none') {
        // If no file selected AND no reused attachment visible, clear it
        state.currentAttachment = null;
    }

    // Render Preview
    document.getElementById('previewCount').textContent = state.currentContacts.length;
    const colContainer = document.getElementById('previewColumns');
    if(colContainer) {
        colContainer.innerHTML = state.currentColumns.map(col => 
            `<span class="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-300 mr-1 mb-1 font-bold shadow-sm">${col}</span>`
        ).join('');
        colContainer.classList.remove('font-mono', 'text-gray-700');
    }
    
    // Simulate first contact
    let previewMsg = msg;
    if (state.currentContacts.length > 0) {
        const contact = state.currentContacts[0];
        state.currentColumns.forEach(col => {
            const regex = new RegExp(`{{${col}}}`, 'g');
            previewMsg = previewMsg.replace(regex, contact[col] || '');
        });
    }
    document.getElementById('previewMessage').textContent = previewMsg;
    
    goToStep(3);
}

export async function resumeCampaign(c) {
    state.currentContacts = c.contacts;
    state.currentAttachment = c.media;
    state.currentFileName = c.file_name;
    state.selectedPhoneColumn = c.phone_column;
    state.selectedConsentColumn = c.consent_column || '';
    state.consentValue = c.consent_value || '';
    await startCampaign(c);
}

export async function startCampaign(resumedCampaign = null) {
    let startIndex = 0;
    let successCount = 0;
    let campaignData;

    if (resumedCampaign && resumedCampaign.id) {
        // RESUMING
        campaignData = resumedCampaign;
        startIndex = campaignData.logs.length;
        successCount = campaignData.success;
        
        // Ensure UI is ready
        goToStep(4);
    } else {
        // NEW CAMPAIGN
        const name = document.getElementById('campName').value;
        const rawMsg = document.getElementById('campMessage').value;
        
        if(!(await notifier.confirm(`Iniciar disparo para ${state.currentContacts.length} contatos?`))) return;
        
        goToStep(4);
        
        const campaignId = crypto.randomUUID();
        campaignData = {
            id: campaignId,
            client_id: state.clientId,
            name: name,
            template: rawMsg,
            file_name: state.currentFileName,
            media: state.currentAttachment,
            total: state.currentContacts.length,
            success: 0,
            failed: 0,
            date: new Date().toISOString(),
            status: 'sending',
            contacts: state.currentContacts,
            phone_column: state.selectedPhoneColumn,
            consent_column: state.selectedConsentColumn,
            consent_value: state.consentValue,
            logs: []
        };
        
        // Save to DB
        await window.db.add('campaigns', campaignData);
    }

    const rawMsg = campaignData.template;

    // Process
    const progress = document.getElementById('sendProgress');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    
    state.isSending = true;

    // Reset UI or Restore
    if (startIndex === 0) {
        progress.style.width = '0%';
        if(progressPercent) progressPercent.textContent = '0%';
    } else {
        const pct = Math.round((startIndex / state.currentContacts.length) * 100);
        progress.style.width = `${pct}%`;
        if(progressPercent) progressPercent.textContent = `${pct}%`;
    }

    let lastLongPauseTime = Date.now();
    
    for (let i = startIndex; i < state.currentContacts.length; i++) {
        // CHECKPOINT SAVE (Every 5 items)
        if (i > startIndex && i % 5 === 0) {
            campaignData.success = successCount;
            campaignData.failed = i - successCount;
            await window.db.update('campaigns', campaignData);
        }

        // --- DELAY SYSTEM ---
        if (i > 0) {
            // 1. Long Pause (Every 30 mins)
            if (Date.now() - lastLongPauseTime >= 30 * 60 * 1000) {
                for (let s = 60; s > 0; s--) {
                    progressText.textContent = `⏸️ Pausa de Segurança (30min): ${s}s...`;
                    await new Promise(r => setTimeout(r, 1000));
                }
                lastLongPauseTime = Date.now();
            }

            // 2. Random Delay (5-20s)
            const delayMs = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
            const delaySec = Math.ceil(delayMs / 1000);
            
            for (let s = delaySec; s > 0; s--) {
                progressText.textContent = `⏳ Aguardando: ${s}s... (${i}/${state.currentContacts.length} enviados)`;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        // --- CONNECTION CHECK ---
        let connection = await checkConnection();
        while (!connection.ok) {
            progressText.textContent = `⚠️ ${connection.reason}. Aguardando reconexão...`;
            await new Promise(r => setTimeout(r, 5000)); // Check every 5s
            connection = await checkConnection();
        }
        // ------------------------

        progressText.textContent = `Enviando... (${i + 1}/${state.currentContacts.length})`;
        // --------------------

        const contact = state.currentContacts[i];
        
        // Use selected column or fallback
        const phoneKey = state.selectedPhoneColumn || state.currentColumns.find(c => /tel|cel|phone|wpp|whats/i.test(c)) || state.currentColumns[0];
        let phone = String(contact[phoneKey] || '').replace(/\D/g, '');

        if (state.shouldNormalizePhone) {
            // Basic BR Normalization logic: Add 55 if length is 10 or 11 (DDD + Num)
            if (phone.length === 10 || phone.length === 11) {
                phone = '55' + phone;
            }
        }
        
        // Parse Message
        let msg = rawMsg;
        state.currentColumns.forEach(col => {
            const regex = new RegExp(`{{${col}}}`, 'g');
            msg = msg.replace(regex, contact[col] || '');
        });

        const logItem = {
            name: contact['Nome'] || contact['name'] || contact['Cliente'] || 'Sem Nome',
            phone: phone,
            message: msg,
            date: new Date().toISOString(),
            status: 'pending'
        };

        // Send
        try {
            const res = await sendMessage({
                instance_id: state.currentInstanceId,
                phone: phone,
                message: msg,
                media: state.currentAttachment
            });

            if (res.status === 401) {
                // Token Expired - Critical Stop
                campaignData.success = successCount;
                campaignData.failed = (i - startIndex) - successCount; // Update failed count relative to this run
                await window.db.update('campaigns', campaignData);
                
                state.isSending = false;
                await notifier.error('Sessão expirada! A campanha foi pausada automaticamente.\n\nPor favor, faça login novamente e clique em "Retomar" no painel.');
                window.location.reload(); // Force reload to get new login/token state
                return;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Erro API: ${res.status}`);
            }

            successCount++;
            logItem.status = 'success';
        } catch (e) {
            console.error(e);
            logItem.status = 'failed';
            logItem.error = e.message;
        }

        campaignData.logs.push(logItem);

        // Update UI
        const percent = Math.round(((i + 1) / state.currentContacts.length) * 100);
        progress.style.width = `${percent}%`;
        if(progressPercent) progressPercent.textContent = `${percent}%`;
        progressText.textContent = `${i + 1}/${state.currentContacts.length}`;
    }

    // Finish
    campaignData.success = successCount;
    campaignData.failed = state.currentContacts.length - successCount;
    campaignData.status = 'completed';
    await window.db.update('campaigns', campaignData);
    
    state.isSending = false;

    // Reset loaded ID for next campaign
    state.loadedCampaignId = null;

    document.getElementById('finishArea').style.display = 'block';
    loadHistory();
}
