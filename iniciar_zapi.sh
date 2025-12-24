#!/bin/bash

echo "========================================================"
echo "                INICIADOR ZAPI LOCAL"
echo "========================================================"
echo ""

# 1. Verificar Node.js
echo "[1/4] Verificando instalação do Node.js..."
if ! command -v node &> /dev/null; then
    echo ""
    echo "[ERRO CRÍTICO] Node.js não encontrado!"
    echo ""
    echo "Para usar o ZAPI, você precisa instalar o Node.js (versão 18 ou superior)."
    echo ""
    echo "1. Acesse: https://nodejs.org/"
    echo "2. Baixe e instale a versão 'LTS'."
    echo "3. Após instalar, execute este script novamente."
    echo ""
    exit 1
fi
echo "Node.js detectado com sucesso."
echo ""

# 2. Navegar para a pasta do backend
echo "[2/4] Acessando diretório do sistema..."
# Garante que estamos no diretório onde o script está localizado
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ -d "$SCRIPT_DIR/backend" ]; then
    cd "$SCRIPT_DIR/backend"
else
    echo ""
    echo "[ERRO] Pasta 'backend' não encontrada!"
    echo "Certifique-se de que este arquivo está na mesma pasta que o diretório 'backend'."
    echo ""
    exit 1
fi

# 3. Instalar dependências
echo "[3/4] Atualizando dependências (isso pode demorar na primeira vez)..."
npm install --only=production

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Falha ao instalar as dependências."
    echo "Verifique sua conexão com a internet e tente novamente."
    echo ""
    exit 1
fi

# 4. Iniciar o servidor
echo ""
echo "[4/4] Iniciando o servidor ZAPI..."
echo "========================================================"
echo ""
echo "  O sistema está rodando!"
echo "  Mantenha esta janela aberta enquanto usar o ZAPI."
echo ""
echo "  Acesse no seu navegador: http://localhost:3000"
echo ""
echo "========================================================"
echo ""

npm start
