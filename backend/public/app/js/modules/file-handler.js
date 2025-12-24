import { state } from './state.js';
import { goToStep, renderVariableTags } from './ui.js';
import notifier from './notifier.js';

export function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Show File Info
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    fileInfo.classList.add('flex'); // Ensure flex display
    fileInfo.style.display = 'flex'; // Force visibility
    
    state.currentFileName = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse to JSON
        state.currentContacts = XLSX.utils.sheet_to_json(sheet);
        
        if (state.currentContacts.length > 0) {
            // Extract columns
            state.currentColumns = Object.keys(state.currentContacts[0]);
            
            // Open Column Selection Modal instead of going directly to step 2
            const select = document.getElementById('phoneColumnSelect');
            select.innerHTML = state.currentColumns.map(col => `<option value="${col}">${col}</option>`).join('');
            
            // Populate Consent Column Select
            const consentSelect = document.getElementById('consentColumnSelect');
            consentSelect.innerHTML = '<option value="">-- Nenhuma --</option>' + 
                state.currentColumns.map(col => `<option value="${col}">${col}</option>`).join('');

            // Try to auto-select phone column
            const likelyPhone = state.currentColumns.find(c => /tel|cel|phone|wpp|whats/i.test(c));
            if(likelyPhone) select.value = likelyPhone;

            // Try to auto-select consent column
            const likelyConsent = state.currentColumns.find(c => /consent|opt|aceit|term/i.test(c));
            if(likelyConsent) consentSelect.value = likelyConsent;

            document.getElementById('columnSelectionModal').style.display = 'flex';
        } else {
            notifier.warning('O arquivo parece estar vazio.');
        }
    };
    reader.readAsArrayBuffer(file);
}

export async function validateAndCleanPhoneList(rawContacts, phoneColumn, consentColumn = null, consentValue = 'SIM') {
    const { parsePhoneNumber } = window.libphonenumber;
    const validContacts = [];
    const invalidEntries = [];
    const seenNumbers = new Set();
    let duplicateCount = 0;
    let consentRejectedCount = 0;

    for (const contact of rawContacts) {
        const rawPhone = String(contact[phoneColumn] || '');
        
        // Consent Check
        if (consentColumn) {
            const val = String(contact[consentColumn] || '').trim().toLowerCase();
            const expected = String(consentValue || '').trim().toLowerCase();
            
            if (val !== expected) {
                consentRejectedCount++;
                invalidEntries.push({
                    ...contact,
                    _reason: 'Sem Consentimento (Opt-in)',
                    _rawPhone: rawPhone
                });
                continue; // Skip this contact
            }
        }

        try {
            // 1. Parse number (Default to BR if no country code provided)
            const phoneNumber = parsePhoneNumber(rawPhone, 'BR');
            
            // 2. Strict Validation: Must be valid & Mobile & BR
            if (phoneNumber && phoneNumber.isValid() && phoneNumber.country === 'BR' && phoneNumber.getType() === 'MOBILE') {
                const formatted = phoneNumber.number; // E.164 (e.g., +5511999999999)
                
                // 3. Deduplication
                if (seenNumbers.has(formatted)) {
                    duplicateCount++;
                    invalidEntries.push({ 
                        ...contact, 
                        _reason: 'Duplicado', 
                        _rawPhone: rawPhone 
                    });
                } else {
                    seenNumbers.add(formatted);
                    // Update contact with normalized phone (remove + for WhatsApp Web)
                    contact[phoneColumn] = formatted.replace('+', ''); 
                    validContacts.push(contact);
                }
            } else {
                let reason = 'Número Inválido';
                if (!phoneNumber || !phoneNumber.isValid()) reason = 'Formato Inválido';
                else if (phoneNumber.country !== 'BR') reason = 'Não é BR';
                else if (phoneNumber.getType() !== 'MOBILE') reason = 'Não é Celular';

                invalidEntries.push({ 
                    ...contact, 
                    _reason: reason, 
                    _rawPhone: rawPhone 
                });
            }
        } catch (e) {
            invalidEntries.push({ 
                ...contact, 
                _reason: 'Erro de Parse', 
                _rawPhone: rawPhone 
            });
        }
    }

    return { validContacts, invalidEntries, duplicateCount, consentRejectedCount };
}

export async function confirmPhoneColumn() {
    state.selectedPhoneColumn = document.getElementById('phoneColumnSelect').value;
    state.selectedConsentColumn = document.getElementById('consentColumnSelect').value;
    state.consentValue = document.getElementById('consentValueInput').value || 'SIM';
    state.shouldNormalizePhone = document.getElementById('normalizePhone').checked;
    
    // START VALIDATION
    const { validContacts, invalidEntries, duplicateCount, consentRejectedCount } = await validateAndCleanPhoneList(
        state.currentContacts, 
        state.selectedPhoneColumn,
        state.selectedConsentColumn,
        state.consentValue
    );
    
    // Update State
    state.currentContacts = validContacts;

    document.getElementById('columnSelectionModal').style.display = 'none';
    
    // Show Summary if there are issues
    if (invalidEntries.length > 0) {
        showValidationSummary(validContacts.length, invalidEntries, duplicateCount, consentRejectedCount);
    } else {
        // Direct Success
        renderVariableTags();
        goToStep(2);
    }
}

function showValidationSummary(validCount, invalidEntries, duplicateCount, consentRejectedCount = 0) {
    const summaryHtml = `
        <div id="validationSummaryOverlay" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 fade-in">
            <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-filter text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800">Resultado da Validação</h3>
                    <p class="text-gray-500 text-sm">Analisamos sua lista para garantir envios seguros.</p>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                        <span class="block text-2xl font-bold text-green-600">${validCount}</span>
                        <span class="text-xs text-green-700 font-medium">Contatos Válidos</span>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                        <span class="block text-2xl font-bold text-red-600">${invalidEntries.length}</span>
                        <span class="text-xs text-red-700 font-medium">Removidos</span>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4 mb-6 overflow-y-auto flex-1 border border-gray-200 text-sm">
                    <p class="mb-2 font-bold text-gray-700">Detalhes das Remoções:</p>
                    <ul class="space-y-1">
                        ${consentRejectedCount > 0 ? `<li class="text-blue-600 flex justify-between"><span>Sem Consentimento:</span> <span>${consentRejectedCount}</span></li>` : ''}
                        ${duplicateCount > 0 ? `<li class="text-orange-600 flex justify-between"><span>Duplicados:</span> <span>${duplicateCount}</span></li>` : ''}
                        ${(invalidEntries.length - duplicateCount - consentRejectedCount) > 0 ? `<li class="text-red-600 flex justify-between"><span>Inválidos/Fixos:</span> <span>${invalidEntries.length - duplicateCount - consentRejectedCount}</span></li>` : ''}
                    </ul>
                    
                    <details class="mt-4">
                        <summary class="cursor-pointer text-emerald-600 hover:text-emerald-700 font-medium text-xs select-none">Ver lista de rejeitados</summary>
                        <div class="mt-2 space-y-1">
                            ${invalidEntries.map(e => `
                                <div class="flex justify-between text-xs text-gray-500 border-b border-gray-100 pb-1">
                                    <span class="font-mono">${e._rawPhone}</span>
                                    <span class="text-red-500">${e._reason}</span>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                </div>

                <button onclick="closeValidationSummary()" class="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                    Entendido, Continuar
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', summaryHtml);
}

// Expose closer to window
window.closeValidationSummary = function() {
    const el = document.getElementById('validationSummaryOverlay');
    if(el) el.remove();
    renderVariableTags();
    goToStep(2);
};
