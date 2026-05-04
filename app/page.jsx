"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://redwood-backend-production.up.railway.app";

const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "5555992290849";

export default function Home() {
  const [form, setForm] = useState({
    origin: "POA",
    destination: "GIG",
    departureDate: "2026-06-12",
    returnDate: "2026-06-17",
    passengers: 1,
  });

  const [flights, setFlights] = useState([]);
  const [averagePrice, setAveragePrice] = useState(null);
  const [bestFlight, setBestFlight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlights([]);
    setBestFlight(null);

    try {
      const payload = {
        origin: form.origin.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase(),
        departureDate: form.departureDate,
        returnDate: form.returnDate,
        adults: Number(form.passengers || 1),
        passengers: Number(form.passengers || 1),
        provider: "duffel",
      };

      const response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Resposta backend:", data);

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar voos.");
      }

      const offers = data.offers || [];

      setFlights(offers);
      setAveragePrice(data.averagePrice || null);

      if (offers.length > 0) {
        const best = [...offers].sort((a, b) => a.price - b.price)[0];
        setBestFlight(best);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      setError("Não foi possível buscar voos agora.");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value, currency = "BRL") {
    if (!value && value !== 0) return "Consultar";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  }

  function getWhatsAppLink(flight) {
    const price = flight?.price
      ? formatCurrency(flight.price, flight.currency)
      : "valor consultado";

    const message = `Olá! Tenho interesse nessa passagem encontrada no site da Redwood Viagens:%0A%0AOrigem: ${form.origin}%0ADestino: ${form.destination}%0AIda: ${form.departureDate}%0AVolta: ${form.returnDate}%0APassageiros: ${form.passengers}%0APreço: ${price}%0A%0APode me ajudar com essa cotação?`;

    return `https://wa.me/${WHATSAPP_PHONE}?text=${message}`;
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <header className="border-b border-red-600/40 bg-[#020817]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo-redwood.png"
              alt="Redwood Viagens"
              className="h-14 w-auto object-contain"
            />
          </div>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 md:flex">
            <a href="#" className="text-[#D4AF37]">
              Início
            </a>
            <a href="#busca">Busca</a>
            <a href="#resultados">Oportunidades</a>
            <a
              href={`https://wa.me/${WHATSAPP_PHONE}`}
              target="_blank"
              className="rounded-full bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-6 py-3 font-bold text-[#020817]"
            >
              Cotação grátis
            </a>
          </nav>
        </div>
      </header>

      <section
        id="busca"
        className="relative overflow-hidden bg-gradient-to-br from-[#020817] via-[#07152c] to-[#0B1F3A]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,57,53,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.12),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-14 bg-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-[0.45em] text-[#D4AF37]">
                Redwood Viagens
              </span>
            </div>

            <h1 className="max-w-xl font-serif text-5xl leading-tight md:text-7xl">
              Viaje com economia,{" "}
              <span className="italic text-[#D4AF37]">segurança</span> e
              suporte completo.
            </h1>

            <p className="mt-8 max-w-xl text-lg font-semibold leading-8 text-[#CBD5E1]">
              A Redwood busca oportunidades, acompanha a variação dos preços e
              conecta você com atendimento humano para decidir com segurança.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#busca"
                className="rounded-full bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-8 py-4 font-bold text-[#020817] shadow-xl shadow-yellow-500/20"
              >
                Quero pesquisar agora →
              </a>

              <a
                href={`https://wa.me/${WHATSAPP_PHONE}`}
                target="_blank"
                className="rounded-full border border-[#D4AF37]/60 px-8 py-4 font-bold text-white hover:bg-[#D4AF37] hover:text-[#020817]"
              >
                Falar com especialista
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-[#CBD5E1]">
              <span>🛡️ Cadastro seguro</span>
              <span>🎧 Suporte 24h</span>
              <span>⭐ Atendimento humano</span>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="rounded-[2rem] border border-[#D4AF37]/35 bg-[#020817]/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.45em] text-[#D4AF37]">
              Busca Inteligente
            </p>

            <h2 className="text-3xl font-black">Pesquisar passagem</h2>

            <p className="mt-2 text-sm text-[#CBD5E1]">
              Use aeroportos IATA: POA, GIG, GRU, SDU, MCZ, MAO, LIS.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Origem (IATA)
                </span>
                <input
                  name="origin"
                  value={form.origin}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-white px-4 py-4 font-bold uppercase text-[#020817] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Destino (IATA)
                </span>
                <input
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-white px-4 py-4 font-bold uppercase text-[#020817] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">Ida</span>
                <input
                  type="date"
                  name="departureDate"
                  value={form.departureDate}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-white px-4 py-4 font-bold text-[#020817] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">Volta</span>
                <input
                  type="date"
                  name="returnDate"
                  value={form.returnDate}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-white px-4 py-4 font-bold text-[#020817] outline-none"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-bold">Passageiros</span>
              <input
                type="number"
                min="1"
                name="passengers"
                value={form.passengers}
                onChange={handleChange}
                className="w-full rounded-xl bg-white px-4 py-4 font-bold text-[#020817] outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-6 py-4 font-black text-[#020817] shadow-xl shadow-yellow-500/20 disabled:opacity-60"
            >
              {loading ? "Buscando oportunidades..." : "🔎 Buscar melhores preços"}
            </button>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/60 bg-red-950/40 px-4 py-4 text-sm font-bold text-red-200">
                {error}
              </div>
            )}
          </form>
        </div>
      </section>

      <section
        id="resultados"
        className="border-t border-red-600/40 bg-[#030712] px-6 py-16"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#D4AF37]">
            Resultados
          </p>

          <h2 className="mt-3 text-3xl font-black">Voos encontrados</h2>

          {bestFlight && (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-[#D4AF37]/40 bg-[#07152c] p-7 lg:col-span-2">
                <p className="text-sm font-bold text-[#D4AF37]">
                  Melhor oportunidade encontrada
                </p>

                <h3 className="mt-3 text-5xl font-black">
                  {formatCurrency(bestFlight.price, bestFlight.currency)}
                </h3>

                {averagePrice && (
                  <p className="mt-2 text-[#CBD5E1]">
                    Média encontrada:{" "}
                    {formatCurrency(averagePrice, bestFlight.currency)}
                  </p>
                )}

                <p className="mt-3 text-[#CBD5E1]">
                  {form.origin} → {form.destination} • Ida{" "}
                  {form.departureDate}
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <button className="rounded-xl bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-6 py-4 font-black text-[#020817]">
                    🔔 Ser avisado quando baixar
                  </button>

                  <a
                    href={getWhatsAppLink(bestFlight)}
                    target="_blank"
                    className="rounded-xl bg-green-600 px-6 py-4 font-black text-white"
                  >
                    💬 Falar no WhatsApp
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-950/60 to-[#020817] p-7 text-center">
                <div className="mx-auto mb-4 w-fit rounded-full bg-red-500/20 px-4 py-2 text-sm font-black text-red-200">
                  ⚠️ Atenção, preço pode mudar
                </div>

                <h3 className="text-xl font-black">
                  Chance de alteração nas próximas horas
                </h3>

                <div className="mx-auto my-7 flex h-36 w-36 items-center justify-center rounded-full border-[12px] border-[#D4AF37] bg-[#020817] shadow-2xl shadow-yellow-500/20">
                  <span className="text-4xl font-black text-[#D4AF37]">
                    {bestFlight?.prediction?.probability || 72}%
                  </span>
                </div>

                <p className="text-sm text-[#CBD5E1]">
                  Crie um alerta gratuito e a Redwood acompanha essa rota para
                  você.
                </p>
              </div>
            </div>
          )}

          {flights.length === 0 && !loading && (
            <div className="mt-8 rounded-3xl border border-[#D4AF37]/20 bg-[#020817] p-8 text-[#CBD5E1]">
              Faça uma busca para visualizar as oportunidades disponíveis.
            </div>
          )}

          {flights.length > 0 && (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {flights.map((flight, index) => (
                <div
                  key={flight.id || index}
                  className="rounded-3xl border border-white/10 bg-[#07152c] p-6 shadow-xl transition hover:border-[#D4AF37]/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">
                        {form.origin} → {form.destination}
                      </h3>
                      <p className="mt-1 text-sm text-[#CBD5E1]">
                        {flight.validatingAirlinesCodes?.join(", ") ||
                          "Companhia a confirmar"}
                      </p>
                    </div>

                    <span className="text-2xl">✈️</span>
                  </div>

                  <p className="mt-5 text-3xl font-black text-[#D4AF37]">
                    {formatCurrency(flight.price, flight.currency)}
                  </p>

                  <p className="mt-2 text-sm text-[#CBD5E1]">
                    Oferta encontrada via Duffel
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-[#CBD5E1]">
                    <div>
                      <strong className="block text-white">Ida</strong>
                      {form.departureDate}
                    </div>

                    <div>
                      <strong className="block text-white">Volta</strong>
                      {form.returnDate || "Consultar"}
                    </div>
                  </div>

                  <a
                    href={getWhatsAppLink(flight)}
                    target="_blank"
                    className="mt-6 block rounded-xl bg-green-600 px-5 py-3 text-center font-black text-white"
                  >
                    💬 Cotar no WhatsApp
                  </a>

                  <button className="mt-3 w-full rounded-xl border border-[#D4AF37]/50 px-5 py-3 font-black text-[#D4AF37]">
                    🔔 Criar alerta de preço
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
