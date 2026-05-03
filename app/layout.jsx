import './globals.css';

export const metadata = {
  title: 'Redwood Viagens | Busca Inteligente de Passagens',
  description: 'Pesquise passagens aéreas, veja preços e fale com a Redwood Viagens no WhatsApp.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
