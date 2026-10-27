const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Primeiro número que será usado (só vale se ainda não existir contador salvo).
// Ex.: NRO_INICIAL=181 => o primeiro relatório será 000181.
const NRO_INICIAL = parseInt(process.env.NRO_INICIAL || "1", 10);

// Pasta onde o contador é gravado. No Render, aponte para o Disk (ex.: /data).
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const ARQUIVO = path.join(DATA_DIR, "contador.json");
fs.mkdirSync(DATA_DIR, { recursive: true });

// Lê o último número usado (ou NRO_INICIAL - 1 se ainda não existe).
function lerUltimo() {
  let ultimo = NRO_INICIAL - 1;
  try {
    const v = JSON.parse(fs.readFileSync(ARQUIVO, "utf8")).ultimo;
    if (Number.isInteger(v) && v > ultimo) ultimo = v;
  } catch (e) {
    /* arquivo ainda não existe */
  }
  return ultimo;
}

// Incrementa e grava. Node roda em uma única thread e esta função é síncrona,
// então duas pessoas clicando ao mesmo tempo nunca recebem o mesmo número.
function proximoNumero() {
  const numero = lerUltimo() + 1;
  const tmp = ARQUIVO + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ ultimo: numero }));
  fs.renameSync(tmp, ARQUIVO); // troca atômica: nunca deixa o arquivo pela metade
  return numero;
}

app.disable("x-powered-by");

app.post("/api/proximo-numero", (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ numero: proximoNumero() });
  } catch (e) {
    console.error("Erro ao gerar número:", e);
    res.status(500).json({ erro: "falha ao gerar número" });
  }
});

// Só consulta, não incrementa (útil para conferir).
app.get("/api/ultimo-numero", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ultimo: lerUltimo() });
});

app.get("/healthz", (req, res) => res.send("ok"));

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Contador salvo em: ${ARQUIVO} (último: ${lerUltimo()})`);
});
