# Frontend React ZAPY

Este diretório contém os componentes React gerados para a atualização do painel do operador ZAPY.

## Estrutura

- `src/App.jsx`: Componente principal com layout e navegação.
- `src/components/`: Componentes reutilizáveis (Sidebar, Header Mobile).
- `src/pages/`: Páginas principais (Nova Campanha, Histórico, Conexão).
- `src/utils/`: Funções utilitárias e configuração de API.

## Como usar

Estes arquivos são componentes prontos para serem usados em um projeto React (Vite, Create React App, Next.js).

### Dependências Necessárias

Para que estes componentes funcionem, instale as seguintes dependências no seu projeto React:

```bash
npm install tailwindcss postcss autoprefixer
npm install chart.js react-chartjs-2
npm install xlsx
```

### Configuração do Tailwind

Certifique-se de configurar o Tailwind CSS no seu projeto para que as classes funcionem corretamente.

## Funcionalidades Implementadas

1. **Nova Campanha (Wizard)**: 
   - 4 passos: Importar, Mensagem, Revisão, Envio.
   - Barra de progresso visual.
   - Leitura de arquivos Excel (.xlsx) com preview.
   - Inserção de variáveis dinâmicas na mensagem.

2. **Histórico**:
   - Tabela de campanhas com status.
   - Gráfico de pizza (Chart.js) mostrando sucesso vs falhas.
   - Paginação e ordenação (UI mock).

3. **Conexão**:
   - Status em tempo real das instâncias do WhatsApp.
   - Exibição de QR Code para conexão.
   - Botão para desconectar/criar nova sessão.
