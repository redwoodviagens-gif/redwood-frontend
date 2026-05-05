"use client";

import { useState } from "react";

const API_URL =
"https://redwood-backend-production.up.railway.app";||
  "https://SEU-BACKEND-RAILWAY.up.railway.app";

function formatMoney(value) {
  if (!value && value !== 0) return "R$ --";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function estimateAveragePrice(price) {
  const current = Number(price || 0);
  if (current <= 0) return 1000;
  return current * 1.45;
}

function calculateFallbackProbability(price, averagePrice) {
  const p = Number(price || 0);
  const avg = Number(averagePrice || estimateAveragePrice(p));

  if (p <= 0 || avg <= 0) return 50;

  const priceIndex = p / avg;

  if (priceIndex <= 0.65) return 20;
  if (priceIndex <= 0.75) return 30;
  if (priceIndex <= 0.95) return 45;
  if (priceIndex <= 1.10) return 60;
  if (priceIndex <= 1.25) return 75;
  return 85;
}

function getValidDropProbability(flight, price, averagePrice) {
  const raw =
    flight.dropProbability ??
    flight.probability ??
    flight.drop_probability ??
    flight.priceDropProbability;

  const parsed = Number(raw);

  if (!Number.isNaN(parsed) && parsed > 0) {
    return Math.max(0, Math.min(100, parsed));
  }

  return calculateFallbackProbability(price, averagePrice);
}

function analyzeFare(currentPrice, averagePrice, dropProbability) {
  const price = Number(currentPrice || 0);
  const avg = Number(averagePrice || estimateAveragePrice(price));
  const probability = Math.max(0, Math.min(100, Number(dropProbability || 0)));

  const priceIndex = price / avg;

  let fareLevel = "";
  let recommendation = "";
  let message = "";
  let badgeColor = "";
  let buttonText = "";

  if (priceIndex <= 0.75) {
    fareLevel = "TARIFA BAIXA";
  } else if (priceIndex <= 1.05) {
    fareLevel = "TARIFA NORMAL";
  } else if (priceIndex <= 1.25) {
    fareLevel = "TARIFA ALTA";
  } else {
    fareLevel = "TARIFA MUITO ALTA";
  }

  if (priceIndex <= 0.75 && probability <= 40) {
    recommendation = "COMPRE AGORA";
    message =
      "Tarifa abaixo da média e baixa chance de queda. Boa oportunidade para emitir agora.";
    badgeColor = "bg-green-500";
    buttonText = "Reservar";
  } else if (priceIndex <= 0.75 && probability > 40) {
    recommendation = "MONITORAR";
    message =
      "Tarifa boa, mas ainda existe chance relevante de queda. Vale criar um alerta antes de emitir.";
    badgeColor = "bg-yellow-500";
    buttonText = "Criar Alerta";
  } else if (priceIndex <= 1.05 && probability >= 60) {
    recommendation = "ESPERAR";
    message =
      "Preço dentro da média, mas com alta chance de queda. Melhor monitorar antes de comprar.";
    badgeColor = "bg-yellow-500";
    buttonText = "Criar Alerta";
  } else if (priceIndex > 1.05 && probability >= 50) {
    recommendation = "ESPERAR";
    message =
      "Tarifa acima da média e com chance de queda. Recomendamos aguardar ou criar alerta.";
    badgeColor = "bg-orange-500";
    buttonText = "Criar Alerta";
  } else if (priceIndex > 1.25) {
    recommendation = "PREÇO ALTO";
    message =
      "Tarifa muito acima da média. Recomendamos monitorar antes de emitir.";
    badgeColor = "bg-red-600";
    buttonText = "Monitorar Preço";
  } else {
    recommendation = "MONITORAR";
    message =
      "Preço aceitável, mas sem sinal forte para compra imediata. Crie um alerta.";
    badgeColor = "bg-blue-600";
    buttonText = "Criar Alerta";
  }

  return {
    priceIndex,
    fareLevel,
    recommendation,
    message,
    dropProbability: probability,
    averagePrice: avg,
    badgeColor,
    buttonText,
  };
}

function ProbabilityGauge({ probability }) {
  const percentage = Math.max(0, Math.min(100, Number(probability || 0)));
  const rotation = (percentage / 100) * 180;

  let color = "#22c55e";

  if (percentage >= 41) color = "#facc15";
  if (percentage >= 70) color = "#ef4444";

  return (
    <div className="w-full flex flex-col items-center mt-4">
      <div className="relative w-44 h-24 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-[18px] border-gray-200 border-b-0"></div>

        <div
          className="absolute inset-0 rounded-t-full border-[18px] border-b-0"
          style={{
            borderColor: color,
            borderBottomColor: "transparent",
            transform: `rotate(${rotation - 180}deg)`,
            transformOrigin: "center bottom",
          }}
        ></div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl font-bold">
          {percentage}%
        </div>
      </div>

      <div className="flex justify-between w-40 text-xs text-gray-400 mt-1">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [origin, setOrigin] = useState("POA");
  const [destination, setDestination] = useState("GIG");
  const [departureDate, setDepartureDate] = useState("2026-06-12");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);

  const [lead, setLead] = useState({
    name: "",
    whatsapp: "",
    email: "",
    targetPrice: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  async function searchFlights(e) {
    e.preventDefault();
    setLoading(true);
    setFlights([]);

    try {
      const response = await fetch(`${API_URL}/api/flights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin,
          destination,
          departureDate,
          returnDate,
          passengers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Erro ao buscar voos");
      }

      const normalizedFlights = Array.isArray(data.flights)
        ? data.flights
        : Array.isArray(data)
        ? data
        : [];

      setFlights(normalizedFlights);
    } catch (error) {
      alert("Erro ao buscar voos. Verifique o backend e tente novamente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function openAlertModal(flight) {
    setSelectedFlight(flight);
    setShowModal(true);
  }

  async function createPriceAlert(e) {
    e.preventDefault();

    if (!selectedFlight) return;

    setAlertLoading(true);

    const price = Number(selectedFlight.price || selectedFlight.totalPrice || 0);
    const averagePrice =
      Number(selectedFlight.averagePrice) || estimateAveragePrice(price);

    const safeProbability = getValidDropProbability(
      selectedFlight,
      price,
      averagePrice
    );

    const analysis = analyzeFare(price, averagePrice, safeProbability);

    try {
      const response = await fetch(`${API_URL}/api/price-alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: lead.name,
          whatsapp: lead.whatsapp,
          email: lead.email,
          targetPrice: lead.targetPrice,
          origin,
          destination,
          departureDate,
          returnDate,
          passengers,
          currentPrice: price,
          averagePrice: analysis.averagePrice,
          dropProbability: analysis.dropProbability,
          recommendation: analysis.recommendation,
          fareLevel: analysis.fareLevel,
          airline: selectedFlight.airline || selectedFlight.carrier || "",
          departureTime: selectedFlight.departureTime || "",
          arrivalTime: selectedFlight.arrivalTime || "",
          stops: selectedFlight.stops ?? 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Erro ao criar alerta");
      }

      const whatsappMessage = encodeURIComponent(
        `Olá! Tenho interesse nesse voo:\n\n` +
          `✈️ ${origin} → ${destination}\n` +
          `📅 Ida: ${departureDate}\n` +
          `${returnDate ? `📅 Volta: ${returnDate}\n` : ""}` +
          `👥 Passageiros: ${passengers}\n` +
          `💰 Preço atual: ${formatMoney(price)}\n` +
          `📊 Probabilidade de queda: ${analysis.dropProbability}%\n` +
          `🧠 Recomendação: ${analysis.recommendation}\n\n` +
          `Meu nome: ${lead.name}\n` +
          `WhatsApp: ${lead.whatsapp}\n` +
          `Preço desejado: ${formatMoney(lead.targetPrice)}`
      );

      window.open(`https://wa.me/55992290849?text=${whatsappMessage}`, "_blank");

      setShowModal(false);
      setLead({
        name: "",
        whatsapp: "",
        email: "",
        targetPrice: "",
      });

      alert("Alerta criado com sucesso!");
    } catch (error) {
      alert("Erro ao criar alerta. Verifique o backend.");
      console.error(error);
    } finally {
      setAlertLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#071426] text-white border-b border-red-600">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              Redwood Viagens
            </h1>
            <p className="text-sm text-slate-300">
              Seu próximo destino começa com a melhor escolha.
            </p>
          </div>

          <a
            href="https://wa.me/55992290849"
            target="_blank"
            className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold"
          >
            Fale no WhatsApp
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-br from-[#071426] to-[#0b2a4a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-4xl font-extrabold max-w-3xl">
            Pesquise passagens, compare preços e saiba se vale comprar agora.
          </h2>
          <p className="mt-4 text-slate-200 max-w-2xl">
            Nosso sistema analisa preço, média estimada da rota e probabilidade
            de queda para indicar a melhor decisão.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-8">
        <form
          onSubmit={searchFlights}
          className="bg-white shadow-xl rounded-2xl p-6 grid grid-cols-1 md:grid-cols-6 gap-4"
        >
          <div>
            <label className="text-sm font-semibold">Origem</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value.toUpperCase())}
              className="w-full mt-1 border rounded-xl px-3 py-3"
              placeholder="POA"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Destino</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              className="w-full mt-1 border rounded-xl px-3 py-3"
              placeholder="GIG"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Ida</label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Volta</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-3"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Pessoas</label>
            <input
              type="number"
              min="1"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-3"
            />
          </div>

          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold mt-6 py-3"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10">
        {flights.length === 0 && !loading && (
          <div className="text-center text-slate-500 py-10">
            Faça uma busca para ver as melhores opções.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flights.map((flight, index) => {
            const price = Number(flight.price || flight.totalPrice || 0);
            const averagePrice =
              Number(flight.averagePrice) || estimateAveragePrice(price);

            const safeProbability = getValidDropProbability(
              flight,
              price,
              averagePrice
            );

            const analysis = analyzeFare(price, averagePrice, safeProbability);

            const routeOrigin = flight.origin || origin;
            const routeDestination = flight.destination || destination;

            return (
              <div
                key={flight.id || index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100"
              >
                <div className="bg-slate-100 px-6 py-4">
                  <h3 className="font-bold">
                    {routeOrigin} → {routeDestination}
                  </h3>
                  <p className="text-sm text-slate-500">{departureDate}</p>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                      ✈️
                    </div>

                    <div>
                      <p className="font-bold">
                        {flight.departureTime || flight.departure || "Horário não informado"}{" "}
                        {flight.arrivalTime || flight.arrival
                          ? `- ${flight.arrivalTime || flight.arrival}`
                          : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {routeOrigin}-{routeDestination}{" "}
                        {Number(flight.stops || 0) === 0
                          ? "Direto"
                          : `${flight.stops} parada(s)`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`${analysis.badgeColor} inline-block text-white font-bold px-4 py-2 rounded-lg text-sm`}
                  >
                    {analysis.recommendation}
                  </span>

                  <p className="text-sm text-slate-600 mt-3">
                    {analysis.message}
                  </p>

                  <div className="mt-5">
                    <p className="text-3xl font-extrabold">
                      {formatMoney(price)}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Média estimada da rota:{" "}
                      <strong>{formatMoney(analysis.averagePrice)}</strong>
                    </p>

                    <p className="text-xs text-slate-500">
                      Índice da tarifa:{" "}
                      <strong>{analysis.priceIndex.toFixed(2)}</strong>
                    </p>
                  </div>

                  <div
                    className={`${analysis.badgeColor} text-white font-semibold rounded-lg px-4 py-3 mt-4 text-sm`}
                  >
                    {analysis.fareLevel} — {analysis.message}
                  </div>

                  <h4 className="font-bold mt-6">
                    Probabilidade de descida
                  </h4>

                  <ProbabilityGauge probability={analysis.dropProbability} />

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => openAlertModal(flight)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
                    >
                      {analysis.buttonText}
                    </button>

                    <button
                      onClick={() => openAlertModal(flight)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg"
                    >
                      🔔 Alerta
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showModal && selectedFlight && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold">Criar alerta de preço</h3>
            <p className="text-sm text-slate-600 mt-1">
              Informe seus dados para monitorarmos essa tarifa.
            </p>

            <form onSubmit={createPriceAlert} className="mt-5 space-y-4">
              <input
                placeholder="Nome"
                value={lead.name}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-3"
                required
              />

              <input
                placeholder="WhatsApp"
                value={lead.whatsapp}
                onChange={(e) =>
                  setLead({ ...lead, whatsapp: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-3"
                required
              />

              <input
                type="email"
                placeholder="E-mail"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
                className="w-full border rounded-xl px-4 py-3"
              />

              <input
                type="number"
                placeholder="Preço desejado"
                value={lead.targetPrice}
                onChange={(e) =>
                  setLead({ ...lead, targetPrice: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-3"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border rounded-xl py-3 font-bold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={alertLoading}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 font-bold"
                >
                  {alertLoading ? "Salvando..." : "Criar alerta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
