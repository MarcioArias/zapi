import notifier from './notifier.js';

export const state = {
    user: null,
    token: null,
    clientId: null,
    currentContacts: [],
    currentColumns: [],
    currentFileName: '',
    currentInstanceId: null,
    currentAttachment: null,
    loadedCampaignId: null,
    selectedPhoneColumn: '',
    selectedConsentColumn: '',
    consentValue: '',
    shouldNormalizePhone: true,
    isSending: false
};

export async function initState() {
    const userStr = localStorage.getItem('zapi_user');
    if (!userStr) window.location.href = '../index.html';

    state.user = JSON.parse(userStr);
    state.token = localStorage.getItem('zapi_token');
    
    if (!state.token) {
        await notifier.error('Atualização de Segurança: Por favor, faça login novamente.');
        localStorage.removeItem('zapi_user');
        window.location.href = '../index.html';
    }

    state.clientId = state.user.role === 'admin' ? state.user.id : state.user.client_id;

    if (!state.clientId) {
        console.error('Client ID missing from user object', state.user);
        window.location.href = '../index.html';
    }
}
