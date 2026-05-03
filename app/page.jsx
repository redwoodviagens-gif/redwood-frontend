'use client';

import { useMemo, useState } from 'react';
import { Plane, Search, MessageCircle, ShieldCheck, Clock, Bell, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redwood-backend-production.up.railway.app';
const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '5555992290849';
const USD_BRL_RATE = 5.2; // ajuste manual quando quiser

function moneyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function normalizeOffers(response) {
  const offers = response?.offers || response?.data?.offers || response?.data || [];
  if (!Array.isArray(offers)) return [];
  return offers.map((offer, index) => {
    const rawPrice = Number(offer.price || offer.total_amount || offer.totalAmount || 0);
    const currency = offer.currency || offer.total_currency || 'USD';
    const priceBRL = currency === 'BRL' ? rawPrice : rawPrice * USD_BRL_RATE;
    const slice = offer.itineraries?.[0] || offer.slices?.[0] || {};
    const segment = slice.segments?.[0] || {};
    const airline = segment.marketing_carrier?.name || segment.operating_carrier?.name || offer.airline || 'Companhia aérea';
    const depart = segment.departing_at || segment.departure_time || '';
    const arrive = segment.arriving_at || segment.arrival_time || '';
    const stops = Math.max((slice.segments?.length || 1) - 1, 0);
    return { id: offer.id || `offer-${index}`, rawPrice, currency, priceBRL, airline, depart, arrive, stops, raw: offer };
  }).sort((a, b) => a.priceBRL - b.priceBRL);
}

function predictionFor(priceBRL, daysAhead) {
  let probability = 62;
  if (daysAhead > 60) probability += 14;
  if (daysAhead < 20) probability -= 18;
  if (priceBRL > 2500) probability += 8;
  if (priceBRL < 1200) probability -= 10;
  probability = Math.max(35, Math.min(88, Math.round(probability)));
  return {
    probability,
    trend: probability >= 60 ? 'down' : 'up',
    label: probability >= 60 ? 'Espere, o preço pode baixar' : 'Atenção, o preço pode subir'
  };
}

export default function Home() {
  const [origin, setOrigin] = useState('GRU');
  const [destination, setDestination] = useState('MCZ');
  const [departureDate, setDepartureDate] = useState('2026-06-10');
  const [returnDate, setReturnDate] = useState('2026-06-17');
  const [adults, setAdults] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const offers = useMemo(() => normalizeOffers(result), [result]);
  const averagePrice = offers.length ? offers.reduce((sum, item) => sum + item.priceBRL, 0) / offers.length : 0;
  const bestOffer = offers[0];
  const daysAhead = Math.ceil((new Date(departureDate) - new Date()) / (1000 * 60 * 60 * 24));
  const prediction = bestOffer ? predictionFor(bestOffer.priceBRL, daysAhead) : null;

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
    const text = `Olá, vim pelo buscador da Redwood Viagens. Quero cotar passagem:\n\nOrigem: ${origin}\nDestino: ${destination}\nIda: ${departureDate}\nVolta: ${returnDate}\nPassageiros: ${adults}\nPreço encontrado: ${moneyBRL(offer.priceBRL)}\nCompanhia: ${offer.airline}`;
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
              <h1 className="text-4xl font-black leading-tight md:text-6xl">Encontre passagens e descubra se vale comprar agora.</h1>
              <p className="mt-5 max-w-xl text-lg text-slate-300">Busque voos reais, veja o menor preço encontrado e fale com a Redwood para garantir a melhor cotação.</p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><ShieldCheck size={16} /> Atendimento seguro</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Clock size={16} /> Suporte 24h</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Bell size={16} /> Alerta de preço</span>
              </div>
            </div>

            <form onSubmit={searchFlights} className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
              <h2 className="mb-4 text-2xl font-black">Pesquisar passagem</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Origem (IATA)" value={origin} onChange={setOrigin} placeholder="GRU" />
                <Field label="Destino (IATA)" value={destination} onChange={setDestination} placeholder="MCZ" />
                <DateField label="Ida" value={departureDate} onChange={setDepartureDate} />
                <DateField label="Volta" value={returnDate} onChange={setReturnDate} />
                <label className="space-y-1 text-sm font-bold sm:col-span-2">Passageiros
                  <input type="number" min="1" value={adults} onChange={(e) => setAdults(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-blue-600" />
                </label>
              </div>
              <button disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-4 font-black text-white hover:bg-blue-800 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Pesquisar voos
              </button>
              <p className="mt-3 text-xs text-slate-500">Use códigos IATA: GRU, GIG, BSB, POA, MCZ, MIA, LIS, MCO.</p>
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
                  <div className="text-4xl font-black md:text-5xl">{moneyBRL(bestOffer.priceBRL)}</div>
                  <p className="mt-1 text-sm text-slate-500">Média encontrada: {moneyBRL(averagePrice)}</p>
                </div>
                <a href={whatsappLink(bestOffer)} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700">
                  <MessageCircle size={18} /> Cotar no WhatsApp
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
              <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-bold ${prediction.trend === 'down' ? 'bg-cyan-400 text-slate-950' : 'bg-red-500 text-white'}`}>
                {prediction.trend === 'down' ? <TrendingDown size={18} /> : <TrendingUp size={18} />} {prediction.label}
              </div>
              <p className="mt-5 text-sm text-slate-300">Probabilidade estimada de baixa</p>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-lime-400" style={{ width: `${prediction.probability}%` }} /></div>
              <div className="mt-2 text-3xl font-black">{prediction.probability}%</div>
            </div>
          </div>
        )}

        {offers.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-black">Voos encontrados</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.slice(0, 9).map((offer) => (
                <article key={offer.id} className="rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{origin} → {destination}</p>
                      <p className="mt-1 text-sm text-slate-500">{offer.airline}</p>
                    </div>
                    <Plane className="text-blue-700" />
                  </div>
                  <div className="mt-4 text-3xl font-black">{moneyBRL(offer.priceBRL)}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div><strong>Saída:</strong><br />{offer.depart ? new Date(offer.depart).toLocaleString('pt-BR') : '-'}</div>
                    <div><strong>Chegada:</strong><br />{offer.arrive ? new Date(offer.arrive).toLocaleString('pt-BR') : '-'}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{offer.stops === 0 ? 'Voo direto' : `${offer.stops} escala(s)`}</p>
                  <a href={whatsappLink(offer)} target="_blank" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-black text-white hover:bg-green-700">
                    <MessageCircle size={18} /> Enviar cotação
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
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
