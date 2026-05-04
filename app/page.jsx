"use client";

import { useState } from "react";

const API_URL = "https://redwood-backend-production.up.railway.app";
const WHATSAPP = "5599999999999";
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
        headers: {
          "Content-Type": "application/json",
        },
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
            strokeLinecap="butt"
            pathLength="100"
          />

          <path
            d="M 25 95 A 75 75 0 0 1 175 95"
            fill="none"
            stroke="#4ade00"
            strokeWidth="24"
            strokeLinecap="butt"
            pathLength="100"
            strokeDasharray={`${safeValue} 100`}
          />

          <text
            x="100"
            y="88"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="#000"
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
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-8 lg:px-24 py-16">
        <div>
          <img
            src="/logo-redwood.png"
            alt="Redwood Viagens"
            className="w-56 mb-10"
          />

          <h1 className="text-5xl lg:text-7xl font-serif leading-tight">
            Viaje com economia,{" "}
            <span className="text-yellow-400 italic">segurança</span> e suporte
            completo.
          </h1>

          <p className="mt-8 text-lg text-blue-100 max-w-xl">
            A Redwood busca oportunidades, acompanha a variação dos preços e
            conecta você com atendimento humano para decidir com segurança.
          </p>
        </div>

        <form
          onSubmit={buscarVoos}
          className="bg-[#020F1F] border border-yellow-500/40 rounded-3xl p-8 shadow-2xl"
        >
          <p className="text-yellow-400 tracking-[0.4em] text-xs mb-4">
            BUSCA INTELIGENTE
          </p>

          <h2 className="text-3xl font-bold mb-2">Pesquisar passagem</h2>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <label className="text-sm">
              Origem (IATA)
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label className="text-sm">
              Destino (IATA)
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label className="text-sm">
              Ida
              <input
                type="date"
                value={dataIda}
                onChange={(e) => setDataIda(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label className="text-sm">
              Volta
              <input
                type="date"
                value={dataVolta}
                onChange={(e) => setDataVolta(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>
          </div>

          <label className="block mt-4 text-sm">
            Passageiros
            <input
              type="number"
              min="1"
              value={adultos}
              onChange={(e) => setAdultos(e.target.value)}
              className="mt-2 w-full rounded-xl p-4 text-black font-bold"
            />
          </label>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-yellow-400 text-black font-bold p-4 hover:bg-yellow-300"
          >
            {loading ? "Buscando..." : "🔎 Buscar melhores preços"}
          </button>

          {erro && <p className="mt-4 text-red-400">{erro}</p>}
        </form>
      </section>

      <section className="bg-[#f3f6f9] text-black px-6 lg:px-24 py-12">
        <p className="text-yellow-600 tracking-[0.4em] text-xs mb-3">
          RESULTADOS
        </p>

        <h2 className="text-3xl font-bold mb-8 text-[#07111f]">
          Voos encontrados
        </h2>

        {resultados.length === 0 && !loading && (
          <div className="bg-white border rounded-xl p-8 text-gray-600">
            Faça uma busca para visualizar as oportunidades disponíveis.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resultados.map((voo) => {
            const probabilidade = calcularProbabilidade(voo);

            return (
              <div
                key={voo.id}
                className="bg-white border border-gray-300 rounded-xl shadow-md overflow-hidden flex flex-col w-full"
              >
                <div className="bg-gray-100 px-6 py-5 border-b flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-[#0b2545]">
                      {voo.origin} → {voo.destination}
                    </p>

                    <p className="text-sm text-gray-500">
                      {formatarData(dataIda)}{" "}
                      {dataVolta && `- ${formatarData(dataVolta)}`}
                    </p>
                  </div>

                  <span className="text-gray-500">⌄</span>
                </div>

                <div className="px-6 py-5 border-b flex items-center gap-5">
                  <div className="w-24 h-14 bg-[#24126a] rounded flex items-center justify-center p-2">
                    {voo.airlineLogo ? (
                      <img
                        src={voo.airlineLogo}
                        alt={voo.airline || "Companhia aérea"}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-white text-xs font-bold text-center">
                        {voo.airline?.slice(0, 12) || "Cia Aérea"}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xl font-bold text-[#07111f]">
                      {voo.departureTime
                        ? new Date(voo.departureTime).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "--:--"}{" "}
                      -{" "}
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

                    <p className="text-base text-[#07111f]">
                      {voo.origin}-{voo.destination}{" "}
                      {voo.stops === 0 ? "Direto" : `${voo.stops} escala(s)`}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-6 flex-1">
                  <p className="text-3xl font-bold text-[#07111f] mb-1">
                    {converterParaBRL(voo.price)}
                  </p>

                  <p className="text-sm text-gray-500 mb-3">
                    Valor original: {voo.priceText}
                  </p>

                  <div className="inline-block bg-cyan-400 text-white font-bold px-4 py-2 rounded mb-2">
                    {textoAlerta(probabilidade)}
                  </div>

                  <span className="ml-2 text-sm text-blue-600">Por quê?</span>

                  <p className="font-bold mt-6 mb-3">
                    Probabilidade de descida
                  </p>

                  <Gauge value={probabilidade} />

                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/${WHATSAPP}?text=Olá, quero reservar essa passagem ${voo.origin} para ${voo.destination} por ${converterParaBRL(
                        voo.price
                      )}. Valor original: ${voo.priceText}`}
                      target="_blank"
                      className="bg-blue-600 text-white px-5 py-3 rounded font-bold"
                    >
                      ✔ Reservar agora
                    </a>

                    <a
                      href={`https://wa.me/${WHATSAPP}?text=Quero criar alerta de preço para voo ${voo.origin} → ${voo.destination} em ${formatarData(
                        dataIda
                      )}. Me avise quando baixar. Valor atual: ${converterParaBRL(
                        voo.price
                      )}`}
                      target="_blank"
                      style={{ backgroundColor: REDWOOD_RED }}
                      className="text-white px-5 py-3 rounded font-bold hover:opacity-90"
                    >
                      🔔 Criar alerta de preço
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
