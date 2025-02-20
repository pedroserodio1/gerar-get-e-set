// script.js
const historico = [];

// Navegação
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('.menu').addEventListener('click', (e) => {
        const target = e.target.closest('.menu-item');
        if (!target) return;

        document.querySelectorAll('.menu-item.active, .section.active').forEach(el => {
            el.classList.remove('active');
        });

        const sectionId = target.dataset.section;
        target.classList.add('active');
        document.getElementById(sectionId).classList.add('active');
    });
});

// Helpers
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2');
}

function sanitizeSQL(input) {
    return input.replace(/[;'"\\]/g, '');
}

// Histórico
function atualizarHistorico() {
    const historicoDiv = document.getElementById("historico-list");
    historicoDiv.innerHTML = historico.map(item => `
        <div class="historico-item">
            <pre>${item.getter}</pre>
            <pre>${item.setter}</pre>
            <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
    `).join('');

    try {
        localStorage.setItem('historico', JSON.stringify(historico));
    } catch (e) {
        console.error('Erro no Local Storage:', e);
    }
}

// Validação
function validarEntradas() {
    const campos = [
        { id: 'nome', msg: 'Preencha o nome da variável' },
        { id: 'tipo', msg: 'Informe o tipo da variável' }
    ];

    return campos.every(({ id, msg }) => {
        const campo = document.getElementById(id);
        if (!campo.value.trim()) {
            campo.classList.add('invalid');
            campo.focus();
            setTimeout(() => campo.classList.remove('invalid'), 1000);
            alert(msg);
            return false;
        }
        return true;
    });
}

// Geradores
function gerar() {
    if (!validarEntradas()) return;

    const nome = document.getElementById("nome").value.trim();
    const tipo = document.getElementById("tipo").value.trim();
    const isList = document.getElementById("isList").checked;

    const tipoFinal = isList ? `List<${tipo}>` : tipo;
    const comentarios = document.getElementById("comentarios")?.value.trim() || '';

    const getter = `public ${tipoFinal} get${capitalize(nome)}() {\n    return this.${nome};\n}`;
    const setter = `public void set${capitalize(nome)}(${tipoFinal} ${nome}) {\n    this.${nome} = ${nome};\n}`;

    historico.push({ 
        getter: `// ${comentarios}\n${getter}`, 
        setter: `// ${comentarios}\n${setter}`,
        timestamp: Date.now()
    });

    document.getElementById("get").textContent = getter;
    document.getElementById("set").textContent = setter;
    atualizarHistorico();
}

// ALTER TABLE
function adicionarColuna() {
    const container = document.getElementById("colunas-container");
    const div = document.createElement("div");
    div.className = "coluna";
    div.innerHTML = `
        <input type="text" class="coluna-nome" placeholder="Nome da coluna">
        <input type="text" class="coluna-tipo" placeholder="Tipo (Ex: VARCHAR(255))">
        <button onclick="removerColuna(this)" class="danger">❌</button>
    `;
    container.appendChild(div);
}

// Função para gerar ALTER TABLE corrigida
function gerarAlterTable() {
  const nomeTabela = sanitizeSQL(document.getElementById("nome-tabela").value.trim());
  const colunas = document.querySelectorAll(".coluna");

  if (!nomeTabela || colunas.length === 0) {
    alert("Preencha o nome da tabela e adicione colunas!");
    return;
  }

  // Data atual no formato DDMMYYYY (ex: 20102023)
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  const dataAtual = `${dia}${mes}${ano}`;

  let sql = `DO $$\nBEGIN\n\n`;
  let colunasSQL = [];
  let colunasNomes = [];

  // Coletar colunas válidas
  colunas.forEach(coluna => {
    const nome = sanitizeSQL(coluna.querySelector(".coluna-nome").value.trim());
    const tipo = sanitizeSQL(coluna.querySelector(".coluna-tipo").value.trim());
    
    if (nome && tipo) {
      colunasSQL.push(`    ALTER TABLE public.${nomeTabela} ADD COLUMN IF NOT EXISTS ${nome} ${tipo};`);
      colunasNomes.push(nome);
    }
  });

  if (colunasSQL.length === 0) {
    alert("Preencha pelo menos uma coluna válida!");
    return;
  }

  // Verificação de existência das colunas (com AND)
  sql += `IF NOT EXISTS (\n    SELECT column_name\n    FROM information_schema.columns\n    WHERE\n        table_schema = 'public'\n        AND table_name = '${nomeTabela}'\n`;
  colunasNomes.forEach(nome => {
    sql += `        AND column_name = '${nome}'\n`;
  });
  sql += `) THEN\n\n`;

  // Comandos ALTER TABLE
  sql += colunasSQL.join('\n') + '\n\n';

  // Verificação da tabela sym_trigger_hist
  sql += `    IF EXISTS (\n        SELECT 1\n        FROM information_schema.tables\n        WHERE\n            table_schema = 'public'\n            AND table_name = 'sym_trigger_hist'\n    ) THEN\n\n`;
  sql += `        PERFORM deletetblp('${nomeTabela}');\n`;
  sql += `        PERFORM deletefunc('${nomeTabela}');\n`;
  sql += `        PERFORM deletetrigger('${nomeTabela}');\n`;
  sql += `        PERFORM corrigetblp('public.${nomeTabela}', '${nomeTabela}');\n\n`;
  sql += `    END IF;\n\n`;

  // Data estática no RAISE NOTICE
  sql += `ELSE\n    RAISE NOTICE 'campos novos ${dataAtual}';\nEND IF;\n\nEND\n$$;`;

  document.getElementById("alter-table-sql").textContent = sql;
}

// Função de sanitização aprimorada
function sanitizeSQL(input) {
  return input
      .replace(/[;'"\\]/g, '') // Remove caracteres perigosos
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();
}

// Utilitários
function copiarTexto(id) {
    navigator.clipboard.writeText(document.getElementById(id).textContent)
        .then(() => alert("Copiado!"))
        .catch(err => console.error("Erro:", err));
}

window.onload = () => {
    const stored = JSON.parse(localStorage.getItem('historico')) || [];
    historico.push(...stored);
    atualizarHistorico();
};

// Atualize os listeners dos inputs
document.getElementById("nome").addEventListener("input", gerarPreview);
document.getElementById("tipo").addEventListener("input", gerarPreview);
document.getElementById("isList").addEventListener("change", gerarPreview);

function gerarPreview() {
    if (!validarEntradas()) return;
    
    const nome = document.getElementById("nome").value.trim();
    const tipo = document.getElementById("tipo").value.trim();
    const isList = document.getElementById("isList").checked;
    
    const tipoFinal = isList ? `List<${tipo}>` : tipo;
    const getterPreview = `public ${tipoFinal} get${capitalize(nome)}() { ... }`;
    const setterPreview = `public void set${capitalize(nome)}(${tipoFinal} ${nome}) { ... }`;
    
    document.getElementById("get").textContent = getterPreview;
    document.getElementById("set").textContent = setterPreview;
}

function exportarHistorico() {
  const historicoData = JSON.stringify(historico, null, 2);
  const blob = new Blob([historicoData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-${new Date().toISOString()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// Templates padrão
let templates = {
  getter: "public {type} get{name}() {\n    return this.{name};\n}",
  setter: "public void set{name}({type} {name}) {\n    this.{name} = {name};\n}"
};

// Carregar templates do localStorage
function carregarTemplates() {
  const saved = localStorage.getItem("templates");
  if (saved) templates = JSON.parse(saved);
}

// Interface de edição (adicione ao HTML)
function abrirEditorTemplates() {
  const templateGetter = prompt("Template do Getter (use {type} e {name}):", templates.getter);
  const templateSetter = prompt("Template do Setter (use {type} e {name}):", templates.setter);
  
  if (templateGetter && templateSetter) {
      templates = { getter: templateGetter, setter: templateSetter };
      localStorage.setItem("templates", JSON.stringify(templates));
      alert("Templates atualizados!");
  }
}

function limparHistorico() {
  historico.length = 0; // Limpa a lista
  document.getElementById("historico-list").innerHTML = "";
  alert("Histórico limpo!");
}

// Gera o ALTER TABLE com as colunas adicionadas

// Função para limpar o histórico




