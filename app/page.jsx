"use client";

import { useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "55992290849";

const formatCurrency = (value, currency = "BRL") => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(number);
};

const normalizePrice = (flight) => {
  const raw =
    flight?.price ??
    flight?.total_amount ??
    flight?.totalAmount ??
    flight?.amount ??
    flight?.total ??
    0;

  const value = Number(raw);
  const currency = flight?.currency || flight?.total_currency || "BRL";

  // Enquanto a Duffel estiver em test mode, pode vir em USD.
  // Para produção, o ideal é o backend já devolver BRL.
  if (currency === "USD") return { value: value * 5.2, currency: "BRL" };
  return { value, currency };
};

const buildWhatsAppLink = (flight, search) => {
  const { value } = normalizePrice(flight);
  const route = `${search.origin} → ${search.destination}`;
  const airline = flight?.airline || flight?.carrier || flight?.company || "Companhia a confirmar";
  const text = `Olá, Redwood Viagens! Tenho interesse nessa passagem:\n\nRota: ${route}\nIda: ${search.departureDate}\nVolta: ${search.returnDate || "sem volta"}\nCompanhia: ${airline}\nValor encontrado: ${formatCurrency(value)}\n\nPode verificar disponibilidade para mim?`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
};

function PriceGauge({ percent = 68 }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const circumference = 251.2;
  const dash = (safePercent / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 drop-shadow-[0_0_22px_rgba(212,175,55,0.35)]">
        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="13" />
        <circle
          cx="60"
          cy="60"
          r="40"
          fill="none"
          stroke="url(#redwoodGauge)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <defs>
          <linearGradient id="redwoodGauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="55%" stopColor="#F5C542" />
            <stop offset="100%" stopColor="#E53935" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute text-center">
        <div className="text-5xl font-black text-white">{safePercent}%</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">risco de alta</div>
      </div>
    </div>
  );
}

function FlightCard({ flight, search, onAlert }) {
  const { value } = normalizePrice(flight);
  const airline = flight?.airline || flight?.carrier || flight?.company || "Companhia a confirmar";
  const departure = flight?.departureTime || flight?.departure_time || flight?.departure || "Horário a confirmar";
  const arrival = flight?.arrivalTime || flight?.arrival_time || flight?.arrival || "Horário a confirmar";

  return (
    <article className="group rounded-3xl border border-white/10 bg-[#020617]/90 p-6 shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/70 hover:shadow-[0_0_35px_rgba(212,175,55,0.18)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">{search.origin} → {search.destination}</h3>
          <p className="mt-1 text-sm text-[#CBD5E1]">{airline}</p>
        </div>
        <div className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2 text-[#D4AF37]">✈</div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-[#CBD5E1]">Melhor valor encontrado</p>
        <p className="mt-1 text-4xl font-black text-[#D4AF37]">{formatCurrency(value)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-[#CBD5E1]">
        <div>
          <p className="font-bold text-white">Saída</p>
          <p>{departure}</p>
        </div>
        <div>
          <p className="font-bold text-white">Chegada</p>
          <p>{arrival}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <a
          href={buildWhatsAppLink(flight, search)}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-5 py-3 text-center font-black text-[#020817] shadow-lg shadow-[#D4AF37]/20 transition hover:scale-[1.01]"
        >
          💬 Falar com especialista agora
        </a>
        <button
          type="button"
          onClick={() => onAlert(flight)}
          className="w-full rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-3 font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/20"
        >
          🔔 Ser avisado quando baixar
        </button>
      </div>
    </article>
  );
}

export default function Home() {
  const [search, setSearch] = useState({
    origin: "POA",
    destination: "GIG",
    departureDate: "2026-06-12",
    returnDate: "2026-06-17",
    passengers: 1,
  });

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [alertForm, setAlertForm] = useState({ name: "", whatsapp: "", targetPrice: "" });
  const [alertStatus, setAlertStatus] = useState("");

  const bestFlight = useMemo(() => {
    if (!flights.length) return null;
    return [...flights].sort((a, b) => normalizePrice(a).value - normalizePrice(b).value)[0];
  }, [flights]);

  const bestPrice = bestFlight ? normalizePrice(bestFlight).value : 0;
  const averagePrice = flights.length
    ? flights.reduce((sum, flight) => sum + normalizePrice(flight).value, 0) / flights.length
    : 0;

  const riskPercent = bestPrice && averagePrice
    ? Math.min(92, Math.max(38, Math.round(((averagePrice - bestPrice) / Math.max(bestPrice, 1)) * 100 + 55)))
    : 68;

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFlights([]);

    try {
      const response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(search),
      });

      if (!response.ok) throw new Error("Não foi possível buscar voos agora.");

      const data = await response.json();
      const results = data?.flights || data?.offers || data?.data || [];
      setFlights(Array.isArray(results) ? results : []);
    } catch (err) {
      setError(err.message || "Erro ao buscar voos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAlert(event) {
    event.preventDefault();
    if (!selectedFlight) return;

    setAlertStatus("Salvando alerta...");

    try {
      const { value } = normalizePrice(selectedFlight);
      const payload = {
        origin: search.origin,
        destination: search.destination,
        departure_date: search.departureDate,
        return_date: search.returnDate,
        passengers: search.passengers,
        target_price: Number(alertForm.targetPrice || value),
        name: alertForm.name,
        whatsapp: alertForm.whatsapp,
        airline: selectedFlight?.airline || selectedFlight?.carrier || selectedFlight?.company || "Companhia a confirmar",
        flight_summary: `${search.origin} → ${search.destination} | ${formatCurrency(value)}`,
      };

      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Não foi possível salvar o alerta.");

      setAlertStatus("✅ Alerta criado! A Redwood vai acompanhar esse preço para você.");
      setTimeout(() => {
        setSelectedFlight(null);
        setAlertForm({ name: "", whatsapp: "", targetPrice: "" });
        setAlertStatus("");
      }, 1800);
    } catch (err) {
      setAlertStatus(`❌ ${err.message || "Erro ao criar alerta."}`);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020817] text-white">
      <section className="relative min-h-[720px] border-b border-[#E53935]/35">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(11,31,58,0.75),transparent_38%),linear-gradient(135deg,#020817_0%,#061327_45%,#0B1F3A_100%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute -right-24 top-10 h-96 w-96 rounded-full bg-[#E53935]/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-white/5 text-2xl shadow-xl">✈️</div>
            <div>
              <p className="text-xl font-black tracking-wide text-white">REDWOOD</p>
              <p className="text-xs font-bold tracking-[0.45em] text-[#E53935]">VIAGENS</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-6 py-3 font-black text-[#020817] shadow-lg shadow-[#D4AF37]/20 md:block"
          >
            Cotação grátis
          </a>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-8 flex items-center gap-4 text-xs font-black uppercase tracking-[0.45em] text-[#D4AF37]">
              <span className="h-px w-14 bg-[#D4AF37]" /> Redwood Viagens
            </div>

            <h1 className="max-w-3xl font-serif text-5xl font-light leading-[1.04] text-white md:text-7xl">
              Viaje com economia, <span className="italic text-[#D4AF37]">segurança</span> e inteligência.
            </h1>

            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-[#CBD5E1]">
              Busque passagens aéreas, compare oportunidades e receba alertas quando o preço baixar. A Redwood acompanha sua viagem do planejamento ao retorno.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#busca" className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-7 py-4 font-black text-[#020817] shadow-xl shadow-[#D4AF37]/20 transition hover:scale-[1.02]">
                Buscar melhores preços →
              </a>
              <a href="#resultados" className="rounded-full border border-[#D4AF37]/40 bg-white/5 px-7 py-4 font-bold text-white transition hover:bg-white/10">
                Ver oportunidades
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold text-[#CBD5E1]">
              <span>🛡️ Cadastro seguro</span>
              <span>🎧 Suporte 24h</span>
              <span>⭐ Atendimento humano</span>
            </div>
          </div>

          <form id="busca" onSubmit={handleSearch} className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#020617]/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-[0.26em] text-[#D4AF37]">Busca inteligente</p>
              <h2 className="mt-2 text-3xl font-black text-white">Pesquisar passagem</h2>
              <p className="mt-2 text-sm text-[#CBD5E1]">Use aeroportos IATA: POA, GIG, GRU, SDU, MCZ, LIS.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-white">
                Origem (IATA)
                <input value={search.origin} onChange={(e) => setSearch({ ...search, origin: e.target.value.toUpperCase() })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              </label>
              <label className="space-y-2 text-sm font-bold text-white">
                Destino (IATA)
                <input value={search.destination} onChange={(e) => setSearch({ ...search, destination: e.target.value.toUpperCase() })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              </label>
              <label className="space-y-2 text-sm font-bold text-white">
                Ida
                <input type="date" value={search.departureDate} onChange={(e) => setSearch({ ...search, departureDate: e.target.value })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              </label>
              <label className="space-y-2 text-sm font-bold text-white">
                Volta
                <input type="date" value={search.returnDate} onChange={(e) => setSearch({ ...search, returnDate: e.target.value })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm font-bold text-white">
              Passageiros
              <input type="number" min="1" value={search.passengers} onChange={(e) => setSearch({ ...search, passengers: Number(e.target.value) })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </label>

            <button disabled={loading} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-6 py-4 font-black text-[#020817] shadow-xl shadow-[#D4AF37]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Buscando melhores oportunidades..." : "🔎 Buscar melhores preços"}
            </button>
            {error && <p className="mt-4 rounded-2xl border border-[#E53935]/40 bg-[#E53935]/10 p-3 text-sm font-bold text-red-200">{error}</p>}
          </form>
        </div>
      </section>

      <section id="resultados" className="relative mx-auto max-w-7xl px-6 py-14">
        {bestFlight && (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#020617]/90 p-8 shadow-2xl">
              <p className="text-sm font-black uppercase tracking-[0.26em] text-[#D4AF37]">🔥 Melhor oportunidade encontrada</p>
              <h2 className="mt-3 text-5xl font-black text-white">{formatCurrency(bestPrice)}</h2>
              {averagePrice > 0 && <p className="mt-2 text-[#CBD5E1]">Média encontrada: {formatCurrency(averagePrice)}</p>}
              <p className="mt-2 font-semibold text-[#CBD5E1]">{search.origin} → {search.destination} • Saída {search.departureDate}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => setSelectedFlight(bestFlight)} className="rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-6 py-4 font-black text-[#020817] shadow-lg shadow-[#D4AF37]/20">
                  🔔 Ser avisado quando baixar
                </button>
                <a href={buildWhatsAppLink(bestFlight, search)} target="_blank" rel="noreferrer" className="rounded-2xl bg-green-600 px-6 py-4 text-center font-black text-white shadow-lg shadow-green-900/20">
                  💬 Falar com especialista agora
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#D4AF37]/30 bg-gradient-to-br from-[#111827] to-[#020617] p-7 text-center shadow-2xl shadow-black/50">
              <div className="mx-auto mb-4 w-fit rounded-full bg-[#E53935]/15 px-4 py-2 text-sm font-black text-red-200">
                ⚠️ Atenção: esse preço pode subir
              </div>
              <h3 className="text-2xl font-black text-white">Não perca essa oportunidade</h3>
              <PriceGauge percent={riskPercent} />
              <p className="mx-auto mb-5 max-w-sm text-sm leading-6 text-[#CBD5E1]">
                Quando o sistema identifica risco de alta, o melhor movimento é criar um alerta ou falar com um especialista antes que a tarifa mude.
              </p>
              <button onClick={() => setSelectedFlight(bestFlight)} className="w-full rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-5 py-4 font-black text-[#020817] shadow-lg shadow-[#D4AF37]/20">
                🔔 Criar alerta grátis agora
              </button>
              <a href={buildWhatsAppLink(bestFlight, search)} target="_blank" rel="noreferrer" className="mt-3 block w-full rounded-2xl bg-green-600 px-5 py-4 font-black text-white">
                💬 Garantir com a Redwood
              </a>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="mb-6 text-3xl font-black text-white">Voos encontrados</h2>
          {!flights.length && !loading && (
            <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#020617]/80 p-8 text-[#CBD5E1]">
              Faça uma busca para visualizar as oportunidades disponíveis.
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {flights.map((flight, index) => (
              <FlightCard key={flight?.id || index} flight={flight} search={search} onAlert={setSelectedFlight} />
            ))}
          </div>
        </div>
      </section>

      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateAlert} className="w-full max-w-lg rounded-[2rem] border border-[#D4AF37]/30 bg-[#020617] p-7 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-[#D4AF37]">Alerta Redwood</p>
                <h3 className="mt-2 text-3xl font-black text-white">Ser avisado quando baixar</h3>
                <p className="mt-2 text-sm text-[#CBD5E1]">Informe seus dados para a Redwood acompanhar essa oportunidade.</p>
              </div>
              <button type="button" onClick={() => setSelectedFlight(null)} className="rounded-full border border-white/10 px-3 py-2 text-white">✕</button>
            </div>

            <div className="space-y-4">
              <input required placeholder="Seu nome" value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              <input required placeholder="WhatsApp com DDD" value={alertForm.whatsapp} onChange={(e) => setAlertForm({ ...alertForm, whatsapp: e.target.value })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
              <input placeholder="Preço desejado" type="number" value={alertForm.targetPrice} onChange={(e) => setAlertForm({ ...alertForm, targetPrice: e.target.value })} className="w-full rounded-2xl border border-[#D4AF37]/20 bg-white/95 px-4 py-3 font-bold text-[#020817] outline-none focus:ring-2 focus:ring-[#D4AF37]" />
            </div>

            <button className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F5C542] px-5 py-4 font-black text-[#020817] shadow-lg shadow-[#D4AF37]/20">
              🔔 Criar alerta de preço grátis
            </button>
            {alertStatus && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-[#CBD5E1]">{alertStatus}</p>}
          </form>
        </div>
      )}
    </main>
  );
}
