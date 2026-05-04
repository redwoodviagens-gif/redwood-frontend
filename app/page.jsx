"use client";

import { useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const WHATSAPP_NUMBER = "5555992290849";

const formatBRL = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
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
    0;

  const currency = String(
    flight?.currency || flight?.total_currency || flight?.price_currency || "BRL"
  ).toUpperCase();

  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;

  // Se a Duffel retornar em USD no modo teste, converte apenas para exibição comercial.
  if (currency === "USD") return value * 5.2;
  return value;
};

const normalizeFlights = (data) => {
  const list =
    data?.flights ||
    data?.offers ||
    data?.data ||
    data?.results ||
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(list)) return [];

  return list.map((item, index) => {
    const firstSlice = item?.slices?.[0];
    const firstSegment = firstSlice?.segments?.[0];
    const lastSegment = firstSlice?.segments?.[firstSlice?.segments?.length - 1];
    const airline =
      item?.airline ||
      item?.owner?.name ||
      firstSegment?.marketing_carrier?.name ||
      firstSegment?.operating_carrier?.name ||
      "Companhia aérea";

    const origin =
      item?.origin ||
      firstSlice?.origin?.iata_code ||
      firstSegment?.origin?.iata_code ||
      "Origem";

    const destination =
      item?.destination ||
      firstSlice?.destination?.iata_code ||
      lastSegment?.destination?.iata_code ||
      "Destino";

    const departure =
      item?.departure ||
      item?.departure_time ||
      firstSegment?.departing_at ||
      firstSlice?.departure_time ||
      "";

    const arrival =
      item?.arrival ||
      item?.arrival_time ||
      lastSegment?.arriving_at ||
      firstSlice?.arrival_time ||
      "";

    const stops =
      item?.stops ??
      Math.max(0, (firstSlice?.segments?.length || 1) - 1);

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
  if (!value) return "Horário a confirmar";
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
    if (!bestFlight) return 50;
    const base = 58 + Math.min(24, economyPercent || 0);
    return Math.max(50, Math.min(88, base));
  }, [bestFlight, economyPercent]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

      const response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: form.origin.trim().toUpperCase(),
          destination: form.destination.trim().toUpperCase(),
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          passengers: Number(form.passengers || 1),
        }),
      });

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
    setSelectedFlight(flight || null);
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
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL não está configurada na Vercel.");
      }

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
    <main className="min-h-screen overflow-hidden bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(33,80,145,0.32),transparent_32%),radial-gradient(circle_at_top_right,rgba(229,57,53,0.18),transparent_28%),linear-gradient(135deg,#020817,#071a33_55%,#020817)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-4">
          <img
            src="/logo-redwood.png"
            alt="Redwood Viagens"
            className="h-16 w-16 rounded-full object-cover ring-1 ring-[#D4AF37]/45 shadow-[0_0_30px_rgba(229,57,53,.18)]"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div>
            <p className="text-xl font-black uppercase tracking-wide text-white">Redwood</p>
            <p className="text-xs font-black uppercase tracking-[0.42em] text-[#E53935]">Viagens</p>
          </div>
        </div>

        <button
          onClick={() => openWhatsapp()}
          className="hidden rounded-full bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-7 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(229,57,53,.28)] transition hover:-translate-y-0.5 md:block"
        >
          Cotação grátis
        </button>
      </header>

      <section className="mx-auto grid min-h-[640px] w-full max-w-7xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <div>
          <div className="mb-8 flex items-center gap-4">
            <span className="h-px w-12 bg-[#E53935]" />
            <span className="text-xs font-black uppercase tracking-[0.55em] text-[#E53935]">Redwood Viagens</span>
          </div>

          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
            Passagens com preço inteligente e atendimento
            <span className="block bg-gradient-to-r from-[#E53935] via-[#ff6b5f] to-[#ffffff] bg-clip-text text-transparent">
              Redwood.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-[#CBD5E1]">
            Busque oportunidades, acompanhe variações de preço e fale com um especialista antes que a tarifa mude.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => document.getElementById("search-box")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-8 py-4 text-sm font-black text-white shadow-[0_22px_50px_rgba(229,57,53,.30)] transition hover:-translate-y-1"
            >
              Buscar melhores preços →
            </button>
            <button
              onClick={() => openAlertModal(bestFlight)}
              className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:border-[#E53935]/70 hover:bg-[#E53935]/10"
            >
              🔔 Criar alerta gratuito
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-5 text-sm font-bold text-[#CBD5E1]">
            <span>🛡️ Atendimento seguro</span>
            <span>🎧 Suporte 24h</span>
            <span>✈️ Monitoramento de preços</span>
          </div>
        </div>

        <form
          id="search-box"
          onSubmit={handleSearch}
          className="rounded-[2rem] border border-[#E53935]/35 bg-[#050B18]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-xl md:p-8"
        >
          <div className="mb-7">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-[#E53935]">Busca inteligente</p>
            <h2 className="mt-3 text-3xl font-black text-white">Pesquisar passagem</h2>
            <p className="mt-2 text-sm text-[#CBD5E1]">Use aeroportos IATA: POA, GIG, GRU, SDU, MCZ, MAO, LIS.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-white">Origem (IATA)</span>
              <input
                value={form.origin}
                onChange={(e) => updateForm("origin", e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black uppercase text-[#020817] outline-none ring-0 transition focus:border-[#E53935] focus:ring-4 focus:ring-[#E53935]/20"
                placeholder="POA"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-white">Destino (IATA)</span>
              <input
                value={form.destination}
                onChange={(e) => updateForm("destination", e.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black uppercase text-[#020817] outline-none transition focus:border-[#E53935] focus:ring-4 focus:ring-[#E53935]/20"
                placeholder="GIG"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-white">Ida</span>
              <input
                type="date"
                value={form.departureDate}
                onChange={(e) => updateForm("departureDate", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black text-[#020817] outline-none transition focus:border-[#E53935] focus:ring-4 focus:ring-[#E53935]/20"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-white">Volta</span>
              <input
                type="date"
                value={form.returnDate}
                onChange={(e) => updateForm("returnDate", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black text-[#020817] outline-none transition focus:border-[#E53935] focus:ring-4 focus:ring-[#E53935]/20"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-black text-white">Passageiros</span>
              <input
                type="number"
                min="1"
                max="9"
                value={form.passengers}
                onChange={(e) => updateForm("passengers", e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-black text-[#020817] outline-none transition focus:border-[#E53935] focus:ring-4 focus:ring-[#E53935]/20"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-6 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(229,57,53,.30)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Buscando oportunidades..." : "🔎 Buscar melhores preços"}
          </button>

          {error && (
            <div className="mt-5 rounded-2xl border border-[#E53935]/45 bg-[#E53935]/10 px-4 py-3 text-sm font-bold text-[#fecaca]">
              {error}
            </div>
          )}
        </form>
      </section>

      <section className="border-t border-[#E53935]/30 bg-[#020817]/80 px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {bestFlight && (
            <div className="mb-10 grid gap-7 lg:grid-cols-[1fr_420px]">
              <div className="rounded-[2rem] border border-white/10 bg-[#050B18]/90 p-7 shadow-2xl">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-[#E53935]">Melhor oportunidade encontrada</p>
                <h2 className="mt-3 text-5xl font-black text-white">{formatBRL(bestFlight.price)}</h2>
                <p className="mt-3 text-[#CBD5E1]">
                  {bestFlight.airline} • {bestFlight.origin} → {bestFlight.destination} • Saída {formatDateTime(bestFlight.departure)}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => openAlertModal(bestFlight)}
                    className="rounded-2xl bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-6 py-4 font-black text-white shadow-[0_18px_45px_rgba(229,57,53,.25)]"
                  >
                    🔔 Ser avisado antes de subir
                  </button>
                  <button
                    onClick={() => openWhatsapp(bestFlight)}
                    className="rounded-2xl bg-[#16A34A] px-6 py-4 font-black text-white shadow-[0_18px_45px_rgba(22,163,74,.22)]"
                  >
                    💬 Falar no WhatsApp
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#E53935]/35 bg-gradient-to-br from-[#111827] to-[#020617] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]">
                <div className="mx-auto mb-4 w-fit animate-pulse rounded-full bg-[#E53935]/20 px-4 py-2 text-sm font-black text-[#fecaca]">
                  ⚠️ Esse preço pode mudar a qualquer momento
                </div>
                <h3 className="text-2xl font-black text-white">Chance de aumento nas próximas horas</h3>
                <div className="relative mx-auto my-7 flex h-52 w-52 items-center justify-center rounded-full bg-[conic-gradient(#E53935_var(--risk),rgba(255,255,255,.12)_0)] p-4" style={{ "--risk": `${priceRisk}%` }}>
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#020817] shadow-inner">
                    <span className="text-5xl font-black text-white">{priceRisk}%</span>
                    <span className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-[#E53935]">alerta</span>
                  </div>
                </div>
                <p className="mx-auto max-w-sm text-sm leading-6 text-[#CBD5E1]">
                  Crie um alerta gratuito para a Redwood acompanhar essa rota e te chamar quando surgir uma oportunidade melhor.
                </p>
                <button
                  onClick={() => openAlertModal(bestFlight)}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-5 py-4 font-black text-white shadow-[0_18px_45px_rgba(229,57,53,.28)] transition hover:-translate-y-0.5"
                >
                  🔔 Criar alerta de preço grátis
                </button>
                <button
                  onClick={() => openWhatsapp(bestFlight)}
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 font-black text-white transition hover:border-[#E53935]/60 hover:bg-[#E53935]/10"
                >
                  💬 Prefiro falar com especialista
                </button>
              </div>
            </div>
          )}

          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.4em] text-[#E53935]">Resultados</p>
              <h2 className="mt-2 text-3xl font-black text-white">Voos encontrados</h2>
            </div>
            {flights.length > 0 && <p className="text-sm font-bold text-[#CBD5E1]">{flights.length} oportunidades encontradas</p>}
          </div>

          {flights.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-[#050B18]/80 p-8 text-[#CBD5E1]">
              {searched ? "Faça uma nova busca ou tente outras datas para visualizar oportunidades." : "Faça uma busca para visualizar as oportunidades disponíveis."}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {flights.map((flight) => (
                <article
                  key={flight.id}
                  className="rounded-[2rem] border border-white/10 bg-[#050B18]/90 p-6 shadow-xl transition hover:-translate-y-1 hover:border-[#E53935]/55"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-white">{flight.origin} → {flight.destination}</h3>
                      <p className="mt-1 text-sm text-[#CBD5E1]">{flight.airline}</p>
                    </div>
                    <span className="rounded-full bg-[#E53935]/15 px-3 py-1 text-xs font-black text-[#fecaca]">
                      {flight.stops === 0 ? "Direto" : `${flight.stops} parada(s)`}
                    </span>
                  </div>

                  <p className="text-4xl font-black text-white">{formatBRL(flight.price)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="font-black text-white">Saída</p>
                      <p className="mt-1 text-[#CBD5E1]">{formatDateTime(flight.departure)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="font-black text-white">Chegada</p>
                      <p className="mt-1 text-[#CBD5E1]">{formatDateTime(flight.arrival)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => openWhatsapp(flight)}
                    className="mt-6 w-full rounded-2xl bg-[#16A34A] px-5 py-4 font-black text-white transition hover:bg-[#15803D]"
                  >
                    💬 Cotar no WhatsApp
                  </button>
                  <button
                    onClick={() => openAlertModal(flight)}
                    className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-5 py-4 font-black text-white transition hover:-translate-y-0.5"
                  >
                    🔔 Ser avisado quando baixar
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-[#E53935]/35 bg-[#050B18] p-7 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#E53935]">Alerta Redwood</p>
                <h3 className="mt-2 text-2xl font-black text-white">Criar alerta de preço</h3>
                <p className="mt-2 text-sm text-[#CBD5E1]">A Redwood te avisa quando encontrar uma oportunidade melhor.</p>
              </div>
              <button onClick={closeAlertModal} className="rounded-full bg-white/10 px-3 py-1 text-white">×</button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <input
                value={alertForm.name}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-bold text-[#020817] outline-none focus:ring-4 focus:ring-[#E53935]/20"
                placeholder="Seu nome"
                required
              />
              <input
                value={alertForm.whatsapp}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-bold text-[#020817] outline-none focus:ring-4 focus:ring-[#E53935]/20"
                placeholder="WhatsApp com DDD"
                required
              />
              <input
                type="number"
                value={alertForm.targetPrice}
                onChange={(e) => setAlertForm((prev) => ({ ...prev, targetPrice: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white px-4 py-4 font-bold text-[#020817] outline-none focus:ring-4 focus:ring-[#E53935]/20"
                placeholder="Preço desejado"
                required
              />

              <button
                type="submit"
                disabled={alertStatus === "salvando" || alertStatus === "sucesso"}
                className="w-full rounded-2xl bg-gradient-to-r from-[#E53935] to-[#ff6b5f] px-5 py-4 font-black text-white disabled:opacity-60"
              >
                {alertStatus === "salvando" ? "Salvando alerta..." : alertStatus === "sucesso" ? "✅ Alerta criado" : "🔔 Criar alerta grátis"}
              </button>

              {alertStatus && alertStatus !== "salvando" && alertStatus !== "sucesso" && (
                <p className="rounded-2xl border border-[#E53935]/40 bg-[#E53935]/10 p-3 text-sm font-bold text-[#fecaca]">
                  {alertStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
