import { state } from './state.js';

const API_URL = '/api/app';

export async function fetchInstances() {
    const res = await fetch(`${API_URL}/instances?client_id=${state.clientId}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error('Server Error');
    return await res.json();
}

export async function createInstance(name) {
    const res = await fetch(`${API_URL}/instances`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({
            client_id: state.clientId,
            name: name
        })
    });
    if (!res.ok) throw new Error('Erro ao criar instância');
    return await res.json();
}

export async function updateInstanceStatus(instanceId, status) {
    const res = await fetch(`${API_URL}/instances/${instanceId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Erro ao atualizar status');
    return await res.json();
}

export async function sendMessage(payload) {
    const res = await fetch(`${API_URL}/send-message`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
    });
    return res;
}
