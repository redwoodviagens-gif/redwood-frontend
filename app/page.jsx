"use client";

import { useMemo, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const WHATSAPP_NUMBER = "5555992290849";

const formatBRL = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(number);
};

const normalizePrice = (flight) => {
  const raw =
    flight?.priceBRL ??
    flight?.price_brl ??
    flight?.total_amount_brl ??
    flight?.totalAmountBRL ??
    flight?.price ??
    flight?.amount ??
    flight?.total_amount ??
    flight?.totalAmount ??
    0;

  const currency = String(
    flight?.currency || flight?.total_currency || flight?.price_currency || "BRL"
  ).toUpperCase();

  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;

  // Apenas para exibição quando a Duffel estiver em sandbox/teste retornando USD.
  if (currency === "USD") return value * 5.2;
  return value;
};

const normalizeFlights = (data) => {
  const list =
    data?.flights ||
    data?.offers ||
    data?.data ||
    data?.results ||
    data?.items ||
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    const firstSlice = item?.slices?.[0];
    const firstSegment = firstSlice?.segments?.[0];
    const lastSegment = firstSlice?.segments?.[firstSlice?.segments?.length - 1];

    const airline =
      item?.airline ||
      item?.airlineName ||
      item?.owner?.name ||
      firstSegment?.marketing_carrier?.name ||
      firstSegment?.operating_carrier?.name ||
      "Companhia aérea";

    const origin =
      item?.origin ||
      item?.origin_iata ||
      firstSlice?.origin?.iata_code ||
      firstSegment?.origin?.iata_code ||
      "Origem";

    const destination =
      item?.destination ||
      item?.destination_iata ||
      firstSlice?.destination?.iata_code ||
      lastSegment?.destination?.iata_code ||
      "Destino";

    const departure =
      item?.departure ||
      item?.departure_time ||
      item?.departureTime ||
      firstSegment?.departing_at ||
      firstSlice?.departure_time ||
      "";

    const arrival =
      item?.arrival ||
      item?.arrival_time ||
      item?.arrivalTime ||
      lastSegment?.arriving_at ||
      firstSlice?.arrival_time ||
      "";

    const stops = item?.stops ?? Math.max(0, (firstSlice?.segments?.length || 1) - 1);

    return {
      id: item?.id || `flight-${index}`,
      origin,
      destination,
      airline,
      departure,
      arrival,
      stops,
      price: normalizePrice(item),
      raw: item,
    };
  });
};

const formatDateTime = (value) => {
  if (!value) return "A confirmar";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
};

export default function Page() {
  const [form, setForm] = useState({
    origin: "POA",
    destination: "GIG",
    departureDate: "2026-06-12",
    returnDate: "2026-06-17",
    passengers: 1,
  });

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [alertForm, setAlertForm] = useState({ name: "", whatsapp: "", targetPrice: "" });
  const [alertStatus, setAlertStatus] = useState("");

  const bestFlight = useMemo(() => {
    if (!flights.length) return null;
    return [...flights].sort((a, b) => a.price - b.price)[0];
  }, [flights]);

  const averagePrice = useMemo(() => {
    if (!flights.length) return 0;
    return flights.reduce((sum, flight) => sum + flight.price, 0) / flights.length;
  }, [flights]);

  const economyPercent = useMemo(() => {
    if (!bestFlight || !averagePrice || averagePrice <= bestFlight.price) return 0;
    return Math.round(((averagePrice - bestFlight.price) / averagePrice) * 100);
  }, [bestFlight, averagePrice]);

  const priceRisk = useMemo(() => {
    if (!bestFlight) return 68;
    const base = 60 + Math.min(24, economyPercent || 8);
    return Math.max(62, Math.min(89, base));
  }, [bestFlight, economyPercent]);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const searchPayload = {
    origin: form.origin.trim().toUpperCase(),
    destination: form.destination.trim().toUpperCase(),
    departureDate: form.departureDate,
    returnDate: form.returnDate,
    passengers: Number(form.passengers || 1),
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSearched(true);
    setFlights([]);

    try {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL não está configurada na Vercel.");
      }

      let response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload),
      });

      // Fallback para backends que estejam aceitando GET com query string.
      if (response.status === 404 || response.status === 405) {
        const params = new URLSearchParams(searchPayload).toString();
        response = await fetch(`${API_URL}/api/flights?${params}`);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Não foi possível buscar voos agora.");
      }

      const normalized = normalizeFlights(data);
      setFlights(normalized);
      if (!normalized.length) setError("Nenhuma oportunidade encontrada para essa busca.");
    } catch (err) {
      setError(err?.message || "Não foi possível buscar voos agora.");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsapp = (flight = bestFlight) => {
    const price = flight?.price ? formatBRL(flight.price) : "sob consulta";
    const message = encodeURIComponent(
      `Olá, Redwood Viagens! Quero cotar esta passagem:\n\n${form.origin.toUpperCase()} → ${form.destination.toUpperCase()}\nIda: ${form.departureDate}\nVolta: ${form.returnDate}\nValor encontrado: ${price}\n\nPode me ajudar a garantir essa oportunidade?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const openAlertModal = (flight = bestFlight) => {
    setSelectedFlight(flight || {
      origin: form.origin,
      destination: form.destination,
      airline: "Redwood Viagens",
      price: 0,
    });
    setAlertStatus("");
    setAlertForm((prev) => ({
      ...prev,
      targetPrice: flight?.price ? String(Math.max(1, Math.floor(flight.price * 0.95))) : prev.targetPrice,
    }));
  };

  const closeAlertModal = () => {
    setSelectedFlight(null);
    setAlertStatus("");
  };

  const handleCreateAlert = async (event) => {
    event.preventDefault();
    setAlertStatus("salvando");

    try {
      if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não está configurada na Vercel.");

      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin.trim().toUpperCase(),
          destination: form.destination.trim().toUpperCase(),
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          targetPrice: Number(alertForm.targetPrice || 0),
          name: alertForm.name,
          whatsapp: alertForm.whatsapp,
          airline: selectedFlight?.airline || bestFlight?.airline || "",
          flightSummary: selectedFlight
            ? `${selectedFlight.origin} → ${selectedFlight.destination} | ${selectedFlight.airline} | ${formatBRL(selectedFlight.price)}`
            : `${form.origin} → ${form.destination}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || "Erro ao criar alerta.");
      setAlertStatus("sucesso");
    } catch (err) {
      setAlertStatus(err?.message || "Erro ao criar alerta.");
    }
  };

  return (
    <main className="min-h-screen bg-[#050912] text-white">
      <section className="relative min-h-[720px] overflow-hidden border-b border-[#991B1B]/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_0%,rgba(30,58,138,0.45),transparent_34%),linear-gradient(90deg,rgba(2,6,23,.98)_0%,rgba(2,6,23,.88)_42%,rgba(2,6,23,.68)_68%,rgba(2,6,23,.98)_100%)]" />
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_72%_8%,rgba(255,255,255,.14),transparent_20%),linear-gradient(115deg,transparent_0%,rgba(12,45,83,.55)_48%,transparent_78%)]" />
        <div className="absolute right-0 top-0 hidden h-52 w-[48%] rounded-bl-[120px] bg-gradient-to-l from-[#0B1F3A]/80 to-transparent opacity-80 lg:block" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div className="flex items-center gap-4">
            <img
              src="/logo-redwood.png"
              alt="Redwood Viagens"
              className="h-14 w-14 rounded-full object-cover ring-1 ring-[#D4AF37]/45"
            />
            <div className="leading-none">
              <p className="text-2xl font-semibold tracking-[0.08em] text-white">REDWOOD</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.48em] text-[#E53935]">VIAGENS</p>
            </div>
          </div>

          <nav className="hidden items-center gap-9 text-sm font-bold text-white/70 lg:flex">
            <a className="text-[#D4AF37]" href="#search-box">Início</a>
            <a href="#results" className="hover:text-white">Busca</a>
            <a href="#results" className="hover:text-white">Oportunidades</a>
            <button onClick={() => openWhatsapp()} className="rounded-full bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-7 py-3 font-black text-[#070B16] shadow-lg shadow-[#D4AF37]/20">
              Cotação grátis
            </button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pt-24">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-14 bg-[#D4AF37]" />
              <span className="text-xs font-black uppercase tracking-[0.55em] text-[#D4AF37]">Redwood Viagens</span>
            </div>

            <h1 className="max-w-3xl text-[3.25rem] font-serif leading-[0.98] tracking-[-0.04em] text-white md:text-[5.5rem]">
              Viaje com economia,
              <span className="block italic text-[#D4AF37]">segurança</span>
              <span className="block">e suporte completo.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg font-semibold leading-8 text-white/75">
              A Redwood Viagens busca oportunidades, acompanha a variação dos preços e conecta você com atendimento humano para decidir com segurança.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => document.getElementById("search-box")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-full bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-8 py-4 text-sm font-black text-[#070B16] shadow-[0_20px_45px_rgba(212,175,55,.25)] transition hover:-translate-y-0.5"
              >
                Quero pesquisar agora →
              </button>
              <button
                onClick={() => openWhatsapp()}
                className="rounded-full border border-[#D4AF37]/45 bg-white/5 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-[#D4AF37]/10"
              >
                Falar com especialista
              </button>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 text-sm font-bold text-white/65">
              <span>🛡️ Cadastro seguro</span>
              <span>🎧 Suporte 24h</span>
              <span>⭐ Atendimento humano</span>
            </div>
          </div>

          <form
            id="search-box"
            onSubmit={handleSearch}
            className="rounded-[2rem] border border-[#D4AF37]/30 bg-[#070B16]/88 p-6 shadow-[0_28px_90px_rgba(0,0,0,.55)] backdrop-blur-xl md:p-8"
          >
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#D4AF37]">Busca inteligente</p>
              <h2 className="mt-3 text-3xl font-black text-white">Pesquisar passagem</h2>
              <p className="mt-2 text-sm text-white/65">Use aeroportos IATA: POA, GIG, GRU, SDU, MCZ, MAO, LIS.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-white">Origem (IATA)</span>
                <input value={form.origin} onChange={(e) => updateForm("origin", e.target.value.toUpperCase())} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-black uppercase text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" placeholder="POA" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-white">Destino (IATA)</span>
                <input value={form.destination} onChange={(e) => updateForm("destination", e.target.value.toUpperCase())} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-black uppercase text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" placeholder="GIG" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-white">Ida</span>
                <input type="date" value={form.departureDate} onChange={(e) => updateForm("departureDate", e.target.value)} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-black text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-white">Volta</span>
                <input type="date" value={form.returnDate} onChange={(e) => updateForm("returnDate", e.target.value)} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-black text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-black text-white">Passageiros</span>
                <input type="number" min="1" max="9" value={form.passengers} onChange={(e) => updateForm("passengers", e.target.value)} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-black text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" />
              </label>
            </div>

            <button type="submit" disabled={loading} className="mt-7 w-full rounded-xl bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-6 py-4 text-base font-black text-[#070B16] shadow-[0_18px_45px_rgba(212,175,55,.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Buscando oportunidades..." : "🔎 Buscar melhores preços"}
            </button>

            {error && <div className="mt-5 rounded-xl border border-[#E53935]/45 bg-[#E53935]/10 px-4 py-3 text-sm font-bold text-[#fecaca]">{error}</div>}
          </form>
        </div>
      </section>

      <section id="results" className="bg-[#050912] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {bestFlight && (
            <div className="mb-10 grid gap-7 lg:grid-cols-[1fr_440px]">
              <div className="rounded-[2rem] border border-[#D4AF37]/25 bg-[#070B16] p-8 shadow-2xl">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-[#D4AF37]">Melhor oportunidade encontrada</p>
                <h2 className="mt-4 text-5xl font-black text-white">{formatBRL(bestFlight.price)}</h2>
                <p className="mt-3 text-white/65">Média encontrada: {formatBRL(averagePrice)} • {bestFlight.airline}</p>
                <p className="mt-2 text-sm text-white/70">{bestFlight.origin} → {bestFlight.destination} • Saída {formatDateTime(bestFlight.departure)}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => openAlertModal(bestFlight)} className="rounded-xl bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-6 py-4 font-black text-[#070B16]">🔔 Ser avisado antes de subir</button>
                  <button onClick={() => openWhatsapp(bestFlight)} className="rounded-xl bg-[#16A34A] px-6 py-4 font-black text-white">💬 Cotar no WhatsApp</button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#D4AF37]/35 bg-gradient-to-br from-[#101522] to-[#050912] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]">
                <div className="mx-auto mb-4 w-fit animate-pulse rounded-full bg-[#E53935]/20 px-4 py-2 text-sm font-black text-[#fecaca]">⚠️ Atenção: o preço pode subir</div>
                <h3 className="text-2xl font-black text-white">Não perca essa oportunidade</h3>
                <div className="relative mx-auto my-7 flex h-56 w-56 items-center justify-center rounded-full bg-[conic-gradient(#D4AF37_var(--risk),rgba(255,255,255,.12)_0)] p-4" style={{ "--risk": `${priceRisk}%` }}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#050912] shadow-inner">
                    <span className="text-5xl font-black text-white">{priceRisk}%</span>
                    <span className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-[#D4AF37]">risco de alta</span>
                  </div>
                </div>
                <p className="mx-auto max-w-sm text-sm leading-6 text-white/70">Crie um alerta gratuito para a Redwood acompanhar essa rota e te chamar antes que o valor mude.</p>
                <button onClick={() => openAlertModal(bestFlight)} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-5 py-4 font-black text-[#070B16] transition hover:-translate-y-0.5">🔔 Criar alerta de preço grátis</button>
                <button onClick={() => openWhatsapp(bestFlight)} className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-5 py-4 font-black text-white transition hover:border-[#D4AF37]/60">💬 Prefiro falar com especialista</button>
              </div>
            </div>
          )}

          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-[#D4AF37]">Resultados</p>
              <h2 className="mt-2 text-3xl font-black text-white">Voos encontrados</h2>
            </div>
            {flights.length > 0 && <p className="text-sm font-bold text-white/65">{flights.length} oportunidades encontradas</p>}
          </div>

          {flights.length === 0 ? (
            <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#070B16] p-8 text-white/65">{searched ? "Faça uma nova busca ou tente outras datas para visualizar oportunidades." : "Faça uma busca para visualizar as oportunidades disponíveis."}</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {flights.map((flight) => (
                <article key={flight.id} className="rounded-[2rem] border border-white/10 bg-[#070B16] p-6 shadow-xl transition hover:-translate-y-1 hover:border-[#D4AF37]/55">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-white">{flight.origin} → {flight.destination}</h3>
                      <p className="mt-1 text-sm text-white/65">{flight.airline}</p>
                    </div>
                    <span className="rounded-full bg-[#D4AF37]/15 px-3 py-1 text-xs font-black text-[#F5D56A]">{flight.stops === 0 ? "Direto" : `${flight.stops} parada(s)`}</span>
                  </div>
                  <p className="text-4xl font-black text-white">{formatBRL(flight.price)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-white/5 p-3"><p className="font-black text-white">Saída</p><p className="mt-1 text-white/65">{formatDateTime(flight.departure)}</p></div>
                    <div className="rounded-xl bg-white/5 p-3"><p className="font-black text-white">Chegada</p><p className="mt-1 text-white/65">{formatDateTime(flight.arrival)}</p></div>
                  </div>
                  <button onClick={() => openWhatsapp(flight)} className="mt-6 w-full rounded-xl bg-[#16A34A] px-5 py-4 font-black text-white transition hover:bg-[#15803D]">💬 Cotar no WhatsApp</button>
                  <button onClick={() => openAlertModal(flight)} className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-5 py-4 font-black text-[#070B16] transition hover:-translate-y-0.5">🔔 Ser avisado quando baixar</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-[#D4AF37]/35 bg-[#070B16] p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">Alerta Redwood</p>
                <h3 className="mt-2 text-2xl font-black text-white">Criar alerta de preço</h3>
                <p className="mt-2 text-sm text-white/65">A Redwood te avisa quando encontrar uma oportunidade melhor.</p>
              </div>
              <button onClick={closeAlertModal} className="rounded-full bg-white/10 px-3 py-1 text-white">×</button>
            </div>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <input value={alertForm.name} onChange={(e) => setAlertForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-bold text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" placeholder="Seu nome" required />
              <input value={alertForm.whatsapp} onChange={(e) => setAlertForm((prev) => ({ ...prev, whatsapp: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-bold text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" placeholder="WhatsApp com DDD" required />
              <input type="number" value={alertForm.targetPrice} onChange={(e) => setAlertForm((prev) => ({ ...prev, targetPrice: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white px-4 py-4 font-bold text-[#070B16] outline-none focus:ring-4 focus:ring-[#D4AF37]/25" placeholder="Preço desejado" required />
              <button type="submit" disabled={alertStatus === "salvando" || alertStatus === "sucesso"} className="w-full rounded-xl bg-gradient-to-r from-[#F5D56A] to-[#C9971A] px-5 py-4 font-black text-[#070B16] disabled:opacity-60">
                {alertStatus === "salvando" ? "Salvando alerta..." : alertStatus === "sucesso" ? "✅ Alerta criado" : "🔔 Criar alerta grátis"}
              </button>
              {alertStatus && alertStatus !== "salvando" && alertStatus !== "sucesso" && <p className="rounded-xl border border-[#E53935]/40 bg-[#E53935]/10 p-3 text-sm font-bold text-[#fecaca]">{alertStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
