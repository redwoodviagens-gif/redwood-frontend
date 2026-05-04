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
      console.error("ERRO NO FRONT:", error);
      setErro("Não foi possível buscar voos agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-8 lg:px-24 py-20">
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
          <p className="text-sm text-gray-300 mb-8">
            Use aeroportos IATA: POA, GIG, GRU, SDU, MCZ, MAO, LIS.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <label>
              Origem (IATA)
              <input
                value={origem}
                onChange={(e) => setOrigem(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label>
              Destino (IATA)
              <input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label>
              Ida
              <input
                type="date"
                value={dataIda}
                onChange={(e) => setDataIda(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>

            <label>
              Volta
              <input
                type="date"
                value={dataVolta}
                onChange={(e) => setDataVolta(e.target.value)}
                className="mt-2 w-full rounded-xl p-4 text-black font-bold"
              />
            </label>
          </div>

          <label className="block mt-4">
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

      <section className="px-8 lg:px-24 py-12 border-t border-red-700/40">
        <p className="text-yellow-400 tracking-[0.4em] text-xs mb-4">
          RESULTADOS
        </p>

        <h2 className="text-3xl font-bold mb-8">Voos encontrados</h2>

        {resultados.length === 0 && !loading && (
          <div className="border border-yellow-500/30 rounded-2xl p-8 text-blue-100">
            Faça uma busca para visualizar as oportunidades disponíveis.
          </div>
        )}

        <div className="grid gap-6">
          {resultados.map((voo) => (
            <div
              key={voo.id}
              className="bg-[#030918] border border-yellow-500/30 rounded-2xl p-6"
            >
              <div className="flex justify-between gap-6 flex-wrap">
                <div>
                  <h3 className="text-2xl font-bold">
                    {voo.airline || "Companhia aérea"}
                  </h3>

                  <p className="text-blue-100 mt-2">
                    {voo.origin} → {voo.destination}
                  </p>

                  <p className="text-sm text-gray-400 mt-2">
                    Duração: {voo.duration || "Não informado"} |{" "}
                    {voo.stops === 0
                      ? "Voo direto"
                      : `${voo.stops} parada(s)`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-400">A partir de</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {voo.priceText}
                  </p>

                  <a
                    href={`https://wa.me/55${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "5599999999999"}?text=Olá, quero cotar essa passagem ${voo.origin} para ${voo.destination} por ${voo.priceText}`}
                    target="_blank"
                    className="inline-block mt-4 bg-green-500 text-black font-bold px-5 py-3 rounded-xl"
                  >
                    Chamar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
