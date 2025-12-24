import { state } from './state.js';
import { insertAtCursor } from './utils.js';

export function showModule(id) {
    document.querySelectorAll('.module').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    const target = document.getElementById(id);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    
    document.querySelectorAll('#sidebar a').forEach(el => el.classList.remove('bg-emerald-50', 'text-emerald-700', 'font-bold', 'border-r-4', 'border-emerald-500', 'shadow-sm'));
    document.querySelectorAll('#sidebar a').forEach(el => el.classList.add('text-gray-600', 'font-medium', 'hover:bg-gray-50', 'hover:text-emerald-600'));

    const link = document.querySelector(`#sidebar a[onclick="showModule('${id}')"]`);
    if(link) {
        link.classList.remove('text-gray-600', 'font-medium', 'hover:bg-gray-50', 'hover:text-emerald-600');
        link.classList.add('bg-emerald-50', 'text-emerald-700', 'font-bold', 'border-r-4', 'border-emerald-500', 'shadow-sm');
    }

    // Close mobile sidebar if open
    if(window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
    }
}

export function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if(sb.classList.contains('-translate-x-full')) {
        sb.classList.remove('-translate-x-full');
    } else {
        sb.classList.add('-translate-x-full');
    }
}

export function goToStep(stepNum) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    
    // Show target step
    const target = document.getElementById(`step${stepNum}`);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Update Progress Bar & Indicators
    const progress = document.getElementById('progressBar');
    if(progress) {
        const pct = ((stepNum - 1) / 3) * 100;
        progress.style.width = `${pct}%`;
    }

    // Update Indicators Style
    for(let i=1; i<=4; i++) {
        const ind = document.getElementById(`ind-step${i}`);
        if(!ind) continue;
        
        const circle = ind.querySelector('div');
        const label = ind.querySelector('span');
        
        // Reset base style
        circle.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-gray-50 transition-colors';
        label.className = 'text-xs font-medium mt-1';

        if(i < stepNum) {
            // Completed
            circle.classList.add('bg-emerald-600', 'text-white');
            label.classList.add('text-emerald-600');
        } else if(i === stepNum) {
            // Current
            circle.classList.add('bg-emerald-600', 'text-white', 'ring-2', 'ring-emerald-200');
            label.classList.add('text-emerald-700', 'font-bold');
        } else {
            // Pending
            circle.classList.add('bg-gray-300', 'text-gray-600');
            label.classList.add('text-gray-500');
        }
    }
}

export function renderVariableTags() {
    const container = document.getElementById('variableTags');
    container.innerHTML = '';
    
    state.currentColumns.forEach(col => {
        const tag = document.createElement('span');
        tag.className = 'inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:bg-emerald-200 hover:text-emerald-800 transition-colors border border-emerald-200 shadow-sm select-none';
        tag.textContent = col;
        tag.onclick = () => insertAtCursor(document.getElementById('campMessage'), `{{${col}}}`);
        container.appendChild(tag);
    });
}

export function renderInstanceStatus(instance) {
    const div = document.getElementById('instanceStatus');
    div.innerHTML = `
        <div class="flex flex-col items-center justify-center w-full text-center py-6">
            <div class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-100">
                <i class="fab fa-whatsapp text-5xl text-green-500"></i>
            </div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">WhatsApp Conectado</h3>
            <div class="flex items-center justify-center space-x-2 mb-4">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p class="text-gray-600 font-medium">Sessão: <span class="text-gray-900">${instance.name}</span></p>
            </div>
            <div class="inline-flex items-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500">
                <i class="fas fa-fingerprint mr-2 text-gray-400"></i>
                ID: <span class="font-mono ml-1">${instance.id}</span>
            </div>
        </div>
    `;
}
