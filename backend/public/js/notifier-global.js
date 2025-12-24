/**
 * Global Notifier for ZAPI
 * Requires SweetAlert2 (https://cdn.jsdelivr.net/npm/sweetalert2@11)
 */
window.notifier = {
    success: async (msg) => {
        return Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: msg,
            confirmButtonColor: '#10B981', // emerald-500
            confirmButtonText: 'OK'
        });
    },

    error: async (msg) => {
        return Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: msg,
            confirmButtonColor: '#EF4444', // red-500
            confirmButtonText: 'Fechar'
        });
    },

    warning: async (msg) => {
        return Swal.fire({
            icon: 'warning',
            title: 'Atenção!',
            text: msg,
            confirmButtonColor: '#F59E0B', // amber-500
            confirmButtonText: 'Entendi'
        });
    },

    info: async (msg) => {
        return Swal.fire({
            icon: 'info',
            title: 'Informação',
            text: msg,
            confirmButtonColor: '#3B82F6', // blue-500
            confirmButtonText: 'OK'
        });
    },

    /**
     * Exibe um diálogo de confirmação.
     * @param {string} msg Mensagem da pergunta
     * @param {string} confirmBtnText Texto do botão de confirmação
     * @param {string} cancelBtnText Texto do botão de cancelamento
     * @returns {Promise<boolean>} true se confirmado, false caso contrário
     */
    confirm: async (msg, confirmBtnText = 'Sim', cancelBtnText = 'Cancelar') => {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: msg,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#d33',
            confirmButtonText: confirmBtnText,
            cancelButtonText: cancelBtnText,
            reverseButtons: true
        });
        return result.isConfirmed;
    },

    /**
     * Exibe um prompt de entrada de texto.
     * @param {string} msg Mensagem do prompt
     * @param {object} inputOptions Opções adicionais do SweetAlert (ex: inputPlaceholder)
     * @returns {Promise<string|null>} O valor digitado ou null se cancelado
     */
    prompt: async (msg, inputOptions = {}) => {
        const { value: text } = await Swal.fire({
            title: msg,
            input: 'text',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            ...inputOptions
        });
        return text || null;
    }
};
