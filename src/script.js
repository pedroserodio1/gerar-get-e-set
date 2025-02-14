function gerar() {
  let nome = document.querySelector("#nome").value.trim();
  let tipo = document.querySelector("#tipo").value.trim();

  if (nome === "" || tipo === "") {
      alert("Preencha os campos corretamente!");
      return;
  }

  let metodo = retornaMetodo(nome);

  // Gere os métodos get e set
  let get = `public ${tipo} get${metodo}() {\n    return ${nome};\n}`;

  let set = `public void set${metodo}(${tipo} ${nome}) {\n    this.${nome} = ${nome};\n}`;

  // Atualiza os elementos no HTML
  document.querySelector("#get").textContent = get;
  document.querySelector("#set").textContent = set;
}

function retornaMetodo(nome) {
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function copiarTexto(id) {
  let texto = document.getElementById(id).innerText;
  navigator.clipboard.writeText(texto).then(() => {
      alert("Copiado para a área de transferência!");
  }).catch(err => {
      console.error("Erro ao copiar: ", err);
  });
}

function copiarTudo() {
  let getTexto = document.getElementById("get").innerText;
  let setTexto = document.getElementById("set").innerText;
  let textoCompleto = getTexto + "\n\n" + setTexto;

  navigator.clipboard.writeText(textoCompleto).then(() => {
      alert("Get e Set copiados para a área de transferência!");
  }).catch(err => {
      console.error("Erro ao copiar: ", err);
  });
}

