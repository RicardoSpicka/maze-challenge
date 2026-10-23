
import { useCallback, useEffect, useState } from 'react';
import './App.css';
import type React from 'react';

type Direction = 'N' | 'E' | 'S' | 'W';

interface Cell {
  walls: Record<Direction, boolean>;
  visited: boolean;
}

const DIRECTIONS: Record<Direction, {
  dx: number;
  dy: number;
  opposite: Direction;
}> = {
  N: { dx: 0, dy: -1, opposite: 'S' },
  E: { dx: 1, dy: 0, opposite: 'W' },
  S: { dx: 0, dy: 1, opposite: 'N' },
  W: { dx: -1, dy: 0, opposite: 'E' },
};

const SIZES = [14, 18, 22];

const THEMES = [
  { id: 'verde', name: 'Verde', accent: '#b8f36b' },
  { id: 'roxo', name: 'Roxo Arcade', accent: '#d19aff' },
  { id: 'laranja', name: 'Laranja Solar', accent: '#ffb454' },
  { id: 'azul-claro', name: 'Azul Gelo', accent: '#2479b8' },
  { id: 'grafite', name: 'Grafite', accent: '#45e0d0' },
  { id: 'areia', name: 'Areia', accent: '#8a6238' },
  { id: 'rosa', name: 'Rosa', accent: '#f08ab5' },
];

function generateMaze(size: number, difficulty: string): Cell[] {
  const cells: Cell[] = Array.from({ length: size * size }, () => ({
    walls: { N: true, E: true, S: true, W: true },
    visited: false,
  }));

  const stack = [0];
  cells[0].visited = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const x = current % size;
    const y = Math.floor(current / size);

    const neighbors = (Object.keys(DIRECTIONS) as Direction[])
      .map((direction) => {
        const { dx, dy } = DIRECTIONS[direction];
        const nx = x + dx;
        const ny = y + dy;

        return {
          direction,
          index: ny * size + nx,
          valid: nx >= 0 && nx < size && ny >= 0 && ny < size,
        };
      })
      .filter(({ index, valid }) => valid && !cells[index].visited);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    const opposite = DIRECTIONS[next.direction].opposite;

    cells[current].walls[next.direction] = false;
    cells[next.index].walls[opposite] = false;
    cells[next.index].visited = true;
    stack.push(next.index);
  }

  // Mais passagens abertas deixam o modo fácil menos exigente.
  const openings = difficulty === 'easy'
    ? 0.12
    : difficulty === 'medium'
      ? 0.04
      : 0;

  for (let i = 0; i < cells.length; i++) {
    const x = i % size;
    const y = Math.floor(i / size);

    for (const direction of ['E', 'S'] as Direction[]) {
      const { dx, dy, opposite } = DIRECTIONS[direction];
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= size || ny >= size) continue;
      if (!cells[i].walls[direction]) continue;

      if (Math.random() < openings) {
        const neighbor = ny * size + nx;
        cells[i].walls[direction] = false;
        cells[neighbor].walls[opposite] = false;
      }
    }
  }

  return cells;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function App() {
  const [size, setSize] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [maze, setMaze] = useState<Cell[]>(() => generateMaze(10, 'medium'));
  const [player, setPlayer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);

  const exit = size * size - 1;
  const cellSize = 20;
  const boardSize = size * cellSize;

  const [path, setPath] = useState<number[]>([0]);
  const [dragging, setDragging] = useState(false);
  const [theme, setTheme] = useState('verde');
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const newGame = useCallback((newSize = size, newDifficulty = difficulty) => {
    setSize(newSize);
    setDifficulty(newDifficulty);
    setMaze(generateMaze(newSize, newDifficulty));
    setPlayer(0);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setWon(false);
    setPath([0]);
    setDragging(false);
    setShowCompletionModal(false);
  }, [size, difficulty]);

  

  useEffect(() => {
    if (!started || won) return;

    const interval = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [started, won]);

  useEffect(() => {
    if (won) {
      setShowCompletionModal(true);
    }
  }, [won]);

  const movePlayer = useCallback((direction: Direction) => {
    if (won) return;

    const cell = maze[player];
    if (!cell || cell.walls[direction]) return;

    const x = player % size;
    const y = Math.floor(player / size);
    const { dx, dy } = DIRECTIONS[direction];
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 0 || nx >= size || ny < 0 || ny >= size) return;

    const next = ny * size + nx;

    setStarted(true);
    setPlayer(next);
    setPath((current) => [...current, next]);
    setMoves((current) => current + 1);

    if (next === exit) setWon(true);
  }, [maze, player, size, exit, won]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keys: Record<string, Direction> = {
        ArrowUp: 'N',
        w: 'N',
        ArrowRight: 'E',
        d: 'E',
        ArrowDown: 'S',
        s: 'S',
        ArrowLeft: 'W',
        a: 'W',
      };

      const direction = keys[event.key] ?? keys[event.key.toLowerCase()];
      if (!direction) return;

      event.preventDefault();
      movePlayer(direction);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  const walls: string[] = [];

  maze.forEach((cell, index) => {
    const x = (index % size) * cellSize;
    const y = Math.floor(index / size) * cellSize;
    const { N, E, S, W } = cell.walls;

    if (N) walls.push(`M ${x} ${y} h ${cellSize}`);
    if (W) walls.push(`M ${x} ${y} v ${cellSize}`);
    if (E) walls.push(`M ${x + cellSize} ${y} v ${cellSize}`);
    if (S) walls.push(`M ${x} ${y + cellSize} h ${cellSize}`);
  });



const getCellFromPointer = (
  event: React.PointerEvent<SVGSVGElement>
): number => {
  const svg = event.currentTarget;
  const point = svg.createSVGPoint();

  point.x = event.clientX;
  point.y = event.clientY;

  const matrix = svg.getScreenCTM();
  if (!matrix) return -1;
  const svgPoint = point.matrixTransform(matrix.inverse());

  const x = Math.floor((svgPoint.x + 3) / cellSize);
  const y = Math.floor((svgPoint.y + 3) / cellSize);

  if (x < 0 || x >= size || y < 0 || y >= size) {
    return -1;
  }

  return y * size + x;
};


const handlePointerDown = (
  event: React.PointerEvent<SVGSVGElement>
) => {
  if (won) return;

  const cell = getCellFromPointer(event);

  // O percurso só começa na posição atual do jogador.
  if (cell !== player) return;

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  setDragging(true);
  setStarted(true);
};

const handlePointerMove = (
  event: React.PointerEvent<SVGSVGElement>
) => {
    if (!dragging || won) return;

    const next = getCellFromPointer(event);
    if (next < 0 || next === player) return;

    const currentX = player % size;
    const currentY = Math.floor(player / size);
    const nextX = next % size;
    const nextY = Math.floor(next / size);

    // Só permite avançar para uma célula vizinha.
    if (Math.abs(currentX - nextX) + Math.abs(currentY - nextY) !== 1) {
      return;
    }

    const direction: Direction =
      nextY < currentY ? 'N'
        : nextY > currentY ? 'S'
          : nextX < currentX ? 'W' : 'E';

    if (maze[player].walls[direction]) return;

    setPlayer(next);
    setMoves((current) => current + 1);
    setPath((current) => [...current, next]);

    if (next === exit) {
      setWon(true);
      setDragging(false);
    }
  };

  const handlePointerUp = () => {
    setDragging(false);
  };


  const playerX = (player % size) * cellSize + cellSize / 2;
  const playerY = Math.floor(player / size) * cellSize + cellSize / 2;
  const exitX = (exit % size) * cellSize + cellSize / 2;
  const exitY = Math.floor(exit / size) * cellSize + cellSize / 2;

  return (
    <main className="app-shell" data-theme={theme}>
      
      
      <header className="topbar">
        <a className="brand" href="#" aria-label="PuzzleLab início">
          <span className="brand-icon">♞</span>
          <span>PUZZLELAB</span>
        </a>

        <div className="theme-picker">
          <button
            type="button"
            className="theme-toggle"
            aria-expanded={showThemeOptions}
            aria-label="Selecionar tema de cores"
            onClick={() => setShowThemeOptions((open) => !open)}
          >
            <span className="dev-badge">DEV</span>
            <span>Tema</span>
            <span
              className="theme-swatch"
              style={{
                '--theme-swatch': THEMES.find((item) => item.id === theme)?.accent,
              } as React.CSSProperties}
            />
            <span className={`theme-chevron ${showThemeOptions ? 'open' : ''}`}>
              ⌄
            </span>
          </button>

          {showThemeOptions && (
            <div className="theme-options" role="group" aria-label="Temas disponíveis">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`theme-option ${theme === item.id ? 'active' : ''}`}
                  style={{ '--theme-swatch': item.accent } as React.CSSProperties}
                  onClick={() => {
                    setTheme(item.id);
                    setShowThemeOptions(false);
                  }}
                >
                  <span className="theme-swatch" />
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="status">
          <span /> SISTEMA ONLINE
        </span>
      </header>


      <section className="hero">
        <p className="eyebrow">DESAFIE SUA ORIENTAÇÃO</p>
        <h1>ENCONTRE A <span>SAÍDA.</span></h1>
        <p className="subtitle">Um caminho. Mil possibilidades. Você consegue?</p>
      </section>

      <section className="game-layout">
        <aside className="game-panel">
          <div className="panel-heading">
            <span>CONFIGURAÇÃO</span>
            <span className="panel-number">01</span>
          </div>

          <label className="field-label">TAMANHO DO TABULEIRO</label>
          <div className="size-options">
            {SIZES.map((option) => (
              <button
                key={option}
                className={`option-button ${size === option ? 'selected' : ''}`}
                onClick={() => newGame(option, difficulty)}
              >
                <strong>{option}×{option}</strong>
                <small>{option * option} células</small>
              </button>
            ))}
          </div>

          <label className="field-label">DIFICULDADE</label>
          <div className="difficulty-options">
            {[
              { id: 'easy', label: 'FÁCIL', color: 'easy-dot' },
              { id: 'medium', label: 'MÉDIO', color: 'medium-dot' },
              { id: 'hard', label: 'DIFÍCIL', color: 'hard-dot' },
            ].map((item) => (
              <button
                key={item.id}
                className={`difficulty-button ${difficulty === item.id ? 'selected' : ''}`}
                onClick={() => newGame(size, item.id)}
              >
                <span className={item.color} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="panel-divider" />

          <div className="stats">
            <div className="stat">
              <span className="stat-label">TEMPO DECORRIDO</span>
              <strong className="timer">{formatTime(seconds)}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">MOVIMENTOS</span>
              <strong>{String(moves).padStart(3, '0')}</strong>
            </div>
          </div>

          <button className="primary-button" onClick={() => newGame()}>
            <span>↻</span> NOVO LABIRINTO
          </button>
          <button className="secondary-button" onClick={() => newGame()}>
            REINICIAR PARTIDA
          </button>

          <p className="panel-tip">
            <span>✦</span> DICA: planeje seus movimentos e evite voltar pelo mesmo caminho.
          </p>
        </aside>

        <section className="board-panel">
          <div className="board-heading">
            <div>
              <span className="live-dot" />
              <span>LABIRINTO ATIVO</span>
            </div>
            <span className="board-dimensions">{size} × {size}</span>
          </div>

          <div className="maze-viewport">
            <svg
              className="maze-svg"
              viewBox={`-3 -3 ${boardSize + 6} ${boardSize + 6}`}
              role="img"
              aria-label={`Labirinto ${size} por ${size}. Use as setas do teclado para chegar à saída.`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <defs>
                <filter id="wall-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="player-glow" x="-200%" y="-200%" width="400%" height="400%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                x="0" y="0" width={boardSize} height={boardSize}
                fill="#071219"
              />

              <polyline
                points={path.map((index) => {
                  const x = (index % size) * cellSize + cellSize / 2;
                  const y = Math.floor(index / size) * cellSize + cellSize / 2;
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#a3ff6f"
                strokeWidth={cellSize * 0.42}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
                pointerEvents="none"
              />

              {maze.map((_, index) => (
                <rect
                  key={`cell-${index}`}
                  x={(index % size) * cellSize}
                  y={Math.floor(index / size) * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={index === player ? '#10382f' : 'transparent'}
                  className={index === player ? 'player-cell' : ''}
                />
              ))}

              <path
                d={walls.join(' ')}
                fill="none"
                stroke="#176777"
                strokeWidth={size === 30 ? 1.15 : 1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#wall-glow)"
              />

              <circle
                cx={cellSize / 2}
                cy={cellSize / 2}
                r={cellSize * 0.22}
                fill="#27e8ff"
                filter="url(#player-glow)"
                opacity={player === 0 ? 0.35 : 0.15}
              />
              <circle
                cx={cellSize / 2}
                cy={cellSize / 2}
                r={cellSize * 0.15}
                fill="#27e8ff"
                opacity="0.7"
              />

              <circle
                cx={exitX}
                cy={exitY}
                r={cellSize * 0.28}
                fill="#a3ff6f"
                opacity="0.2"
              />
              <circle
                cx={exitX}
                cy={exitY}
                r={cellSize * 0.15}
                fill="#a3ff6f"
              />

              {moves > 0 && (
                <path
                  d={`M ${cellSize / 2} ${cellSize / 2} L ${playerX} ${playerY}`}
                  stroke="#a3ff6f"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.12"
                  fill="none"
                />
              )}

              <circle
                cx={playerX}
                cy={playerY}
                r={cellSize * 0.28}
                fill="#a3ff6f"
                opacity="0.2"
              />
              <circle
                cx={playerX}
                cy={playerY}
                r={cellSize * 0.16}
                fill="#b5ff80"
                stroke="#e1ffc9"
                strokeWidth="0.8"
                filter="url(#player-glow)"
              />
            </svg>
          </div>

          <div className="board-legend">
            <span><i className="legend-player" /> VOCÊ</span>
            <span><i className="legend-exit" /> SAÍDA</span>
            <span><i className="legend-wall" /> PAREDES</span>
          </div> 
        </section>
      </section>

      <nav className="mobile-controls" aria-label="Controles do jogador">
        <button aria-label="Mover para cima" onClick={() => movePlayer('N')}>↑</button>
        <div>
          <button aria-label="Mover para esquerda" onClick={() => movePlayer('W')}>←</button>
          <button aria-label="Mover para baixo" onClick={() => movePlayer('S')}>↓</button>
          <button aria-label="Mover para direita" onClick={() => movePlayer('E')}>→</button>
        </div>
      </nav>

  
      <footer className="footer">
        <div className="footer-author">
          <p>
            Desenvolvido por <strong>Ricardo Spicka</strong> © 2026
          </p>

          <div className="footer-social">
            <a
              href="https://github.com/RicardoSpicka"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <span>·</span>
            <a
              href="https://www.linkedin.com/in/ricardo-spicka-b79049160"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div className="footer-games">
          <span className="footer-games-title">MAIS JOGOS DO PUZZLELAB</span>

          <div style={{display: 'flex', flexDirection: "column"}}>
              <a
                href="https://apague-as-luzes.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Apague as Luzes
              </a>

              <a
                href="https://knight-tour-beta.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Knight’s Tour
              </a>

           </div>
        </div>
      </footer>


      {showCompletionModal && (
        <div
          className="completion-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowCompletionModal(false);
          }}
        >
          <section
            className="completion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            <button
              type="button"
              className="completion-close"
              aria-label="Fechar resultado"
              onClick={() => setShowCompletionModal(false)}
            >×</button>

            <div className="completion-celebration" aria-hidden="true">
              <span className="celebration-orbit orbit-one" />
              <span className="celebration-orbit orbit-two" />
              <span className="celebration-star">✦</span>
            </div>

            <p className="completion-eyebrow">MISSÃO CUMPRIDA</p>
            <h2 id="completion-title">Você conseguiu!</h2>
            <p className="completion-description">
              Você encontrou a saída do labirinto. Muito bem!
            </p>

            <div className="completion-result">
              <div className="completion-primary-stat">
                <span>SEU TEMPO</span>
                <strong>{formatTime(seconds)}</strong>
              </div>
              <div className="completion-primary-stat">
                <span>MOVIMENTOS</span>
                <strong>{moves}</strong>
              </div>
            </div>

            <div className="completion-details">
              <div className="completion-detail">
                <span className="completion-detail-icon">▦</span>
                <span>Labirinto</span>
                <strong>{size} × {size}</strong>
              </div>
              <div className="completion-detail">
                <span className="completion-detail-icon">◆</span>
                <span>Dificuldade</span>
                <strong>{difficulty === 'easy' ? 'Fácil' : difficulty === 'medium' ? 'Médio' : 'Difícil'}</strong>
              </div>
            </div>

            <div className="completion-actions">
              <button type="button" className="primary-button" onClick={() => newGame()}>
                ↻ Jogar novamente
              </button>
              <button type="button" className="secondary-button" onClick={() => setShowCompletionModal(false)}>
                Ver labirinto
              </button>
            </div>
            <p className="completion-footer">CADA MOVIMENTO CONTA ✦ MAZE CHALLENGE</p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
