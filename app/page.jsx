"use client";

import { useState } from "react";

const API_URL = "https://redwood-backend-production.up.railway.app";
const WHATSAPP = "55992290849";
const REDWOOD_RED = "#e42320";
const DOLAR_FIXO = 5.4;

export default function Home() {
  const [origem, setOrigem] = useState("POA");
  const [destino, setDestino] = useState("GIG");
  const [dataIda, setDataIda] = useState("2026-06-12");
  const [dataVolta, setDataVolta] = useState("2026-06-17");
  const [adultos, setAdultos] = useState(1);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [vooSelecionado, setVooSelecionado] = useState(null);
  const [leadNome, setLeadNome] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [precoDesejado, setPrecoDesejado] = useState("");

  async function buscarVoos(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setErro("");
      setResultados([]);

      const payload = {
        origin: origem.toUpperCase().trim(),
        destination: destino.toUpperCase().trim(),
        departureDate: dataIda,
        returnDate: dataVolta || null,
        adults: Number(adultos || 1),
      };

      const response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Erro ao buscar voos");
      }

      setResultados(Array.isArray(data.flights) ? data.flights : []);
    } catch (error) {
      console.error(error);
      setErro("Não foi possível buscar voos agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function converterParaBRL(valorUSD) {
    const valor = Number(valorUSD || 0) * DOLAR_FIXO;

    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function calcularPrecoBRLNumero(valorUSD) {
    return Number((Number(valorUSD || 0) * DOLAR_FIXO).toFixed(2));
  }

  function calcularProbabilidade(voo) {
    const preco = Number(voo.price || 0);

    if (preco <= 120) return 83;
    if (preco <= 180) return 71;
    if (preco <= 250) return 58;
    return 42;
  }

  function textoAlerta(probabilidade) {
    if (probabilidade >= 70) return "🔥 Espere, o preço pode cair";
    if (probabilidade >= 50) return "⚠️ Fique atento, pode variar";
    return "🚀 Boa oportunidade para comprar";
  }

  function gerarDecisao(voo, probabilidade) {
    const preco = Number(voo.price || 0);

    if (preco <= 120 || probabilidade <= 45) {
      return {
        texto: "🟢 COMPRE AGORA",
        cor: "bg-green-500 text-white",
        descricao: "Boa oportunidade para emitir agora.",
      };
    }

    if (probabilidade >= 60) {
      return {
        texto: "🟡 ESPERE",
        cor: "bg-yellow-400 text-black",
        descricao: "Alta chance de o preço variar nos próximos dias.",
      };
    }

    return {
      texto: "🔴 PREÇO ALTO",
      cor: "bg-red-500 text-white",
      descricao: "Pode aparecer uma condição melhor depois.",
    };
  }

  function limparRecomendacao(texto) {
    return texto.replace(/[🟢🟡🔴]/g, "").trim();
  }

  function abrirModalAlerta(voo, decisao) {
    setVooSelecionado({ voo, decisao });
    setLeadNome("");
    setLeadWhatsapp("");
    setLeadEmail("");
    setPrecoDesejado("");
    setModalAberto(true);
  }

  async function salvarAlertaComLead() {
    try {
      if (!vooSelecionado) return;

      if (!leadNome || !leadWhatsapp) {
        alert("Preencha nome e WhatsApp para criar o alerta.");
        return;
      }

      const { voo, decisao } = vooSelecionado;

      await fetch(`${API_URL}/api/price-alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: leadNome,
          whatsapp: leadWhatsapp,
          email: leadEmail,
          origem: voo.origin,
          destino: voo.destination,
          dataIda: dataIda,
          dataVolta: dataVolta,
          passageiros: Number(adultos || 1),
          precoAtual: calcularPrecoBRLNumero(voo.price),
          moeda: "BRL",
          precoDesejado: precoDesejado ? Number(precoDesejado) : null,
          companhia: voo.airline || "",
          codigoCompanhia: "",
          horarioIda: voo.departureTime || "",
          horarioVolta: voo.arrivalTime || "",
          offerId: voo.id,
          provider: "duffel",
          observacoes: `Alerta criado pelo site Redwood Viagens. Recomendação: ${limparRecomendacao(
            decisao.texto
          )}`,
          campanha: "site-redwood",
          raw: voo,
        }),
      });

      const mensagemWhatsApp = encodeURIComponent(
        `Olá! Quero criar um alerta de preço na Redwood Viagens:

👤 Nome: ${leadNome}
📲 WhatsApp do cliente: ${leadWhatsapp}
📧 Email: ${leadEmail || "Não informado"}

✈️ Trecho: ${voo.origin} → ${voo.destination}
📅 Ida: ${formatarData(dataIda)}
📅 Volta: ${dataVolta ? formatarData(dataVolta) : "Não informada"}
👥 Passageiros: ${adultos}

💰 Valor atual: ${converterParaBRL(voo.price)}
🎯 Preço desejado: ${
          precoDesejado ? `R$ ${precoDesejado}` : "Não informado"
        }
📊 Recomendação atual: ${limparRecomendacao(decisao.texto)}

Pode me avisar quando esse preço baixar?`
      );

      setModalAberto(false);

      window.open(`https://wa.me/${WHATSAPP}?text=${mensagemWhatsApp}`, "_blank");
    } catch (error) {
      console.error("Erro ao salvar alerta:", error);
      alert("Não foi possível criar o alerta agora. Tente novamente.");
    }
  }

  function Gauge({ value }) {
    const safeValue = Math.min(Math.max(value, 0), 100);

    return (
      <div className="w-48">
        <svg viewBox="0 0 200 115" className="w-full h-auto">
          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="24"
            pathLength="100"
          />

          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="#4ade00"
            strokeWidth="24"
            pathLength="100"
            strokeDasharray={`${safeValue} 100`}
          />

          <text
            x="100"
            y="88"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
          >
            {safeValue}%
          </text>

          <text x="22" y="112" fontSize="11" fill="#9ca3af">
            0
          </text>

          <text x="166" y="112" fontSize="11" fill="#9ca3af">
            100
          </text>
        </svg>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#031B34] text-white">
      <header className="sticky top-0 z-50 bg-[#020F1F]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
          <img
            src="/logo-redwood.png"
            alt="Redwood Viagens"
            className="h-16 w-auto object-contain"
          />

          <nav className="hidden md:flex items-center gap-8 text-sm text-blue-100">
            <a href="#" className="hover:text-yellow-400">
              Passagens
            </a>
            <a href="#" className="hover:text-yellow-400">
              Pacotes
            </a>
            <a href="#" className="hover:text-yellow-400">
              Seguros
            </a>
            <a href="#" className="hover:text-yellow-400">
              Atendimento
            </a>
          </nav>

          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            className="hidden md:inline-flex bg-[#e42320] text-white font-bold px-5 py-3 rounded-xl shadow-lg hover:opacity-90"
          >
            Falar com especialista
          </a>
        </div>
      </header>

      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 px-6 lg:px-10 py-20 items-center">
        <div>
          <p className="text-yellow-400 tracking-[0.35em] text-xs mb-6">
            REDWOOD VIAGENS
          </p>

          <h1 className="text-5xl lg:text-7xl font-serif leading-tight">
            Viaje com economia,{" "}
            <span className="text-yellow-400 italic">segurança</span> e suporte
            completo.
          </h1>

          <p className="mt-8 text-lg text-blue-100 max-w-xl">
            Buscamos oportunidades reais, acompanhamos a variação dos preços e
            conectamos você com atendimento humano para decidir com segurança.
          </p>

          <div className="mt-8 flex flex-wrap gap-4 text-sm text-blue-100">
            <span>🛡️ Compra segura</span>
            <span>🎧 Suporte humano</span>
            <span>✈️ Passagens e pacotes</span>
          </div>
        </div>

        <form
          onSubmit={buscarVoos}
          className="bg-[#020F1F] border border-yellow-500/40 rounded-3xl p-8 shadow-2xl"
        >
          <p className="text-yellow-400 tracking-[0.35em] text-xs mb-4">
            BUSCA INTELIGENTE
          </p>

          <h2 className="text-3xl font-bold mb-6">Pesquisar passagem</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              placeholder="Origem"
              className="p-4 text-black rounded-xl font-bold"
            />

            <input
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Destino"
              className="p-4 text-black rounded-xl font-bold"
            />

            <input
              type="date"
              value={dataIda}
              onChange={(e) => setDataIda(e.target.value)}
              className="p-4 text-black rounded-xl font-bold"
            />

            <input
              type="date"
              value={dataVolta}
              onChange={(e) => setDataVolta(e.target.value)}
              className="p-4 text-black rounded-xl font-bold"
            />
          </div>

          <input
            type="number"
            min="1"
            value={adultos}
            onChange={(e) => setAdultos(e.target.value)}
            className="mt-4 p-4 w-full text-black rounded-xl font-bold"
          />

          <button className="mt-6 w-full bg-yellow-400 text-black p-4 rounded-xl font-bold hover:bg-yellow-300">
            {loading ? "Buscando..." : "🔎 Buscar melhores preços"}
          </button>

          {erro && <p className="text-red-400 mt-3">{erro}</p>}
        </form>
      </section>

      <section className="bg-[#f3f6f9] text-black px-6 lg:px-24 py-12">
        <h2 className="text-3xl font-bold mb-8">Voos encontrados</h2>

        {resultados.length === 0 && !loading && (
          <div className="bg-white border rounded-xl p-8 text-gray-600">
            Faça uma busca para visualizar as oportunidades disponíveis.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resultados.map((voo) => {
            const prob = calcularProbabilidade(voo);
            const decisao = gerarDecisao(voo, prob);

            const mensagemReserva = encodeURIComponent(
              `Olá! Vi uma passagem no site da Redwood Viagens:

✈️ Trecho: ${voo.origin} → ${voo.destination}
📅 Data: ${formatarData(dataIda)}
💰 Valor encontrado: ${converterParaBRL(voo.price)}
📊 Recomendação: ${limparRecomendacao(decisao.texto)}

Pode me ajudar a confirmar disponibilidade e emitir?`
            );

            return (
              <div
                key={voo.id}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                <div className="bg-gray-100 px-6 py-5 flex justify-between">
                  <div>
                    <p className="font-semibold">
                      {voo.origin} → {voo.destination}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatarData(dataIda)}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center">
                    {voo.airlineLogo ? (
                      <img
                        src={voo.airlineLogo}
                        alt={voo.airline || "Companhia aérea"}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-bold">
                        {voo.airline || "Cia"}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="font-bold">
                      {voo.departureTime
                        ? new Date(voo.departureTime).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "--:--"}
                      {" - "}
                      {voo.arrivalTime
                        ? new Date(voo.arrivalTime).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "--:--"}
                    </p>

                    <p>
                      {voo.origin}-{voo.destination}{" "}
                      {voo.stops === 0 ? "Direto" : `${voo.stops} escala(s)`}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div
                    className={`inline-block px-4 py-2 rounded-lg font-bold mb-2 ${decisao.cor}`}
                  >
                    {decisao.texto}
                  </div>

                  <p className="text-sm text-gray-500 mb-4">
                    {decisao.descricao}
                  </p>

                  <p className="text-3xl font-bold mb-2">
                    {converterParaBRL(voo.price)}
                  </p>

                  <div className="bg-cyan-400 text-white px-4 py-2 rounded inline-block">
                    {textoAlerta(prob)}
                  </div>

                  <p className="mt-5 font-bold">Probabilidade de descida</p>

                  <Gauge value={prob} />

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/${WHATSAPP}?text=${mensagemReserva}`}
                      target="_blank"
                      className="bg-blue-600 text-white px-4 py-3 rounded font-bold"
                    >
                      Reservar
                    </a>

                    <button
                      onClick={() => abrirModalAlerta(voo, decisao)}
                      style={{ backgroundColor: REDWOOD_RED }}
                      className="text-white px-4 py-3 rounded font-bold"
                    >
                      🔔 Criar Alerta de Preço
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] px-4">
          <div className="bg-white text-black p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-[#031B34]">
              Criar alerta de preço
            </h2>

            <p className="text-sm text-gray-600 mb-5">
              Preencha seus dados para a Redwood avisar quando aparecer uma
              melhor oportunidade.
            </p>

            <input
              placeholder="Seu nome"
              value={leadNome}
              onChange={(e) => setLeadNome(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            <input
              placeholder="WhatsApp com DDD"
              value={leadWhatsapp}
              onChange={(e) => setLeadWhatsapp(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            <input
              placeholder="Email (opcional)"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              className="w-full p-3 border rounded-xl mb-3"
            />

            <input
              placeholder="Preço desejado em R$ (opcional)"
              value={precoDesejado}
              onChange={(e) => setPrecoDesejado(e.target.value)}
              className="w-full p-3 border rounded-xl mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={salvarAlertaComLead}
                style={{ backgroundColor: REDWOOD_RED }}
                className="text-white px-4 py-3 rounded-xl font-bold w-full"
              >
                Salvar alerta
              </button>

              <button
                onClick={() => setModalAberto(false)}
                className="bg-gray-200 px-4 py-3 rounded-xl font-bold w-full"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
