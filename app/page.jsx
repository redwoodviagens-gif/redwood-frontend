"use client";

import { useState } from "react";

const API_URL = "https://redwood-backend-production.up.railway.app";

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

  function calcularProbabilidade(voo) {
    const preco = Number(voo.price || 0);
    if (preco <= 120) return 83;
    if (preco <= 180) return 71;
    if (preco <= 250) return 58;
    return 42;
  }

  function Gauge({ value }) {
    return (
      <div className="relative w-44 h-24 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-44 rounded-full border-[22px] border-gray-200"></div>

        <div
          className="absolute inset-x-0 bottom-0 h-44 rounded-full border-[22px] border-green-500"
          style={{
            clipPath: "inset(0 0 50% 0)",
            transform: `rotate(${value * 1.8 - 90}deg)`,
          }}
        ></div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className="text-2xl font-bold text-black">{value}%</p>
        </div>

        <span className="absolute bottom-0 left-0 text-xs text-gray-400">0</span>
        <span className="absolute bottom-0 right-0 text-xs text-gray-400">
          100
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-8 lg:px-24 py-16">
        <div>
          <p className="text-yellow-400 tracking-[0.4em] text-sm mb-8">
            REDWOOD VIAGENS
          </p>

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
          className="bg-[#030918] border border-yellow-500/40 rounded-3xl p-8 shadow-2xl"
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
                  <div className="w-24 h-12 bg-[#24126a] text-white rounded flex items-center justify-center text-xs font-bold text-center">
                    {voo.airline?.slice(0, 12) || "Cia Aérea"}
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
                  <p className="text-3xl font-light mb-3">{voo.priceText}</p>

                  <div className="inline-block bg-cyan-400 text-white font-bold px-4 py-2 rounded mb-2">
                    Espere, o preço pode descer
                  </div>

                  <span className="ml-2 text-sm text-blue-600">Por quê?</span>

                  <p className="font-bold mt-6 mb-3">
                    Probabilidade de descida
                  </p>

                  <Gauge value={probabilidade} />

                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/5599999999999?text=Olá, quero reservar essa passagem ${voo.origin} para ${voo.destination} por ${voo.priceText}`}
                      target="_blank"
                      className="bg-blue-600 text-white px-5 py-3 rounded font-bold"
                    >
                      ✔ Reservar agora
                    </a>

                    <button className="bg-blue-500 text-white px-5 py-3 rounded font-bold">
                      🔔 Criar alerta de preço
                    </button>
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
