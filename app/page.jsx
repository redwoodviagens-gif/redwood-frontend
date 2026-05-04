'use client';

import { useMemo, useState } from 'react';
import { Plane, Search, MessageCircle, ShieldCheck, Clock, Bell, TrendingDown, TrendingUp, Loader2, X, Target, Sparkles, Send } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redwood-backend-production.up.railway.app';
const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '5555992290849';

function money(value, currency = 'BRL') {
  const safeCurrency = currency || 'BRL';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: safeCurrency }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

function normalizeOffers(response) {
  const offers = response?.offers || response?.data?.offers || response?.data || [];
  if (!Array.isArray(offers)) return [];

  return offers.map((offer, index) => {
    const rawPrice = Number(offer.price || offer.total_amount || offer.totalAmount || 0);
    const currency = offer.currency || offer.total_currency || 'USD';
    const outbound = offer.outbound || {};
    const inbound = offer.inbound || null;
    const firstSlice = offer.slices?.[0] || offer.itineraries?.[0] || {};
    const firstSegment = firstSlice?.segments?.[0] || {};
    const lastSegment = firstSlice?.segments?.[firstSlice?.segments?.length - 1] || firstSegment;

    const airline = offer.airline || outbound.airlineName || firstSegment?.marketing_carrier?.name || firstSegment?.operating_carrier?.name || 'Companhia aérea não informada';
    const airlineCode = offer.airlineCode || outbound.airlineCode || firstSegment?.marketing_carrier?.iata_code || firstSegment?.operating_carrier?.iata_code || '';
    const depart = outbound.departingAt || firstSegment?.departing_at || firstSegment?.departure_time || '';
    const arrive = outbound.arrivingAt || lastSegment?.arriving_at || lastSegment?.arrival_time || '';
    const returnDepart = inbound?.departingAt || '';
    const returnArrive = inbound?.arrivingAt || '';
    const stops = typeof outbound.stops === 'number' ? outbound.stops : Math.max((firstSlice?.segments?.length || 1) - 1, 0);

    return {
      id: offer.id || `offer-${index}`,
      provider: offer.provider || response?.provider || 'duffel',
      liveMode: offer.liveMode ?? offer.live_mode ?? false,
      rawPrice,
      currency,
      airline,
      airlineCode,
      depart,
      arrive,
      returnDepart,
      returnArrive,
      stops,
      outbound,
      inbound,
      raw: offer
    };
  }).sort((a, b) => a.rawPrice - b.rawPrice);
}

function predictionFor(price, averagePrice, daysAhead) {
  let probability = 62;
  if (daysAhead > 60) probability += 14;
  if (daysAhead < 20) probability -= 18;
  if (averagePrice && price > averagePrice * 1.12) probability += 10;
  if (averagePrice && price < averagePrice * 0.9) probability -= 12;
  probability = Math.max(28, Math.min(91, Math.round(probability)));
  return {
    probability,
    trend: probability >= 60 ? 'down' : 'up',
    label: probability >= 60 ? 'Espere, o preço pode baixar' : 'Atenção, o preço pode subir'
  };
}

export default function Home() {
  const [origin, setOrigin] = useState('POA');
  const [destination, setDestination] = useState('GIG');
  const [departureDate, setDepartureDate] = useState('2026-06-12');
  const [returnDate, setReturnDate] = useState('2026-06-17');
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [alertStatus, setAlertStatus] = useState('');

  const offers = useMemo(() => normalizeOffers(result), [result]);
  const averagePrice = offers.length ? offers.reduce((sum, item) => sum + item.rawPrice, 0) / offers.length : 0;
  const bestOffer = offers[0];
  const daysAhead = Math.ceil((new Date(departureDate) - new Date()) / (1000 * 60 * 60 * 24));
  const prediction = bestOffer ? predictionFor(bestOffer.rawPrice, averagePrice, daysAhead) : null;

  async function searchFlights(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({ origin, destination, departureDate, returnDate, adults: String(adults) });
      const response = await fetch(`${API_URL}/api/flights/search?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Erro ao buscar voos');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Não foi possível buscar os voos agora.');
    } finally {
      setLoading(false);
    }
  }

  function whatsappLink(offer) {
    const text = `Olá, vim pelo buscador da Redwood Viagens. Quero cotar passagem:\n\nOrigem: ${origin}\nDestino: ${destination}\nIda: ${departureDate}\nVolta: ${returnDate || 'não informada'}\nPassageiros: ${adults}\nPreço encontrado: ${money(offer.rawPrice, offer.currency)}\nCompanhia: ${offer.airline}\nHorário ida: ${formatDateTime(offer.depart)}\n${offer.returnDepart ? `Horário volta: ${formatDateTime(offer.returnDepart)}\n` : ''}Pode me ajudar?`;
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2563eb_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#991b1b_0%,transparent_28%)] opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-200">
                <Plane size={16} /> Redwood Viagens • Busca Inteligente
              </div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">Encontre passagens e seja avisado quando baixar.</h1>
              <p className="mt-5 max-w-xl text-lg text-slate-300">Busque ofertas via API, veja companhia, horários e crie um alerta para a Redwood acompanhar seu preço ideal.</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><ShieldCheck size={16} /> Atendimento seguro</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Clock size={16} /> Suporte 24h</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Bell size={16} /> Alerta de preço</span>
              </div>
            </div>

            <form onSubmit={searchFlights} className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
              <h2 className="mb-4 text-2xl font-black">Pesquisar passagem</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Origem (IATA)" value={origin} onChange={setOrigin} placeholder="POA" />
                <Field label="Destino (IATA)" value={destination} onChange={setDestination} placeholder="GIG" />
                <DateField label="Ida" value={departureDate} onChange={setDepartureDate} />
                <DateField label="Volta" value={returnDate} onChange={setReturnDate} />
                <label className="space-y-1 text-sm font-bold sm:col-span-2">Passageiros
                  <input type="number" min="1" value={adults} onChange={(e) => setAdults(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-600" />
                </label>
              </div>
              <button disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 font-black text-white hover:bg-blue-800 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Pesquisar voos
              </button>
              <p className="mt-3 text-xs text-slate-500">Use aeroportos específicos: POA, GIG, SDU, GRU, CGH, MCZ, MIA, LIS.</p>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}

        {bestOffer && (
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-xl lg:col-span-2">
              <p className="text-sm font-bold text-slate-500">Melhor preço encontrado</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-4xl font-black md:text-5xl">{money(bestOffer.rawPrice, bestOffer.currency)}</div>
                  <p className="mt-1 text-sm text-slate-500">Média encontrada: {money(averagePrice, bestOffer.currency)} • {bestOffer.liveMode ? 'Live mode' : 'Modo teste Duffel'}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{bestOffer.airline} • Saída {formatDateTime(bestOffer.depart)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => setSelectedOffer(bestOffer)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:brightness-105">
                    <Bell size={18} /> Criar alerta inteligente
                  </button>
                  <a href={whatsappLink(bestOffer)} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700">
                    <MessageCircle size={18} /> Cotar no WhatsApp
                  </a>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
              <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold ${prediction.trend === 'down' ? 'bg-cyan-400 text-slate-950' : 'bg-red-500 text-white'}`}>
                {prediction.trend === 'down' ? <TrendingDown size={18} /> : <TrendingUp size={18} />} {prediction.label}
              </div>
              <p className="mt-5 text-sm text-slate-300">Probabilidade estimada de baixa</p>
              <Gauge value={prediction.probability} />
            </div>
          </div>
        )}

        {offers.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-black">Voos encontrados</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.slice(0, 12).map((offer) => (
                <article key={offer.id} className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{origin} → {destination}</p>
                      <p className="mt-1 text-sm text-slate-500">{offer.airline} {offer.airlineCode ? `(${offer.airlineCode})` : ''}</p>
                    </div>
                    <Plane className="text-blue-700" />
                  </div>
                  <div className="mt-4 text-3xl font-black">{money(offer.rawPrice, offer.currency)}</div>
                  <p className="mt-1 text-xs text-slate-500">{offer.liveMode ? 'Oferta live' : 'Oferta em modo teste'} • Provider: {offer.provider}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div><strong>Saída:</strong><br />{formatDateTime(offer.depart)}</div>
                    <div><strong>Chegada:</strong><br />{formatDateTime(offer.arrive)}</div>
                    {offer.returnDepart && <div><strong>Volta:</strong><br />{formatDateTime(offer.returnDepart)}</div>}
                    {offer.returnArrive && <div><strong>Chegada volta:</strong><br />{formatDateTime(offer.returnArrive)}</div>}
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{offer.stops === 0 ? 'Voo direto' : `${offer.stops} escala(s)`}</p>
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => setSelectedOffer(offer)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 font-black text-slate-950 hover:brightness-105">
                      <Target size={18} /> Quero pagar menos
                    </button>
                    <a href={whatsappLink(offer)} target="_blank" className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-black text-white hover:bg-green-700">
                      <MessageCircle size={18} /> Enviar cotação
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedOffer && (
        <PriceAlertModal
          offer={selectedOffer}
          origin={origin}
          destination={destination}
          departureDate={departureDate}
          returnDate={returnDate}
          adults={adults}
          onClose={() => { setSelectedOffer(null); setAlertStatus(''); }}
          alertStatus={alertStatus}
          setAlertStatus={setAlertStatus}
        />
      )}
    </main>
  );
}

function PriceAlertModal({ offer, origin, destination, departureDate, returnDate, adults, onClose, alertStatus, setAlertStatus }) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function submitAlert(e) {
    e.preventDefault();
    setSaving(true);
    setAlertStatus('');
    try {
      const payload = {
        nome,
        whatsapp,
        email,
        origem: origin,
        destino: destination,
        data_ida: departureDate,
        data_volta: returnDate,
        passageiros: Number(adults || 1),
        preco_atual: offer.rawPrice,
        moeda: offer.currency,
        preco_desejado: Number(String(targetPrice).replace(',', '.')),
        companhia: offer.airline,
        codigo_companhia: offer.airlineCode,
        horario_ida: offer.depart,
        horario_volta: offer.returnDepart,
        offer_id: offer.id,
        provider: offer.provider,
        live_mode: offer.liveMode,
        observacoes: notes,
        campanha: 'site-redwood-alerta-preco',
        raw: offer.raw
      };

      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Erro ao salvar alerta');
      setAlertStatus('Alerta criado com sucesso! A Redwood vai acompanhar esse voo e falar com você no WhatsApp.');
      if (data.whatsappLink) window.open(data.whatsappLink, '_blank');
    } catch (err) {
      setAlertStatus(err.message || 'Não foi possível criar o alerta agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-yellow-400/30 bg-slate-950 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#facc15_0%,transparent_28%),radial-gradient(circle_at_bottom_left,#2563eb_0%,transparent_32%)] opacity-30" />
        <div className="relative p-6 md:p-8">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"><X size={18} /></button>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-200">
            <Sparkles size={16} /> Alerta Inteligente Redwood
          </div>
          <h2 className="text-3xl font-black">Quer pagar menos nesse voo?</h2>
          <p className="mt-2 text-slate-300">Informe seu preço ideal. A Redwood salva seu alerta e acompanha a oportunidade para converter sua viagem com segurança.</p>

          <div className="mt-5 rounded-2xl bg-white p-4 text-slate-950">
            <div className="grid gap-3 md:grid-cols-3">
              <div><p className="text-xs font-bold text-slate-500">Rota</p><p className="font-black">{origin} → {destination}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Preço atual</p><p className="font-black">{money(offer.rawPrice, offer.currency)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Companhia</p><p className="font-black">{offer.airline}</p></div>
            </div>
          </div>

          <form onSubmit={submitAlert} className="mt-5 grid gap-3 md:grid-cols-2">
            <Input label="Nome" value={nome} onChange={setNome} placeholder="Seu nome" required />
            <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="5599999999999" required />
            <Input label="E-mail (opcional)" value={email} onChange={setEmail} placeholder="email@email.com" />
            <Input label={`Preço desejado (${offer.currency})`} value={targetPrice} onChange={setTargetPrice} placeholder="Ex: 450" required />
            <label className="space-y-1 text-sm font-bold md:col-span-2">Observações
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: tenho flexibilidade de data, aceito voo com escala, posso comprar hoje se chegar nesse valor..." className="min-h-24 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-white outline-none placeholder:text-slate-400 focus:border-yellow-400" />
            </label>
            <button disabled={saving} className="md:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:brightness-105 disabled:opacity-70">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Criar alerta e enviar para Redwood
            </button>
          </form>
          {alertStatus && <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100">{alertStatus}</div>}
        </div>
      </div>
    </div>
  );
}

function Gauge({ value }) {
  return (
    <div className="mt-3 flex flex-col items-center">
      <div className="relative h-24 w-48 overflow-hidden">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full border-[18px] border-white/20" />
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full border-[18px] border-lime-400" style={{ clipPath: `polygon(0 50%, ${value}% 50%, ${value}% 0, 0 0)` }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-black">{value}%</div>
      </div>
      <div className="mt-1 flex w-48 justify-between text-xs text-slate-400"><span>0</span><span>100</span></div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="space-y-1 text-sm font-bold">{label}
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value.toUpperCase())} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-600" />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="space-y-1 text-sm font-bold">{label}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-600" />
    </label>
  );
}

function Input({ label, value, onChange, placeholder, required }) {
  return (
    <label className="space-y-1 text-sm font-bold">{label}
      <input required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-white outline-none placeholder:text-slate-400 focus:border-yellow-400" />
    </label>
  );
}
