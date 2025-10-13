import GameCanvas from './components/GameCanvas';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
      <GameCanvas />
    </main>
  );
}
