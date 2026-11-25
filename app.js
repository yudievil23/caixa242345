// ============================================================================
// CHAVES DE PERSISTÊNCIA (localStorage) E CONSTANTES
// ============================================================================
const STORAGE_KEYS = {
    PRODUTOS: 'dona_gleicy_produtos_v1',
    PEDIDOS: 'dona_gleicy_pedidos_historico_v1',
    CONTADOR_COMANDA: 'dona_gleicy_contador_comanda_v1',
    LARGURA_BOBINA: 'dona_gleicy_largura_bobina_v1',
    COMPRAS: 'dona_gleicy_controle_compras_v1',
    RETIRADAS_ATALHO: 'dona_gleicy_retiradas_atalho_v1',
    SOBRAS_POS_COMPRAS: 'dona_gleicy_sobras_pos_compras_v1',
    QRCODES_COMPROVANTE: 'dona_gleicy_qrcodes_comprovante_v1',
    COMISSOES_VENDEDORES: 'dona_gleicy_comissoes_vendedores_v1',
    COMISSOES_METAS_MES: 'dona_gleicy_comissoes_metas_mes_v1',
    COMISSOES_REGISTROS: 'dona_gleicy_comissoes_registros_v1',
    COMISSOES_LOG_ADMIN: 'dona_gleicy_comissoes_log_admin_v1',
    CHAMADA_COZINHA: 'dona_gleicy_chamada_cozinha_v1'
};

const SENHA_EXCLUSAO_HISTORICO = '332133';
const CODIGO_ADMIN_COMISSAO = '332133';
const META_MENSAL_PADRAO = 5000.00;
const COMISSAO_PADRAO_PERCENTUAL = 10;

const VENDEDORES_INICIAIS = [
    { id: 'vend_1', nome: 'Atendente 01', comissaoPercentual: 10, metaMensal: 5000.00 },
    { id: 'vend_2', nome: 'Atendente 02', comissaoPercentual: 10, metaMensal: 5000.00 }
];

const FORMAS_PAGAMENTO_EFETIVO = [
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Dinheiro'
];

// Modalidades oficiais do relatório financeiro
const MODALIDADES_PAGAMENTO = [
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Dinheiro',
    'Vale-consumo da casa'
];

// Opções disponíveis na seleção de pagamento
const FORMAS_PAGAMENTO_SELECAO = [
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Dinheiro',
    'Vale-consumo da casa'
];

// Formas disponíveis para Retirada (ALT + 1) e Sobrou Pós-Compras (ALT + 2)
const FORMAS_RETIRADA_E_SOBRA = [
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Dinheiro',
    'Vale-consumo',
    'Consumo da casa'
];

// Catálogo inicial padrão (carregado apenas na primeira execução)
const PRODUTOS_INICIAIS = [
    { id: 'p1', nome: 'Peixe', preco: 15.00, categoria: 'Refeições' },
    { id: 'p2', nome: 'Lasanha', preco: 15.00, categoria: 'Refeições' },
    { id: 'p3', nome: 'Suco de cupuaçu', preco: 6.00, categoria: 'Bebidas' },
    { id: 'p4', nome: 'Churrasco Misto', preco: 25.00, categoria: 'Churrasco' },
    { id: 'p5', nome: 'X-Salada', preco: 12.00, categoria: 'Lanches' }
];

// ============================================================================
// FUNÇÕES DE PRECISÃO MONETÁRIA EXATA (CENTAVOS INTEIROS)
// ============================================================================
function paraCentavos(valor) {
    if (typeof valor === 'number') {
        return Number.isFinite(valor) ? Math.round((valor + Number.EPSILON) * 100) : 0;
    }
    const num = parseNumeroDecimalEntrada(valor);
    return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) : 0;
}

function deCentavos(centavos) {
    const inteiro = Math.round(Number(centavos || 0));
    return Number((inteiro / 100).toFixed(2));
}

function normalizarMoedaValor(valor) {
    return deCentavos(paraCentavos(valor));
}

function calcularSubtotalCentavos(precoUnitario, quantidade) {
    const precoCent = paraCentavos(precoUnitario);
    const qtdInt = Math.max(0, Math.round(Number(quantidade || 0)));
    return precoCent * qtdInt;
}

// ============================================================================
// ESTADO DA APLICAÇÃO
// ============================================================================
let produtos = [];
let carrinho = {}; // { produtoId: quantidade }
let categoriaAtiva = 'Todas';
let termoPesquisaCatalogo = '';
let impressaoEmAndamento = false;

let contextoPagamento = null;
let contextoPendenteImpressao = null;
let filtroStatusHistorico = 'Todas';
let mostrarTodosDiasHistorico = false;

// Estado do filtro de período do relatório financeiro ('dia' | 'mes' | 'ano')
let tipoPeriodoRelatorio = 'dia';
let dataSelecionadaRelatorio = '';
let mesSelecionadoRelatorio = '';
let anoSelecionadoRelatorio = '';

// Ação pendente de autorização por senha antes de excluir
let acaoExclusaoPendente = null;

// Preços temporários por item apenas na comanda atual (não altera o cadastro oficial)
let precosTemporariosComanda = {}; // { produtoId: precoNumerico }

// Estado de edição / correção de comanda existente no histórico
let vendaEmEdicaoId = null;
let modoEdicaoComanda = null; // 'editar' | 'corrigir'
let itensEdicaoComanda = []; // [{ id, nome, precoUnitario, quantidade, subtotal }]

// Estado do controle de compras (ALT + 0), retiradas (ALT + 1) e sobras (ALT + 2)
let compraEditandoId = null;
let retiradaBloqueadaPorPadrao = true;
let retiradaEditandoId = null;

// Pilha de abertura de janelas/modais para resolver ESC no primeiro plano sem perder ordem
let pilhaJanelasAbertas = [];

// Estado temporário de pré-visualização antes de salvar os QR Codes
let qrPreviewPendenteSalvar = {
    pos: { wifi: null, pix: null },
    pendente: { wifi: null, pix: null }
};

// Estado da funcionalidade de Comissão de Vendedores
let vendedorSelecionadoComandaId = '';
let vendedorSelecionadoPainelId = '';
let mesSelecionadoComissao = '';
let adminComissoesAutorizado = false;

// ============================================================================
// PADRONIZAÇÃO DE JANELAS E MODAIS (ESC + BOTÃO X NO PRIMEIRO PLANO)
// ============================================================================
const REGISTRO_JANELAS_MODAL = [
    {
        id: 'modal-senha-comissao',
        zIndex: 1100,
        fechar: () => fecharModalSenhaComissao()
    },
    {
        id: 'modal-senha-exclusao',
        zIndex: 1100,
        fechar: () => fecharModalSenhaExclusao()
    },
    {
        id: 'modal-sobra-pos-compras',
        zIndex: 1095,
        fechar: () => fecharModalSobraPosCompras()
    },
    {
        id: 'modal-retirada-atalho',
        zIndex: 1095,
        fechar: () => fecharModalRetiradaAtalho()
    },
    {
        id: 'tela-chamada-vertical',
        zIndex: 1090,
        fechar: () => fecharTelaChamadaVertical()
    },
    {
        id: 'modal-pendente-imprimir',
        zIndex: 1080,
        fechar: () => {
            const vendaId = contextoPendenteImpressao?.vendaId;
            if (vendaId) {
                concluirEnvioPendenteHistorico(vendaId, false);
            } else {
                fecharModalConfirmacaoPendente();
            }
        }
    },
    {
        id: 'modal-gerenciar-historico',
        zIndex: 1050,
        fechar: () => fecharModalGerenciarHistorico()
    },
    {
        id: 'modal-editar-comanda',
        zIndex: 1000,
        fechar: () => fecharModalEditarComanda()
    },
    {
        id: 'modal-comprovante-pos-pgto',
        zIndex: 1000,
        fechar: () => fecharModalComprovantePosPagamento()
    },
    {
        id: 'modal-pagamento',
        zIndex: 1000,
        fechar: () => fecharModalPagamento()
    },
    {
        id: 'modal-controle-compras',
        zIndex: 1000,
        fechar: () => fecharModalControleCompras()
    },
    {
        id: 'modal-comissoes',
        zIndex: 1000,
        fechar: () => fecharModalComissoes()
    },
    {
        id: 'modal-historico',
        zIndex: 1000,
        fechar: () => fecharModalHistorico()
    },
    {
        id: 'modal-crud',
        zIndex: 1000,
        fechar: () => {
            resetarFormularioCRUD();
            document.getElementById('modal-crud')?.classList.add('hidden');
            sincronizarPilhaJanelas();
        }
    }
];

function sincronizarPilhaJanelas() {
    const abertosAtuais = REGISTRO_JANELAS_MODAL
        .map(cfg => cfg.id)
        .filter(id => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });

    pilhaJanelasAbertas = pilhaJanelasAbertas.filter(id => abertosAtuais.includes(id));
    abertosAtuais.forEach(id => {
        if (!pilhaJanelasAbertas.includes(id)) {
            pilhaJanelasAbertas.push(id);
        }
    });
}

function registrarAberturaJanela(id) {
    pilhaJanelasAbertas = pilhaJanelasAbertas.filter(item => item !== id);
    pilhaJanelasAbertas.push(id);
}

function obterJanelaTopoPrimeiroPlano() {
    sincronizarPilhaJanelas();
    const candidatos = REGISTRO_JANELAS_MODAL.filter(cfg => {
        const el = document.getElementById(cfg.id);
        return el && !el.classList.contains('hidden');
    });

    if (candidatos.length === 0) return null;

    candidatos.sort((a, b) => {
        if (b.zIndex !== a.zIndex) return b.zIndex - a.zIndex;
        const idxA = pilhaJanelasAbertas.indexOf(a.id);
        const idxB = pilhaJanelasAbertas.indexOf(b.id);
        return idxB - idxA;
    });

    return candidatos[0];
}

function fecharJanelaTopoComEsc() {
    const topo = obterJanelaTopoPrimeiroPlano();
    if (!topo) return false;
    topo.fechar();
    sincronizarPilhaJanelas();
    return true;
}

// ============================================================================
// FUNCIONALIDADE CHAMADA (COZINHA • TELA VERTICAL & PEDIDO SAÍDO)
// ============================================================================
function obterPedidosChamadaCozinha() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAMADA_COZINHA) || '[]');
        if (!Array.isArray(raw)) return [];
        const vistos = new Set();
        return raw.filter(p => {
            if (!p || !p.vendaId || vistos.has(p.vendaId)) return false;
            vistos.add(p.vendaId);
            return true;
        });
    } catch (e) {
        return [];
    }
}

function salvarPedidosChamadaCozinha(lista) {
    const vistos = new Set();
    const unicos = (Array.isArray(lista) ? lista : []).filter(p => {
        if (!p || !p.vendaId || vistos.has(p.vendaId)) return false;
        vistos.add(p.vendaId);
        return true;
    });
    localStorage.setItem(STORAGE_KEYS.CHAMADA_COZINHA, JSON.stringify(unicos));
    renderizarChamadaCozinha();
}

function enviarPedidoParaChamadaCozinha(venda) {
    if (!venda || !venda.id) return;
    if (!Array.isArray(venda.itens) || venda.itens.length === 0) return;

    const filaAtual = obterPedidosChamadaCozinha();
    if (filaAtual.some(p => p.vendaId === venda.id)) {
        renderizarChamadaCozinha();
        return;
    }

    const registroChamada = {
        id: 'chamada_' + venda.id,
        vendaId: venda.id,
        numero: venda.numero,
        cliente: venda.cliente || '',
        vendedorNome: venda.vendedorNome || '',
        dataHora: venda.dataHora || new Date().toLocaleString('pt-BR'),
        itens: venda.itens.map(it => ({
            id: it.id,
            nome: it.nome,
            quantidade: Math.max(1, Math.round(Number(it.quantidade || 1))),
            precoUnitario: normalizarMoedaValor(it.precoUnitario),
            subtotal: normalizarMoedaValor(it.subtotal)
        })),
        observacoes: venda.observacoes || '',
        enviadoEm: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };

    filaAtual.push(registroChamada);
    salvarPedidosChamadaCozinha(filaAtual);
}

function marcarPedidoSaidoCozinha(vendaId) {
    if (!vendaId) return;
    const filaAtual = obterPedidosChamadaCozinha();
    const novaFila = filaAtual.filter(p => p.vendaId !== vendaId);
    salvarPedidosChamadaCozinha(novaFila);
}

function formatarObservacaoCozinha(obsTexto) {
    const limpa = String(obsTexto || '').trim();
    if (!limpa) return null;

    const norm = normalizarTextoBusca(limpa);
    const semVerdura = (
        norm.includes('sem verdura') ||
        norm.includes('sem verduras') ||
        norm.includes('nao deseja verdura') ||
        norm.includes('nao quer verdura') ||
        norm.includes('tirar verdura')
    );

    if (semVerdura) {
        return {
            destaqueEspecial: true,
            texto: 'ATENÇÃO: CLIENTE NÃO DESEJA VERDURA.'
        };
    }

    return {
        destaqueEspecial: false,
        texto: `ATENÇÃO: ${limpa.toUpperCase()}`
    };
}

function renderizarChamadaCozinha() {
    const fila = obterPedidosChamadaCozinha();

    const contadorPrincipal = document.getElementById('contador-pedidos-cozinha');
    const contadorVertical = document.getElementById('chamada-contador-pendentes');
    const ultimaAttEl = document.getElementById('chamada-ultima-atualizacao');
    const listaPrincipal = document.getElementById('lista-pedidos-cozinha-principal');
    const listaVertical = document.getElementById('chamada-lista-pedidos');

    if (contadorPrincipal) contadorPrincipal.textContent = String(fila.length);
    if (contadorVertical) contadorVertical.textContent = String(fila.length);
    if (ultimaAttEl) {
        ultimaAttEl.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`;
    }

    if (listaPrincipal) {
        if (fila.length === 0) {
            listaPrincipal.innerHTML = '<p class="empty-msg">Nenhum pedido pendente na cozinha no momento.</p>';
        } else {
            listaPrincipal.innerHTML = fila.map(pedido => {
                const resumoItens = (pedido.itens || [])
                    .map(it => `${it.quantidade}x ${escapeHTML(it.nome)} (${formatarMoeda(it.subtotal)})`)
                    .join(' • ');
                const obsFormatada = formatarObservacaoCozinha(pedido.observacoes);
                const identificacaoTexto = pedido.cliente ? pedido.cliente : 'Sem identificação informada';

                return `
                    <div class="cozinha-card-principal">
                        <div>
                            <div class="cozinha-card-principal-topo">
                                <div>
                                    <strong>Comanda #${escapeHTML(pedido.numero)}</strong>
                                    <div class="venda-data">${escapeHTML(identificacaoTexto)}</div>
                                </div>
                                <span class="chamada-hora-badge">${escapeHTML(pedido.enviadoEm || '')}</span>
                            </div>
                            <div class="cozinha-card-principal-itens" style="margin-top: 8px;">
                                ${resumoItens}
                            </div>
                            ${obsFormatada ? `
                                <div class="cozinha-card-principal-obs" style="margin-top: 8px;">
                                    ${escapeHTML(obsFormatada.texto)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="cozinha-card-principal-rodape">
                            <span class="venda-data">${pedido.vendedorNome ? `Atend.: ${escapeHTML(pedido.vendedorNome)}` : 'Cozinha'}</span>
                            <button type="button" class="btn-pedido-saido" onclick="marcarPedidoSaidoCozinha('${escapeHTML(pedido.vendaId)}')">
                                PEDIDO SAÍDO
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (listaVertical) {
        if (fila.length === 0) {
            listaVertical.innerHTML = '<p class="empty-msg">Nenhum pedido pendente na cozinha.</p>';
        } else {
            listaVertical.innerHTML = fila.map(pedido => {
                const itensHtml = (pedido.itens || []).map(it => `
                    <div class="chamada-item-linha">
                        <span class="chamada-item-qtd-nome">${it.quantidade}x ${escapeHTML(it.nome)}</span>
                        <div class="chamada-item-valores">
                            <div>Unit: ${formatarMoeda(it.precoUnitario)}</div>
                            <strong>${formatarMoeda(it.subtotal)}</strong>
                        </div>
                    </div>
                `).join('');

                const obsFormatada = formatarObservacaoCozinha(pedido.observacoes);
                const identificacaoExibicao = pedido.cliente
                    ? escapeHTML(pedido.cliente)
                    : '<span style="color: var(--text-muted); font-weight: 500;">Não informada</span>';

                return `
                    <article class="chamada-pedido-card">
                        <div class="chamada-pedido-topo">
                            <div>
                                <div class="chamada-comanda-num">COMANDA #${escapeHTML(pedido.numero)}</div>
                                <div class="chamada-identificacao-linha">Identificação: ${identificacaoExibicao}</div>
                                ${pedido.vendedorNome ? `<div class="venda-data">Atendente: ${escapeHTML(pedido.vendedorNome)}</div>` : ''}
                            </div>
                            <span class="chamada-hora-badge">${escapeHTML(pedido.enviadoEm || '')}</span>
                        </div>

                        <div class="chamada-itens-lista">
                            ${itensHtml}
                        </div>

                        ${obsFormatada ? `
                            <div class="${obsFormatada.destaqueEspecial ? 'chamada-obs-alerta' : 'chamada-obs-normal'}">
                                ${escapeHTML(obsFormatada.texto)}
                            </div>
                        ` : ''}
                    </article>
                `;
            }).join('');
        }
    }
}

function abrirTelaChamadaVertical() {
    renderizarChamadaCozinha();
    document.getElementById('tela-chamada-vertical')?.classList.remove('hidden');
    registrarAberturaJanela('tela-chamada-vertical');
}

function fecharTelaChamadaVertical() {
    document.getElementById('tela-chamada-vertical')?.classList.add('hidden');
    sincronizarPilhaJanelas();
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosPersistentes();
    inicializarFiltrosPeriodoRelatorio();
    inicializarComissoes();
    atualizarNumeroComandaUI();
    renderizarCategorias();
    renderizarCatalogo();
    renderizarCarrinho();
    renderizarChamadaCozinha();
    registrarEventos();
    atualizarPreviewsQRCodesUI();
    sincronizarPilhaJanelas();
});

function carregarDadosPersistentes() {
    const dadosSalvos = localStorage.getItem(STORAGE_KEYS.PRODUTOS);
    if (dadosSalvos) {
        const parsed = JSON.parse(dadosSalvos);
        produtos = Array.isArray(parsed)
            ? parsed.map(p => ({ ...p, preco: normalizarMoedaValor(p.preco) }))
            : [];
    } else {
        produtos = PRODUTOS_INICIAIS.map(p => ({ ...p, preco: normalizarMoedaValor(p.preco) }));
        salvarProdutosStorage();
    }

    const larguraSalva = localStorage.getItem(STORAGE_KEYS.LARGURA_BOBINA) || '80mm';
    const selectBobina = document.getElementById('select-largura-bobina');
    selectBobina.value = larguraSalva;
    aplicarLarguraBobina(larguraSalva);
}

function inicializarFiltrosPeriodoRelatorio() {
    const hoje = new Date();
    const chaveHoje = obterChaveDia(hoje);
    const [anoAtual, mesAtual] = chaveHoje.split('-');

    dataSelecionadaRelatorio = chaveHoje;
    mesSelecionadoRelatorio = `${anoAtual}-${mesAtual}`;
    anoSelecionadoRelatorio = anoAtual;

    document.getElementById('input-relatorio-dia').value = dataSelecionadaRelatorio;
    document.getElementById('input-relatorio-mes').value = mesSelecionadoRelatorio;

    popularOpcoesAnoRelatorio(anoAtual);
}

function popularOpcoesAnoRelatorio(anoPadrao) {
    const selectAno = document.getElementById('select-relatorio-ano');
    const anosSet = new Set([String(anoPadrao)]);

    obterHistorico().forEach(venda => {
        if (typeof venda.dataChave === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(venda.dataChave)) {
            anosSet.add(venda.dataChave.slice(0, 4));
        }
    });

    const anosOrdenados = Array.from(anosSet).sort((a, b) => Number(b) - Number(a));
    selectAno.innerHTML = anosOrdenados
        .map(ano => `<option value="${escapeHTML(ano)}">${escapeHTML(ano)}</option>`)
        .join('');

    if (!anosOrdenados.includes(String(anoSelecionadoRelatorio))) {
        anoSelecionadoRelatorio = anosOrdenados[0] || String(anoPadrao);
    }
    selectAno.value = anoSelecionadoRelatorio;
}

function salvarProdutosStorage() {
    localStorage.setItem(STORAGE_KEYS.PRODUTOS, JSON.stringify(produtos));
}

function obterChaveDia(date = new Date()) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function obterChaveMes(dataOuChaveDia = new Date()) {
    if (typeof dataOuChaveDia === 'string' && /^\d{4}-\d{2}/.test(dataOuChaveDia)) {
        return dataOuChaveDia.slice(0, 7);
    }
    return obterChaveDia(dataOuChaveDia instanceof Date ? dataOuChaveDia : new Date()).slice(0, 7);
}

function formatarDataChaveBR(dataChave) {
    if (!dataChave || !/^\d{4}-\d{2}-\d{2}$/.test(dataChave)) {
        return new Date().toLocaleDateString('pt-BR');
    }
    const [ano, mes, dia] = dataChave.split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarMesChaveBR(mesChave) {
    const partes = String(mesChave || '').split('-');
    if (partes.length !== 2) return mesChave || '';
    const ano = Number(partes[0]);
    const mesIdx = Number(partes[1]) - 1;
    const dataRef = new Date(ano, mesIdx, 1);
    if (Number.isNaN(dataRef.getTime())) return mesChave;
    const nomeMes = dataRef.toLocaleDateString('pt-BR', { month: 'long' });
    const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    return `${nomeMesCapitalizado}/${ano}`;
}

function parseNumeroDecimalEntrada(valorRaw) {
    if (typeof valorRaw === 'number') {
        return Number.isFinite(valorRaw) ? valorRaw : NaN;
    }
    let limpo = String(valorRaw ?? '')
        .replace(/R\$/gi, '')
        .replace(/%/g, '')
        .replace(/\s+/g, '')
        .trim();

    if (!limpo) return NaN;

    if (limpo.includes(',') && limpo.includes('.')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    } else if (limpo.includes(',')) {
        limpo = limpo.replace(',', '.');
    }

    const num = Number(limpo);
    return Number.isFinite(num) ? num : NaN;
}

// ============================================================================
// COMISSÃO DE VENDEDORES, METAS MENSAIS & HISTÓRICO PERMANENTE
// ============================================================================
function obterVendedoresConfig() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMISSOES_VENDEDORES) || 'null');
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((v, idx) => ({
                id: v.id || `vend_${idx + 1}`,
                nome: String(v.nome || `Vendedor ${idx + 1}`).trim(),
                comissaoPercentual: Math.max(0, Number(v.comissaoPercentual ?? COMISSAO_PADRAO_PERCENTUAL)),
                metaMensal: Math.max(0, normalizarMoedaValor(v.metaMensal ?? META_MENSAL_PADRAO))
            }));
        }
    } catch (e) {
        // Fallback seguro
    }
    const iniciais = VENDEDORES_INICIAIS.map(v => ({ ...v }));
    salvarVendedoresConfig(iniciais);
    return iniciais;
}

function salvarVendedoresConfig(lista) {
    localStorage.setItem(STORAGE_KEYS.COMISSOES_VENDEDORES, JSON.stringify(lista));
}

function obterMetasMensaisHistorico() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMISSOES_METAS_MES) || '{}');
        return raw && typeof raw === 'object' ? raw : {};
    } catch (e) {
        return {};
    }
}

function salvarMetasMensaisHistorico(mapa) {
    localStorage.setItem(STORAGE_KEYS.COMISSOES_METAS_MES, JSON.stringify(mapa));
}

function obterMetaVendedorNoMes(vendedorId, mesChave) {
    const vendedores = obterVendedoresConfig();
    const vend = vendedores.find(v => v.id === vendedorId);
    const metaBase = Math.max(0, normalizarMoedaValor(vend?.metaMensal ?? META_MENSAL_PADRAO));
    const metasMes = obterMetasMensaisHistorico();
    const mes = mesChave || obterChaveMes();

    if (metasMes[mes] && Object.prototype.hasOwnProperty.call(metasMes[mes], vendedorId)) {
        return Math.max(0, normalizarMoedaValor(metasMes[mes][vendedorId]));
    }
    return metaBase;
}

function registrarMetaVendedorNoMes(vendedorId, mesChave, valorMeta) {
    const metasMes = obterMetasMensaisHistorico();
    const mes = mesChave || obterChaveMes();
    if (!metasMes[mes] || typeof metasMes[mes] !== 'object') {
        metasMes[mes] = {};
    }
    metasMes[mes][vendedorId] = Math.max(0, normalizarMoedaValor(valorMeta));
    salvarMetasMensaisHistorico(metasMes);
}

function obterRegistrosComissoes() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMISSOES_REGISTROS) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (e) {
        return [];
    }
}

function salvarRegistrosComissoes(lista) {
    localStorage.setItem(STORAGE_KEYS.COMISSOES_REGISTROS, JSON.stringify(lista));
}

function obterLogAdminComissoes() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMISSOES_LOG_ADMIN) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (e) {
        return [];
    }
}

function registrarLogAdminComissao(descricao) {
    const logs = obterLogAdminComissoes();
    logs.unshift({
        id: 'log_com_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        dataHora: new Date().toLocaleString('pt-BR'),
        mesChave: obterChaveMes(),
        descricao
    });
    localStorage.setItem(STORAGE_KEYS.COMISSOES_LOG_ADMIN, JSON.stringify(logs));
}

function inicializarComissoes() {
    const vendedores = obterVendedoresConfig();
    const mesAtual = obterChaveMes();
    mesSelecionadoComissao = mesAtual;

    const inputMes = document.getElementById('input-mes-comissao');
    if (inputMes) {
        inputMes.value = mesAtual;
    }

    if (!vendedorSelecionadoComandaId && vendedores.length > 0) {
        vendedorSelecionadoComandaId = vendedores[0].id;
    }
    if (!vendedorSelecionadoPainelId && vendedores.length > 0) {
        vendedorSelecionadoPainelId = vendedores[0].id;
    }

    sincronizarComissoesComHistorico();
    popularSeletoresVendedores();
}

function popularSeletoresVendedores() {
    const vendedores = obterVendedoresConfig();
    const selectComanda = document.getElementById('select-vendedor-comanda');
    const selectPainel = document.getElementById('select-vendedor-painel');
    const selectAdmin = document.getElementById('admin-select-vendedor');

    if (vendedores.length > 0) {
        if (!vendedores.some(v => v.id === vendedorSelecionadoComandaId)) {
            vendedorSelecionadoComandaId = vendedores[0].id;
        }
        if (!vendedores.some(v => v.id === vendedorSelecionadoPainelId)) {
            vendedorSelecionadoPainelId = vendedores[0].id;
        }
    }

    const opcoesHtml = vendedores.map(v =>
        `<option value="${escapeHTML(v.id)}">${escapeHTML(v.nome)} (${Number(v.comissaoPercentual || 0)}%)</option>`
    ).join('');

    if (selectComanda) {
        selectComanda.innerHTML = opcoesHtml;
        selectComanda.value = vendedorSelecionadoComandaId;
    }
    if (selectPainel) {
        selectPainel.innerHTML = opcoesHtml;
        selectPainel.value = vendedorSelecionadoPainelId;
    }
    if (selectAdmin) {
        const valorAnteriorAdmin = selectAdmin.value;
        selectAdmin.innerHTML = opcoesHtml;
        if (vendedores.some(v => v.id === valorAnteriorAdmin)) {
            selectAdmin.value = valorAnteriorAdmin;
        } else if (vendedores.length > 0) {
            selectAdmin.value = vendedorSelecionadoPainelId || vendedores[0].id;
        }
    }

    sincronizarCamposAdminVendedor();
}

function sincronizarCamposAdminVendedor() {
    const selectAdmin = document.getElementById('admin-select-vendedor');
    if (!selectAdmin) return;

    const vendedores = obterVendedoresConfig();
    const vend = vendedores.find(v => v.id === selectAdmin.value) || vendedores[0];
    if (!vend) return;

    const mesRef = mesSelecionadoComissao || obterChaveMes();
    const metaMes = obterMetaVendedorNoMes(vend.id, mesRef);

    const inputCom = document.getElementById('admin-input-comissao');
    const inputMeta = document.getElementById('admin-input-meta');
    const infoEl = document.getElementById('admin-taxa-atual-info');

    if (inputCom) inputCom.value = String(Number(vend.comissaoPercentual || 0)).replace('.', ',');
    if (inputMeta) inputMeta.value = Number(metaMes || 0).toFixed(2).replace('.', ',');
    if (infoEl) {
        infoEl.innerHTML = `Porcentagem cadastrada para <strong>${escapeHTML(vend.nome)}</strong>: <strong>${Number(vend.comissaoPercentual || 0)}%</strong> • Meta (${escapeHTML(formatarMesChaveBR(mesRef))}): <strong>${formatarMoeda(metaMes)}</strong>`;
    }
}

function sincronizarComissoesComHistorico() {
    const historico = obterHistorico();
    const registros = obterRegistrosComissoes();
    const vendedores = obterVendedoresConfig();
    const vendedorPadraoId = vendedores[0]?.id || 'vend_1';
    let alterado = false;

    const mapaPorVenda = new Map();
    registros.forEach(reg => {
        if (reg && reg.vendaId) {
            mapaPorVenda.set(reg.vendaId, reg);
        }
    });

    historico.forEach(venda => {
        const mesChave = obterChaveMes(venda.dataChave);
        const vendedorId = venda.vendedorId || vendedorPadraoId;
        const vendObj = vendedores.find(v => v.id === vendedorId);
        const vendedorNome = venda.vendedorNome || vendObj?.nome || 'Vendedor';

        if (!venda.vendedorId) {
            venda.vendedorId = vendedorId;
            venda.vendedorNome = vendedorNome;
            alterado = true;
        }

        const existente = mapaPorVenda.get(venda.id);

        if (venda.statusPagamento === 'Pago') {
            const percentualAplicado = existente && typeof existente.comissaoPercentual === 'number'
                ? existente.comissaoPercentual
                : Number(vendObj?.comissaoPercentual ?? COMISSAO_PADRAO_PERCENTUAL);

            const totalVendaCent = paraCentavos(venda.total);
            const totalVenda = deCentavos(totalVendaCent);
            const quantidadeItens = (venda.itens || []).reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
            const valorComissao = deCentavos(Math.round(totalVendaCent * (percentualAplicado / 100)));

            const novoRegistro = {
                id: existente?.id || ('com_reg_' + venda.id),
                vendaId: venda.id,
                numeroComanda: venda.numero,
                dataChave: venda.dataChave,
                mesChave,
                dataHora: venda.dataHora || new Date().toLocaleString('pt-BR'),
                cliente: venda.cliente || 'Balcão',
                vendedorId,
                vendedorNome,
                quantidadeItens,
                totalVenda,
                comissaoPercentual: percentualAplicado,
                valorComissao,
                status: 'Confirmada'
            };

            const mudanca = !existente ||
                existente.totalVenda !== novoRegistro.totalVenda ||
                existente.quantidadeItens !== novoRegistro.quantidadeItens ||
                existente.valorComissao !== novoRegistro.valorComissao ||
                existente.comissaoPercentual !== novoRegistro.comissaoPercentual ||
                existente.vendedorId !== novoRegistro.vendedorId ||
                existente.status !== 'Confirmada';

            if (mudanca) {
                mapaPorVenda.set(venda.id, {
                    ...novoRegistro,
                    atualizadoEm: new Date().toLocaleString('pt-BR')
                });
                alterado = true;
            }
        } else if (existente && existente.status !== 'Estornada') {
            mapaPorVenda.set(venda.id, {
                ...existente,
                valorComissao: 0,
                status: 'Estornada',
                atualizadoEm: new Date().toLocaleString('pt-BR')
            });
            alterado = true;
        }
    });

    const idsHistorico = new Set(historico.map(v => v.id));
    mapaPorVenda.forEach((reg, vendaId) => {
        if (!idsHistorico.has(vendaId) && reg.status !== 'Estornada') {
            mapaPorVenda.set(vendaId, {
                ...reg,
                valorComissao: 0,
                status: 'Estornada',
                atualizadoEm: new Date().toLocaleString('pt-BR')
            });
            alterado = true;
        }
    });

    if (alterado) {
        salvarRegistrosComissoes(Array.from(mapaPorVenda.values()));
    }
}

function abrirModalComissoes() {
    sincronizarComissoesComHistorico();
    popularSeletoresVendedores();
    renderizarPainelComissoes();
    document.getElementById('modal-comissoes')?.classList.remove('hidden');
    registrarAberturaJanela('modal-comissoes');
}

function fecharModalComissoes() {
    document.getElementById('modal-comissoes')?.classList.add('hidden');
    sincronizarPilhaJanelas();
}

function ativarVisaoVendedor() {
    adminComissoesAutorizado = false;
    document.getElementById('btn-perfil-vendedor')?.classList.add('active');
    document.getElementById('btn-perfil-admin')?.classList.remove('active');
    document.getElementById('secao-admin-comissoes')?.classList.add('hidden');
    renderizarPainelComissoes();
}

function solicitarAcessoAdminComissoes() {
    if (adminComissoesAutorizado) {
        document.getElementById('secao-admin-comissoes')?.classList.remove('hidden');
        renderizarPainelComissoes();
        return;
    }

    const inputCod = document.getElementById('input-senha-comissao');
    const erroEl = document.getElementById('erro-senha-comissao');
    if (inputCod) inputCod.value = '';
    if (erroEl) erroEl.classList.add('hidden');

    document.getElementById('modal-senha-comissao')?.classList.remove('hidden');
    registrarAberturaJanela('modal-senha-comissao');
    setTimeout(() => inputCod?.focus(), 50);
}

function fecharModalSenhaComissao() {
    document.getElementById('modal-senha-comissao')?.classList.add('hidden');
    document.getElementById('erro-senha-comissao')?.classList.add('hidden');
    sincronizarPilhaJanelas();
}

function confirmarCodigoAdminComissoes() {
    const inputCod = document.getElementById('input-senha-comissao');
    const erroEl = document.getElementById('erro-senha-comissao');
    const digitado = (inputCod?.value || '').trim();

    if (digitado !== CODIGO_ADMIN_COMISSAO) {
        erroEl?.classList.remove('hidden');
        inputCod?.focus();
        return;
    }

    adminComissoesAutorizado = true;
    fecharModalSenhaComissao();
    document.getElementById('btn-perfil-admin')?.classList.add('active');
    document.getElementById('btn-perfil-vendedor')?.classList.remove('active');
    document.getElementById('secao-admin-comissoes')?.classList.remove('hidden');
    popularSeletoresVendedores();
    renderizarPainelComissoes();
}

function calcularResumoVendedorMes(vendedorId, mesChave) {
    const vendedores = obterVendedoresConfig();
    const vend = vendedores.find(v => v.id === vendedorId) || vendedores[0];
    const idAlvo = vend ? vend.id : vendedorId;
    const mes = mesChave || obterChaveMes();
    const metaMensal = obterMetaVendedorNoMes(idAlvo, mes);
    const metaMensalCent = paraCentavos(metaMensal);
    const comissaoPercentual = Number(vend?.comissaoPercentual ?? COMISSAO_PADRAO_PERCENTUAL);

    const registrosConfirmadosMes = obterRegistrosComissoes().filter(reg =>
        reg.vendedorId === idAlvo &&
        reg.mesChave === mes &&
        reg.status === 'Confirmada'
    );

    const totalVendas = registrosConfirmadosMes.length;
    const quantidadeProdutos = registrosConfirmadosMes.reduce((acc, r) => acc + Number(r.quantidadeItens || 0), 0);
    const valorVendidoCent = registrosConfirmadosMes.reduce((acc, r) => acc + paraCentavos(r.totalVenda), 0);
    const comissaoAcumuladaCent = registrosConfirmadosMes.reduce((acc, r) => acc + paraCentavos(r.valorComissao), 0);

    const valorVendido = deCentavos(valorVendidoCent);
    const comissaoAcumulada = deCentavos(comissaoAcumuladaCent);
    const faltaParaMeta = deCentavos(Math.max(0, metaMensalCent - valorVendidoCent));
    const percentualMeta = metaMensalCent > 0 ? Math.min(100, (valorVendidoCent / metaMensalCent) * 100) : 0;
    const percentualMetaExibicao = metaMensalCent > 0 ? ((valorVendidoCent / metaMensalCent) * 100) : 0;

    return {
        vendedor: vend,
        mesChave: mes,
        metaMensal,
        comissaoPercentual,
        totalVendas,
        quantidadeProdutos,
        valorVendido,
        comissaoAcumulada,
        faltaParaMeta,
        percentualMeta,
        percentualMetaExibicao,
        registrosConfirmadosMes
    };
}

function renderizarPainelComissoes() {
    sincronizarComissoesComHistorico();

    const vendedores = obterVendedoresConfig();
    if (vendedores.length === 0) return;

    if (!vendedores.some(v => v.id === vendedorSelecionadoPainelId)) {
        vendedorSelecionadoPainelId = vendedores[0].id;
    }

    const mesAtual = mesSelecionadoComissao || obterChaveMes();
    const selectPainel = document.getElementById('select-vendedor-painel');
    if (selectPainel) {
        selectPainel.value = vendedorSelecionadoPainelId;
    }

    const resumo = calcularResumoVendedorMes(vendedorSelecionadoPainelId, mesAtual);
    const mesRefEl = document.getElementById('comissoes-mes-referencia');
    const permEl = document.getElementById('comissoes-status-permissao');

    if (mesRefEl) {
        mesRefEl.textContent = `Mês de referência: ${formatarMesChaveBR(mesAtual)} • Histórico permanente preservado`;
    }
    if (permEl) {
        permEl.textContent = adminComissoesAutorizado
            ? 'Modo Administrador Ativo (332133): edição manual de comissões e metas liberada'
            : `Visão do Vendedor (${resumo.vendedor?.nome || ''}): exibindo apenas seu desempenho`;
    }

    document.getElementById('comissao-kpi-meta').textContent = formatarMoeda(resumo.metaMensal);
    document.getElementById('comissao-kpi-vendido').textContent = formatarMoeda(resumo.valorVendido);
    document.getElementById('comissao-kpi-falta').textContent = formatarMoeda(resumo.faltaParaMeta);
    document.getElementById('comissao-kpi-percentual-meta').textContent = `${resumo.percentualMetaExibicao.toFixed(1)}%`;
    document.getElementById('comissao-kpi-taxa').textContent = `${resumo.comissaoPercentual}%`;
    document.getElementById('comissao-kpi-acumulada').textContent = formatarMoeda(resumo.comissaoAcumulada);
    document.getElementById('comissao-kpi-qtd-vendas').textContent = String(resumo.totalVendas);
    document.getElementById('comissao-kpi-qtd-itens').textContent = `${resumo.quantidadeProdutos} un.`;

    const barraEl = document.getElementById('meta-progresso-barra');
    const textoBarraEl = document.getElementById('meta-progresso-texto');
    if (barraEl) {
        barraEl.style.width = `${resumo.percentualMeta.toFixed(1)}%`;
    }
    if (textoBarraEl) {
        textoBarraEl.textContent = `${resumo.percentualMetaExibicao.toFixed(1)}% concluído (${formatarMoeda(resumo.valorVendido)} de ${formatarMoeda(resumo.metaMensal)})`;
    }

    const graficoEl = document.getElementById('grafico-desempenho-comissoes');
    const subtituloGraficoEl = document.getElementById('comissao-grafico-subtitulo');
    const vendedoresParaGrafico = adminComissoesAutorizado
        ? vendedores
        : vendedores.filter(v => v.id === vendedorSelecionadoPainelId);

    if (subtituloGraficoEl) {
        subtituloGraficoEl.textContent = adminComissoesAutorizado
            ? `Comparativo Mensal • ${formatarMesChaveBR(mesAtual)}`
            : `Meu Desempenho • ${formatarMesChaveBR(mesAtual)}`;
    }

    if (graficoEl) {
        const dadosGrafico = vendedoresParaGrafico.map(v => ({
            vendedor: v,
            resumo: calcularResumoVendedorMes(v.id, mesAtual)
        }));
        const maiorRef = Math.max(
            ...dadosGrafico.map(d => Math.max(d.resumo.valorVendido, d.resumo.metaMensal)),
            1
        );

        graficoEl.innerHTML = dadosGrafico.map(({ vendedor, resumo: r }) => {
            const pctBarra = Math.min(100, Math.round((r.valorVendido / maiorRef) * 100));
            return `
                <div class="grafico-item ${r.valorVendido >= r.metaMensal && r.metaMensal > 0 ? 'is-lider' : ''}">
                    <div class="grafico-item-topo">
                        <span class="grafico-item-nome">${escapeHTML(vendedor.nome)} (${r.comissaoPercentual}%)</span>
                        <span class="grafico-item-valores">
                            <strong>${formatarMoeda(r.valorVendido)}</strong> / Meta ${formatarMoeda(r.metaMensal)} (${r.percentualMetaExibicao.toFixed(0)}%)
                        </span>
                    </div>
                    <div class="grafico-trilha">
                        <div class="grafico-preenchimento" style="width: ${pctBarra}%"></div>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">
                        Comissão acumulada: <strong style="color: var(--accent);">${formatarMoeda(r.comissaoAcumulada)}</strong> • Falta para meta: <strong>${formatarMoeda(r.faltaParaMeta)}</strong>
                    </div>
                </div>
            `;
        }).join('');
    }

    const listaVendasEl = document.getElementById('lista-vendas-comissao-vendedor');
    if (listaVendasEl) {
        const ordenadas = [...resumo.registrosConfirmadosMes].reverse();
        if (ordenadas.length === 0) {
            listaVendasEl.innerHTML = '<p class="empty-msg">Nenhuma venda confirmada para este vendedor no mês selecionado.</p>';
        } else {
            listaVendasEl.innerHTML = ordenadas.map(reg => `
                <div class="comissao-venda-item">
                    <div>
                        <strong>Comanda #${escapeHTML(reg.numeroComanda)}</strong> • ${escapeHTML(reg.cliente || 'Balcão')}
                        <div style="font-size: 0.76rem; color: var(--text-muted);">
                            ${escapeHTML(reg.dataHora)} • ${reg.quantidadeItens} un. • Total: ${formatarMoeda(reg.totalVenda)} (${reg.comissaoPercentual}%)
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div>Comissão: <strong>${formatarMoeda(reg.valorComissao)}</strong></div>
                    </div>
                </div>
            `).join('');
        }
    }

    if (adminComissoesAutorizado) {
        renderizarSecaoAdminComissoes(mesAtual);
    }
}

function renderizarSecaoAdminComissoes(mesAtual) {
    const vendedores = obterVendedoresConfig();
    const tbody = document.getElementById('tabela-admin-vendedores');
    if (tbody) {
        tbody.innerHTML = vendedores.map(v => {
            const r = calcularResumoVendedorMes(v.id, mesAtual);
            const taxaFormatada = String(Number(v.comissaoPercentual || 0)).replace('.', ',');
            const metaFormatada = Number(r.metaMensal || 0).toFixed(2).replace('.', ',');
            return `
                <tr>
                    <td><strong>${escapeHTML(v.nome)}</strong></td>
                    <td>
                        <input
                            type="text"
                            inputmode="decimal"
                            class="input-edicao-inline"
                            id="tabela-input-comissao-${escapeHTML(v.id)}"
                            value="${escapeHTML(taxaFormatada)}"
                            aria-label="Percentual de comissão de ${escapeHTML(v.nome)}"
                        >
                    </td>
                    <td>
                        <input
                            type="text"
                            inputmode="decimal"
                            class="input-edicao-inline input-meta-inline"
                            id="tabela-input-meta-${escapeHTML(v.id)}"
                            value="${escapeHTML(metaFormatada)}"
                            aria-label="Meta mensal de ${escapeHTML(v.nome)}"
                        >
                    </td>
                    <td>${formatarMoeda(r.valorVendido)}</td>
                    <td><strong style="color: var(--accent);">${formatarMoeda(r.comissaoAcumulada)}</strong></td>
                    <td>
                        <button type="button" class="btn-primary qr-btn-sm" onclick="salvarLinhaVendedorAdmin('${escapeHTML(v.id)}')">
                            Salvar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const logListaEl = document.getElementById('lista-log-admin-comissoes');
    if (logListaEl) {
        const logs = obterLogAdminComissoes();
        if (logs.length === 0) {
            logListaEl.innerHTML = '<p class="empty-msg">Nenhuma alteração administrativa registrada ainda.</p>';
        } else {
            logListaEl.innerHTML = logs.map(item => `
                <div class="comissao-log-item">
                    <strong>${escapeHTML(item.dataHora)}</strong> — ${escapeHTML(item.descricao)}
                </div>
            `).join('');
        }
    }

    sincronizarCamposAdminVendedor();
}

function aplicarAtualizacaoVendedorAdmin(vendedorId, novaTaxa, novaMeta) {
    if (!adminComissoesAutorizado) {
        solicitarAcessoAdminComissoes();
        return false;
    }

    if (!vendedorId || Number.isNaN(novaTaxa) || novaTaxa < 0 || novaTaxa > 100) {
        alert('Informe uma porcentagem de comissão válida entre 0% e 100%.');
        return false;
    }
    if (Number.isNaN(novaMeta) || novaMeta < 0) {
        alert('Informe um valor de meta mensal válido maior ou igual a zero.');
        return false;
    }

    const vendedores = obterVendedoresConfig();
    const idx = vendedores.findIndex(v => v.id === vendedorId);
    if (idx === -1) return false;

    const taxaArredondada = Math.round(novaTaxa * 100) / 100;
    const metaArredondada = normalizarMoedaValor(novaMeta);
    const mesRef = mesSelecionadoComissao || obterChaveMes();

    vendedores[idx].comissaoPercentual = taxaArredondada;
    vendedores[idx].metaMensal = metaArredondada;
    salvarVendedoresConfig(vendedores);
    registrarMetaVendedorNoMes(vendedorId, mesRef, metaArredondada);

    registrarLogAdminComissao(
        `Atualizou ${vendedores[idx].nome}: comissão ${taxaArredondada}% e meta (${formatarMesChaveBR(mesRef)}) ${formatarMoeda(metaArredondada)}.`
    );

    popularSeletoresVendedores();
    renderizarPainelComissoes();
    alert(`Configurações de ${vendedores[idx].nome} salvas com sucesso!`);
    return true;
}

function salvarLinhaVendedorAdmin(vendedorId) {
    const inputCom = document.getElementById(`tabela-input-comissao-${vendedorId}`);
    const inputMeta = document.getElementById(`tabela-input-meta-${vendedorId}`);
    const novaTaxa = parseNumeroDecimalEntrada(inputCom?.value);
    const novaMeta = parseNumeroDecimalEntrada(inputMeta?.value);

    const selectAdmin = document.getElementById('admin-select-vendedor');
    if (selectAdmin) {
        selectAdmin.value = vendedorId;
    }

    aplicarAtualizacaoVendedorAdmin(vendedorId, novaTaxa, novaMeta);
}

function salvarConfiguracaoVendedorAdmin() {
    const selectAdmin = document.getElementById('admin-select-vendedor');
    const vendedorId = selectAdmin?.value;
    const novaTaxa = parseNumeroDecimalEntrada(document.getElementById('admin-input-comissao')?.value);
    const novaMeta = parseNumeroDecimalEntrada(document.getElementById('admin-input-meta')?.value);

    aplicarAtualizacaoVendedorAdmin(vendedorId, novaTaxa, novaMeta);
}

function cadastrarNovoVendedorAdmin() {
    if (!adminComissoesAutorizado) {
        solicitarAcessoAdminComissoes();
        return;
    }

    const nomeInput = document.getElementById('admin-novo-vendedor-nome');
    const comInput = document.getElementById('admin-novo-vendedor-comissao');
    const metaInput = document.getElementById('admin-novo-vendedor-meta');

    const nome = (nomeInput?.value || '').trim();
    const taxa = parseNumeroDecimalEntrada(comInput?.value ?? '10');
    const meta = parseNumeroDecimalEntrada(metaInput?.value ?? '5000');

    if (!nome) {
        alert('Informe o nome do vendedor.');
        return;
    }
    if (Number.isNaN(taxa) || taxa < 0 || taxa > 100) {
        alert('Informe uma porcentagem válida entre 0% e 100%.');
        return;
    }
    if (Number.isNaN(meta) || meta < 0) {
        alert('Informe uma meta mensal válida maior ou igual a zero.');
        return;
    }

    const vendedores = obterVendedoresConfig();
    const novoVendedor = {
        id: 'vend_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        nome,
        comissaoPercentual: Math.round(taxa * 100) / 100,
        metaMensal: normalizarMoedaValor(meta)
    };

    vendedores.push(novoVendedor);
    salvarVendedoresConfig(vendedores);
    registrarMetaVendedorNoMes(novoVendedor.id, mesSelecionadoComissao || obterChaveMes(), novoVendedor.metaMensal);

    registrarLogAdminComissao(
        `Cadastrou novo vendedor "${novoVendedor.nome}" com comissão ${novoVendedor.comissaoPercentual}% e meta ${formatarMoeda(novoVendedor.metaMensal)}.`
    );

    if (nomeInput) nomeInput.value = '';
    vendedorSelecionadoPainelId = novoVendedor.id;
    popularSeletoresVendedores();
    const selectAdmin = document.getElementById('admin-select-vendedor');
    if (selectAdmin) selectAdmin.value = novoVendedor.id;
    renderizarPainelComissoes();
}

function preencherCupomComissaoVendedor(resumo) {
    alternarModoImpressaoTermica('comissao');

    document.getElementById('print-com-vendedor').textContent = resumo.vendedor?.nome || 'Vendedor';
    document.getElementById('print-com-mes').textContent = formatarMesChaveBR(resumo.mesChave);
    document.getElementById('print-com-emissao').textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('print-com-meta').textContent = formatarMoeda(resumo.metaMensal);
    document.getElementById('print-com-vendido').textContent = formatarMoeda(resumo.valorVendido);
    document.getElementById('print-com-falta').textContent = formatarMoeda(resumo.faltaParaMeta);
    document.getElementById('print-com-pct-meta').textContent = `${resumo.percentualMetaExibicao.toFixed(1)}%`;
    document.getElementById('print-com-qtd').textContent = `${resumo.totalVendas} venda(s) / ${resumo.quantidadeProdutos} un.`;
    document.getElementById('print-com-taxa').textContent = `${resumo.comissaoPercentual}%`;
    document.getElementById('print-com-acumulada').textContent = formatarMoeda(resumo.comissaoAcumulada);

    const listaContainer = document.getElementById('print-com-lista-vendas');
    const vendasOrdenadas = [...(resumo.registrosConfirmadosMes || [])];

    if (vendasOrdenadas.length === 0) {
        listaContainer.innerHTML = '<div class="cupom-rel-linha">Nenhuma venda confirmada no mes.</div>';
    } else {
        listaContainer.innerHTML = vendasOrdenadas.map(reg => `
            <div class="cupom-rel-linha">
                <div class="cupom-rel-linha-topo">
                    <span>Comanda #${escapeHTML(reg.numeroComanda)} (${reg.comissaoPercentual}%)</span>
                    <span>Com: ${formatarMoeda(reg.valorComissao)}</span>
                </div>
                <div class="cupom-rel-linha-sub">
                    <span>${escapeHTML(reg.cliente || 'Balcão')} • ${reg.quantidadeItens} un.</span>
                    <span>Venda: ${formatarMoeda(reg.totalVenda)}</span>
                </div>
            </div>
        `).join('');
    }
}

function imprimirRelatorioComissaoVendedor() {
    if (impressaoEmAndamento) return;
    impressaoEmAndamento = true;

    try {
        sincronizarComissoesComHistorico();
        const mesAtual = mesSelecionadoComissao || obterChaveMes();
        const resumo = calcularResumoVendedorMes(vendedorSelecionadoPainelId, mesAtual);
        preencherCupomComissaoVendedor(resumo);

        setTimeout(() => {
            window.print();
            impressaoEmAndamento = false;
        }, 120);
    } catch (erro) {
        console.error('Erro ao imprimir comissão:', erro);
        alert('Falha ao preparar a impressão da comissão.');
        impressaoEmAndamento = false;
    }
}

// ============================================================================
// NORMALIZAÇÃO DE PAGAMENTOS E HISTÓRICO FINANCEIRO
// ============================================================================
function normalizarFormaPagamento(forma) {
    const texto = String(forma || '').trim();
    if (!texto) return 'Dinheiro';
    const lower = texto.toLowerCase();
    if (lower === 'vale da casa' || lower === 'vale-consumo da casa' || lower === 'vale consumo da casa') {
        return 'Vale-consumo da casa';
    }
    if (lower === 'vale-consumo' || lower === 'vale consumo') {
        return 'Vale-consumo';
    }
    if (lower === 'consumo da casa' || lower === 'consumo') {
        return 'Consumo da casa';
    }
    if (lower === 'cartão de crédito' || lower === 'cartao de credito') {
        return 'Cartão de crédito';
    }
    if (lower === 'cartão de débito' || lower === 'cartao de debito') {
        return 'Cartão de débito';
    }
    if (lower === 'pix') {
        return 'PIX';
    }
    if (lower === 'dinheiro') {
        return 'Dinheiro';
    }
    return texto;
}

function normalizarListaPagamentosVenda(venda) {
    if (venda.statusPagamento === 'Pendente') {
        return [];
    }

    const totalVendaCent = paraCentavos(venda.total);

    if (Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0) {
        const filtrados = venda.pagamentos
            .map(p => ({
                forma: normalizarFormaPagamento(p.forma || p.formaPagamento),
                centavos: paraCentavos(p.valor)
            }))
            .filter(p => p.centavos > 0);

        if (filtrados.length === 1 && totalVendaCent > 0 && filtrados[0].centavos !== totalVendaCent) {
            return [{
                forma: filtrados[0].forma,
                valor: deCentavos(totalVendaCent)
            }];
        }

        if (filtrados.length > 0) {
            return filtrados.map(p => ({
                forma: p.forma,
                valor: deCentavos(p.centavos)
            }));
        }
    }

    return [{
        forma: normalizarFormaPagamento(venda.formaPagamento || 'Dinheiro'),
        valor: deCentavos(totalVendaCent)
    }];
}

function formatarDescricaoPagamentos(venda) {
    const lista = normalizarListaPagamentosVenda(venda);
    if (lista.length > 1) {
        return lista.map(p => `${p.forma}: ${formatarMoeda(p.valor)}`).join(' + ');
    }
    if (lista.length === 1) {
        return lista[0].forma;
    }
    return venda.formaPagamento || 'Pagamento pendente';
}

function obterHistorico() {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PEDIDOS) || '[]');
    if (!Array.isArray(raw)) return [];

    return raw.map((item, idx) => {
        const statusNormalizado = item.statusPagamento === 'Pendente' ? 'Pendente' : 'Pago';
        const dataChave = item.dataChave || (typeof item.dataHora === 'string' && item.dataHora.includes('/')
            ? (() => {
                const parteData = item.dataHora.split(',')[0].trim().split('/');
                if (parteData.length === 3) {
                    return `${parteData[2]}-${parteData[1].padStart(2, '0')}-${parteData[0].padStart(2, '0')}`;
                }
                return obterChaveDia();
            })()
            : obterChaveDia());

        const itensPreservados = Array.isArray(item.itens)
            ? item.itens.map(it => {
                const precoUnit = normalizarMoedaValor(it.precoUnitario);
                const qtd = Math.max(0, Math.round(Number(it.quantidade || 0)));
                const subCent = paraCentavos(it.subtotal) > 0
                    ? paraCentavos(it.subtotal)
                    : calcularSubtotalCentavos(precoUnit, qtd);
                return {
                    ...it,
                    precoUnitario: precoUnit,
                    quantidade: qtd,
                    subtotal: deCentavos(subCent)
                };
            })
            : [];

        const totalCent = paraCentavos(item.total) > 0
            ? paraCentavos(item.total)
            : itensPreservados.reduce((acc, it) => acc + paraCentavos(it.subtotal), 0);
        const totalExato = deCentavos(totalCent);

        const pagamentosNormalizados = statusNormalizado === 'Pago'
            ? normalizarListaPagamentosVenda({ ...item, total: totalExato, statusPagamento: statusNormalizado })
            : [];

        const formaNormalizada = statusNormalizado === 'Pendente'
            ? (item.formaPagamento || 'Pagamento pendente')
            : (pagamentosNormalizados.length > 1
                ? pagamentosNormalizados.map(p => `${p.forma}: ${formatarMoeda(p.valor)}`).join(' + ')
                : normalizarFormaPagamento(pagamentosNormalizados[0]?.forma || item.formaPagamento || 'Dinheiro'));

        return {
            ...item,
            id: item.id || `venda_legada_${idx}_${item.numero || '0'}`,
            dataChave,
            itens: itensPreservados,
            total: totalExato,
            statusPagamento: statusNormalizado,
            formaPagamento: formaNormalizada,
            pagamentos: pagamentosNormalizados
        };
    });
}

function salvarHistorico(lista) {
    localStorage.setItem(STORAGE_KEYS.PEDIDOS, JSON.stringify(lista));
    sincronizarComissoesComHistorico();
    if (!document.getElementById('modal-comissoes')?.classList.contains('hidden')) {
        renderizarPainelComissoes();
    }
}

function obterProximoNumeroComanda() {
    const atual = parseInt(localStorage.getItem(STORAGE_KEYS.CONTADOR_COMANDA) || '1', 10);
    return atual;
}

function incrementarNumeroComanda() {
    const atual = obterProximoNumeroComanda();
    localStorage.setItem(STORAGE_KEYS.CONTADOR_COMANDA, (atual + 1).toString());
    atualizarNumeroComandaUI();
}

function atualizarNumeroComandaUI() {
    const num = obterProximoNumeroComanda().toString().padStart(3, '0');
    document.getElementById('numero-comanda').textContent = num;
}

function formatarMoeda(valor) {
    const norm = normalizarMoedaValor(valor);
    return norm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================================
// PESQUISA INTELIGENTE NO CARDÁPIO DIGITAL
// ============================================================================
function normalizarTextoBusca(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function produtoCorrespondePesquisa(produto, consultaRaw) {
    const consultaNorm = normalizarTextoBusca(consultaRaw);
    if (!consultaNorm) return true;

    const nomeNorm = normalizarTextoBusca(produto.nome);
    const catNorm = normalizarTextoBusca(produto.categoria);
    const descNorm = normalizarTextoBusca(produto.descricao || produto.observacao || '');
    const termosRelacionados = Array.isArray(produto.termos)
        ? produto.termos.map(t => normalizarTextoBusca(t)).join(' ')
        : '';

    const textoCompleto = `${nomeNorm} ${catNorm} ${descNorm} ${termosRelacionados}`.trim();
    if (!textoCompleto) return false;

    const palavrasAlvo = textoCompleto.split(' ').filter(Boolean);
    const tokensBusca = consultaNorm.split(' ').filter(Boolean);

    return tokensBusca.every(token => {
        if (textoCompleto.includes(token)) return true;
        return palavrasAlvo.some(palavra => palavra.startsWith(token));
    });
}

// ============================================================================
// GERENCIAMENTO DINÂMICO DE PRODUTOS E CARRINHO
// ============================================================================
function renderizarCategorias() {
    const container = document.getElementById('filtros-categoria');
    const categorias = ['Todas', ...new Set(produtos.map(p => p.categoria))];

    container.innerHTML = categorias.map(cat => `
        <button class="tab-btn ${cat === categoriaAtiva ? 'active' : ''}" 
                onclick="selecionarCategoria('${escapeHTML(cat)}')">
            ${escapeHTML(cat)}
        </button>
    `).join('');
}

function selecionarCategoria(cat) {
    categoriaAtiva = cat;
    renderizarCategorias();
    renderizarCatalogo();
}

function renderizarCatalogo() {
    const container = document.getElementById('lista-produtos-catalogo');
    const baseCategoria = categoriaAtiva === 'Todas'
        ? produtos
        : produtos.filter(p => p.categoria === categoriaAtiva);

    const filtrados = baseCategoria.filter(p => produtoCorrespondePesquisa(p, termoPesquisaCatalogo));

    if (filtrados.length === 0) {
        container.innerHTML = termoPesquisaCatalogo.trim()
            ? '<p class="empty-msg">Nenhum produto encontrado para essa pesquisa.</p>'
            : '<p class="empty-msg">Nenhum produto nesta categoria.</p>';
        return;
    }

    container.innerHTML = filtrados.map(prod => {
        const qtd = carrinho[prod.id] || 0;
        const precoEfetivo = obterPrecoEfetivoComanda(prod);
        const foiAlterado = paraCentavos(precoEfetivo) !== paraCentavos(prod.preco);
        return `
            <div class="produto-card">
                <div>
                    <span class="produto-cat">${escapeHTML(prod.categoria)}</span>
                    <div class="produto-nome">${escapeHTML(prod.nome)}</div>
                    <div class="produto-preco produto-preco-editavel ${foiAlterado ? 'preco-alterado-temp' : ''}" 
                         title="Clique para editar o preço apenas nesta comanda (Original: ${formatarMoeda(prod.preco)})"
                         onclick="editarPrecoTemporarioComanda('${prod.id}')">
                        ${formatarMoeda(precoEfetivo)}${foiAlterado ? ' <span class="badge-preco-temp">Temp</span>' : ''}
                    </div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="alterarQuantidade('${prod.id}', -1)">-</button>
                    <span><strong>${qtd}</strong></span>
                    <button class="qty-btn" onclick="alterarQuantidade('${prod.id}', 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
}

function alterarQuantidade(produtoId, delta) {
    const qtdAtual = carrinho[produtoId] || 0;
    const novaQtd = qtdAtual + delta;

    if (novaQtd <= 0) {
        delete carrinho[produtoId];
    } else {
        carrinho[produtoId] = novaQtd;
    }

    renderizarCatalogo();
    renderizarCarrinho();
}

function obterPrecoEfetivoComanda(prod) {
    if (!prod) return 0;
    if (Object.prototype.hasOwnProperty.call(precosTemporariosComanda, prod.id)) {
        const val = Number(precosTemporariosComanda[prod.id]);
        if (Number.isFinite(val) && val >= 0) {
            return normalizarMoedaValor(val);
        }
    }
    return normalizarMoedaValor(prod.preco);
}

function editarPrecoTemporarioComanda(produtoId) {
    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return;

    const precoAtual = obterPrecoEfetivoComanda(prod);
    const entrada = prompt(
        `Editar preço apenas nesta comanda:\nProduto: ${prod.nome}\nPreço original no cardápio: ${formatarMoeda(prod.preco)}\nPreço atual nesta comanda: ${formatarMoeda(precoAtual)}\n\nInforme o novo valor (R$):`,
        precoAtual.toFixed(2).replace('.', ',')
    );

    if (entrada === null) return;
    const novoPreco = parseNumeroDecimalEntrada(entrada);

    if (Number.isNaN(novoPreco) || novoPreco < 0) {
        alert('Informe um valor válido maior ou igual a zero.');
        return;
    }

    const arredondado = normalizarMoedaValor(novoPreco);
    if (paraCentavos(arredondado) === paraCentavos(prod.preco)) {
        delete precosTemporariosComanda[produtoId];
    } else {
        precosTemporariosComanda[produtoId] = arredondado;
        if (!(produtoId in carrinho) || (carrinho[produtoId] || 0) <= 0) {
            carrinho[produtoId] = 1;
        }
    }

    renderizarCatalogo();
    renderizarCarrinho();
}

function calcularResumoPedido() {
    let totalCentavos = 0;
    const itensDetalhados = [];

    for (const [id, qtdRaw] of Object.entries(carrinho)) {
        const prod = produtos.find(p => p.id === id);
        const qtd = Math.max(0, Math.round(Number(qtdRaw || 0)));
        if (prod && qtd > 0) {
            const precoUnit = obterPrecoEfetivoComanda(prod);
            const subtotalCent = calcularSubtotalCentavos(precoUnit, qtd);
            totalCentavos += subtotalCent;
            itensDetalhados.push({
                id: prod.id,
                nome: prod.nome,
                precoUnitario: precoUnit,
                precoOriginal: normalizarMoedaValor(prod.preco),
                quantidade: qtd,
                subtotal: deCentavos(subtotalCent)
            });
        }
    }

    return { itensDetalhados, total: deCentavos(totalCentavos) };
}

function renderizarCarrinho() {
    const container = document.getElementById('itens-comanda');
    const btnFinalizar = document.getElementById('btn-ir-pagamento');
    const totalDisplay = document.getElementById('valor-total-display');

    const { itensDetalhados, total } = calcularResumoPedido();

    if (itensDetalhados.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nenhum item adicionado ao pedido.</p>';
        btnFinalizar.disabled = true;
        totalDisplay.textContent = 'R$ 0,00';
        return;
    }

    container.innerHTML = itensDetalhados.map(item => {
        const alterado = typeof item.precoOriginal === 'number' &&
            paraCentavos(item.precoUnitario) !== paraCentavos(item.precoOriginal);
        return `
        <div class="item-comanda-row">
            <div>
                <strong>${item.quantidade}x ${escapeHTML(item.nome)}</strong>
                <div style="font-size: 0.8rem; color: #a6978e;">
                    Unit: <span class="preco-unit-editavel" title="Clique para editar preço nesta comanda" onclick="editarPrecoTemporarioComanda('${item.id}')">${formatarMoeda(item.precoUnitario)}</span>${alterado ? ` <span class="badge-preco-temp">(Orig: ${formatarMoeda(item.precoOriginal)})</span>` : ''}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <strong>${formatarMoeda(item.subtotal)}</strong>
                <button class="qty-btn" onclick="alterarQuantidade('${item.id}', -1)">-</button>
                <button class="qty-btn" onclick="alterarQuantidade('${item.id}', 1)">+</button>
            </div>
        </div>
    `;
    }).join('');

    totalDisplay.textContent = formatarMoeda(total);
    btnFinalizar.disabled = false;
}

function limparComandaAtual() {
    carrinho = {};
    precosTemporariosComanda = {};
    document.getElementById('input-mesa-cliente').value = '';
    document.getElementById('input-observacoes').value = '';
    renderizarCatalogo();
    renderizarCarrinho();
}

// ============================================================================
// CRUD DE PRODUTOS (PERSISTENTE)
// ============================================================================
function renderizarTabelaCRUD() {
    const tbody = document.getElementById('tabela-produtos-crud');
    tbody.innerHTML = produtos.map(p => `
        <tr>
            <td>${escapeHTML(p.categoria)}</td>
            <td>${escapeHTML(p.nome)}</td>
            <td>${formatarMoeda(p.preco)}</td>
            <td>
                <button class="btn-secondary" style="padding:4px 10px;" onclick="editarProduto('${p.id}')">Editar</button>
                <button class="btn-danger-sm" onclick="excluirProduto('${p.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function salvarProdutoFormulario(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nome = document.getElementById('prod-nome').value.trim();
    const precoRaw = parseNumeroDecimalEntrada(document.getElementById('prod-preco').value);
    const categoria = document.getElementById('prod-categoria').value.trim();

    if (!nome || Number.isNaN(precoRaw) || precoRaw < 0 || !categoria) return;

    const preco = normalizarMoedaValor(precoRaw);

    if (id) {
        const index = produtos.findIndex(p => p.id === id);
        if (index !== -1) {
            produtos[index] = { ...produtos[index], id, nome, preco, categoria };
        }
    } else {
        const novoId = 'prod_' + Date.now();
        produtos.push({ id: novoId, nome, preco, categoria });
    }

    salvarProdutosStorage();
    resetarFormularioCRUD();
    renderizarTabelaCRUD();
    renderizarCategorias();
    renderizarCatalogo();
    renderizarCarrinho();
}

function editarProduto(id) {
    const prod = produtos.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-nome').value = prod.nome;
    document.getElementById('prod-preco').value = Number(prod.preco || 0).toFixed(2);
    document.getElementById('prod-categoria').value = prod.categoria;
    document.getElementById('btn-salvar-prod').textContent = 'Atualizar';
    document.getElementById('btn-cancelar-edicao').classList.remove('hidden');
}

function excluirProduto(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    produtos = produtos.filter(p => p.id !== id);
    delete carrinho[id];
    delete precosTemporariosComanda[id];

    salvarProdutosStorage();
    renderizarTabelaCRUD();
    renderizarCategorias();
    renderizarCatalogo();
    renderizarCarrinho();
}

function resetarFormularioCRUD() {
    document.getElementById('form-produto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('btn-salvar-prod').textContent = 'Salvar Produto';
    document.getElementById('btn-cancelar-edicao').classList.add('hidden');
}

// ============================================================================
// CONFIGURAÇÃO E PERSISTÊNCIA DOS QR CODES DO COMPROVANTE (WI-FI E PIX)
// ============================================================================
function obterQRCodesPersistidos() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.QRCODES_COMPROVANTE) || '{}');
        return {
            wifi: typeof raw.wifi === 'string' && raw.wifi.startsWith('data:image/') ? raw.wifi : '',
            pix: typeof raw.pix === 'string' && raw.pix.startsWith('data:image/') ? raw.pix : ''
        };
    } catch (e) {
        return { wifi: '', pix: '' };
    }
}

function salvarQRCodesPersistidos(dados) {
    localStorage.setItem(STORAGE_KEYS.QRCODES_COMPROVANTE, JSON.stringify({
        wifi: dados.wifi || '',
        pix: dados.pix || ''
    }));
}

function selecionarArquivoQR(tipo, escopo) {
    const inputEl = document.getElementById(`input-qr-${tipo}-${escopo}`);
    if (inputEl) {
        inputEl.value = '';
        inputEl.click();
    }
}

function otimizarDataUrlImagem(dataUrl, qualidade = 0.8, larguraMax = 600, callback) {
    const img = new Image();
    img.onload = () => {
        try {
            let w = img.width || larguraMax;
            let h = img.height || larguraMax;
            if (w > larguraMax) {
                h = Math.round((h * larguraMax) / w);
                w = larguraMax;
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                callback(dataUrl);
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const q = Math.min(0.99, Math.max(0.1, Number(qualidade) || 0.8));
            const saida = canvas.toDataURL('image/jpeg', q);
            callback(saida && saida.startsWith('data:image/') ? saida : dataUrl);
        } catch (err) {
            callback(dataUrl);
        }
    };
    img.onerror = () => callback(dataUrl);
    img.src = dataUrl;
}

function processarArquivoQRSelecionado(tipo, escopo, arquivo) {
    if (!arquivo) return;
    if (!arquivo.type || !arquivo.type.startsWith('image/')) {
        alert('Selecione um arquivo de imagem válido (PNG, JPG, WEBP, etc.).');
        return;
    }

    const qualidade = Number(document.getElementById('select-qualidade-qr')?.value || 0.8);
    const larguraMax = Math.max(150, Number(document.getElementById('input-largura-max-qr')?.value || 600));

    const leitor = new FileReader();
    leitor.onload = (ev) => {
        const dataUrl = String(ev.target?.result || '');
        if (!dataUrl.startsWith('data:image/')) return;
        otimizarDataUrlImagem(dataUrl, qualidade, larguraMax, (otimizada) => {
            qrPreviewPendenteSalvar[escopo][tipo] = otimizada;
            atualizarPreviewsQRCodesUI();
        });
    };
    leitor.readAsDataURL(arquivo);
}

function salvarQRCode(tipo, escopo) {
    const pendente = qrPreviewPendenteSalvar[escopo]?.[tipo];
    if (!pendente) return;

    try {
        const atuais = obterQRCodesPersistidos();
        atuais[tipo] = pendente;
        salvarQRCodesPersistidos(atuais);
        qrPreviewPendenteSalvar[escopo][tipo] = null;
        atualizarPreviewsQRCodesUI();
    } catch (erro) {
        console.error('Erro ao salvar QR Code:', erro);
        alert('Não foi possível salvar a imagem. Verifique se o arquivo não excede o limite de armazenamento do navegador.');
    }
}

function excluirQRCode(tipo) {
    const nomeLabel = tipo === 'wifi' ? 'Wi-Fi da loja' : 'pagamento via Pix';
    if (!confirm(`Deseja realmente excluir o QR Code do ${nomeLabel}?`)) return;

    const atuais = obterQRCodesPersistidos();
    atuais[tipo] = '';
    salvarQRCodesPersistidos(atuais);
    qrPreviewPendenteSalvar.pos[tipo] = null;
    qrPreviewPendenteSalvar.pendente[tipo] = null;
    atualizarPreviewsQRCodesUI();
}

function atualizarPreviewsQRCodesUI() {
    const salvos = obterQRCodesPersistidos();
    const escopos = ['pos', 'pendente'];
    const tipos = ['wifi', 'pix'];

    escopos.forEach(escopo => {
        tipos.forEach(tipo => {
            const boxEl = document.getElementById(`qr-${tipo}-preview-box-${escopo}`);
            const btnSalvar = document.getElementById(`btn-salvar-qr-${tipo}-${escopo}`);
            const btnExcluir = document.getElementById(`btn-excluir-qr-${tipo}-${escopo}`);
            const pendente = qrPreviewPendenteSalvar[escopo]?.[tipo];
            const salvo = salvos[tipo];
            const srcExibir = pendente || salvo;

            if (boxEl) {
                if (srcExibir) {
                    const tagStatus = pendente
                        ? '<span class="qr-status-badge qr-status-pendente">Pré-visualização (clique em Salvar)</span>'
                        : '<span class="qr-status-badge qr-status-salvo">Salvo no sistema</span>';
                    boxEl.innerHTML = `
                        <img src="${srcExibir}" alt="QR Code ${tipo.toUpperCase()}" class="qr-preview-img">
                        ${tagStatus}
                    `;
                } else {
                    boxEl.innerHTML = '<span class="qr-empty-label">Nenhuma imagem salva</span>';
                }
            }

            if (btnSalvar) {
                btnSalvar.disabled = !pendente;
            }
            if (btnExcluir) {
                btnExcluir.disabled = !salvo && !pendente;
            }
        });
    });
}

function vendaPossuiPagamentoPix(venda) {
    if (!venda || venda.statusPagamento === 'Pendente') return false;
    const lista = normalizarListaPagamentosVenda(venda);
    if (lista.some(p => normalizarFormaPagamento(p.forma) === 'PIX')) {
        return true;
    }
    return normalizarFormaPagamento(venda.formaPagamento) === 'PIX';
}

function aplicarQRCodesNoCupom(venda) {
    const container = document.getElementById('print-qrcodes-container');
    const blocoWifi = document.getElementById('print-qr-wifi-bloco');
    const imgWifi = document.getElementById('print-qr-wifi-img');
    const blocoPix = document.getElementById('print-qr-pix-bloco');
    const imgPix = document.getElementById('print-qr-pix-img');

    if (!container || !blocoWifi || !imgWifi || !blocoPix || !imgPix) return;

    const qrcodes = obterQRCodesPersistidos();
    const isPix = vendaPossuiPagamentoPix(venda);

    const exibirWifi = Boolean(qrcodes.wifi);
    const exibirPix = isPix && Boolean(qrcodes.pix);

    if (exibirWifi) {
        imgWifi.src = qrcodes.wifi;
        blocoWifi.classList.remove('hidden');
    } else {
        imgWifi.removeAttribute('src');
        blocoWifi.classList.add('hidden');
    }

    if (exibirPix) {
        imgPix.src = qrcodes.pix;
        blocoPix.classList.remove('hidden');
    } else {
        imgPix.removeAttribute('src');
        blocoPix.classList.add('hidden');
    }

    if (exibirWifi || exibirPix) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// ============================================================================
// HISTÓRICO AUTOMÁTICO, MÚLTIPLOS PAGAMENTOS, PENDENTE E IMPRESSÃO
// ============================================================================
function aplicarLarguraBobina(largura) {
    const cupom = document.getElementById('area-impressao-termica');
    cupom.classList.remove('bobina-80mm', 'bobina-58mm');
    cupom.classList.add(`bobina-${largura}`);
    localStorage.setItem(STORAGE_KEYS.LARGURA_BOBINA, largura);
}

function alternarModoImpressaoTermica(modo) {
    const blocoComanda = document.getElementById('print-bloco-comanda');
    const blocoRelatorio = document.getElementById('print-bloco-relatorio');
    const blocoComissao = document.getElementById('print-bloco-comissao');

    blocoComanda?.classList.add('hidden');
    blocoRelatorio?.classList.add('hidden');
    blocoComissao?.classList.add('hidden');

    if (modo === 'relatorio') {
        blocoRelatorio?.classList.remove('hidden');
    } else if (modo === 'comissao') {
        blocoComissao?.classList.remove('hidden');
    } else {
        blocoComanda?.classList.remove('hidden');
    }
}

function iniciarFluxoFinalizacaoEImprimir() {
    const { itensDetalhados, total } = calcularResumoPedido();
    if (itensDetalhados.length === 0) return;

    const agora = new Date();
    const numeroComanda = obterProximoNumeroComanda().toString().padStart(3, '0');
    const clienteMesa = document.getElementById('input-mesa-cliente').value.trim();
    const observacoesTexto = document.getElementById('input-observacoes').value;

    const vendedores = obterVendedoresConfig();
    const vendSelecionado = vendedores.find(v => v.id === vendedorSelecionadoComandaId) || vendedores[0] || {
        id: 'vend_1',
        nome: 'Atendente 01'
    };

    const novaVenda = {
        id: 'venda_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        dataChave: obterChaveDia(agora),
        numero: numeroComanda,
        dataHora: agora.toLocaleString('pt-BR'),
        cliente: clienteMesa || 'Balcão',
        vendedorId: vendSelecionado.id,
        vendedorNome: vendSelecionado.nome,
        itens: itensDetalhados.map(item => ({ ...item })),
        total: normalizarMoedaValor(total),
        formaPagamento: 'Pagamento pendente',
        statusPagamento: 'Pendente',
        pagamentos: [],
        observacoes: observacoesTexto
    };

    const historico = obterHistorico();
    historico.push(novaVenda);
    salvarHistorico(historico);

    enviarPedidoParaChamadaCozinha({
        ...novaVenda,
        cliente: clienteMesa
    });

    incrementarNumeroComanda();
    limparComandaAtual();

    abrirModalPagamentoParaVenda(novaVenda.id, 'nova');
}

function criarHtmlLinhaPagamento(formaInicial = 'PIX', valorInicial = '', permitirRemover = false) {
    const optionsHtml = FORMAS_PAGAMENTO_SELECAO.map(forma => `
        <option value="${escapeHTML(forma)}" ${forma === formaInicial ? 'selected' : ''}>
            ${escapeHTML(forma)}
        </option>
    `).join('');

    const valorAttr = valorInicial !== '' ? Number(valorInicial).toFixed(2) : '';

    return `
        <div class="multi-pgto-linha">
            <select class="select-forma-linha" aria-label="Forma de pagamento">
                ${optionsHtml}
            </select>
            <input
                type="number"
                class="input-valor-linha"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value="${valorAttr}"
                aria-label="Valor pago nesta forma"
            >
            ${permitirRemover
                ? '<button type="button" class="btn-danger-sm btn-remover-linha-pgto" title="Remover forma de pagamento">×</button>'
                : '<span style="width: 34px; display: inline-block;"></span>'
            }
        </div>
    `;
}

function adicionarLinhaPagamento(forma = 'Dinheiro', valor = '') {
    const listaEl = document.getElementById('lista-linhas-pagamento');
    const linhasExistentes = listaEl.querySelectorAll('.multi-pgto-linha').length;
    const html = criarHtmlLinhaPagamento(forma, valor, linhasExistentes > 0);
    listaEl.insertAdjacentHTML('beforeend', html);

    const novaLinha = listaEl.lastElementChild;
    const selectEl = novaLinha.querySelector('.select-forma-linha');
    const inputEl = novaLinha.querySelector('.input-valor-linha');
    const btnRemover = novaLinha.querySelector('.btn-remover-linha-pgto');

    selectEl.addEventListener('change', atualizarConferenciaMultiPagamentos);
    inputEl.addEventListener('input', atualizarConferenciaMultiPagamentos);
    if (btnRemover) {
        btnRemover.addEventListener('click', () => {
            novaLinha.remove();
            atualizarConferenciaMultiPagamentos();
        });
    }

    atualizarConferenciaMultiPagamentos();
}

function lerLinhasPagamentoModal() {
    const linhas = Array.from(document.querySelectorAll('#lista-linhas-pagamento .multi-pgto-linha'));
    return linhas.map(linha => {
        const forma = normalizarFormaPagamento(linha.querySelector('.select-forma-linha')?.value || 'PIX');
        const rawStr = linha.querySelector('.input-valor-linha')?.value;
        const centavos = paraCentavos(rawStr);
        const valor = centavos > 0 ? deCentavos(centavos) : 0;
        return { forma, valor, centavos: Math.max(0, centavos) };
    });
}

function atualizarConferenciaMultiPagamentos() {
    const secaoMulti = document.getElementById('secao-multiplos-pagamentos');
    const conferenciaEl = document.getElementById('resumo-conferencia-pagamento');
    const selecionadoRadio = document.querySelector('input[name="forma_pagamento"]:checked')?.value;

    if (selecionadoRadio === 'Pagamento pendente') {
        secaoMulti.classList.add('hidden');
        return;
    }
    secaoMulti.classList.remove('hidden');

    const totalVendaCent = contextoPagamento ? paraCentavos(contextoPagamento.totalVenda) : 0;
    const totalVenda = deCentavos(totalVendaCent);
    const linhas = lerLinhasPagamentoModal();
    const totalInformadoCent = linhas.reduce((acc, l) => acc + l.centavos, 0);
    const totalInformado = deCentavos(totalInformadoCent);
    const diferencaCent = totalInformadoCent - totalVendaCent;
    const temDinheiro = linhas.some(l => l.forma === 'Dinheiro' && l.centavos > 0);

    let html = `<div>Total informado: <strong>${formatarMoeda(totalInformado)}</strong> de <strong>${formatarMoeda(totalVenda)}</strong></div>`;

    if (totalInformadoCent === 0 && linhas.length === 1) {
        html += `<div class="conf-ok">Se deixar em branco ou 0, será considerado o total integral de <strong>${formatarMoeda(totalVenda)}</strong> em <strong>${escapeHTML(linhas[0].forma)}</strong>.</div>`;
    } else if (diferencaCent < 0) {
        html += `<div class="conf-falta">Falta pagar: <strong>${formatarMoeda(deCentavos(Math.abs(diferencaCent)))}</strong></div>`;
    } else if (diferencaCent > 0) {
        const troco = deCentavos(diferencaCent);
        html += `<div class="conf-excedente">Valor excedente: <strong>${formatarMoeda(troco)}</strong>${temDinheiro ? ` — Troco: <strong>${formatarMoeda(troco)}</strong>` : ''}</div>`;
    } else {
        html += `<div class="conf-ok">Valor conferido com o total da venda.</div>`;
    }

    conferenciaEl.innerHTML = html;
}

function abrirModalPagamentoParaVenda(vendaId, modo) {
    const historico = obterHistorico();
    const venda = historico.find(v => v.id === vendaId);
    if (!venda) return;

    contextoPagamento = { modo, vendaId, totalVenda: normalizarMoedaValor(venda.total) };

    const tituloEl = document.getElementById('modal-pgto-titulo');
    const subinfoEl = document.getElementById('modal-pgto-subtitulo-info');
    const valorEl = document.getElementById('modal-total-valor');
    const opcaoPendenteEl = document.getElementById('opcao-pgto-pendente');
    const listaLinhasEl = document.getElementById('lista-linhas-pagamento');

    valorEl.textContent = formatarMoeda(venda.total);

    if (modo === 'reabrir') {
        tituloEl.textContent = `Receber Pagamento — Comanda #${venda.numero}`;
        subinfoEl.textContent = `Cliente/Mesa: ${venda.cliente} | Valor a pagar:`;
        opcaoPendenteEl.classList.add('hidden');
    } else {
        tituloEl.textContent = `Forma de Pagamento — Comanda #${venda.numero}`;
        subinfoEl.textContent = 'Venda registrada no histórico. Total a pagar:';
        opcaoPendenteEl.classList.remove('hidden');
    }

    const primeiraForma = document.querySelector('input[name="forma_pagamento"][value="PIX"]');
    if (primeiraForma) primeiraForma.checked = true;

    listaLinhasEl.innerHTML = '';
    adicionarLinhaPagamento('PIX', '');

    document.getElementById('modal-pagamento').classList.remove('hidden');
    registrarAberturaJanela('modal-pagamento');
}

function fecharModalPagamento() {
    document.getElementById('modal-pagamento').classList.add('hidden');
    contextoPagamento = null;
    sincronizarPilhaJanelas();
}

function abrirModalConfirmacaoPendente(vendaId) {
    const venda = obterHistorico().find(v => v.id === vendaId);
    if (!venda) return;

    contextoPendenteImpressao = { vendaId: venda.id };

    document.getElementById('pendente-imprimir-numero').textContent = venda.numero;
    document.getElementById('pendente-imprimir-cliente').textContent = venda.cliente || 'Balcão';
    document.getElementById('pendente-imprimir-valor').textContent = formatarMoeda(venda.total);

    atualizarPreviewsQRCodesUI();
    document.getElementById('modal-pendente-imprimir').classList.remove('hidden');
    registrarAberturaJanela('modal-pendente-imprimir');
}

function fecharModalConfirmacaoPendente() {
    document.getElementById('modal-pendente-imprimir').classList.add('hidden');
    contextoPendenteImpressao = null;
    sincronizarPilhaJanelas();
}

function concluirEnvioPendenteHistorico(vendaId, deveImprimir) {
    const historico = obterHistorico();
    const indice = historico.findIndex(v => v.id === vendaId);
    if (indice === -1) {
        fecharModalConfirmacaoPendente();
        return;
    }

    const vendaPendente = {
        ...historico[indice],
        total: normalizarMoedaValor(historico[indice].total),
        statusPagamento: 'Pendente',
        formaPagamento: 'Pagamento pendente',
        pagamentos: []
    };
    delete vendaPendente.dataPagamento;

    historico[indice] = vendaPendente;
    salvarHistorico(historico);
    enviarPedidoParaChamadaCozinha(vendaPendente);

    fecharModalConfirmacaoPendente();

    if (!document.getElementById('modal-historico').classList.contains('hidden')) {
        renderizarHistorico();
    } else {
        renderizarRelatorioFinanceiroPeriodo();
    }

    if (deveImprimir) {
        imprimirComprovanteVenda(vendaPendente.id);
    }
}

function confirmarSelecaoPagamento() {
    if (!contextoPagamento) return;

    const { vendaId } = contextoPagamento;
    const selecionadoEl = document.querySelector('input[name="forma_pagamento"]:checked');
    const escolhaRadio = selecionadoEl ? selecionadoEl.value : 'PIX';

    const historico = obterHistorico();
    const indice = historico.findIndex(v => v.id === vendaId);
    if (indice === -1) {
        fecharModalPagamento();
        return;
    }

    const totalVendaCent = paraCentavos(historico[indice].total);
    const totalVenda = deCentavos(totalVendaCent);

    if (escolhaRadio === 'Pagamento pendente') {
        const vendaPendente = {
            ...historico[indice],
            total: totalVenda,
            statusPagamento: 'Pendente',
            formaPagamento: 'Pagamento pendente',
            pagamentos: []
        };
        delete vendaPendente.dataPagamento;
        historico[indice] = vendaPendente;
        salvarHistorico(historico);
        enviarPedidoParaChamadaCozinha(vendaPendente);

        fecharModalPagamento();
        abrirModalConfirmacaoPendente(vendaPendente.id);
        return;
    }

    const vendaAtualizada = { ...historico[indice], total: totalVenda };
    const linhas = lerLinhasPagamentoModal();
    const linhasComValor = linhas.filter(l => l.centavos > 0);

    let pagamentosCentavos = [];

    if (linhasComValor.length === 0) {
        const formaBase = linhas[0]?.forma || normalizarFormaPagamento(escolhaRadio);
        pagamentosCentavos = [{ forma: formaBase, centavos: totalVendaCent }];
    } else {
        const somaInformadaCent = linhasComValor.reduce((acc, l) => acc + l.centavos, 0);
        const faltaCent = totalVendaCent - somaInformadaCent;

        if (faltaCent > 0) {
            alert(`O valor informado (${formatarMoeda(deCentavos(somaInformadaCent))}) é menor que o total da venda (${formatarMoeda(totalVenda)}). Ainda falta pagar ${formatarMoeda(deCentavos(faltaCent))}.`);
            return;
        }

        const mapaFormas = new Map();
        linhasComValor.forEach(l => {
            mapaFormas.set(l.forma, (mapaFormas.get(l.forma) || 0) + l.centavos);
        });
        pagamentosCentavos = Array.from(mapaFormas.entries()).map(([forma, centavos]) => ({
            forma,
            centavos
        }));

        let excedenteCent = somaInformadaCent - totalVendaCent;
        if (excedenteCent > 0) {
            for (let i = pagamentosCentavos.length - 1; i >= 0; i--) {
                if (pagamentosCentavos[i].forma === 'Dinheiro' && excedenteCent > 0) {
                    const abatimento = Math.min(pagamentosCentavos[i].centavos, excedenteCent);
                    pagamentosCentavos[i].centavos -= abatimento;
                    excedenteCent -= abatimento;
                }
            }
            if (excedenteCent > 0) {
                const ultimoIdx = pagamentosCentavos.length - 1;
                pagamentosCentavos[ultimoIdx].centavos = Math.max(
                    0,
                    pagamentosCentavos[ultimoIdx].centavos - excedenteCent
                );
            }
        }
    }

    const pagamentosFinal = pagamentosCentavos
        .filter(p => p.centavos > 0)
        .map(p => ({
            forma: p.forma,
            valor: deCentavos(p.centavos)
        }));

    vendaAtualizada.statusPagamento = 'Pago';
    vendaAtualizada.pagamentos = pagamentosFinal;
    vendaAtualizada.formaPagamento = pagamentosFinal.length > 1
        ? pagamentosFinal.map(p => `${p.forma}: ${formatarMoeda(p.valor)}`).join(' + ')
        : pagamentosFinal[0].forma;
    vendaAtualizada.dataPagamento = new Date().toLocaleString('pt-BR');

    historico[indice] = vendaAtualizada;
    salvarHistorico(historico);
    enviarPedidoParaChamadaCozinha(vendaAtualizada);

    fecharModalPagamento();

    if (!document.getElementById('modal-historico').classList.contains('hidden')) {
        renderizarHistorico();
    }

    abrirModalComprovantePosPagamento(vendaAtualizada.id);
}

function abrirModalComprovantePosPagamento(vendaId) {
    const venda = obterHistorico().find(v => v.id === vendaId);
    if (!venda) return;

    document.getElementById('pos-pgto-numero').textContent = venda.numero;
    document.getElementById('pos-pgto-forma').textContent = formatarDescricaoPagamentos(venda);
    document.getElementById('pos-pgto-valor').textContent = formatarMoeda(venda.total);

    const btnImprimir = document.getElementById('btn-imprimir-comprovante-modal');
    btnImprimir.dataset.vendaId = venda.id;

    atualizarPreviewsQRCodesUI();
    document.getElementById('modal-comprovante-pos-pgto').classList.remove('hidden');
    registrarAberturaJanela('modal-comprovante-pos-pgto');
}

function fecharModalComprovantePosPagamento() {
    document.getElementById('modal-comprovante-pos-pgto').classList.add('hidden');
    sincronizarPilhaJanelas();
}

function preencherCupomComVenda(venda) {
    alternarModoImpressaoTermica('comanda');

    document.getElementById('print-numero').textContent = venda.numero;
    document.getElementById('print-data-hora').textContent = venda.dataHora;
    document.getElementById('print-cliente').textContent = `Cliente/Mesa: ${venda.cliente || 'Balcão'}`;

    const vendedorEl = document.getElementById('print-vendedor');
    if (vendedorEl) {
        if (venda.vendedorNome) {
            vendedorEl.textContent = `Vendedor: ${venda.vendedorNome}`;
            vendedorEl.classList.remove('hidden');
        } else {
            vendedorEl.textContent = '';
            vendedorEl.classList.add('hidden');
        }
    }

    const printItensContainer = document.getElementById('print-itens-lista');
    printItensContainer.innerHTML = (venda.itens || []).map(item => `
        <div class="cupom-item-linha">
            <span>${item.quantidade}x ${escapeHTML(item.nome)}</span>
            <span>${formatarMoeda(item.subtotal)}</span>
        </div>
    `).join('');

    document.getElementById('print-total').textContent = formatarMoeda(venda.total);
    document.getElementById('print-pagamento').textContent = formatarDescricaoPagamentos(venda);
    document.getElementById('print-status').textContent = venda.statusPagamento;

    const obsContainer = document.getElementById('print-obs-container');
    const obsPre = document.getElementById('print-observacoes');
    const obsTexto = venda.observacoes || '';

    if (obsTexto.trim().length > 0) {
        obsPre.textContent = obsTexto;
        obsContainer.classList.remove('hidden');
    } else {
        obsPre.textContent = '';
        obsContainer.classList.add('hidden');
    }

    aplicarQRCodesNoCupom(venda);
}

function imprimirComprovanteVenda(vendaId) {
    if (impressaoEmAndamento) return;
    impressaoEmAndamento = true;

    try {
        const venda = obterHistorico().find(v => v.id === vendaId);
        if (!venda) {
            impressaoEmAndamento = false;
            return;
        }

        preencherCupomComVenda(venda);

        setTimeout(() => {
            window.print();
            impressaoEmAndamento = false;
        }, 120);
    } catch (erro) {
        console.error('Erro ao imprimir comprovante:', erro);
        alert('Falha ao preparar a impressão do comprovante.');
        impressaoEmAndamento = false;
    }
}

// ============================================================================
// GERENCIAR HISTÓRICO (EXCLUSÃO COM SENHA 332133 E CONFIRMAÇÃO)
// ============================================================================
function obterChaveDiaReferenciaGerenciamento() {
    if (tipoPeriodoRelatorio === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(dataSelecionadaRelatorio)) {
        return dataSelecionadaRelatorio;
    }
    return obterChaveDia();
}

function abrirModalGerenciarHistorico() {
    popularModalGerenciarHistorico();
    document.getElementById('modal-gerenciar-historico').classList.remove('hidden');
    registrarAberturaJanela('modal-gerenciar-historico');
}

function fecharModalGerenciarHistorico() {
    document.getElementById('modal-gerenciar-historico').classList.add('hidden');
    sincronizarPilhaJanelas();
}

function popularModalGerenciarHistorico() {
    const chaveDia = obterChaveDiaReferenciaGerenciamento();
    const historico = obterHistorico();
    const comandasDoDia = historico.filter(v => v.dataChave === chaveDia);

    document.getElementById('gerenciar-data-referencia').textContent = formatarDataChaveBR(chaveDia);
    document.getElementById('gerenciar-qtd-dia').textContent = String(comandasDoDia.length);

    const selectComanda = document.getElementById('select-comanda-excluir');
    const btnExcluirComanda = document.getElementById('btn-excluir-comanda-especifica');
    const btnExcluirTudo = document.getElementById('btn-excluir-todo-historico-dia');

    if (comandasDoDia.length === 0) {
        selectComanda.innerHTML = '<option value="">Nenhuma comanda registrada neste dia</option>';
        selectComanda.disabled = true;
        btnExcluirComanda.disabled = true;
        btnExcluirTudo.disabled = true;
    } else {
        selectComanda.disabled = false;
        btnExcluirComanda.disabled = false;
        btnExcluirTudo.disabled = false;

        selectComanda.innerHTML = [...comandasDoDia].reverse().map(venda => {
            const label = `Comanda #${venda.numero} — ${venda.cliente || 'Balcão'} (${formatarMoeda(venda.total)} • ${venda.statusPagamento})`;
            return `<option value="${escapeHTML(venda.id)}">${escapeHTML(label)}</option>`;
        }).join('');
    }
}

function solicitarExclusaoComandaEspecifica() {
    const vendaId = document.getElementById('select-comanda-excluir').value;
    if (!vendaId) return;

    const venda = obterHistorico().find(v => v.id === vendaId);
    if (!venda) return;

    abrirModalSenhaExclusao({
        tipo: 'comanda',
        vendaId: venda.id,
        exigirConfirmacaoExtra: false,
        descricao: `Você está prestes a excluir individualmente a Comanda #${venda.numero} (${venda.cliente || 'Balcão'} — ${formatarMoeda(venda.total)}). Informe a senha de autorização para prosseguir.`
    });
}

function solicitarExclusaoTodoHistoricoDia() {
    const chaveDia = obterChaveDiaReferenciaGerenciamento();
    const dataBR = formatarDataChaveBR(chaveDia);
    const qtd = obterHistorico().filter(v => v.dataChave === chaveDia).length;
    if (qtd === 0) return;

    abrirModalSenhaExclusao({
        tipo: 'dia',
        dataChave: chaveDia,
        exigirConfirmacaoExtra: true,
        descricao: `Esta ação apagará permanentemente todo o histórico financeiro do dia ${dataBR} (${qtd} registro(s)). Digite a senha de autorização para continuar.`,
        textoConfirmacaoExtra: `Atenção: você confirmou apagar TODOS os ${qtd} registro(s) do dia ${dataBR} de uma só vez. Esta operação não pode ser desfeita.`
    });
}

function abrirModalSenhaExclusao(acaoConfig) {
    acaoExclusaoPendente = acaoConfig;

    const inputSenha = document.getElementById('input-senha-exclusao');
    const erroEl = document.getElementById('erro-senha-exclusao');
    const confirmacaoExtraEl = document.getElementById('senha-exclusao-confirmacao-extra');

    document.getElementById('senha-exclusao-descricao').textContent = acaoConfig.descricao;

    if (acaoConfig.exigirConfirmacaoExtra && acaoConfig.textoConfirmacaoExtra) {
        confirmacaoExtraEl.textContent = acaoConfig.textoConfirmacaoExtra;
        confirmacaoExtraEl.classList.remove('hidden');
    } else {
        confirmacaoExtraEl.textContent = '';
        confirmacaoExtraEl.classList.add('hidden');
    }

    inputSenha.value = '';
    erroEl.classList.add('hidden');

    document.getElementById('modal-senha-exclusao').classList.remove('hidden');
    registrarAberturaJanela('modal-senha-exclusao');
    setTimeout(() => inputSenha.focus(), 50);
}

function fecharModalSenhaExclusao() {
    document.getElementById('modal-senha-exclusao').classList.add('hidden');
    document.getElementById('input-senha-exclusao').value = '';
    document.getElementById('erro-senha-exclusao').classList.add('hidden');
    acaoExclusaoPendente = null;
    sincronizarPilhaJanelas();
}

function confirmarExclusaoComSenha() {
    if (!acaoExclusaoPendente) return;

    const senhaDigitada = document.getElementById('input-senha-exclusao').value.trim();
    const erroEl = document.getElementById('erro-senha-exclusao');

    if (senhaDigitada !== SENHA_EXCLUSAO_HISTORICO) {
        erroEl.classList.remove('hidden');
        document.getElementById('input-senha-exclusao').focus();
        return;
    }

    if (acaoExclusaoPendente.exigirConfirmacaoExtra) {
        const confirmou = confirm('Confirma novamente: deseja realmente excluir TODO o histórico financeiro deste dia? Essa ação é definitiva.');
        if (!confirmou) {
            return;
        }
    }

    const historicoAtual = obterHistorico();
    let novoHistorico = historicoAtual;

    if (acaoExclusaoPendente.tipo === 'comanda') {
        novoHistorico = historicoAtual.filter(v => v.id !== acaoExclusaoPendente.vendaId);
    } else if (acaoExclusaoPendente.tipo === 'dia') {
        novoHistorico = historicoAtual.filter(v => v.dataChave !== acaoExclusaoPendente.dataChave);
    }

    salvarHistorico(novoHistorico);
    fecharModalSenhaExclusao();
    popularModalGerenciarHistorico();

    if (!document.getElementById('modal-historico').classList.contains('hidden')) {
        renderizarHistorico();
    } else {
        renderizarRelatorioFinanceiroPeriodo();
    }
}

// ============================================================================
// RELATÓRIO FINANCEIRO POR DIA, MÊS E ANO + GRÁFICO + RESUMO
// ============================================================================
function filtrarVendasPagasPorPeriodo(vendasPagas) {
    if (tipoPeriodoRelatorio === 'mes') {
        const prefixoMes = mesSelecionadoRelatorio || obterChaveDia().slice(0, 7);
        return vendasPagas.filter(v => String(v.dataChave || '').startsWith(prefixoMes));
    }

    if (tipoPeriodoRelatorio === 'ano') {
        const prefixoAno = String(anoSelecionadoRelatorio || obterChaveDia().slice(0, 4));
        return vendasPagas.filter(v => String(v.dataChave || '').startsWith(prefixoAno));
    }

    const chaveDia = dataSelecionadaRelatorio || obterChaveDia();
    return vendasPagas.filter(v => v.dataChave === chaveDia);
}

function filtrarPorPeriodoGenerico(registros) {
    if (tipoPeriodoRelatorio === 'mes') {
        const prefixoMes = mesSelecionadoRelatorio || obterChaveDia().slice(0, 7);
        return registros.filter(r => String(r.dataChave || '').startsWith(prefixoMes));
    }

    if (tipoPeriodoRelatorio === 'ano') {
        const prefixoAno = String(anoSelecionadoRelatorio || obterChaveDia().slice(0, 4));
        return registros.filter(r => String(r.dataChave || '').startsWith(prefixoAno));
    }

    const chaveDia = dataSelecionadaRelatorio || obterChaveDia();
    return registros.filter(r => r.dataChave === chaveDia);
}

function obterDescricaoPeriodoAtual() {
    if (tipoPeriodoRelatorio === 'mes') {
        return `Mês: ${formatarMesChaveBR(mesSelecionadoRelatorio)}`;
    }
    if (tipoPeriodoRelatorio === 'ano') {
        return `Ano: ${anoSelecionadoRelatorio}`;
    }
    return `Dia: ${formatarDataChaveBR(dataSelecionadaRelatorio)}`;
}

// 1. Fechamento Financeiro = Total Gráfico Comparativo - Total Retirado (R$)
function calcularFechamentoFinanceiroPeriodo(totalGraficoRecebido, totalRetiradoValor) {
    const graficoCent = Math.max(0, paraCentavos(totalGraficoRecebido));
    const retiradoCent = Math.max(0, paraCentavos(totalRetiradoValor));
    return deCentavos(graficoCent - retiradoCent);
}

// 2. Total Consolidado = Fechamento Financeiro (Gráfico - Retirado) + Sobrou Pós-Compras (R$)
function calcularTotalConsolidadoPeriodo(fechamentoFinanceiroValor, sobrouPosComprasValor) {
    const fechamentoCent = paraCentavos(fechamentoFinanceiroValor);
    const sobraCent = Math.max(0, paraCentavos(sobrouPosComprasValor));
    return deCentavos(fechamentoCent + sobraCent);
}

function gerarDadosRelatorioPeriodo() {
    const historico = obterHistorico();
    const vendasPagasTodas = historico.filter(v => v.statusPagamento === 'Pago');
    const vendasPeriodo = filtrarVendasPagasPorPeriodo(vendasPagasTodas);

    const mapaModalidades = new Map();
    MODALIDADES_PAGAMENTO.forEach(mod => {
        mapaModalidades.set(mod, {
            modalidade: mod,
            quantidade: 0,
            totalCentavos: 0,
            total: 0,
            percentualValor: 0,
            percentualQtd: 0
        });
    });

    vendasPeriodo.forEach(venda => {
        const pagamentos = normalizarListaPagamentosVenda(venda);
        const modalidadesNaVenda = new Set();

        pagamentos.forEach(pgto => {
            const mod = normalizarFormaPagamento(pgto.forma);
            if (!mapaModalidades.has(mod)) {
                mapaModalidades.set(mod, {
                    modalidade: mod,
                    quantidade: 0,
                    totalCentavos: 0,
                    total: 0,
                    percentualValor: 0,
                    percentualQtd: 0
                });
            }
            const registro = mapaModalidades.get(mod);
            registro.totalCentavos += paraCentavos(pgto.valor);
            modalidadesNaVenda.add(mod);
        });

        modalidadesNaVenda.forEach(mod => {
            const registro = mapaModalidades.get(mod);
            if (registro) {
                registro.quantidade += 1;
            }
        });
    });

    const linhas = Array.from(mapaModalidades.values()).map(item => ({
        ...item,
        total: deCentavos(item.totalCentavos)
    }));

    const linhasEfetivas = linhas.filter(item => FORMAS_PAGAMENTO_EFETIVO.includes(item.modalidade));
    const totalGeralRecebidoCent = linhasEfetivas.reduce((acc, item) => acc + item.totalCentavos, 0);
    const totalGeralRecebido = deCentavos(totalGeralRecebidoCent);
    const totalComandasRegistradas = vendasPeriodo.length;

    const valeConsumoItem = linhas.find(item => item.modalidade === 'Vale-consumo da casa') || {
        modalidade: 'Vale-consumo da casa',
        quantidade: 0,
        totalCentavos: 0,
        total: 0
    };

    linhas.forEach(item => {
        item.percentualValor = totalGeralRecebidoCent > 0
            ? (item.totalCentavos / totalGeralRecebidoCent) * 100
            : 0;
        item.percentualQtd = totalComandasRegistradas > 0
            ? (item.quantidade / totalComandasRegistradas) * 100
            : 0;
    });

    let maiorMovimentacao = null;
    linhasEfetivas.forEach(item => {
        if (item.totalCentavos > 0 || item.quantidade > 0) {
            if (
                !maiorMovimentacao ||
                item.totalCentavos > maiorMovimentacao.totalCentavos ||
                (item.totalCentavos === maiorMovimentacao.totalCentavos && item.quantidade > maiorMovimentacao.quantidade)
            ) {
                maiorMovimentacao = item;
            }
        }
    });

    const porNomeEfetivo = {};
    linhasEfetivas.forEach(item => {
        porNomeEfetivo[item.modalidade] = item;
    });

    const retiradasPeriodo = filtrarPorPeriodoGenerico(obterRetiradasAtalho());
    const totalRetiradoPeriodo = deCentavos(
        retiradasPeriodo.reduce((acc, r) => acc + Math.max(0, paraCentavos(r.valor)), 0)
    );
    const sobrasPeriodo = filtrarPorPeriodoGenerico(obterSobrasPosCompras());
    const totalSobrouPosComprasPeriodo = deCentavos(
        sobrasPeriodo.reduce((acc, s) => acc + Math.max(0, paraCentavos(s.valor)), 0)
    );
    const fechamentoFinanceiroPeriodo = calcularFechamentoFinanceiroPeriodo(
        totalGeralRecebido,
        totalRetiradoPeriodo
    );
    const totalConsolidadoPeriodo = calcularTotalConsolidadoPeriodo(
        fechamentoFinanceiroPeriodo,
        totalSobrouPosComprasPeriodo
    );

    return {
        tipoPeriodo: tipoPeriodoRelatorio,
        descricaoPeriodo: obterDescricaoPeriodoAtual(),
        linhas,
        linhasEfetivas,
        porNomeEfetivo,
        totalGeralRecebido,
        totalComandasRegistradas,
        valeConsumo: valeConsumoItem,
        maiorMovimentacao,
        totalRetiradoPeriodo,
        totalSobrouPosComprasPeriodo,
        fechamentoFinanceiroPeriodo,
        totalConsolidadoPeriodo
    };
}

function renderizarRelatorioFinanceiroPeriodo() {
    const relatorio = gerarDadosRelatorioPeriodo();

    document.getElementById('relatorio-periodo-titulo').textContent = relatorio.descricaoPeriodo;

    const valorPix = relatorio.porNomeEfetivo['PIX']?.total || 0;
    const valorCredito = relatorio.porNomeEfetivo['Cartão de crédito']?.total || 0;
    const valorDebito = relatorio.porNomeEfetivo['Cartão de débito']?.total || 0;
    const valorDinheiro = relatorio.porNomeEfetivo['Dinheiro']?.total || 0;

    document.getElementById('resumo-p-pix').textContent = formatarMoeda(valorPix);
    document.getElementById('resumo-p-credito').textContent = formatarMoeda(valorCredito);
    document.getElementById('resumo-p-debito').textContent = formatarMoeda(valorDebito);
    document.getElementById('resumo-p-dinheiro').textContent = formatarMoeda(valorDinheiro);
    document.getElementById('resumo-p-total-geral').textContent = formatarMoeda(relatorio.fechamentoFinanceiroPeriodo);
    document.getElementById('resumo-p-qtd-comandas').textContent = String(relatorio.totalComandasRegistradas);

    const maiorMovEl = document.getElementById('resumo-p-maior-movimentacao');
    const liderEl = document.getElementById('relatorio-lider-texto');

    if (relatorio.maiorMovimentacao && (relatorio.maiorMovimentacao.totalCentavos > 0 || relatorio.maiorMovimentacao.quantidade > 0)) {
        const textoMaior = `${relatorio.maiorMovimentacao.modalidade} (${formatarMoeda(relatorio.maiorMovimentacao.total)} • ${relatorio.maiorMovimentacao.quantidade} venda(s))`;
        maiorMovEl.textContent = textoMaior;
        liderEl.textContent = textoMaior;
    } else {
        maiorMovEl.textContent = 'Nenhuma movimentação no período';
        liderEl.textContent = 'Nenhuma venda paga no período';
    }

    document.getElementById('vale-consumo-valor').textContent = formatarMoeda(relatorio.valeConsumo.total);
    document.getElementById('vale-consumo-detalhe').textContent = `${relatorio.valeConsumo.quantidade} comanda(s) no período (não somado ao total recebido)`;

    const tbody = document.getElementById('tabela-relatorio-pagamentos');
    tbody.innerHTML = relatorio.linhas.map(item => {
        const isLider = relatorio.maiorMovimentacao && relatorio.maiorMovimentacao.modalidade === item.modalidade;
        const isVale = item.modalidade === 'Vale-consumo da casa';
        return `
            <tr class="${isLider ? 'linha-lider' : ''}">
                <td>
                    ${escapeHTML(item.modalidade)}
                    ${isLider ? ' ★' : ''}
                    ${isVale ? ' (Separado)' : ''}
                </td>
                <td class="text-center">${item.quantidade}</td>
                <td class="text-right"><strong>${formatarMoeda(item.total)}</strong></td>
                <td class="text-right">${isVale ? '—' : `${item.percentualValor.toFixed(1)}%`}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('relatorio-total-qtd').textContent = String(relatorio.totalComandasRegistradas);
    document.getElementById('relatorio-total-valor').textContent = formatarMoeda(relatorio.fechamentoFinanceiroPeriodo);

    const isMensal = relatorio.tipoPeriodo === 'mes';
    const itensGrafico = relatorio.linhasEfetivas;

    document.getElementById('grafico-titulo-modalidades').textContent = isMensal
        ? 'Gráfico Mensal por Forma de Pagamento'
        : 'Gráfico Comparativo por Forma de Pagamento';

    document.getElementById('grafico-subtitulo-regra').textContent = isMensal
        ? 'Valores originais • PIX, Crédito, Débito e Dinheiro'
        : 'Valores originais sem duplicação (sem vale-consumo)';

    const maxValorGrafico = Math.max(...itensGrafico.map(l => l.total), 0);
    const graficoEl = document.getElementById('grafico-relatorio-pagamentos');

    graficoEl.innerHTML = itensGrafico.map(item => {
        const isLider = relatorio.maiorMovimentacao &&
            relatorio.maiorMovimentacao.modalidade === item.modalidade &&
            item.totalCentavos > 0;
        const larguraBarra = maxValorGrafico > 0 ? Math.round((item.total / maxValorGrafico) * 100) : 0;

        return `
            <div class="grafico-item ${isLider ? 'is-lider' : ''}">
                <div class="grafico-item-topo">
                    <span class="grafico-item-nome">
                        ${escapeHTML(item.modalidade)}${isLider ? ' (Maior movimentação)' : ''}
                    </span>
                    <span class="grafico-item-valores">
                        <strong>${formatarMoeda(item.total)}</strong> (${item.quantidade}x)
                    </span>
                </div>
                <div class="grafico-trilha">
                    <div class="grafico-preenchimento" style="width: ${larguraBarra}%"></div>
                </div>
            </div>
        `;
    }).join('');

    const destaqueGraficoEl = document.getElementById('grafico-destaque-mensal');
    const totalConsolidadoExato = calcularTotalConsolidadoPeriodo(
        relatorio.fechamentoFinanceiroPeriodo,
        relatorio.totalSobrouPosComprasPeriodo
    );
    const resumoFechamentoLinha = `Total Gráfico: <strong>${formatarMoeda(relatorio.totalGeralRecebido)}</strong> • Total Retirado: <strong>${formatarMoeda(relatorio.totalRetiradoPeriodo)}</strong> • Fechamento Financeiro: <strong>${formatarMoeda(relatorio.fechamentoFinanceiroPeriodo)}</strong> • Sobrou Pós-Compras: <strong>${formatarMoeda(relatorio.totalSobrouPosComprasPeriodo)}</strong> • Total Consolidado: <strong>${formatarMoeda(totalConsolidadoExato)}</strong>`;
    if (relatorio.maiorMovimentacao && relatorio.maiorMovimentacao.totalCentavos > 0) {
        destaqueGraficoEl.innerHTML = `Maior movimentação: <strong>${escapeHTML(relatorio.maiorMovimentacao.modalidade)}</strong> (${formatarMoeda(relatorio.maiorMovimentacao.total)}) • ${resumoFechamentoLinha}.`;
    } else {
        destaqueGraficoEl.innerHTML = resumoFechamentoLinha;
    }
}

function preencherCupomRelatorioPeriodo(relatorio) {
    alternarModoImpressaoTermica('relatorio');

    document.getElementById('print-rel-data').textContent = relatorio.descricaoPeriodo;
    document.getElementById('print-rel-emissao').textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const tabelaContainer = document.getElementById('print-rel-tabela');
    tabelaContainer.innerHTML = relatorio.linhas.map(item => `
        <div class="cupom-rel-linha">
            <div class="cupom-rel-linha-topo">
                <span>${escapeHTML(item.modalidade)}</span>
                <span>${formatarMoeda(item.total)}</span>
            </div>
            <div class="cupom-rel-linha-sub">
                <span>Comandas: ${item.quantidade}</span>
                <span>${item.modalidade === 'Vale-consumo da casa' ? 'Separado' : `Part.: ${item.percentualValor.toFixed(1)}%`}</span>
            </div>
        </div>
    `).join('');

    const larguraBobina = document.getElementById('select-largura-bobina').value;
    const maxCaracteresBarra = larguraBobina === '58mm' ? 14 : 22;
    const baseGrafico = relatorio.linhasEfetivas;
    const maxValor = Math.max(...baseGrafico.map(l => l.total), 0);

    const graficoContainer = document.getElementById('print-rel-grafico');
    graficoContainer.innerHTML = baseGrafico.map(item => {
        const blocosPreenchidos = maxValor > 0
            ? Math.round((item.total / maxValor) * maxCaracteresBarra)
            : 0;
        const blocosVazios = Math.max(0, maxCaracteresBarra - blocosPreenchidos);
        const barraTexto = '█'.repeat(blocosPreenchidos) + '░'.repeat(blocosVazios);

        return `
            <div class="cupom-rel-grafico-item">
                <div>${escapeHTML(item.modalidade)}: ${formatarMoeda(item.total)}</div>
                <div class="cupom-rel-barra">[${barraTexto}]</div>
            </div>
        `;
    }).join('');

    document.getElementById('print-rel-lider').textContent = relatorio.maiorMovimentacao && relatorio.maiorMovimentacao.totalCentavos > 0
        ? `${relatorio.maiorMovimentacao.modalidade} (${formatarMoeda(relatorio.maiorMovimentacao.total)})`
        : 'Nenhuma venda paga';

    document.getElementById('print-rel-qtd-total').textContent = String(relatorio.totalComandasRegistradas);
    document.getElementById('print-rel-vale-consumo').textContent = formatarMoeda(relatorio.valeConsumo.total);
    document.getElementById('print-rel-valor-total').textContent = formatarMoeda(relatorio.fechamentoFinanceiroPeriodo);
}

function imprimirRelatorioFinanceiroPeriodo() {
    if (impressaoEmAndamento) return;
    impressaoEmAndamento = true;

    try {
        renderizarRelatorioFinanceiroPeriodo();
        const relatorio = gerarDadosRelatorioPeriodo();
        preencherCupomRelatorioPeriodo(relatorio);

        setTimeout(() => {
            window.print();
            impressaoEmAndamento = false;
        }, 120);
    } catch (erro) {
        console.error('Erro ao imprimir relatório financeiro:', erro);
        alert('Falha ao preparar a impressão do relatório financeiro.');
        impressaoEmAndamento = false;
    }
}

// ============================================================================
// RENDERIZAÇÃO DO HISTÓRICO DE VENDAS
// ============================================================================
function abrirModalHistorico(rolarParaRelatorio = false) {
    renderizarHistorico();
    const modal = document.getElementById('modal-historico');
    modal.classList.remove('hidden');
    registrarAberturaJanela('modal-historico');

    if (rolarParaRelatorio) {
        setTimeout(() => {
            const secao = document.getElementById('secao-relatorio-diario');
            if (secao) secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }
}

function fecharModalHistorico() {
    document.getElementById('modal-historico').classList.add('hidden');
    sincronizarPilhaJanelas();
}

function renderizarHistorico() {
    const hojeChave = obterChaveDia();
    const historicoCompleto = obterHistorico();
    popularOpcoesAnoRelatorio(hojeChave.slice(0, 4));

    document.getElementById('historico-data-referencia').textContent = mostrarTodosDiasHistorico
        ? 'Exibindo: Todos os dias registrados no histórico'
        : `Referência do dia: ${new Date().toLocaleDateString('pt-BR')}`;

    const basePeriodo = mostrarTodosDiasHistorico
        ? historicoCompleto
        : historicoCompleto.filter(v => v.dataChave === hojeChave);

    const totalGraficoRefCent = basePeriodo
        .filter(v => v.statusPagamento === 'Pago')
        .reduce((acc, v) => {
            const pagamentosEfetivos = normalizarListaPagamentosVenda(v)
                .filter(p => FORMAS_PAGAMENTO_EFETIVO.includes(normalizarFormaPagamento(p.forma)));
            return acc + pagamentosEfetivos.reduce((s, p) => s + paraCentavos(p.valor), 0);
        }, 0);

    const retiradasRefCent = obterRetiradasAtalho()
        .filter(r => mostrarTodosDiasHistorico ? true : r.dataChave === hojeChave)
        .reduce((acc, r) => acc + Math.max(0, paraCentavos(r.valor)), 0);

    const totalPago = calcularFechamentoFinanceiroPeriodo(
        deCentavos(totalGraficoRefCent),
        deCentavos(retiradasRefCent)
    );

    const totalPendenteCent = basePeriodo
        .filter(v => v.statusPagamento === 'Pendente')
        .reduce((acc, v) => acc + paraCentavos(v.total), 0);
    const totalPendente = deCentavos(totalPendenteCent);

    document.getElementById('resumo-total-pago').textContent = formatarMoeda(totalPago);
    document.getElementById('resumo-total-pendente').textContent = formatarMoeda(totalPendente);
    document.getElementById('resumo-qtd-vendas').textContent = String(basePeriodo.length);

    const filtradas = filtroStatusHistorico === 'Todas'
        ? basePeriodo
        : basePeriodo.filter(v => v.statusPagamento === filtroStatusHistorico);

    const exibicao = [...filtradas].reverse();
    const container = document.getElementById('lista-historico-vendas');

    if (exibicao.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nenhuma venda encontrada para o filtro selecionado.</p>';
    } else {
        container.innerHTML = exibicao.map(venda => {
            const isPendente = venda.statusPagamento === 'Pendente';
            const badgeClass = isPendente ? 'badge-pendente' : 'badge-pago';
            const resumoItens = (venda.itens || [])
                .map(i => `${i.quantidade}x ${escapeHTML(i.nome)}`)
                .join(', ');
            const descricaoPgto = isPendente
                ? (venda.formaPagamento || 'Pagamento pendente')
                : formatarDescricaoPagamentos(venda);

            return `
                <div class="venda-card">
                    <div class="venda-card-topo">
                        <div class="venda-identificacao">
                            <strong>Comanda #${escapeHTML(venda.numero)}</strong>
                            <span class="badge-status ${badgeClass}">${escapeHTML(venda.statusPagamento)}</span>
                            <span>${escapeHTML(venda.cliente || 'Balcão')}</span>
                            ${venda.vendedorNome ? `<span class="venda-data">• Vendedor: <strong>${escapeHTML(venda.vendedorNome)}</strong></span>` : ''}
                        </div>
                        <span class="venda-data">${escapeHTML(venda.dataHora)}</span>
                    </div>

                    <div class="venda-itens-resumo">
                        <strong>Itens:</strong> ${resumoItens || 'Sem itens'}
                    </div>

                    <div class="venda-card-rodape">
                        <div>
                            <span class="venda-meta-pgto">
                                Pagamento: <strong>${escapeHTML(descricaoPgto)}</strong>
                            </span>
                            <span class="venda-total-valor">${formatarMoeda(venda.total)}</span>
                        </div>

                        <div class="venda-acoes">
                            <button type="button" class="btn-warning-sm" onclick="abrirModalPagamentoParaVenda('${venda.id}', 'reabrir')">
                                ABRIR PAGAMENTO
                            </button>
                            <button type="button" class="btn-outline-sm" onclick="abrirModalEditarComandaHistorico('${venda.id}', 'editar')">
                                EDITAR
                            </button>
                            <button type="button" class="btn-outline-sm" onclick="abrirModalEditarComandaHistorico('${venda.id}', 'corrigir')">
                                CORRIGIR
                            </button>
                            ${!isPendente ? `
                                <button type="button" class="btn-outline-sm" onclick="imprimirComprovanteVenda('${venda.id}')">
                                    Imprimir comprovante
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderizarRelatorioFinanceiroPeriodo();
}

function alternarTipoPeriodoRelatorio(novoTipo) {
    tipoPeriodoRelatorio = novoTipo;

    document.querySelectorAll('.periodo-tabs [data-tipo-periodo]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tipoPeriodo === novoTipo);
    });

    document.getElementById('campo-filtro-dia').classList.toggle('hidden', novoTipo !== 'dia');
    document.getElementById('campo-filtro-mes').classList.toggle('hidden', novoTipo !== 'mes');
    document.getElementById('campo-filtro-ano').classList.toggle('hidden', novoTipo !== 'ano');

    renderizarRelatorioFinanceiroPeriodo();
}

// ============================================================================
// EDIÇÃO E CORREÇÃO DE COMANDAS NO HISTÓRICO (ATUALIZAÇÃO AUTOMÁTICA)
// ============================================================================
function abrirModalEditarComandaHistorico(vendaId, modo = 'editar') {
    const historico = obterHistorico();
    const venda = historico.find(v => v.id === vendaId);
    if (!venda) return;

    vendaEmEdicaoId = venda.id;
    modoEdicaoComanda = modo === 'corrigir' ? 'corrigir' : 'editar';
    itensEdicaoComanda = (venda.itens || []).map(item => {
        const precoUnit = normalizarMoedaValor(item.precoUnitario);
        const qtd = Math.max(1, Math.round(Number(item.quantidade || 1)));
        const subCent = calcularSubtotalCentavos(precoUnit, qtd);
        return {
            id: item.id || ('item_' + Math.random().toString(36).slice(2, 7)),
            nome: item.nome,
            precoUnitario: precoUnit,
            quantidade: qtd,
            subtotal: deCentavos(subCent)
        };
    });

    document.getElementById('editar-comanda-kicker').textContent = modoEdicaoComanda === 'corrigir'
        ? 'CORREÇÃO DE REGISTRO • SEM EXCLUIR COMANDA'
        : 'EDIÇÃO DE COMANDA • PRODUTOS, QUANTIDADES E VALORES';
    document.getElementById('editar-comanda-titulo').textContent = `${modoEdicaoComanda === 'corrigir' ? 'Corrigir' : 'Editar'} Comanda #${venda.numero}`;
    document.getElementById('editar-comanda-cliente').value = venda.cliente || 'Balcão';
    document.getElementById('editar-comanda-status').value = venda.statusPagamento || 'Pendente';
    document.getElementById('editar-comanda-obs').value = venda.observacoes || '';

    const selectNovoProd = document.getElementById('select-novo-item-edicao');
    selectNovoProd.innerHTML = produtos.map(p =>
        `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nome)} (${formatarMoeda(p.preco)})</option>`
    ).join('');

    if (produtos.length > 0) {
        document.getElementById('input-novo-preco-edicao').value = Number(produtos[0].preco || 0).toFixed(2);
    }
    document.getElementById('input-nova-qtd-edicao').value = '1';

    renderizarItensEdicaoComanda();
    document.getElementById('modal-editar-comanda').classList.remove('hidden');
    registrarAberturaJanela('modal-editar-comanda');
}

function fecharModalEditarComanda() {
    document.getElementById('modal-editar-comanda').classList.add('hidden');
    vendaEmEdicaoId = null;
    modoEdicaoComanda = null;
    itensEdicaoComanda = [];
    sincronizarPilhaJanelas();
}

function renderizarItensEdicaoComanda() {
    const tbody = document.getElementById('tabela-itens-edicao-comanda');
    if (!itensEdicaoComanda.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Nenhum item na comanda.</td></tr>';
    } else {
        tbody.innerHTML = itensEdicaoComanda.map((item, idx) => `
            <tr>
                <td>${escapeHTML(item.nome)}</td>
                <td>
                    <input type="number" class="input-edicao-inline" step="0.01" min="0" value="${Number(item.precoUnitario || 0).toFixed(2)}"
                           onchange="atualizarItemEdicaoComanda(${idx}, 'preco', this.value)" aria-label="Preço unitário">
                </td>
                <td>
                    <input type="number" class="input-edicao-inline" step="1" min="1" value="${Number(item.quantidade || 1)}"
                           onchange="atualizarItemEdicaoComanda(${idx}, 'qtd', this.value)" aria-label="Quantidade">
                </td>
                <td><strong>${formatarMoeda(item.subtotal)}</strong></td>
                <td>
                    <button type="button" class="btn-danger-sm" onclick="removerItemEdicaoComanda(${idx})">×</button>
                </td>
            </tr>
        `).join('');
    }

    const subtotalCent = itensEdicaoComanda.reduce((acc, i) => acc + paraCentavos(i.subtotal), 0);
    const subtotal = deCentavos(subtotalCent);
    const statusAtual = document.getElementById('editar-comanda-status').value;
    const faltaPagar = statusAtual === 'Pago' ? 0 : subtotal;

    document.getElementById('edicao-subtotal-valor').textContent = formatarMoeda(subtotal);
    document.getElementById('edicao-total-valor').textContent = formatarMoeda(subtotal);
    document.getElementById('edicao-falta-pagar-valor').textContent = formatarMoeda(faltaPagar);
}

function atualizarItemEdicaoComanda(index, campo, valorRaw) {
    const item = itensEdicaoComanda[index];
    if (!item) return;

    if (campo === 'preco') {
        const val = parseNumeroDecimalEntrada(valorRaw);
        if (!Number.isNaN(val) && val >= 0) {
            item.precoUnitario = normalizarMoedaValor(val);
        }
    } else if (campo === 'qtd') {
        const qtd = parseInt(valorRaw, 10);
        if (!Number.isNaN(qtd) && qtd >= 1) {
            item.quantidade = qtd;
        }
    }

    item.subtotal = deCentavos(calcularSubtotalCentavos(item.precoUnitario, item.quantidade));
    renderizarItensEdicaoComanda();
}

function removerItemEdicaoComanda(index) {
    itensEdicaoComanda.splice(index, 1);
    renderizarItensEdicaoComanda();
}

function adicionarItemNaEdicaoComanda() {
    const prodId = document.getElementById('select-novo-item-edicao').value;
    const prod = produtos.find(p => p.id === prodId);
    const precoRaw = parseNumeroDecimalEntrada(document.getElementById('input-novo-preco-edicao').value);
    const qtdRaw = parseInt(document.getElementById('input-nova-qtd-edicao').value, 10);

    const nome = prod ? prod.nome : 'Item avulso';
    const precoUnitario = !Number.isNaN(precoRaw) && precoRaw >= 0
        ? normalizarMoedaValor(precoRaw)
        : normalizarMoedaValor(prod?.preco || 0);
    const quantidade = !Number.isNaN(qtdRaw) && qtdRaw >= 1 ? qtdRaw : 1;
    const subtotal = deCentavos(calcularSubtotalCentavos(precoUnitario, quantidade));

    itensEdicaoComanda.push({
        id: prod ? prod.id : ('item_' + Date.now()),
        nome,
        precoUnitario,
        quantidade,
        subtotal
    });

    renderizarItensEdicaoComanda();
}

function salvarAlteracoesComandaHistorico() {
    if (!vendaEmEdicaoId) return;
    if (!itensEdicaoComanda.length) {
        alert('A comanda precisa ter pelo menos um item.');
        return;
    }

    const historico = obterHistorico();
    const idx = historico.findIndex(v => v.id === vendaEmEdicaoId);
    if (idx === -1) return;

    const vendaOriginal = historico[idx];
    const novoTotalCent = itensEdicaoComanda.reduce((acc, i) => acc + paraCentavos(i.subtotal), 0);
    const novoTotal = deCentavos(novoTotalCent);
    const novoCliente = document.getElementById('editar-comanda-cliente').value.trim() || 'Balcão';
    const novoStatus = document.getElementById('editar-comanda-status').value === 'Pago' ? 'Pago' : 'Pendente';
    const novasObs = document.getElementById('editar-comanda-obs').value;

    let pagamentosAtualizados = [];
    let formaPagamentoTexto = 'Pagamento pendente';

    if (novoStatus === 'Pago') {
        const existentes = normalizarListaPagamentosVenda({ ...vendaOriginal, statusPagamento: 'Pago' });
        if (existentes.length === 1) {
            pagamentosAtualizados = [{ forma: existentes[0].forma, valor: novoTotal }];
            formaPagamentoTexto = existentes[0].forma;
        } else if (existentes.length > 1) {
            const somaAntCent = existentes.reduce((s, p) => s + paraCentavos(p.valor), 0);
            if (somaAntCent > 0) {
                let acumuladoCent = 0;
                pagamentosAtualizados = existentes.map((p, i) => {
                    if (i === existentes.length - 1) {
                        return { forma: p.forma, valor: deCentavos(Math.max(0, novoTotalCent - acumuladoCent)) };
                    }
                    const parcCent = Math.round(novoTotalCent * (paraCentavos(p.valor) / somaAntCent));
                    acumuladoCent += parcCent;
                    return { forma: p.forma, valor: deCentavos(parcCent) };
                });
            } else {
                pagamentosAtualizados = [{ forma: 'Dinheiro', valor: novoTotal }];
            }
            formaPagamentoTexto = pagamentosAtualizados.map(p => `${p.forma}: ${formatarMoeda(p.valor)}`).join(' + ');
        } else {
            const formaPadrao = normalizarFormaPagamento(vendaOriginal.formaPagamento);
            pagamentosAtualizados = [{ forma: formaPadrao, valor: novoTotal }];
            formaPagamentoTexto = formaPadrao;
        }
    }

    historico[idx] = {
        ...vendaOriginal,
        cliente: novoCliente,
        itens: itensEdicaoComanda.map(i => ({ ...i })),
        total: novoTotal,
        statusPagamento: novoStatus,
        pagamentos: pagamentosAtualizados,
        formaPagamento: formaPagamentoTexto,
        observacoes: novasObs,
        atualizadoEm: new Date().toLocaleString('pt-BR')
    };

    salvarHistorico(historico);
    fecharModalEditarComanda();
    renderizarHistorico();
}

// ============================================================================
// RETIRADAS (ALT + 1), SOBROU PÓS-COMPRAS (ALT + 2) E COMPRAS (ALT + 0)
// ============================================================================
function obterRetiradasAtalho() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.RETIRADAS_ATALHO) || '[]');
        if (!Array.isArray(raw)) return [];
        const vistos = new Set();
        return raw.filter(r => {
            if (!r || !r.id || vistos.has(r.id)) return false;
            vistos.add(r.id);
            return true;
        });
    } catch (e) {
        return [];
    }
}

function salvarRetiradasAtalho(lista) {
    const vistos = new Set();
    const unicos = (Array.isArray(lista) ? lista : []).filter(r => {
        if (!r || !r.id || vistos.has(r.id)) return false;
        vistos.add(r.id);
        return true;
    });
    localStorage.setItem(STORAGE_KEYS.RETIRADAS_ATALHO, JSON.stringify(unicos));
}

function obterSobrasPosCompras() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOBRAS_POS_COMPRAS) || '[]');
        if (!Array.isArray(raw)) return [];
        const vistos = new Set();
        return raw.filter(s => {
            if (!s || !s.id || vistos.has(s.id)) return false;
            vistos.add(s.id);
            return true;
        });
    } catch (e) {
        return [];
    }
}

function salvarSobrasPosCompras(lista) {
    const vistos = new Set();
    const unicos = (Array.isArray(lista) ? lista : []).filter(s => {
        if (!s || !s.id || vistos.has(s.id)) return false;
        vistos.add(s.id);
        return true;
    });
    localStorage.setItem(STORAGE_KEYS.SOBRAS_POS_COMPRAS, JSON.stringify(unicos));
}

function obterDataReferenciaFinanceiraDia() {
    const modalComprasVisivel = !document.getElementById('modal-controle-compras')?.classList.contains('hidden');
    const inputComprasData = document.getElementById('compras-data-chave')?.value;
    if (modalComprasVisivel && inputComprasData && /^\d{4}-\d{2}-\d{2}$/.test(inputComprasData)) {
        return inputComprasData;
    }
    if (tipoPeriodoRelatorio === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(dataSelecionadaRelatorio)) {
        return dataSelecionadaRelatorio;
    }
    return obterChaveDia();
}

function calcularTotalGraficoComparativoDia(dataChave) {
    const arrec = obterArrecadacaoDiaPorModalidade(dataChave);
    const cent = FORMAS_PAGAMENTO_EFETIVO.reduce((acc, mod) => acc + paraCentavos(arrec[mod] || 0), 0);
    return deCentavos(cent);
}

function calcularTotalRetiradasDia(dataChave) {
    const chave = dataChave || obterDataReferenciaFinanceiraDia();
    const cent = obterRetiradasAtalho()
        .filter(r => r.dataChave === chave)
        .reduce((acc, r) => acc + Math.max(0, paraCentavos(r.valor)), 0);
    return deCentavos(cent);
}

function calcularTotalSobrasPosComprasDia(dataChave) {
    const chave = dataChave || obterDataReferenciaFinanceiraDia();
    const cent = obterSobrasPosCompras()
        .filter(s => s.dataChave === chave)
        .reduce((acc, s) => acc + Math.max(0, paraCentavos(s.valor)), 0);
    return deCentavos(cent);
}

function sincronizarCamposComprasComRetiradasESobras(dataChave) {
    const chave = dataChave || obterDataReferenciaFinanceiraDia();
    const retiradasDia = obterRetiradasAtalho().filter(r => r.dataChave === chave);
    const sobrasDia = obterSobrasPosCompras().filter(s => s.dataChave === chave);

    const retPorForma = {};
    retiradasDia.forEach(r => {
        const forma = normalizarFormaPagamento(r.formaPagamento);
        retPorForma[forma] = deCentavos(paraCentavos(retPorForma[forma] || 0) + Math.max(0, paraCentavos(r.valor)));
    });

    const sobPorForma = {};
    sobrasDia.forEach(s => {
        const forma = normalizarFormaPagamento(s.formaPagamento);
        sobPorForma[forma] = deCentavos(paraCentavos(sobPorForma[forma] || 0) + Math.max(0, paraCentavos(s.valor)));
    });

    MODALIDADES_PAGAMENTO.forEach((mod, i) => {
        const inpRet = document.getElementById(`compras-retirada-${i}`);
        const inpSob = document.getElementById(`compras-sobra-${i}`);
        if (inpRet) inpRet.value = Number(retPorForma[mod] || 0).toFixed(2);
        if (inpSob) inpSob.value = Number(sobPorForma[mod] || 0).toFixed(2);
    });
}

function atualizarVisoesFinanceirasIntegrado() {
    const dataRef = obterDataReferenciaFinanceiraDia();
    sincronizarCamposComprasComRetiradasESobras(dataRef);
    atualizarCalculosControleCompras();
    renderizarListaRetiradasModal();
    renderizarListaSobrasModal();
    if (!document.getElementById('modal-historico')?.classList.contains('hidden')) {
        renderizarHistorico();
    } else {
        renderizarRelatorioFinanceiroPeriodo();
    }
}

// --- COMANDO ALT + 1: LIBERAR / ABRIR RETIRADA (R$) ---
function abrirModalRetiradaAtalho(retiradaIdParaEditar = null) {
    retiradaBloqueadaPorPadrao = false;
    const dataRef = obterDataReferenciaFinanceiraDia();
    document.getElementById('retirada-data-exibicao').textContent = formatarDataChaveBR(dataRef);

    const inputValor = document.getElementById('input-retirada-valor');
    const selectForma = document.getElementById('select-retirada-forma');
    const btnCancelar = document.getElementById('btn-cancelar-edicao-retirada');
    const btnSalvar = document.getElementById('btn-salvar-retirada-atalho');

    if (retiradaIdParaEditar) {
        const existente = obterRetiradasAtalho().find(r => r.id === retiradaIdParaEditar);
        if (existente) {
            retiradaEditandoId = existente.id;
            if (inputValor) inputValor.value = Number(existente.valor || 0).toFixed(2).replace('.', ',');
            if (selectForma) selectForma.value = normalizarFormaPagamento(existente.formaPagamento);
            if (btnCancelar) btnCancelar.classList.remove('hidden');
            if (btnSalvar) btnSalvar.textContent = 'Salvar Edição';
        }
    } else {
        cancelarEdicaoRetiradaAtalho();
    }

    renderizarListaRetiradasModal();
    document.getElementById('modal-retirada-atalho')?.classList.remove('hidden');
    registrarAberturaJanela('modal-retirada-atalho');
    setTimeout(() => inputValor?.focus(), 50);
}

function fecharModalRetiradaAtalho() {
    document.getElementById('modal-retirada-atalho')?.classList.add('hidden');
    cancelarEdicaoRetiradaAtalho();
    retiradaBloqueadaPorPadrao = true;
    sincronizarPilhaJanelas();
}

function cancelarEdicaoRetiradaAtalho() {
    retiradaEditandoId = null;
    const inputValor = document.getElementById('input-retirada-valor');
    const btnCancelar = document.getElementById('btn-cancelar-edicao-retirada');
    const btnSalvar = document.getElementById('btn-salvar-retirada-atalho');
    if (inputValor) inputValor.value = '';
    if (btnCancelar) btnCancelar.classList.add('hidden');
    if (btnSalvar) btnSalvar.textContent = 'Salvar Retirada';
}

function salvarRetiradaAtalho(e) {
    if (e) e.preventDefault();
    if (retiradaBloqueadaPorPadrao) return;

    const dataRef = obterDataReferenciaFinanceiraDia();
    const valorNum = parseNumeroDecimalEntrada(document.getElementById('input-retirada-valor')?.value);
    const formaPagamento = normalizarFormaPagamento(document.getElementById('select-retirada-forma')?.value || 'Dinheiro');

    if (Number.isNaN(valorNum) || valorNum <= 0) {
        alert('Informe um valor de retirada maior que zero (R$).');
        return;
    }

    const valorNormalizado = normalizarMoedaValor(valorNum);
    const lista = obterRetiradasAtalho();

    if (retiradaEditandoId) {
        const idx = lista.findIndex(r => r.id === retiradaEditandoId);
        if (idx !== -1) {
            lista[idx] = {
                ...lista[idx],
                valor: valorNormalizado,
                formaPagamento,
                atualizadoEm: new Date().toLocaleString('pt-BR')
            };
        }
    } else {
        lista.push({
            id: 'ret_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            dataChave: dataRef,
            dataHora: new Date().toLocaleString('pt-BR'),
            valor: valorNormalizado,
            formaPagamento
        });
    }

    salvarRetiradasAtalho(lista);
    cancelarEdicaoRetiradaAtalho();
    atualizarVisoesFinanceirasIntegrado();
}

function renderizarListaRetiradasModal() {
    const dataRef = obterDataReferenciaFinanceiraDia();
    const retiradasDia = obterRetiradasAtalho().filter(r => r.dataChave === dataRef);
    const totalRetirado = calcularTotalRetiradasDia(dataRef);

    const totalModalEl = document.getElementById('retirada-modal-total-acumulado');
    if (totalModalEl) totalModalEl.textContent = formatarMoeda(totalRetirado);

    const htmlCards = retiradasDia.length === 0
        ? `<p class="empty-msg">Nenhuma retirada cadastrada para ${formatarDataChaveBR(dataRef)}.</p>`
        : [...retiradasDia].reverse().map(reg => `
            <div class="compra-registro-card">
                <div class="compra-registro-topo">
                    <div>
                        <strong>${formatarMoeda(reg.valor)}</strong> • <span>${escapeHTML(reg.formaPagamento)}</span>
                        <span class="venda-data"> • ${escapeHTML(reg.dataHora || '')}</span>
                    </div>
                    <div class="venda-acoes">
                        <button type="button" class="btn-outline-sm" onclick="abrirModalRetiradaAtalho('${escapeHTML(reg.id)}')">Editar</button>
                    </div>
                </div>
            </div>
        `).join('');

    const listaModal = document.getElementById('lista-retiradas-cadastradas');
    if (listaModal) listaModal.innerHTML = htmlCards;

    const listaCompras = document.getElementById('compras-lista-retiradas-dia');
    if (listaCompras) listaCompras.innerHTML = htmlCards;
}

// --- COMANDO ALT + 2: SOBROU PÓS-COMPRAS (R$) ---
function abrirModalSobraPosCompras(sobraIdParaEditar = null) {
    const dataRef = obterDataReferenciaFinanceiraDia();
    document.getElementById('sobra-data-exibicao').textContent = formatarDataChaveBR(dataRef);

    const inputValor = document.getElementById('input-sobra-valor');
    const selectForma = document.getElementById('select-sobra-forma');

    if (sobraIdParaEditar) {
        const reg = obterSobrasPosCompras().find(s => s.id === sobraIdParaEditar);
        if (reg) {
            if (selectForma) selectForma.value = normalizarFormaPagamento(reg.formaPagamento);
            if (inputValor) inputValor.value = Number(reg.valor || 0).toFixed(2).replace('.', ',');
        }
    } else if (inputValor) {
        inputValor.value = '';
    }

    renderizarListaSobrasModal();
    document.getElementById('modal-sobra-pos-compras')?.classList.remove('hidden');
    registrarAberturaJanela('modal-sobra-pos-compras');
    setTimeout(() => inputValor?.focus(), 50);
}

function fecharModalSobraPosCompras() {
    document.getElementById('modal-sobra-pos-compras')?.classList.add('hidden');
    sincronizarPilhaJanelas();
}

function salvarSobraPosCompras() {
    const dataRef = obterDataReferenciaFinanceiraDia();
    const formaPagamento = normalizarFormaPagamento(document.getElementById('select-sobra-forma')?.value || 'Dinheiro');
    const valorNum = parseNumeroDecimalEntrada(document.getElementById('input-sobra-valor')?.value);

    if (Number.isNaN(valorNum) || valorNum < 0) {
        alert('Informe um valor válido maior ou igual a zero para Sobrou Pós-Compras (R$).');
        return;
    }

    const valorNormalizado = normalizarMoedaValor(valorNum);
    const lista = obterSobrasPosCompras();
    const existenteIdx = lista.findIndex(s => s.dataChave === dataRef && normalizarFormaPagamento(s.formaPagamento) === formaPagamento);

    if (existenteIdx !== -1) {
        lista[existenteIdx] = {
            ...lista[existenteIdx],
            valor: valorNormalizado,
            atualizadoEm: new Date().toLocaleString('pt-BR')
        };
    } else {
        lista.push({
            id: 'sobra_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            dataChave: dataRef,
            dataHora: new Date().toLocaleString('pt-BR'),
            formaPagamento,
            valor: valorNormalizado
        });
    }

    salvarSobrasPosCompras(lista);
    if (document.getElementById('input-sobra-valor')) {
        document.getElementById('input-sobra-valor').value = '';
    }
    atualizarVisoesFinanceirasIntegrado();
}

function renderizarListaSobrasModal() {
    const dataRef = obterDataReferenciaFinanceiraDia();
    const sobrasDia = obterSobrasPosCompras().filter(s => s.dataChave === dataRef);
    const totalSobrou = calcularTotalSobrasPosComprasDia(dataRef);
    const totalRetirado = calcularTotalRetiradasDia(dataRef);
    const totalGrafico = calcularTotalGraficoComparativoDia(dataRef);
    const fechamento = calcularFechamentoFinanceiroPeriodo(totalGrafico, totalRetirado);
    const consolidado = calcularTotalConsolidadoPeriodo(totalGrafico, totalSobrou);

    const elTotal = document.getElementById('sobra-modal-total-exibicao');
    const elGraf = document.getElementById('sobra-modal-grafico-exibicao');
    const elFech = document.getElementById('sobra-modal-fechamento-exibicao');
    const elCons = document.getElementById('sobra-modal-consolidado-exibicao');
    if (elTotal) elTotal.textContent = formatarMoeda(totalSobrou);
    if (elGraf) elGraf.textContent = formatarMoeda(totalGrafico);
    if (elFech) elFech.textContent = formatarMoeda(fechamento);
    if (elCons) elCons.textContent = formatarMoeda(consolidado);

    const listaEl = document.getElementById('lista-sobras-cadastradas');
    if (!listaEl) return;

    if (sobrasDia.length === 0) {
        listaEl.innerHTML = `<p class="empty-msg">Nenhum valor registrado em Sobrou Pós-Compras para ${formatarDataChaveBR(dataRef)}.</p>`;
        return;
    }

    listaEl.innerHTML = sobrasDia.map(reg => `
        <div class="compra-registro-card">
            <div class="compra-registro-topo">
                <div>
                    <strong>${escapeHTML(reg.formaPagamento)}</strong> • <strong>${formatarMoeda(reg.valor)}</strong>
                    <span class="venda-data"> • ${escapeHTML(reg.dataHora || '')}</span>
                </div>
                <div class="venda-acoes">
                    <button type="button" class="btn-outline-sm" onclick="abrirModalSobraPosCompras('${escapeHTML(reg.id)}')">Editar</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// CONTROLE DE COMPRAS (ALT + 0) INTEGRADO AO HISTÓRICO FINANCEIRO DO DIA
// ============================================================================
function obterRegistrosCompras() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPRAS) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (e) {
        return [];
    }
}

function salvarRegistrosCompras(lista) {
    localStorage.setItem(STORAGE_KEYS.COMPRAS, JSON.stringify(lista));
}

function obterArrecadacaoDiaPorModalidade(dataChave) {
    const chave = dataChave || obterChaveDia();
    const totaisCent = {
        'PIX': 0,
        'Dinheiro': 0,
        'Cartão de crédito': 0,
        'Cartão de débito': 0,
        'Vale-consumo da casa': 0
    };

    const vendasPagasDia = obterHistorico().filter(v => v.statusPagamento === 'Pago' && v.dataChave === chave);
    vendasPagasDia.forEach(venda => {
        normalizarListaPagamentosVenda(venda).forEach(pgto => {
            const mod = normalizarFormaPagamento(pgto.forma);
            if (Object.prototype.hasOwnProperty.call(totaisCent, mod)) {
                totaisCent[mod] += paraCentavos(pgto.valor);
            }
        });
    });

    return {
        'PIX': deCentavos(totaisCent['PIX']),
        'Dinheiro': deCentavos(totaisCent['Dinheiro']),
        'Cartão de crédito': deCentavos(totaisCent['Cartão de crédito']),
        'Cartão de débito': deCentavos(totaisCent['Cartão de débito']),
        'Vale-consumo da casa': deCentavos(totaisCent['Vale-consumo da casa'])
    };
}

function abrirModalControleCompras(compraId = null) {
    const hojeChave = (tipoPeriodoRelatorio === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(dataSelecionadaRelatorio))
        ? dataSelecionadaRelatorio
        : obterChaveDia();

    const registros = obterRegistrosCompras();
    const existente = compraId
        ? registros.find(r => r.id === compraId)
        : registros.find(r => r.dataChave === hojeChave);

    const dataRef = existente ? existente.dataChave : hojeChave;
    compraEditandoId = existente ? existente.id : null;

    document.getElementById('compras-data-chave').value = dataRef;
    document.getElementById('compras-data-exibicao').textContent = formatarDataChaveBR(dataRef);
    document.getElementById('compras-descricao').value = existente ? (existente.descricao || '') : '';
    document.getElementById('compras-total-gasto').value = existente ? Number(existente.totalGasto || 0).toFixed(2) : '0.00';

    sincronizarCamposComprasComRetiradasESobras(dataRef);
    atualizarCalculosControleCompras();
    renderizarListaRetiradasModal();
    renderizarHistoricoComprasDia(dataRef);
    document.getElementById('modal-controle-compras').classList.remove('hidden');
    registrarAberturaJanela('modal-controle-compras');
}

function fecharModalControleCompras() {
    document.getElementById('modal-controle-compras').classList.add('hidden');
    compraEditandoId = null;
    sincronizarPilhaJanelas();
}

function corrigirFormularioCompras() {
    const dataRef = obterDataReferenciaFinanceiraDia();
    document.getElementById('compras-descricao').value = '';
    document.getElementById('compras-total-gasto').value = '0.00';
    compraEditandoId = null;

    const restantesRet = obterRetiradasAtalho().filter(r => r.dataChave !== dataRef);
    salvarRetiradasAtalho(restantesRet);

    const restantesSob = obterSobrasPosCompras().filter(s => s.dataChave !== dataRef);
    salvarSobrasPosCompras(restantesSob);

    atualizarVisoesFinanceirasIntegrado();
}

function atualizarCalculosControleCompras() {
    const dataRef = document.getElementById('compras-data-chave')?.value || obterChaveDia();
    document.getElementById('compras-data-exibicao').textContent = formatarDataChaveBR(dataRef);

    const arrecadado = obterArrecadacaoDiaPorModalidade(dataRef);
    let totalSobrasCent = 0;
    let totalRetiradoCamposCent = 0;
    const sobrasAtivasHtml = [];

    MODALIDADES_PAGAMENTO.forEach((mod, i) => {
        const valArrec = Number(arrecadado[mod] || 0);
        const inpRet = document.getElementById(`compras-retirada-${i}`);
        const inpSob = document.getElementById(`compras-sobra-${i}`);
        const valRetCent = Math.max(0, paraCentavos(inpRet?.value));
        const valSobCent = Math.max(0, paraCentavos(inpSob?.value));

        const elArrec = document.getElementById(`compras-arrecadado-${i}`);
        if (elArrec) {
            elArrec.textContent = formatarMoeda(valArrec);
            elArrec.title = `Valor original do gráfico (${mod}): ${formatarMoeda(valArrec)}`;
        }

        totalRetiradoCamposCent += valRetCent;
        totalSobrasCent += valSobCent;

        if (valSobCent > 0) {
            sobrasAtivasHtml.push(`
                <div class="sobra-item-ativo">
                    <span>${escapeHTML(mod)}</span>
                    <strong>${formatarMoeda(deCentavos(valSobCent))}</strong>
                </div>
            `);
        }
    });

    const elSobrasLista = document.getElementById('compras-sobras-diferentes-zero');
    if (elSobrasLista) {
        elSobrasLista.innerHTML = sobrasAtivasHtml.length > 0
            ? sobrasAtivasHtml.join('')
            : '<p class="empty-msg">Nenhuma forma de pagamento com valor que sobrou diferente de zero.</p>';
    }

    // Preserva Total Retirado da lista de retiradas do dia e reflete edição direta nos campos da grade se houver
    const totalRetiradoListaCent = paraCentavos(calcularTotalRetiradasDia(dataRef));
    const totalRetirado = deCentavos(totalRetiradoListaCent > 0 ? totalRetiradoListaCent : totalRetiradoCamposCent);
    const totalSobras = deCentavos(totalSobrasCent);
    const totalGrafico = calcularTotalGraficoComparativoDia(dataRef);

    // 1. Fechamento Financeiro = Total Gráfico Comparativo - Total Retirado (R$)
    const fechamentoFinanceiro = calcularFechamentoFinanceiroPeriodo(totalGrafico, totalRetirado);

    // 2. Total Consolidado = Total Gráfico Comparativo + Sobrou Pós-Compras (R$)
    const totalConsolidado = calcularTotalConsolidadoPeriodo(totalGrafico, totalSobras);

    const totalGastoInformado = normalizarMoedaValor(
        Math.max(0, paraCentavos(document.getElementById('compras-total-gasto')?.value))
    );

    document.getElementById('compras-total-retirado').textContent = formatarMoeda(totalRetirado);
    document.getElementById('compras-total-sobras').textContent = formatarMoeda(totalSobras);
    const elGrafRef = document.getElementById('compras-total-grafico-ref');
    if (elGrafRef) elGrafRef.textContent = formatarMoeda(totalGrafico);
    document.getElementById('compras-fechamento-liquido').textContent = formatarMoeda(fechamentoFinanceiro);
    const elCons = document.getElementById('compras-total-consolidado');
    if (elCons) elCons.textContent = formatarMoeda(totalConsolidado);

    return {
        totalRetirado,
        totalSobras,
        totalGrafico,
        totalGastoEfetivo: totalGastoInformado,
        fechamentoLiquido: fechamentoFinanceiro,
        totalConsolidado
    };
}

function salvarControleCompras() {
    const dataRef = document.getElementById('compras-data-chave').value || obterChaveDia();
    const descricao = document.getElementById('compras-descricao').value.trim() || 'Compras do dia';
    const totalGastoInformado = normalizarMoedaValor(
        Math.max(0, paraCentavos(document.getElementById('compras-total-gasto')?.value))
    );

    const arrecadado = obterArrecadacaoDiaPorModalidade(dataRef);
    const retiradasMap = {};
    const sobrasMap = {};

    const sobrasExistentesOutrosDias = obterSobrasPosCompras().filter(s => s.dataChave !== dataRef);
    const novasSobrasDia = [];

    MODALIDADES_PAGAMENTO.forEach((mod, i) => {
        const valSobCent = Math.max(0, paraCentavos(document.getElementById(`compras-sobra-${i}`)?.value));
        sobrasMap[mod] = deCentavos(valSobCent);
        if (valSobCent > 0) {
            novasSobrasDia.push({
                id: 'sobra_' + dataRef + '_' + i,
                dataChave: dataRef,
                dataHora: new Date().toLocaleString('pt-BR'),
                formaPagamento: mod,
                valor: deCentavos(valSobCent)
            });
        }
    });

    salvarSobrasPosCompras([...sobrasExistentesOutrosDias, ...novasSobrasDia]);

    const retiradasDia = obterRetiradasAtalho().filter(r => r.dataChave === dataRef);
    retiradasDia.forEach(r => {
        const forma = normalizarFormaPagamento(r.formaPagamento);
        retiradasMap[forma] = deCentavos(paraCentavos(retiradasMap[forma] || 0) + Math.max(0, paraCentavos(r.valor)));
    });

    const totalRetirado = calcularTotalRetiradasDia(dataRef);
    const totalSobras = calcularTotalSobrasPosComprasDia(dataRef);
    const totalGrafico = calcularTotalGraficoComparativoDia(dataRef);
    const fechamentoFinanceiro = calcularFechamentoFinanceiroPeriodo(totalGrafico, totalRetirado);
    const totalConsolidado = calcularTotalConsolidadoPeriodo(totalGrafico, totalSobras);

    const registros = obterRegistrosCompras();
    const registroObj = {
        id: compraEditandoId || ('compra_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        dataChave: dataRef,
        dataHora: new Date().toLocaleString('pt-BR'),
        descricao,
        arrecadado,
        retiradas: retiradasMap,
        sobras: sobrasMap,
        totalRetirado,
        totalSobras,
        totalGasto: totalGastoInformado,
        fechamentoLiquido: fechamentoFinanceiro,
        totalConsolidado
    };

    if (compraEditandoId) {
        const idx = registros.findIndex(r => r.id === compraEditandoId);
        if (idx !== -1) registros[idx] = registroObj;
        else registros.push(registroObj);
    } else {
        registros.push(registroObj);
    }

    salvarRegistrosCompras(registros);
    compraEditandoId = registroObj.id;
    renderizarHistoricoComprasDia(dataRef);
    if (!document.getElementById('modal-historico').classList.contains('hidden')) {
        renderizarHistorico();
    } else {
        renderizarRelatorioFinanceiroPeriodo();
    }
    alert('Controle de compras e fechamento financeiro salvos com sucesso!');
}

function renderizarHistoricoComprasDia(dataRef = null) {
    const chave = dataRef || document.getElementById('compras-data-chave')?.value || obterChaveDia();
    const lista = obterRegistrosCompras().filter(r => r.dataChave === chave);
    const container = document.getElementById('lista-historico-compras-dia');
    if (!container) return;

    if (!lista.length) {
        container.innerHTML = `<p class="empty-msg">Nenhum registro de compras salvo para ${formatarDataChaveBR(chave)}.</p>`;
        return;
    }

    container.innerHTML = [...lista].reverse().map(reg => {
        const graficoVal = calcularTotalGraficoComparativoDia(reg.dataChave);
        const consolidadoVal = typeof reg.totalConsolidado === 'number'
            ? reg.totalConsolidado
            : calcularTotalConsolidadoPeriodo(graficoVal, reg.totalSobras);

        return `
            <div class="compra-registro-card">
                <div class="compra-registro-topo">
                    <div>
                        <strong>${escapeHTML(reg.descricao || 'Compras do dia')}</strong>
                        <span class="venda-data"> • ${escapeHTML(reg.dataHora || formatarDataChaveBR(reg.dataChave))}</span>
                    </div>
                    <div class="venda-acoes">
                        <button type="button" class="btn-outline-sm" onclick="abrirModalControleCompras('${reg.id}')">Editar / Corrigir</button>
                        <button type="button" class="btn-outline-sm" onclick="imprimirRegistroCompra('${reg.id}')">Imprimir</button>
                    </div>
                </div>
                <div class="compra-registro-metricas">
                    <span>Total Retirado: <strong>${formatarMoeda(reg.totalRetirado)}</strong></span>
                    <span>Sobrou Pós-Compras: <strong>${formatarMoeda(reg.totalSobras)}</strong></span>
                    <span>Fechamento Financeiro: <strong>${formatarMoeda(reg.fechamentoLiquido)}</strong></span>
                    <span>Total Consolidado: <strong>${formatarMoeda(consolidadoVal)}</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

function imprimirRegistroCompra(compraId) {
    const reg = obterRegistrosCompras().find(r => r.id === compraId);
    if (!reg) return;

    const graficoVal = calcularTotalGraficoComparativoDia(reg.dataChave);
    const consolidadoVal = typeof reg.totalConsolidado === 'number'
        ? reg.totalConsolidado
        : calcularTotalConsolidadoPeriodo(graficoVal, reg.totalSobras);

    alternarModoImpressaoTermica('relatorio');
    document.getElementById('print-rel-data').textContent = `Compras do Dia: ${formatarDataChaveBR(reg.dataChave)}`;
    document.getElementById('print-rel-emissao').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const tabelaContainer = document.getElementById('print-rel-tabela');
    tabelaContainer.innerHTML = MODALIDADES_PAGAMENTO.map(mod => `
        <div class="cupom-rel-linha">
            <div class="cupom-rel-linha-topo">
                <span>${escapeHTML(mod)}</span>
                <span>Ret: ${formatarMoeda(reg.retiradas?.[mod] || 0)}</span>
            </div>
            <div class="cupom-rel-linha-sub">
                <span>Gráfico: ${formatarMoeda(reg.arrecadado?.[mod] || 0)}</span>
                <span>Sobrou: ${formatarMoeda(reg.sobras?.[mod] || 0)}</span>
            </div>
        </div>
    `).join('');

    document.getElementById('print-rel-grafico').innerHTML = `
        <div class="cupom-rel-grafico-item">
            <div>${escapeHTML(reg.descricao || 'Compras do dia')}</div>
            <div>Total Consolidado: ${formatarMoeda(consolidadoVal)}</div>
        </div>
    `;
    document.getElementById('print-rel-lider').textContent = `Total Retirado: ${formatarMoeda(reg.totalRetirado)}`;
    document.getElementById('print-rel-qtd-total').textContent = formatarMoeda(reg.totalRetirado);
    document.getElementById('print-rel-vale-consumo').textContent = formatarMoeda(reg.totalSobras);
    document.getElementById('print-rel-valor-total').textContent = formatarMoeda(reg.fechamentoLiquido);

    setTimeout(() => {
        window.print();
    }, 120);
}

// ============================================================================
// REGISTRO DE EVENTOS DA INTERFACE E ATALHOS (ALT + 0, ALT + 1, ALT + 2, ESC)
// ============================================================================
function registrarEventos() {
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.CHAMADA_COZINHA) {
            renderizarChamadaCozinha();
        }
    });

    document.getElementById('btn-abrir-chamada')?.addEventListener('click', abrirTelaChamadaVertical);
    document.getElementById('btn-abrir-chamada-cozinha')?.addEventListener('click', abrirTelaChamadaVertical);
    document.getElementById('btn-fechar-chamada')?.addEventListener('click', fecharTelaChamadaVertical);
    document.getElementById('btn-fechar-chamada-rodape')?.addEventListener('click', fecharTelaChamadaVertical);

    const inputPesquisa = document.getElementById('input-pesquisa-catalogo');
    const btnLimparPesquisa = document.getElementById('btn-limpar-pesquisa-catalogo');

    inputPesquisa.addEventListener('input', (e) => {
        termoPesquisaCatalogo = e.target.value;
        btnLimparPesquisa.classList.toggle('hidden', termoPesquisaCatalogo.trim().length === 0);
        renderizarCatalogo();
    });

    btnLimparPesquisa.addEventListener('click', () => {
        termoPesquisaCatalogo = '';
        inputPesquisa.value = '';
        btnLimparPesquisa.classList.add('hidden');
        renderizarCatalogo();
        inputPesquisa.focus();
    });

    document.getElementById('select-vendedor-comanda')?.addEventListener('change', (e) => {
        vendedorSelecionadoComandaId = e.target.value;
    });

    document.getElementById('btn-abrir-comissoes')?.addEventListener('click', abrirModalComissoes);
    document.getElementById('btn-fechar-comissoes')?.addEventListener('click', fecharModalComissoes);
    document.getElementById('btn-imprimir-comissao')?.addEventListener('click', imprimirRelatorioComissaoVendedor);
    document.getElementById('btn-perfil-vendedor')?.addEventListener('click', ativarVisaoVendedor);
    document.getElementById('btn-perfil-admin')?.addEventListener('click', solicitarAcessoAdminComissoes);
    document.getElementById('btn-bloquear-admin-comissoes')?.addEventListener('click', ativarVisaoVendedor);

    document.getElementById('select-vendedor-painel')?.addEventListener('change', (e) => {
        vendedorSelecionadoPainelId = e.target.value;
        renderizarPainelComissoes();
    });

    document.getElementById('input-mes-comissao')?.addEventListener('change', (e) => {
        if (e.target.value) {
            mesSelecionadoComissao = e.target.value;
            renderizarPainelComissoes();
        }
    });

    document.getElementById('admin-select-vendedor')?.addEventListener('change', sincronizarCamposAdminVendedor);
    document.getElementById('btn-salvar-config-vendedor')?.addEventListener('click', salvarConfiguracaoVendedorAdmin);
    document.getElementById('btn-adicionar-vendedor')?.addEventListener('click', cadastrarNovoVendedorAdmin);

    document.getElementById('btn-fechar-senha-comissao-x')?.addEventListener('click', fecharModalSenhaComissao);
    document.getElementById('btn-cancelar-senha-comissao')?.addEventListener('click', fecharModalSenhaComissao);
    document.getElementById('btn-confirmar-senha-comissao')?.addEventListener('click', confirmarCodigoAdminComissoes);
    document.getElementById('input-senha-comissao')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmarCodigoAdminComissoes();
        }
    });

    document.getElementById('btn-ir-pagamento').addEventListener('click', iniciarFluxoFinalizacaoEImprimir);
    document.getElementById('btn-fechar-pagamento')?.addEventListener('click', fecharModalPagamento);
    document.getElementById('btn-cancelar-pgto').addEventListener('click', fecharModalPagamento);
    document.getElementById('btn-confirmar-pagamento').addEventListener('click', confirmarSelecaoPagamento);
    document.getElementById('btn-adicionar-forma-pagamento').addEventListener('click', () => {
        adicionarLinhaPagamento('Dinheiro', '');
    });

    document.getElementById('btn-fechar-pendente-imprimir')?.addEventListener('click', () => {
        const vendaId = contextoPendenteImpressao?.vendaId;
        if (vendaId) {
            concluirEnvioPendenteHistorico(vendaId, false);
        } else {
            fecharModalConfirmacaoPendente();
        }
    });

    document.getElementById('btn-pendente-sim-imprimir').addEventListener('click', () => {
        const vendaId = contextoPendenteImpressao?.vendaId;
        if (vendaId) {
            concluirEnvioPendenteHistorico(vendaId, true);
        }
    });

    document.getElementById('btn-pendente-nao-continuar').addEventListener('click', () => {
        const vendaId = contextoPendenteImpressao?.vendaId;
        if (vendaId) {
            concluirEnvioPendenteHistorico(vendaId, false);
        }
    });

    document.getElementById('btn-toggle-qr-config-pos')?.addEventListener('click', () => {
        document.getElementById('painel-qr-config-pos')?.classList.toggle('hidden');
        atualizarPreviewsQRCodesUI();
    });

    document.getElementById('btn-toggle-qr-config-pendente')?.addEventListener('click', () => {
        document.getElementById('painel-qr-config-pendente')?.classList.toggle('hidden');
        atualizarPreviewsQRCodesUI();
    });

    document.getElementById('input-qr-wifi-pos')?.addEventListener('change', (e) => {
        processarArquivoQRSelecionado('wifi', 'pos', e.target.files?.[0]);
    });
    document.getElementById('input-qr-pix-pos')?.addEventListener('change', (e) => {
        processarArquivoQRSelecionado('pix', 'pos', e.target.files?.[0]);
    });
    document.getElementById('input-qr-wifi-pendente')?.addEventListener('change', (e) => {
        processarArquivoQRSelecionado('wifi', 'pendente', e.target.files?.[0]);
    });
    document.getElementById('input-qr-pix-pendente')?.addEventListener('change', (e) => {
        processarArquivoQRSelecionado('pix', 'pendente', e.target.files?.[0]);
    });

    document.querySelectorAll('input[name="forma_pagamento"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const valorRadio = e.target.value;
            if (valorRadio !== 'Pagamento pendente') {
                const primeiroSelect = document.querySelector('#lista-linhas-pagamento .select-forma-linha');
                if (primeiroSelect) {
                    primeiroSelect.value = valorRadio;
                }
            }
            atualizarConferenciaMultiPagamentos();
        });
    });

    document.getElementById('btn-imprimir-comprovante-modal').addEventListener('click', (e) => {
        const vendaId = e.currentTarget.dataset.vendaId;
        fecharModalComprovantePosPagamento();
        if (vendaId) {
            imprimirComprovanteVenda(vendaId);
        }
    });

    document.getElementById('btn-fechar-comprovante-pos-x')?.addEventListener('click', fecharModalComprovantePosPagamento);
    document.getElementById('btn-fechar-pos-pgto').addEventListener('click', fecharModalComprovantePosPagamento);

    document.getElementById('btn-limpar-comanda').addEventListener('click', () => {
        if (Object.keys(carrinho).length > 0 && confirm('Limpar todos os itens da comanda atual?')) {
            limparComandaAtual();
        }
    });

    document.getElementById('btn-abrir-cadastro').addEventListener('click', () => {
        renderizarTabelaCRUD();
        document.getElementById('modal-crud').classList.remove('hidden');
        registrarAberturaJanela('modal-crud');
    });

    document.getElementById('btn-fechar-crud').addEventListener('click', () => {
        resetarFormularioCRUD();
        document.getElementById('modal-crud').classList.add('hidden');
        sincronizarPilhaJanelas();
    });

    document.getElementById('form-produto').addEventListener('submit', salvarProdutoFormulario);
    document.getElementById('btn-cancelar-edicao').addEventListener('click', resetarFormularioCRUD);

    document.getElementById('btn-abrir-historico').addEventListener('click', () => abrirModalHistorico(false));
    document.getElementById('btn-abrir-relatorio').addEventListener('click', () => abrirModalHistorico(true));
    document.getElementById('btn-fechar-historico').addEventListener('click', fecharModalHistorico);

    document.getElementById('btn-imprimir-relatorio-topo').addEventListener('click', imprimirRelatorioFinanceiroPeriodo);
    document.getElementById('btn-imprimir-relatorio-diario').addEventListener('click', imprimirRelatorioFinanceiroPeriodo);

    document.getElementById('btn-abrir-gerenciar-historico').addEventListener('click', abrirModalGerenciarHistorico);
    document.getElementById('btn-abrir-gerenciar-relatorio').addEventListener('click', abrirModalGerenciarHistorico);
    document.getElementById('btn-fechar-gerenciar-historico').addEventListener('click', fecharModalGerenciarHistorico);

    document.getElementById('btn-excluir-comanda-especifica').addEventListener('click', solicitarExclusaoComandaEspecifica);
    document.getElementById('btn-excluir-todo-historico-dia').addEventListener('click', solicitarExclusaoTodoHistoricoDia);

    document.getElementById('btn-fechar-senha-exclusao-x')?.addEventListener('click', fecharModalSenhaExclusao);
    document.getElementById('btn-cancelar-senha-exclusao').addEventListener('click', fecharModalSenhaExclusao);
    document.getElementById('btn-confirmar-senha-exclusao').addEventListener('click', confirmarExclusaoComSenha);
    document.getElementById('input-senha-exclusao').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmarExclusaoComSenha();
        }
    });

    document.querySelectorAll('.periodo-tabs [data-tipo-periodo]').forEach(btn => {
        btn.addEventListener('click', () => {
            alternarTipoPeriodoRelatorio(btn.dataset.tipoPeriodo);
        });
    });

    document.getElementById('input-relatorio-dia').addEventListener('change', (e) => {
        if (e.target.value) {
            dataSelecionadaRelatorio = e.target.value;
            renderizarRelatorioFinanceiroPeriodo();
        }
    });

    document.getElementById('input-relatorio-mes').addEventListener('change', (e) => {
        if (e.target.value) {
            mesSelecionadoRelatorio = e.target.value;
            renderizarRelatorioFinanceiroPeriodo();
        }
    });

    document.getElementById('select-relatorio-ano').addEventListener('change', (e) => {
        if (e.target.value) {
            anoSelecionadoRelatorio = e.target.value;
            renderizarRelatorioFinanceiroPeriodo();
        }
    });

    document.querySelectorAll('.historico-filtros [data-filtro-status]').forEach(btn => {
        btn.addEventListener('click', () => {
            filtroStatusHistorico = btn.dataset.filtroStatus;
            document.querySelectorAll('.historico-filtros [data-filtro-status]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarHistorico();
        });
    });

    document.getElementById('chk-mostrar-todos-dias').addEventListener('change', (e) => {
        mostrarTodosDiasHistorico = e.target.checked;
        renderizarHistorico();
    });

    document.getElementById('btn-fechar-editar-comanda').addEventListener('click', fecharModalEditarComanda);
    document.getElementById('btn-cancelar-editar-comanda').addEventListener('click', fecharModalEditarComanda);
    document.getElementById('btn-adicionar-item-edicao').addEventListener('click', adicionarItemNaEdicaoComanda);
    document.getElementById('btn-salvar-editar-comanda').addEventListener('click', salvarAlteracoesComandaHistorico);
    document.getElementById('editar-comanda-status').addEventListener('change', renderizarItensEdicaoComanda);

    document.getElementById('select-novo-item-edicao').addEventListener('change', (e) => {
        const prod = produtos.find(p => p.id === e.target.value);
        if (prod) {
            document.getElementById('input-novo-preco-edicao').value = Number(prod.preco || 0).toFixed(2);
        }
    });

    // Controle de Compras (ALT + 0), Retirada (ALT + 1) e Sobrou Pós-Compras (ALT + 2)
    document.getElementById('btn-abrir-compras').addEventListener('click', () => abrirModalControleCompras());
    document.getElementById('btn-fechar-compras').addEventListener('click', fecharModalControleCompras);
    document.getElementById('btn-corrigir-compras').addEventListener('click', corrigirFormularioCompras);
    document.getElementById('btn-salvar-compras').addEventListener('click', salvarControleCompras);

    document.getElementById('compras-data-chave').addEventListener('change', (e) => {
        const novaData = e.target.value || obterChaveDia();
        document.getElementById('compras-data-exibicao').textContent = formatarDataChaveBR(novaData);
        sincronizarCamposComprasComRetiradasESobras(novaData);
        atualizarCalculosControleCompras();
        renderizarListaRetiradasModal();
        renderizarHistoricoComprasDia(novaData);
    });

    document.getElementById('compras-total-gasto')?.addEventListener('input', atualizarCalculosControleCompras);

    for (let i = 0; i < MODALIDADES_PAGAMENTO.length; i++) {
        document.getElementById(`compras-retirada-${i}`)?.addEventListener('input', atualizarCalculosControleCompras);
        document.getElementById(`compras-sobra-${i}`)?.addEventListener('input', atualizarCalculosControleCompras);
    }

    document.getElementById('btn-atalho-abrir-retirada')?.addEventListener('click', () => abrirModalRetiradaAtalho());
    document.getElementById('btn-fechar-retirada-atalho')?.addEventListener('click', fecharModalRetiradaAtalho);
    document.getElementById('form-retirada-atalho')?.addEventListener('submit', salvarRetiradaAtalho);
    document.getElementById('btn-cancelar-edicao-retirada')?.addEventListener('click', cancelarEdicaoRetiradaAtalho);

    document.getElementById('btn-atalho-abrir-sobra')?.addEventListener('click', () => abrirModalSobraPosCompras());
    document.getElementById('btn-fechar-sobra-pos-compras')?.addEventListener('click', fecharModalSobraPosCompras);
    document.getElementById('btn-salvar-sobra-pos-compras')?.addEventListener('click', salvarSobraPosCompras);
    document.getElementById('input-sobra-valor')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            salvarSobraPosCompras();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            const key = e.key;
            const code = e.code;
            if (key === '0' || code === 'Digit0' || code === 'Numpad0') {
                e.preventDefault();
                abrirModalControleCompras();
                return;
            }
            if (key === '1' || code === 'Digit1' || code === 'Numpad1') {
                e.preventDefault();
                abrirModalRetiradaAtalho();
                return;
            }
            if (key === '2' || code === 'Digit2' || code === 'Numpad2') {
                e.preventDefault();
                abrirModalSobraPosCompras();
                return;
            }
        }

        if (e.key === 'Escape') {
            const fechou = fecharJanelaTopoComEsc();
            if (fechou) {
                e.preventDefault();
            }
        }
    });

    document.getElementById('select-largura-bobina').addEventListener('change', (e) => {
        aplicarLarguraBobina(e.target.value);
    });
}