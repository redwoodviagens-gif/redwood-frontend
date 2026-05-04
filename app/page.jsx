const API_URL = "https://redwood-backend-production.up.railway.app";

async function buscarVoos() {
  try {
    setLoading(true);
    setErro("");

    const payload = {
      origin: origem,
      destination: destino,
      departureDate: dataIda,
      returnDate: dataVolta || null,
      adults: Number(adultos || 1),
      passengers: Number(adultos || 1),
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

    if (!response.ok) {
      console.error("Erro da API:", data);
      throw new Error(data?.message || data?.error || "Erro ao buscar voos");
    }

    setResultados(data.flights || data.data || []);
  } catch (error) {
    console.error("Erro ao buscar voos:", error);
    setErro("Não foi possível buscar voos agora. Tente novamente em alguns instantes.");
  } finally {
    setLoading(false);
  }
}
