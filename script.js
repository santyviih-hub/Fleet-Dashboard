//==================================================
// FLEET DASHBOARD v2.0
// Parte 1 - Inicialização
//==================================================

//------------------------------
// CONFIGURAÇÃO
//------------------------------

const API =
"https://script.google.com/macros/s/AKfycbycP2THhaT_yAQFQHWPY4XubwtPjaWQOW7l5dYu_XK4ieZi3LXkihJsBZ8_jYRnGijW/exec";

const API_VAT =
"https://script.google.com/macros/s/AKfycbx7EoTYZQ4Lq3ENVDdWPHk8Irq7mZN96MqrB-HpOBIc4NUxGmPGmIhqj3IN2SXVYT4/exec?tipo=vat";

const API_FAROL =
"https://script.google.com/macros/s/AKfycbycP2THhaT_yAQFQHWPY4XubwtPjaWQOW7l5dYu_XK4ieZi3LXkihJsBZ8_jYRnGijW/exec?tipo=farol";

const API_FST =
"https://script.google.com/macros/s/AKfycbycP2THhaT_yAQFQHWPY4XubwtPjaWQOW7l5dYu_XK4ieZi3LXkihJsBZ8_jYRnGijW/exec?tipo=fst";

let tabela = null;
let dadosOriginais = [];
let dadosFiltrados = [];

//------------------------------
// INICIALIZAÇÃO
//------------------------------

document.addEventListener("DOMContentLoaded", iniciarDashboard);

async function iniciarDashboard() {
    configurarEventos();
    configurarNotificacoes();

    try {
        await buscarDados();
        preencherFiltros();
        dadosFiltrados = [...dadosOriginais];
        renderizarPainel(dadosFiltrados);
    } catch (erro) {
        console.error("Erro ao iniciar dashboard:", erro);
    } finally {
        atualizarHorario();
        // Mantém a atualização automática mesmo se a primeira consulta falhar.
        setInterval(atualizarDashboard, 60000);
    }
} 

function renderizarPainel(dados) {
    atualizarTabela(dados);
    atualizarKPIs(dados);
    atualizarResumoATS(dados);
    atualizarFIFO(dados);
    atualizarPainelOperacional(dados);
}


//------------------------------
// DASHBOARD
//------------------------------

async function atualizarDashboard() {

    try {

        await buscarDados();

        // Reaplica os filtros atuais e atualiza todos os indicadores/tabela.
        aplicarFiltros();
        atualizarHorario();

    } catch (erro) {

        console.error("Erro ao atualizar dashboard:", erro);

    }

}

//------------------------------
// API
//------------------------------

async function buscarDados() {

    const resposta = await fetch(API);

    if (!resposta.ok) {
        throw new Error("Falha ao acessar API");
    }

    const dados = await resposta.json();
    if (!Array.isArray(dados)) {
        throw new Error("A API não retornou uma lista de registros.");
    }

    dadosOriginais = dados.map(item => ({

        // DADOS DA OPERAÇÃO
        at: item.at ?? "",
        cidade: item.cidade ?? "",
        bairro: item.bairro ?? "",
        agencia: item.agencia ?? "",
        corredor: item.corredor ?? "",
        driver: item.driver ?? "",
        janela: item.janela ?? "",
        status: item.status ?? "",
        statusDriver: item.statusDriver ?? "",

        // INDICADORES
        volumeTotal: Number(item.volumeTotal || 0),
pacotes: Number(item.pacotes || 0),
spr: Number(item.spr || 0),

        // DATA
        dataOriginal: item.idade,
        idade: calcularDias(item.idade),

        // PAINEL
        inicioExpedicao: item.inicioExpedicao ?? "--:--",
        driversHub: Number(item.driversHub || 0),
        bancadas: Number(item.bancadas || 0),
        biparamUmaRota: Number(item.biparamUmaRota || 0)

    }));
   atualizarSidebar();
}

//------------------------------
// EVENTOS
//------------------------------

function configurarEventos() {

    const filtros = [

        "filtroCorredor",
        "filtroCidade",
        "filtroAgencia",
        "filtroStatus",
        "filtroJanela",
        "filtroIdade"

    ];

    filtros.forEach(id => {

        const elemento = document.getElementById(id);

        if (elemento) {

            elemento.addEventListener("change", aplicarFiltros);

        }

    });

    const btnAtualizar = document.getElementById("btnAtualizar");

    if (btnAtualizar) {

        btnAtualizar.addEventListener("click", atualizarDashboard);

    }

    const btnLimpar = document.getElementById("btnLimpar");

    if (btnLimpar) {

        btnLimpar.addEventListener("click", limparFiltros);

    }

}

//------------------------------
// RELÓGIO
//------------------------------

function atualizarHorario() {

    const agora = new Date();

    const hora = agora.toLocaleTimeString("pt-BR", {

        hour: "2-digit",
        minute: "2-digit"

    });

    const data = agora.toLocaleDateString("pt-BR");

    const lblHora = document.getElementById("horaAtualizacao");

    const lblData = document.getElementById("dataOperacao");

    if (lblHora) lblHora.textContent = hora;

    if (lblData) lblData.textContent = data;

}
//==================================================
// FLEET DASHBOARD v2.0
// Parte 2 - Filtros + Tabela
//==================================================

//------------------------------
// PREENCHER FILTROS
//------------------------------

function preencherFiltros(){
    const filtroCorredor = document.getElementById("filtroCorredor");

    // Se o filtro não existe no HTML, não interrompe o carregamento do painel.
    if (!filtroCorredor) {
        console.warn("Filtro filtroCorredor não encontrado; preenchimento de filtros ignorado.");
        return;
    }

    // Se já existe TomSelect, não recria.
    if (filtroCorredor.tomselect) return;

    preencherSelect("filtroCorredor","corredor");
    preencherSelect("filtroCidade","cidade");
    preencherSelect("filtroAgencia","agencia");
    preencherSelect("filtroStatus","status");
    preencherSelect("filtroJanela","janela");
    preencherSelect("filtroIdade","idade");

    criarMultiSelect();

}

//------------------------------

function preencherSelect(id, campo) {

    const select = document.getElementById(id);

    if (!select) return;

    // Se já existe Tom Select, destrói antes de recriar
    if (select.tomselect) {
        select.tomselect.destroy();
    }

    const textoPadrao = select.options.length
        ? select.options[0].text
        : "Todos";

    select.innerHTML = `<option value="">${textoPadrao}</option>`;

    const valores = [...new Set(
        dadosOriginais
            .map(item => item[campo])
            .filter(v => v)
    )].sort();

    valores.forEach(valor => {

        const option = document.createElement("option");
        option.value = valor;
        option.text = valor;
        select.appendChild(option);

    });

}

//------------------------------
// APLICAR FILTROS
//------------------------------

function aplicarFiltros() {
    const obterValores = id => {
        const el = document.getElementById(id);
        if (!el) return [];
        if (el.tomselect) {
            const valor = el.tomselect.getValue();
            return Array.isArray(valor) ? valor : (valor ? [valor] : []);
        }
        return el.value ? [el.value] : [];
    };

    const cidade = obterValores("filtroCidade");
    const corredor = obterValores("filtroCorredor");
    const agencia = obterValores("filtroAgencia");
    const status = obterValores("filtroStatus");
    const janela = obterValores("filtroJanela");
    const idade = obterValores("filtroIdade");

    dadosFiltrados = dadosOriginais.filter(item =>
        (corredor.length === 0 || corredor.includes(item.corredor)) &&
        (cidade.length === 0 || cidade.includes(item.cidade)) &&
        (agencia.length === 0 || agencia.includes(item.agencia)) &&
        (status.length === 0 || status.includes(item.status)) &&
        (janela.length === 0 || janela.includes(item.janela)) &&
        (idade.length === 0 || idade.includes(item.idade))
    );

    renderizarPainel(dadosFiltrados);
}

//------------------------------
// LIMPAR FILTROS
//------------------------------

function limparFiltros() {

    [
        "filtroCorredor",
        "filtroCidade",
        "filtroAgencia",
        "filtroStatus",
        "filtroJanela",
        "filtroIdade"

    ].forEach(id => {

        const el = document.getElementById(id);
        if (!el) return;
        if (el.tomselect) el.tomselect.clear();
        else el.value = "";

    });

    aplicarFiltros();

}

//------------------------------
// TABELA
//------------------------------

function atualizarTabela(dados) {

    if (tabela) {

        tabela.destroy();

    }

    const tbody = document.querySelector("#tabelaOperacao tbody");
    if (!tbody) {
        console.warn("Corpo da tabela #tabelaOperacao tbody não encontrado.");
        return;
    }

    tbody.innerHTML = "";

    let html = "";

dados.forEach(item => {

    html += `

        <tr>

            <td>${item.at}</td>

            <td>${item.cidade}</td>

            <td>${item.bairro}</td>

            <td>${item.agencia}</td>

            <td>${item.corredor}</td>

            <td>${item.driver}</td>

            <td>${item.janela}</td>

            <td>${formatarStatus(item.status)}</td>

            <td>${item.pacotes.toLocaleString("pt-BR")}</td>

            <td>${formatarSPR(item.spr)}</td>

            <td>${formatarData(item.idade)}</td>

        </tr>

    `;

});

tbody.innerHTML = html;

tabela = new DataTable("#tabelaOperacao", {

    destroy: true,

    responsive: false,

    scrollX: false,

    autoWidth: false,

    deferRender: true,

    pageLength: 25,

    order: [],

    language: {
        lengthMenu: "Mostrar _MENU_ resultados por página",
        search: "Buscar",
        searchPlaceholder: "Buscar AT, cidade, driver...",
        info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
        zeroRecords: "Nenhum registro encontrado",
        paginate: {
            first: "«",
            previous: "‹",
            next: "›",
            last: "»"
        }
    }

});
const filtro = document.querySelector(".dt-search input");

if(filtro){

    filtro.setAttribute(
        "placeholder",
        "Buscar AT, cidade, driver..."
    );

}

const select = document.querySelector(".dt-length select");

if(select){

    select.classList.add("dt-select");

}

setTimeout(() => {
    tabela.columns.adjust().draw(false);
}, 50);

}

//------------------------------
// FORMATAR SPR
//------------------------------

function formatarSPR(valor) {

    if (valor === "" || valor == null) {

        return "-";

    }

    const spr = Number(valor);

    let cor = "success";

    if (spr < 100) cor = "warning";

    if (spr < 95) cor = "danger";

    return `
        <span class="badge bg-${cor}">
            ${spr.toFixed(0)}
        </span>
    `;

}

//------------------------------
// FORMATAR STATUS
//------------------------------

function formatarStatus(status) {

    if (!status) return "";

    let cor = "secondary";

    const texto = status.toUpperCase();

    if (texto.includes("PROCESS")) cor = "warning";

    if (texto.includes("EXPED")) cor = "success";

    if (texto.includes("NOSHOW")) cor = "danger";

    if (texto.includes("ADER")) cor = "dark";

    return `
        <span class="badge bg-${cor}">
            ${status}
        </span>
    `;

}

//------------------------------
// FORMATAR DATA
//------------------------------

function formatarData(data) {

    if (!data) return "";

    const d = new Date(data);

    if (isNaN(d.getTime())) {

        return data;

    }

    return d.toLocaleDateString("pt-BR");

}
//==================================================
// FLEET DASHBOARD v2.0
// Parte 3 - KPIs + Resumo ATS + FIFO
//==================================================

//--------------------------------------------------
// KPIs
//--------------------------------------------------

function atualizarKPIs(dados) {

    // ==========================
    // CONTADORES
    // ==========================

    let am = 0;
    let pm = 0;
    let atsNoShow = 0;
let pacotesNoShow = 0;

    let atsPiso = 0;
let atsPisoAM = 0;
let atsPisoPM = 0;
    let atsExpedidas = 0;
    let semAderencia = 0;
    let semAderenciaAM = 0;
let semAderenciaPM = 0;
    let atribuidas = 0;

let atribuidasAM = 0;
let atribuidasPM = 0;

let expedicao = 0;
let expedicaoAM = 0;
let expedicaoPM = 0;

    let volumeTotal = 0;
    let volumeAM = 0;
let volumePM = 0;
    let pacotesPiso = 0;
    let pacotesPisoAM = 0;
let pacotesPisoPM = 0;
    
    let pacotesExpedidos = 0;
let pacotesExpedidosAM = 0;
let pacotesExpedidosPM = 0;
let totalPacotesAM = 0;
let totalPacotesPM = 0;

let totalRotasAM = 0;
let totalRotasPM = 0;

    const agenciasAtribuidas = new Set([
        "SPXOWNFLEET",
        "LC TRANSPORTES",
        "ELOLOGISTICA",
        "OPTIMIZE",
        "REVERSÃO",
        "SUCESSO",
        "DELUNA",
        "BOX"
        
    ]);

    // ==========================
    // PERCORRE A BASE APENAS 1 VEZ
    // ==========================

    dados.forEach(r => {

        const janela = String(r.janela).trim().toUpperCase();
        const status = String(r.status).trim().toUpperCase();
        const agencia = String(r.agencia).trim().toUpperCase();
        const pacotes = Number(r.pacotes || 0);
const volume = Number(r.volumeTotal || 0);

// Volume Total = COLUNA G (SPR ROUTING)
volumeTotal += volume;

if (janela === "AM" || janela === "NO SHOW") {
    volumeAM += volume;
}

if (janela === "PM") {
    volumePM += volume;
}


        // Janelas
       if (janela === "AM") am++;
else if (janela === "PM") pm++;
else if (janela === "NO SHOW") {
    atsNoShow++;
    pacotesNoShow += pacotes;
    am++;
}

        // ATS Expedidas
if (status === "ASSIGNED" || status === "COMPLETE") {

    atsExpedidas++;
    pacotesExpedidos += pacotes;

    if (janela === "AM" || janela === "NO SHOW") {
        expedicaoAM++;
        pacotesExpedidosAM += pacotes;
    }

    if (janela === "PM") {
        expedicaoPM++;
        pacotesExpedidosPM += pacotes;
    }

}

   // ATS no Piso
if (status === "PROCESSING" || status === "PROCESSED") {

    atsPiso++;
    pacotesPiso += pacotes;

    if (janela === "AM" || janela === "NO SHOW") {
        atsPisoAM++;
        pacotesPisoAM += pacotes;
    }

    if (janela === "PM") {
        atsPisoPM++;
        pacotesPisoPM += pacotes;
    }

}

        // Sem Aderência
if (agencia === "SEM ADERENCIA") {

    semAderencia++;

    if (janela === "AM") {
        semAderenciaAM++;
    }

    if (janela === "PM") {
        semAderenciaPM++;
    }

}

        // ATS Atribuídas
if (agenciasAtribuidas.has(agencia)) {

    atribuidas++;

    if (janela === "AM" || janela === "NO SHOW") {
        atribuidasAM++;
    }

    if (janela === "PM") {
        atribuidasPM++;
    }

}
    });

    // ==========================
    // INDICADORES
    // ==========================

    const totalATS = am + pm;

    const spr = atsExpedidas > 0
        ? (pacotesExpedidos / atsExpedidas).toFixed(2)
        : "0.00";

const sprAM = am > 0
    ? (volumeAM / am).toFixed(2)
    : "0.00";

const sprPM = pm > 0
    ? (volumePM / pm).toFixed(2)
    : "0.00";

    // ==========================
    // ATUALIZA OS CARDS
    // ==========================

    document.getElementById("volumeTotal").textContent =
    volumeTotal.toLocaleString("pt-BR");

document.getElementById("kpiVolumeAM").textContent =
    volumeAM.toLocaleString("pt-BR");

document.getElementById("kpiVolumePM").textContent =
    volumePM.toLocaleString("pt-BR");

    document.getElementById("totalATS").textContent =
    totalATS;

document.getElementById("kpiATSAM").textContent = am;
document.getElementById("kpiATSPM").textContent = pm;

    document.getElementById("atsNoShow").textContent =
    atsNoShow;

document.getElementById("kpiNoShowATS").textContent =
    atsNoShow;

document.getElementById("kpiNoShowPacotes").textContent =
    pacotesNoShow.toLocaleString("pt-BR");

    document.getElementById("atsAtribuida").textContent =
    atribuidas;

document.getElementById("kpiAtribuidasAM").textContent =
    atribuidasAM;

document.getElementById("kpiAtribuidasPM").textContent =
    atribuidasPM;

   document.getElementById("atsExpedicao").textContent =
    atsExpedidas;
    document.getElementById("kpiExpedicaoAM").textContent =
    expedicaoAM;

document.getElementById("kpiExpedicaoPM").textContent =
    expedicaoPM;

    document.getElementById("pctExpedido").textContent =
    pacotesExpedidos.toLocaleString("pt-BR");

document.getElementById("kpiPacotesExpAM").textContent =
    pacotesExpedidosAM.toLocaleString("pt-BR");

document.getElementById("kpiPacotesExpPM").textContent =
    pacotesExpedidosPM.toLocaleString("pt-BR");

    document.getElementById("atPiso").textContent =
    atsPiso;

document.getElementById("kpiPisoAM").textContent =
    atsPisoAM;

document.getElementById("kpiPisoPM").textContent =
    atsPisoPM;

   document.getElementById("pctPiso").textContent =
    pacotesPiso.toLocaleString("pt-BR");

document.getElementById("kpiPacotesPisoAM").textContent =
    pacotesPisoAM.toLocaleString("pt-BR");

document.getElementById("kpiPacotesPisoPM").textContent =
    pacotesPisoPM.toLocaleString("pt-BR");

    document.getElementById("semAderencia").textContent =
    semAderencia;

document.getElementById("kpiSemAderenciaAM").textContent =
    semAderenciaAM;

document.getElementById("kpiSemAderenciaPM").textContent =
    semAderenciaPM;

    document.getElementById("spr").textContent =
        spr;
        document.getElementById("kpiSprAM").textContent = sprAM;
document.getElementById("kpiSprPM").textContent = sprPM;

        atualizarAlertas({
    semAderencia,
    atsNoShow,
    atsPiso
});

}

//--------------------------------------------------
// RESUMO ATS
//--------------------------------------------------

function atualizarResumoATS(dados){

    const contador = {
        confirmado:0,
        atraso:0,
        hub:0,
        pendente:0,
        novato:0,
        mensagem:0,
        naoVai:0
    };

    dados.forEach(item=>{

        const status = String(item.statusDriver || "")
            .trim()
            .toUpperCase();

        switch(status){

            case "CONFIRMADO":
                contador.confirmado++;
                break;

            case "VAI ATRASAR MAIS QUE UMA HORA":
                contador.atraso++;
                break;

            case "NO HUB":
                contador.hub++;
                break;

            case "PENDENTE DE CONFIRMAÇÃO":
                contador.pendente++;
                break;

            case "NOVATO":
                contador.novato++;
                break;

            case "MENSAGEM ENVIADA":
                contador.mensagem++;
                break;

            case "NÃO VAI COMPARECER":
            case "NAO VAI COMPARECER":
                contador.naoVai++;
                break;

        }

    });

    
atualizarElemento("driverConfirmado", contador.confirmado);
atualizarElemento("driverAtraso", contador.atraso);
atualizarElemento("driverHubStatus", contador.hub);
atualizarElemento("driverPendente", contador.pendente);
atualizarElemento("driverNovato", contador.novato);
atualizarElemento("driverMensagem", contador.mensagem);
atualizarElemento("driverNaoVai", contador.naoVai);


}

//--------------------------------------------------
// FIFO
//--------------------------------------------------

function atualizarFIFO(dados){

    let dia0 = 0;
    let dia1 = 0;
    let dia2 = 0;
    let dia3 = 0;

    dados.forEach(item => {

        switch(item.idade){

            case "0 Dia":
                dia0++;
                break;

            case "1 Dia":
                dia1++;
                break;

            case "2 Dias":
                dia2++;
                break;

            default:

                const numero = parseInt(item.idade);

                if(!isNaN(numero) && numero >= 3){

                    dia3++;

                }

        }

    });

    const cards = document.querySelectorAll(".status-card h2");

    if(cards.length >= 4){

        cards[0].textContent = dia0;
        cards[1].textContent = dia1;
        cards[2].textContent = dia2;
        cards[3].textContent = dia3;

    }

}

//--------------------------------------------------
// CONTADORES
//--------------------------------------------------

function contarStatus(dados,texto){

    return dados.filter(item=>

        (item.status || "")
        .toUpperCase()
        .includes(texto)

    ).length;

}

function contarJanela(dados,texto){

    return dados.filter(item=>

        (item.janela || "")
        .toUpperCase()
        .includes(texto)

    ).length;

}

function somarPacotes(dados,status){

    return dados

        .filter(item=>

            (item.status || "")
            .toUpperCase()
            .includes(status)

        )

        .reduce((soma,item)=>{

            return soma + Number(item.pacotes || 0);

        },0)

        .toLocaleString("pt-BR");

}

function atualizarSPR(dados){

    if(dados.length===0){

        atualizarElemento("spr","0");

        return;

    }

    const media =

        dados.reduce((soma,item)=>{

            return soma + Number(item.spr || 0);

        },0)

        / dados.length;

    const el=document.getElementById("spr");

    if(el){

        el.innerHTML=formatarSPR(media);

    }

}

function atualizarElemento(id,valor){

    const el=document.getElementById(id);

    if(el){

        el.textContent=valor;

    }

}

//--------------------------------------------------
// FIFO
//--------------------------------------------------

function contarDias(dados,dias){

    return dados.filter(item=>{

        if(!item.idade) return false;

        const data=new Date(item.idade);

        if(isNaN(data)) return false;

        const hoje=new Date();

        const diff=Math.floor(

            (hoje-data)/86400000

        );

        return diff===dias;

    }).length;

}

function contarDiasMaiorIgual(dados,dias){

    return dados.filter(item=>{

        if(!item.idade) return false;

        const data=new Date(item.idade);

        if(isNaN(data)) return false;

        const hoje=new Date();

        const diff=Math.floor(

            (hoje-data)/86400000

        );

        return diff>=dias;

    }).length;

}

// =====================================
// MULTI SELECT
// =====================================

function criarMultiSelect() {
    if (typeof TomSelect === "undefined") {
        console.warn("TomSelect não está carregado; usando filtros HTML nativos.");
        return;
    }

    [
        "filtroCorredor",
        "filtroCidade",
        "filtroAgencia",
        "filtroStatus",
        "filtroJanela",
        "filtroIdade"
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el && !el.tomselect) {

           new TomSelect(el, {
    plugins: {
        remove_button: {},
        clear_button: {}
    },

    maxItems: null,
    hideSelected: true,
    closeAfterSelect: false,

    placeholder: "Selecione...",

    maxOptions: 500,

    maxItemsShown: 1
});

        }

    });

}
function calcularDias(data){

    if(!data) return "";

    const hoje = new Date();
    const dt = new Date(data);

    hoje.setHours(0,0,0,0);
    dt.setHours(0,0,0,0);

    const dias = Math.floor((hoje - dt)/86400000);

    if(dias <= 0) return "0 Dia";
    if(dias == 1) return "1 Dia";
    if(dias == 2) return "2 Dias";

    return `${dias} Dias`;

}
function atualizarPainelOperacional(dados) {
    if (!dados || dados.length === 0) {
        atualizarElemento("inicioExpedicao", "--:--");
        atualizarElemento("driversHub", 0);
        atualizarElemento("bancadas", 0);
        atualizarElemento("biparamUmaRota", 0);
        return;
    }

    atualizarElemento("inicioExpedicao", dados[0].inicioExpedicao || "--:--");
    atualizarElemento("driversHub", dados[0].driversHub || 0);
    atualizarElemento("bancadas", dados[0].bancadas || 0);
    // O card 1 ROTA foi removido do HTML; atualizarElemento ignora ID inexistente.
    atualizarElemento("biparamUmaRota", dados[0].biparamUmaRota || 0);
}

function configurarNotificacoes() {
    const btn = document.getElementById("btnNotificacao");
    const painel = document.getElementById("painelAlertas");
    const overlay = document.getElementById("overlayAlerta");
    const fechar = document.getElementById("fecharAlertas");

    // Se algum componente não existir no HTML, ignora sem quebrar o painel.
    if (!btn || !painel || !overlay || !fechar) return;

    const abrir = () => {
        painel.classList.add("ativo");
        overlay.classList.add("ativo");
    };
    const fecharPainel = () => {
        painel.classList.remove("ativo");
        overlay.classList.remove("ativo");
    };

    btn.onclick = abrir;
    fechar.onclick = fecharPainel;
    overlay.onclick = fecharPainel;
}

function atualizarAlertas(info) {

    const total = info.semAderencia + info.atsNoShow + info.atsPiso;

    const agora = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    const lista = document.getElementById("listaAlertas");
    if (lista) lista.innerHTML = `

        <div class="alerta-item">

            <h5>
                <span class="dot red"></span>
                Sem Aderência
            </h5>

            <strong id="alertaSemAderencia">${info.semAderencia} ATS</strong>

            <p>Aguardando atribuição.</p>

            <small>
                <i class="bi bi-clock"></i>
                Agora mesmo
            </small>

        </div>

        <div class="alerta-item">

            <h5>
                <span class="dot orange"></span>
                No Show
            </h5>

            <strong id="alertaNoShow">${info.atsNoShow} ATS</strong>

            <p>ATS em No Show.</p>

            <small>
                <i class="bi bi-clock"></i>
                Agora mesmo
            </small>

        </div>

        <div class="alerta-item">

            <h5>
                <span class="dot yellow"></span>
                ATS no Piso
            </h5>

            <strong id="alertaPiso">${info.atsPiso} ATS</strong>

            <p>Aguardando expedição.</p>

            <small>
                <i class="bi bi-clock"></i>
                Agora mesmo
            </small>

        </div>

        `;

    const totalEl = document.getElementById("totalAlertas");
    if (totalEl) totalEl.textContent = total;

    const horaEl = document.getElementById("horaAtualizacaoAlertas");
    if (horaEl) horaEl.textContent = agora;

    const badge = document.getElementById("badgeAlerta");
    if (badge) badge.style.display = total > 0 ? "block" : "none";
}
// ===============================
// NAVEGAÇÃO ENTRE PÁGINAS
// Os botões são opcionais: o dashboard funciona sem a lateral.
// ===============================

function mostrarPagina(idPagina) {
    document.querySelectorAll(".page").forEach(pagina => {
        pagina.style.display = pagina.id === idPagina ? "block" : "none";
    });

    document.querySelectorAll(".sidebar li").forEach(li => {
        li.classList.remove("active");
    });

    const mapaBotoes = {
        dashboardPage: "btnDashboard",
        vatPage: "btnVAT",
        fstPage: "btnFST",
        farolPage: "btnFarol"
    };

    const botao = document.getElementById(mapaBotoes[idPagina] || "");
    if (botao && botao.parentElement) {
        botao.parentElement.classList.add("active");
    }
}

function registrarCliqueSeguro(id, callback) {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.addEventListener("click", async function (e) {
        e.preventDefault();
        await callback();
    });
}

registrarCliqueSeguro("btnDashboard", () => mostrarPagina("dashboardPage"));
registrarCliqueSeguro("btnVAT", async () => {
    mostrarPagina("vatPage");
    await carregarVAT();
});
registrarCliqueSeguro("btnFarol", async () => {
    mostrarPagina("farolPage");
    await carregarFarol();
});
registrarCliqueSeguro("btnFST", async () => {
    mostrarPagina("fstPage");
    await carregarFST();
});

async function carregarVAT() {

    try {

        const resposta = await fetch(API_VAT);

        if (!resposta.ok) {
            throw new Error("Erro ao carregar VAT");
        }

        const dados = await resposta.json();
         
        // Total
        document.getElementById("vatTotal").textContent =
            Number(dados.total || 0).toLocaleString("pt-BR");

        // Relocados
        document.getElementById("vatRelocados").textContent =
            Number(dados.relocados || 0).toLocaleString("pt-BR");

        // Consultados
        document.getElementById("vatConsultados").textContent =
            Number(dados.consultados || 0).toLocaleString("pt-BR");

        // Com Erro
        document.getElementById("vatErro").textContent =
            Number(dados.erro || 0).toLocaleString("pt-BR");

        // Bairro Ofensor
        document.getElementById("vatBairro").textContent =
            dados["bairro ofensor"] || "--";

        // ==========================
        // Percentual
        // ==========================

        const percentual = Number(dados.percentual || 0);

        document.getElementById("vatPercentual").textContent =
            percentual.toFixed(1) + "%";

        document.getElementById("vatProgressBar").style.width =
            percentual + "%";

        // ==========================
        // Última atualização
        // ==========================

        if (dados.ultima) {

            const data = new Date(dados.ultima);

            document.getElementById("vatUltimaAtualizacao").textContent =
                data.toLocaleDateString("pt-BR") + " " +
                data.toLocaleTimeString("pt-BR");

        } else {

            document.getElementById("vatUltimaAtualizacao").textContent = "--";

        }

        // ==========================
        // Botão Planilha
        // ==========================

        const botao = document.getElementById("btnAbrirPlanilha");

        if (botao) {

            botao.onclick = () => {
                window.open(
                    "https://docs.google.com/spreadsheets/d/1stHrx-Dct4gdQXjBqCYLthCe_pbk8SuAboZGx75Le8A/edit?gid=1456285798#gid=1456285798",
                    "_blank"
                );
            };

        }

    } catch (e) {

        console.error("Erro ao carregar VAT:", e);

    }

}

async function carregarFarol() {

    try {

        const resposta = await fetch(API_FAROL);

        if (!resposta.ok) {
            throw new Error("Erro ao carregar Farol");
        }

        dadosFarol = await resposta.json();
        if (!Array.isArray(dadosFarol)) dadosFarol = [];
        if (dadosFarol.length) console.log("Dados Farol carregados:", Object.keys(dadosFarol[0]));
       // ==========================
// FILTRA O DIA ANTERIOR
// ==========================

const ontem = new Date();
ontem.setDate(ontem.getDate() - 1);

const dataOntem = ontem.toISOString().substring(0, 10);

dadosFarol = dadosFarol.filter(item =>
    String(item.DATA).startsWith(dataOntem)
);

        if (!dadosFarol.length) return;


    atualizarCardsFarol(dadosFarol);
        atualizarObservacoesFarol();

    } catch (erro) {

        console.error("Erro no Farol:", erro);

    }

}

async function carregarFST() {

    try {

        const resposta = await fetch(API_FST);

        const dados = await resposta.json();

       const totalDrivers = new Set(
    dados
        .map(item => String(item["ID"] || "").trim())
        .filter(id => id !== "")
).size;

const totalATS = dados.reduce((soma, item) => {
    return soma + Number(item["QNT DE ATS"] || 0);
}, 0);

const mediaATS = totalDrivers
    ? (totalATS / totalDrivers).toFixed(1)
    : 0;

const maiorATS = Math.max(
    ...dados.map(item => Number(item["QNT DE ATS"] || 0))
);

document.getElementById("fstTotalDrivers").textContent = totalDrivers;
document.getElementById("fstTotalATS").textContent = totalATS;
document.getElementById("fstMediaATS").textContent = mediaATS;
document.getElementById("fstMaiorATS").textContent = maiorATS;
const active = dados.filter(item =>
    String(item["STATUS DO DRIVERS"] || "")
        .trim()
        .toUpperCase() === "ACTIVE"
).length;

const preSuspensos = dados.filter(item =>
    Number(item["QNT DE ATS"] || 0) >= 15 &&
    Number(item["QNT DE ATS"] || 0) < 20
).length;

const suspensos = dados.filter(item =>
    Number(item["QNT DE ATS"] || 0) >= 20
).length;

document.getElementById("fstActive").textContent = active;
document.getElementById("fstPreSuspensos").textContent = preSuspensos;
document.getElementById("fstSuspensos").textContent = suspensos;


    } catch (erro) {

        console.error("Erro ao carregar First Tripz:", erro);

    }

}

function atualizarObservacoesFarol() {

    const am = dadosFarol.find(item =>
        String(item.EXP || "").toUpperCase() === "AM"
    );

    const pm = dadosFarol.find(item =>
        String(item.EXP || "").toUpperCase() === "PM"
    );

    // AM
   document.getElementById("amInicio").textContent =
    formatarHoraFarol(am?.["INÍCIO"] || am?.INICIO);

document.getElementById("amFim").textContent =
    formatarHoraFarol(am?.FIM);

    document.getElementById("amSOP").textContent =
        am?.SOP || "--";

    document.getElementById("amObs").textContent =
        am?.OBS || am?.OBSERVAÇÃO || am?.OBSERVACAO || "--";

    // PM
   document.getElementById("pmInicio").textContent =
    formatarHoraFarol(pm?.["INÍCIO"] || pm?.INICIO);

document.getElementById("pmFim").textContent =
    formatarHoraFarol(pm?.FIM);

    document.getElementById("pmSOP").textContent =
        pm?.SOP || "--";

    document.getElementById("pmObs").textContent =
        pm?.OBS || pm?.OBSERVAÇÃO || pm?.OBSERVACAO || "--";

}
function atualizarCardsFarol(dados) {

    const totalVolume = dados.reduce((soma, item) =>
        soma + Number(item.VOLUME || 0), 0);

    const totalRotas = dados.reduce((soma, item) =>
        soma + Number(item.ROTAS || 0), 0);

    const totalSPR = totalRotas > 0
        ? (totalVolume / totalRotas)
        : 0;

    const totalMoto = dados.reduce((soma, item) =>
        soma + Number(item["R MOTO"] || 0), 0);

    const totalUtilitario = dados.reduce((soma, item) =>
        soma + Number(item["UTILITÁRIOS"] || item["UTILITARIOS"] || 0), 0);

    const totalATPiso = dados.reduce((soma, item) => {

        const valor =
            item["AT NO PISO"] ??
            item["AT no Piso"] ??
            item["AT No Piso"] ??
            item["AT NO Piso"] ??
            0;

        return soma + Number(valor);

    }, 0);

    document.getElementById("farolVolume").textContent =
        totalVolume.toLocaleString("pt-BR");

    document.getElementById("farolRotas").textContent =
        totalRotas.toLocaleString("pt-BR");

    document.getElementById("farolSPR").textContent =
        totalSPR.toFixed(2).replace(".", ",");

    document.getElementById("farolMoto").textContent =
        totalMoto;

    document.getElementById("farolCarro").textContent =
    totalUtilitario.toLocaleString("pt-BR");

    document.getElementById("farolATPiso").textContent =
        totalATPiso;
}
function formatarHoraFarol(valor) {

    if (!valor) return "--:--";

    // Já está no formato HH:mm
    if (typeof valor === "string" && /^\d{2}:\d{2}/.test(valor)) {
        return valor.substring(0, 5);
    }

    const data = new Date(valor);

    if (!isNaN(data)) {
        return data.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    return "--:--";
}
// ===============================
// FILTRO DOS CARDS DO FAROL
// Os botões podem não existir se a página Farol não estiver montada.
// ===============================

const btnTodos = document.getElementById("btnTodos");
const btnAM = document.getElementById("btnAM");
const btnPM = document.getElementById("btnPM");

if (btnTodos) btnTodos.addEventListener("click", () => {
    atualizarCardsFarol(dadosFarol);
    btnTodos.classList.add("ativo");
    if (btnAM) btnAM.classList.remove("ativo");
    if (btnPM) btnPM.classList.remove("ativo");
});

if (btnAM) btnAM.addEventListener("click", () => {
    const dadosAM = dadosFarol.filter(item =>
        String(item.EXP || "").toUpperCase() === "AM"
    );
    atualizarCardsFarol(dadosAM);
    btnAM.classList.add("ativo");
    if (btnTodos) btnTodos.classList.remove("ativo");
    if (btnPM) btnPM.classList.remove("ativo");
});

if (btnPM) btnPM.addEventListener("click", () => {
    const dadosPM = dadosFarol.filter(item =>
        String(item.EXP || "").toUpperCase() === "PM"
    );
    atualizarCardsFarol(dadosPM);
    btnPM.classList.add("ativo");
    if (btnTodos) btnTodos.classList.remove("ativo");
    if (btnAM) btnAM.classList.remove("ativo");
});

// Atualização da lateral removida: não bloqueia o dashboard.
function atualizarSidebar() {
    const elemento = document.getElementById("ultimaAtualizacaoSidebar");
    if (!elemento) return;

    const agora = new Date();
    elemento.textContent = agora.toLocaleDateString("pt-BR") + " " +
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });
}
