//==================================================
// FLEET DASHBOARD v2.0
// Parte 1 - Inicialização
//==================================================

//------------------------------
// CONFIGURAÇÃO
//------------------------------

const API =
  "https://script.google.com/macros/s/AKfycbycP2THhaT_yAQFQHWPY4XubwtPjaWQOW7l5dYu_XK4ieZi3LXkihJsBZ8_jYRnGijW/exec";

let tabela = null;
let dadosOriginais = [];
let dadosFiltrados = [];

//------------------------------
// INICIALIZAÇÃO
//------------------------------

document.addEventListener("DOMContentLoaded", iniciarDashboard);

async function iniciarDashboard() {

    configurarEventos();

    await buscarDados();

    preencherFiltros();

    dadosFiltrados = [...dadosOriginais];

    atualizarTabela(dadosFiltrados);
    atualizarKPIs(dadosFiltrados);
    atualizarResumoATS(dadosFiltrados);
    atualizarFIFO(dadosFiltrados);
    atualizarPainelOperacional(dadosFiltrados);
    atualizarHorario();

    configurarNotificacoes();

    setInterval(atualizarDashboard, 60000);

}


//------------------------------
// DASHBOARD
//------------------------------

async function atualizarDashboard() {

    try {

        await buscarDados();

        // NÃO recria os filtros
        aplicarFiltros();

        atualizarPainelOperacional(dadosOriginais);

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

        // INDICADORES
        pacotes: Number(item.pacotes || 0),
        spr: Number(item.spr || 0),

        // DATA
        dataOriginal: item.idade,
        idade: calcularDias(item.idade),

        // PAINEL OPERACIONAL
        inicioExpedicao: item.inicioExpedicao ?? "--:--",
        driversHub: Number(item.driversHub || 0),
        bancadas: Number(item.bancadas || 0)

    }));

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

    // Se já existe TomSelect, não recria
    if(document.getElementById("filtroCorredor").tomselect){
        return;
    }

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

  const cidade =
document.getElementById("filtroCidade").tomselect.getValue();

const corredor =
document.getElementById("filtroCorredor").tomselect.getValue();

const agencia =
document.getElementById("filtroAgencia").tomselect.getValue();

const status =
document.getElementById("filtroStatus").tomselect.getValue();

const janela =
document.getElementById("filtroJanela").tomselect.getValue();

const idade =
document.getElementById("filtroIdade").tomselect.getValue();

    dadosFiltrados = dadosOriginais.filter(item => {

        return (
    (corredor.length===0 || corredor.includes(item.corredor)) &&
    (cidade.length===0 || cidade.includes(item.cidade)) &&
    (agencia.length===0 || agencia.includes(item.agencia)) &&
    (status.length===0 || status.includes(item.status)) &&
    (janela.length===0 || janela.includes(item.janela)) &&
    (idade.length===0 || idade.includes(item.idade))
);

    });

    atualizarTabela(dadosFiltrados);

    atualizarKPIs(dadosFiltrados);

    atualizarResumoATS(dadosFiltrados);

    atualizarFIFO(dadosFiltrados);

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

        if (el.tomselect) {

            el.tomselect.clear();

        }

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

   tabela = new DataTable("#tabelaOperacao",{

    destroy:true,

    responsive:true,

    autoWidth:false,

    deferRender:true,

    pageLength:25,

    order:[],

    language:{

        lengthMenu:"Mostrar _MENU_ resultados por página",

        search:"Buscar",

        searchPlaceholder:"Buscar AT, cidade, driver...",

        info:"Mostrando _START_ a _END_ de _TOTAL_ registros",

        zeroRecords:"Nenhum registro encontrado",

        paginate:{

            first:"«",

            previous:"‹",

            next:"›",

            last:"»"

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
    tabela.draw();
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

    let atsPiso = 0;
    let atsExpedidas = 0;
    let semAderencia = 0;
    let atribuidas = 0;

    let volumeTotal = 0;
    let pacotesPiso = 0;
    let pacotesExpedidos = 0;

    const agenciasAtribuidas = new Set([
        "SPXOWNFLEET",
        "LC TRANSPORTES",
        "ELOLOGISTICA",
        "OPTIMIZE",
        "REVERSÃO",
        "SUCESSO"
    ]);

    // ==========================
    // PERCORRE A BASE APENAS 1 VEZ
    // ==========================

    dados.forEach(r => {

        const janela = String(r.janela).trim().toUpperCase();
        const status = String(r.status).trim().toUpperCase();
        const agencia = String(r.agencia).trim().toUpperCase();
        const pacotes = Number(r.pacotes || 0);

        // Volume Total
        volumeTotal += pacotes;

        // Janelas
        if (janela === "AM") am++;
        else if (janela === "PM") pm++;
        else if (janela === "NO SHOW") atsNoShow++;

        // ATS Expedidas
        if (status === "ASSIGNED" || status === "COMPLETE") {
            atsExpedidas++;
            pacotesExpedidos += pacotes;
        }

        // ATS no Piso
        if (status === "PROCESSING" || status === "PROCESSED") {
            atsPiso++;
            pacotesPiso += pacotes;
        }

        // Sem Aderência
        if (agencia === "SEM ADERENCIA") {
            semAderencia++;
        }

        // ATS Atribuídas
        if (agenciasAtribuidas.has(agencia)) {
            atribuidas++;
        }

    });

    // ==========================
    // INDICADORES
    // ==========================

    const totalATS = am + pm + atsNoShow;

    const spr = atsExpedidas > 0
        ? (pacotesExpedidos / atsExpedidas).toFixed(2)
        : "0.00";

    // ==========================
    // ATUALIZA OS CARDS
    // ==========================

    document.getElementById("volumeTotal").textContent =
        volumeTotal.toLocaleString("pt-BR");

    document.getElementById("totalATS").textContent =
        totalATS;

    document.getElementById("atsNoShow").textContent =
        atsNoShow;

    document.getElementById("atsAtribuida").textContent =
        atribuidas;

    document.getElementById("atExpedida").textContent =
        atsExpedidas;

    document.getElementById("pctExpedido").textContent =
        pacotesExpedidos.toLocaleString("pt-BR");

    document.getElementById("atPiso").textContent =
        atsPiso;

    document.getElementById("pctPiso").textContent =
        pacotesPiso.toLocaleString("pt-BR");

    document.getElementById("semAderencia").textContent =
        semAderencia;

    document.getElementById("spr").textContent =
        spr;

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

    const am = dados.filter(r => r.janela === "AM").length;

    const pm = dados.filter(r => r.janela === "PM").length;

    const noShow = dados.filter(r => r.janela === "NO SHOW").length;

    const atribuidas = dados.filter(r => {

        const agencia = (r.agencia || "").toUpperCase();

        return [
            "SPXOWNFLEET",
            "LC TRANSPORTES",
            "ELOLOGISTICA",
            "OPTIMIZE",
            "REVERSÃO",
            "SUCESSO"
        ].includes(agencia);

    }).length;

    const expedidas = dados.filter(r => {

        const status = (r.status || "").toUpperCase();

        return status === "ASSIGNED" || status === "COMPLETE";

    }).length;

    atualizarElemento("resumoAM", am);
    atualizarElemento("resumoPM", pm);
    atualizarElemento("resumoNS", noShow);
    atualizarElemento("resumoATR", atribuidas);
    atualizarElemento("resumoEXP", expedidas);

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
                plugins: ["remove_button"],
                maxItems: null,
                hideSelected: true,
                closeAfterSelect: false,
                placeholder: "Selecione..."
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

    if (dados.length === 0) return;

    document.getElementById("inicioExpedicao").textContent =
        dados[0].inicioExpedicao || "--:--";

    document.getElementById("driversHub").textContent =
        dados[0].driversHub || 0;

    document.getElementById("bancadas").textContent =
        dados[0].bancadas || 0;

}

function configurarNotificacoes(){

    const btn = document.getElementById("btnNotificacao");
    const painel = document.getElementById("painelAlertas");
    const overlay = document.getElementById("overlayAlerta");
    const fechar = document.getElementById("fecharAlertas");

    function abrir(){

        painel.classList.add("ativo");
        overlay.classList.add("ativo");

    }

    function fecharPainel(){

        painel.classList.remove("ativo");
        overlay.classList.remove("ativo");

    }

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

    document.getElementById("listaAlertas").innerHTML = `

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

        <div class="painel-footer">

            <span>Total de alertas</span>

            <h2>${total}</h2>

            <small>
                <i class="bi bi-clock"></i>
                Última atualização: ${agora}
            </small>

        </div>

    `;

    // Apenas mostra ou esconde a bolinha do sino
    const badge = document.getElementById("badgeAlerta");

    badge.style.display = total > 0 ? "block" : "none";
}
/* ==========================
   PAINEL DESLIZANTE
========================== */

const painelPagina = document.getElementById("painelPagina");
const fecharPainel = document.getElementById("fecharPainel");

// Abrir painel
function abrirPainel() {
    painelPagina.classList.add("ativo");
}

// Fechar painel
function fecharPainelPagina() {
    painelPagina.classList.remove("ativo");
}

fecharPainel.addEventListener("click", fecharPainelPagina);
const btnVAT = document.getElementById("btnVAT");

btnVAT.addEventListener("click", function (e) {
    e.preventDefault();
    abrirPainel();
});