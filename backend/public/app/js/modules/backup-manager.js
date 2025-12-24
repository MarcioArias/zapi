import { state } from './state.js';
import notifier from './notifier.js';

const STORES = ['instances', 'contacts', 'campaigns', 'messages'];

export async function exportFullDatabase() {
    if (!window.db || !window.db.db) {
        notifier.error('Banco de dados não inicializado.');
        return;
    }

    const btn = document.getElementById('btnBackupExport');
    const originalText = btn ? btn.innerHTML : '';
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Exportando...';

    try {
        const exportData = {
            meta: {
                version: '1.0',
                exportDate: new Date().toISOString(),
                clientId: state.user?.id || 'unknown',
                agent: navigator.userAgent
            },
            data: {}
        };

        // 1. Coletar Dados
        for (const storeName of STORES) {
            exportData.data[storeName] = await window.db.getAll(storeName);
        }

        // 2. Comprimir (JSON -> String -> GZIP)
        const jsonString = JSON.stringify(exportData);
        const compressed = window.pako.gzip(jsonString);

        // 3. Download
        const blob = new Blob([compressed], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `zapi_backup_${new Date().toISOString().slice(0,10)}.zapibak`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if(btn) btn.innerHTML = '<i class="fas fa-check mr-2"></i> Sucesso!';
        setTimeout(() => { if(btn) btn.innerHTML = originalText; }, 2000);

    } catch (e) {
        console.error('Backup Error:', e);
        notifier.error('Erro ao exportar backup: ' + e.message);
        if(btn) btn.innerHTML = originalText;
    }
}

export function handleBackupSelect(input) {
    const file = input.files[0];
    if (!file) return;

    // Reset input
    input.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const compressed = new Uint8Array(e.target.result);
            
            // 1. Decompress
            let jsonString;
            try {
                jsonString = window.pako.ungzip(compressed, { to: 'string' });
            } catch (err) {
                throw new Error('Arquivo inválido ou corrompido (Falha na descompressão).');
            }

            // 2. Parse
            const backupObj = JSON.parse(jsonString);

            // 3. Validate Structure
            if (!backupObj.meta || !backupObj.data) {
                throw new Error('Formato de backup inválido.');
            }

            // 4. Show Preview
            showRestorePreview(backupObj);

        } catch (error) {
            notifier.error('Erro ao ler backup: ' + error.message);
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

let currentBackupData = null;

async function showRestorePreview(backupObj) {
    currentBackupData = backupObj;
    
    // Calculate Stats for Merge vs Replace
    const stats = {
        replace: {},
        merge: { added: 0, skipped: 0 }
    };

    // Replace Stats (Total items in backup)
    for (const store of STORES) {
        const count = backupObj.data[store]?.length || 0;
        stats.replace[store] = count;
    }

    // Merge Stats (Need to compare with DB)
    // This might be slow for huge DBs, but necessary for accurate preview
    let mergeHtml = '';
    
    try {
        const currentData = {};
        for (const store of STORES) {
            const items = await window.db.getAll(store);
            currentData[store] = new Set(items.map(i => i.id));
        }

        let totalNew = 0;
        let totalSkipped = 0;

        for (const store of STORES) {
            const incoming = backupObj.data[store] || [];
            const existingIds = currentData[store];
            
            let newCount = 0;
            let skippedCount = 0;

            incoming.forEach(item => {
                if (item.id && existingIds.has(item.id)) {
                    skippedCount++;
                } else {
                    newCount++;
                }
            });

            totalNew += newCount;
            totalSkipped += skippedCount;
        }

        stats.merge.added = totalNew;
        stats.merge.skipped = totalSkipped;

    } catch (e) {
        console.error('Error calculating merge stats:', e);
    }

    // Generate Modal HTML
    const modalHtml = `
        <div id="restoreModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 fade-in">
            <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">Restaurar Backup</h3>
                    <button onclick="closeRestoreModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0"><i class="fas fa-info-circle text-blue-500"></i></div>
                        <div class="ml-3">
                            <p class="text-sm text-blue-700">
                                Backup criado em: <strong>${new Date(backupObj.meta.exportDate).toLocaleString()}</strong><br>
                                Versão: ${backupObj.meta.version}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <!-- Option A: Replace -->
                    <div class="border-2 border-gray-200 rounded-xl p-4 hover:border-red-400 cursor-pointer transition-all relative" onclick="selectRestoreMode('replace')">
                        <div class="absolute top-4 right-4 text-gray-300 check-icon"><i class="far fa-circle text-xl"></i></div>
                        <h4 class="font-bold text-gray-800 mb-2 text-lg">Substituição Total</h4>
                        <p class="text-sm text-gray-500 mb-4">Apaga TUDO o que existe hoje e restaura o backup.</p>
                        <ul class="text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
                            <li><strong>Campanhas:</strong> ${stats.replace['campaigns'] || 0}</li>
                            <li><strong>Contatos:</strong> ${stats.replace['contacts'] || 0}</li>
                            <li><strong>Mensagens:</strong> ${stats.replace['messages'] || 0}</li>
                        </ul>
                    </div>

                    <!-- Option B: Merge -->
                    <div class="border-2 border-emerald-500 bg-emerald-50 rounded-xl p-4 cursor-pointer transition-all relative" onclick="selectRestoreMode('merge')">
                        <div class="absolute top-4 right-4 text-emerald-600 check-icon"><i class="fas fa-check-circle text-xl"></i></div>
                        <h4 class="font-bold text-gray-800 mb-2 text-lg">Mesclar (Recomendado)</h4>
                        <p class="text-sm text-gray-500 mb-4">Mantém dados atuais e adiciona apenas o que é novo.</p>
                        <ul class="text-xs text-gray-600 space-y-1 bg-white p-2 rounded border border-gray-100">
                            <li class="text-emerald-600"><strong>Novos Registros:</strong> +${stats.merge.added}</li>
                            <li class="text-gray-400"><strong>Ignorados (Já existem):</strong> ${stats.merge.skipped}</li>
                        </ul>
                    </div>
                </div>

                <input type="hidden" id="restoreMode" value="merge">

                <div class="flex justify-end space-x-3">
                    <button onclick="closeRestoreModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                    <button onclick="executeRestore()" class="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg flex items-center">
                        <i class="fas fa-upload mr-2"></i> Confirmar Restauração
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Attach selection logic
    window.selectRestoreMode = function(mode) {
        document.getElementById('restoreMode').value = mode;
        const cards = document.querySelectorAll('#restoreModal .cursor-pointer');
        
        cards.forEach(card => {
            // Reset styles
            card.classList.remove('border-emerald-500', 'bg-emerald-50', 'border-red-400', 'bg-red-50');
            card.classList.add('border-gray-200');
            const icon = card.querySelector('.check-icon i');
            icon.className = 'far fa-circle text-xl';
            icon.parentElement.classList.remove('text-emerald-600', 'text-red-500');
            icon.parentElement.classList.add('text-gray-300');
        });

        // Highlight selected
        const selectedIndex = mode === 'replace' ? 0 : 1;
        const selected = cards[selectedIndex];
        
        selected.classList.remove('border-gray-200');
        if(mode === 'replace') {
            selected.classList.add('border-red-400', 'bg-red-50');
            const icon = selected.querySelector('.check-icon i');
            icon.className = 'fas fa-check-circle text-xl';
            icon.parentElement.classList.remove('text-gray-300');
            icon.parentElement.classList.add('text-red-500');
        } else {
            selected.classList.add('border-emerald-500', 'bg-emerald-50');
            const icon = selected.querySelector('.check-icon i');
            icon.className = 'fas fa-check-circle text-xl';
            icon.parentElement.classList.remove('text-gray-300');
            icon.parentElement.classList.add('text-emerald-600');
        }
    };
}

window.closeRestoreModal = function() {
    const el = document.getElementById('restoreModal');
    if(el) el.remove();
    currentBackupData = null;
};

window.executeRestore = async function() {
    const mode = document.getElementById('restoreMode').value;
    if (!currentBackupData) return;

    const btn = document.querySelector('#restoreModal button[onclick="executeRestore()"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processando...';
    btn.disabled = true;

    try {
        if (mode === 'replace') {
            // Strategy A: Wipe & Replace
            for (const store of STORES) {
                await window.db.clear(store);
                if (currentBackupData.data[store] && currentBackupData.data[store].length > 0) {
                    await window.db.bulkPut(store, currentBackupData.data[store]);
                }
            }
        } else {
            // Strategy B: Merge (Add only new)
            for (const store of STORES) {
                const incoming = currentBackupData.data[store] || [];
                if (incoming.length === 0) continue;

                // Get existing IDs to filter
                const existing = await window.db.getAll(store);
                const existingIds = new Set(existing.map(i => i.id));

                const toAdd = incoming.filter(item => !item.id || !existingIds.has(item.id));
                
                if (toAdd.length > 0) {
                    await window.db.bulkPut(store, toAdd);
                }
            }
        }

        await notifier.success('Restauração concluída com sucesso!');
        location.reload(); // Reload to refresh UI with new data

    } catch (e) {
        console.error('Restore Error:', e);
        notifier.error('Erro ao restaurar: ' + e.message);
        btn.innerHTML = 'Tentar Novamente';
        btn.disabled = false;
    }
};
