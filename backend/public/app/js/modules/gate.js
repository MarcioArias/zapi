import { state } from './state.js';
import { fetchInstances, createInstance, updateInstanceStatus } from './api.js';
import { renderInstanceStatus } from './ui.js';
import { loadHistory } from './history.js';
import notifier from './notifier.js';

export async function checkConnectionGate() {
    const gate = document.getElementById('gate');
    const content = document.getElementById('appContent');
    const loading = document.getElementById('gateLoading');
    const qrArea = document.getElementById('gateQrArea');
    const btnConnect = document.getElementById('btnConnectGate');

    try {
        const instances = await fetchInstances();
        
        if (!Array.isArray(instances)) throw new Error('Invalid Data');

        const connected = instances.find(i => i.status === 'connected');

        if (connected) {
            // UNLOCK
            state.currentInstanceId = connected.id;
            gate.style.opacity = '0';
            setTimeout(() => gate.style.display = 'none', 500);
            content.style.opacity = '1';
            loadHistory();
            renderInstanceStatus(connected);
        } else {
            // LOCK
            gate.style.display = 'flex';
            gate.style.opacity = '1';
            content.style.opacity = '0';
            
            const connecting = instances.find(i => i.status === 'connecting');
            if (connecting) {
                state.currentInstanceId = connecting.id;
                loading.style.display = 'none';
                qrArea.style.display = 'block';
                
                const img = document.getElementById('gateQrImage');
                const loader = document.getElementById('gateQrLoader');

                if(connecting.qr_code) {
                    img.src = connecting.qr_code;
                    img.classList.remove('hidden');
                    if(loader) loader.classList.add('hidden');
                } else {
                    img.classList.add('hidden');
                    if(loader) loader.classList.remove('hidden');
                }

                btnConnect.style.display = 'none';
                startGatePolling(connecting.id);
            } else {
                loading.style.display = 'none';
                qrArea.style.display = 'none';
                btnConnect.style.display = 'block';
            }
        }
    } catch (e) {
        console.error(e);
        loading.innerHTML = `
            <p style="color: #dc3545; font-weight: bold;">Erro de Conexão</p>
            <p style="font-size: 12px; margin-bottom: 10px;">Verifique se o servidor está rodando.</p>
            <button onclick="location.reload()" class="btn btn-outline btn-sm">Tentar Novamente</button>
        `;
    }
}

export async function initGateConnection() {
    document.getElementById('btnConnectGate').style.display = 'none';
    document.getElementById('gateLoading').style.display = 'block';

    try {
        await createInstance('Operador Principal');
        checkConnectionGate(); // Refresh view
    } catch (e) {
        notifier.error('Erro ao criar conexão.');
        document.getElementById('btnConnectGate').style.display = 'block';
    }
}

export function startGatePolling(instanceId) {
    const interval = setInterval(async () => {
        try {
            const instances = await fetchInstances();
            const me = instances.find(i => i.id === instanceId);
            
            if (me) {
                const img = document.getElementById('gateQrImage');
                const loader = document.getElementById('gateQrLoader');
                const msg = document.getElementById('gateQrMessage');

                // Update QR Code if changed (e.g. refreshed)
                if (me.qr_code) {
                    if (img && img.src !== me.qr_code) {
                        img.src = me.qr_code;
                        img.classList.remove('hidden');
                        if(loader) loader.classList.add('hidden');
                    }
                } else {
                    // QR Code gone (authenticated/loading)
                    if (img) img.classList.add('hidden');
                    if (loader) loader.classList.remove('hidden');
                    
                    // Update text to show progress
                    if (msg) msg.textContent = 'Conectando WhatsApp...';
                }

                if (me.status === 'connected') {
                    clearInterval(interval);
                    checkConnectionGate();
                } else if (me.status === 'failed' || me.status === 'disconnected') {
                     clearInterval(interval);
                     notifier.error('Falha na conexão ou desconectado. Tente novamente.');
                     location.reload();
                }
            }
        } catch (e) { console.error(e); }
    }, 1000); // Poll every 1s for faster feedback
}

export async function simulateScan() {
    if(!state.currentInstanceId) return;
    try {
        await updateInstanceStatus(state.currentInstanceId, 'connected');
        const btn = document.querySelector('#gateQrArea button');
        btn.textContent = 'Simulando...';
        btn.disabled = true;
    } catch(e) { notifier.error('Erro ao simular.'); }
}
