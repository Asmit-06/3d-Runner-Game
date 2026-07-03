import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ──────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────── */
const LANE_X = [-2.5, 0, 2.5];
const PLAYER_Z = 0;
const GROUND_DEPTH = 5;
const GROUND_COUNT = 16;
const GROUND_TOTAL = GROUND_DEPTH * GROUND_COUNT;
const GROUND_HALF = GROUND_TOTAL / 2;
const GROUND_WIDTH = 8;
const INITIAL_SPEED = 10;
const MAX_SPEED = 30;
const SPEED_ACCEL = 0.4;
const JUMP_VELOCITY = 14;
const GRAVITY = 30;
const LANE_SWITCH_SPEED = 18;
const SPAWN_DISTANCE = 35;
const DESPAWN_Z = 10;

/* ──────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────── */
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
let _nextId = 1;
const nextId = () => _nextId++;

/* ──────────────────────────────────────────────
   PLAYER MODEL
   ────────────────────────────────────────────── */
function PlayerModel({ playerRef }) {
  const groupRef = useRef();
  const smoothX = useRef(LANE_X[1]);
  const bobRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const p = playerRef.current;
    const targetX = LANE_X[p.lane];
    smoothX.current += (targetX - smoothX.current) * Math.min(LANE_SWITCH_SPEED * delta, 1);
    bobRef.current += delta * 12;
    const bob = p.isJumping ? 0 : Math.abs(Math.sin(bobRef.current)) * 0.08;
    groupRef.current.position.set(smoothX.current, p.playerY + bob, PLAYER_Z);
    // slight lean when switching lanes
    const dx = targetX - smoothX.current;
    groupRef.current.rotation.z = -dx * 0.25;
    groupRef.current.rotation.y = Math.PI + dx * 0.15;
  });

  return (
    <group ref={groupRef} rotation={[0, Math.PI, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.35]} />
        <meshToonMaterial color="#4488ff" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshToonMaterial color="#ffd1a4" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.1, 1.26, 0.23]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[-0.1, 1.26, 0.23]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, 1.16, 0.23]}>
        <boxGeometry args={[0.12, 0.03, 0.02]} />
        <meshBasicMaterial color="#cc6644" />
      </mesh>
      {/* Legs */}
      <mesh castShadow position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.18]} />
        <meshToonMaterial color="#3366bb" />
      </mesh>
      <mesh castShadow position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.18]} />
        <meshToonMaterial color="#3366bb" />
      </mesh>
      {/* Arms */}
      <mesh castShadow position={[-0.42, 0.8, 0]}>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshToonMaterial color="#4488ff" />
      </mesh>
      <mesh castShadow position={[0.42, 0.8, 0]}>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshToonMaterial color="#4488ff" />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 1.42, -0.04]}>
        <boxGeometry args={[0.5, 0.08, 0.42]} />
        <meshToonMaterial color="#ff4444" />
      </mesh>
      <mesh position={[0, 1.38, 0.02]}>
        <cylinderGeometry args={[0.28, 0.32, 0.14, 16]} />
        <meshToonMaterial color="#ff4444" />
      </mesh>
    </group>
  );
}

/* ──────────────────────────────────────────────
   GROUND SEGMENT
   ────────────────────────────────────────────── */
function GroundSegment({ z, index }) {
  const isLight = Math.floor(index / 2) % 2 === 0;
  return (
    <group position={[0, -0.15, z]}>
      <mesh receiveShadow>
        <boxGeometry args={[GROUND_WIDTH, 0.3, GROUND_DEPTH]} />
        <meshToonMaterial color={isLight ? '#55bb55' : '#44aa44'} />
      </mesh>
      {[-1.25, 1.25].map((lx) => (
        <mesh key={lx} position={[lx, 0.16, 0]} receiveShadow>
          <boxGeometry args={[0.08, 0.02, GROUND_DEPTH]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
        </mesh>
      ))}
      {[-4, 4].map((ex) => (
        <mesh key={ex} position={[ex, 0.16, 0]} receiveShadow>
          <boxGeometry args={[0.12, 0.04, GROUND_DEPTH]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ──────────────────────────────────────────────
   MOVING GROUND (wraps segments)
   ────────────────────────────────────────────── */
function MovingGround({ groundOffset }) {
  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < GROUND_COUNT; i++) {
      segs.push({ baseZ: i * GROUND_DEPTH - GROUND_HALF, index: i });
    }
    return segs;
  }, []);

  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const off = groundOffset.current;
    for (let i = 0; i < groupRef.current.children.length; i++) {
      let z = segments[i].baseZ + off;
      if (z > GROUND_HALF) z -= GROUND_TOTAL;
      if (z < -GROUND_HALF) z += GROUND_TOTAL;
      groupRef.current.children[i].position.z = z;
    }
  });

  return (
    <group ref={groupRef}>
      {segments.map((seg) => (
        <GroundSegment key={seg.index} z={seg.baseZ} index={seg.index} />
      ))}
    </group>
  );
}

/* ──────────────────────────────────────────────
   OBSTACLE MESH (moves itself each frame)
   ────────────────────────────────────────────── */
function ObstacleMesh({ obs, speedRef }) {
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.z = obs.z;
    meshRef.current.visible = obs.z < DESPAWN_Z;
  });

  const color = obs.type === 'barrier' ? '#ff6622' : '#ee3333';

  return (
    <mesh ref={meshRef} position={[obs.x, obs.height / 2, obs.z]} castShadow>
      <boxGeometry args={[obs.width, obs.height, obs.depth]} />
      <meshToonMaterial color={color} />
    </mesh>
  );
}

/* ──────────────────────────────────────────────
   COIN MESH
   ────────────────────────────────────────────── */
function CoinMesh({ coin, speedRef }) {
  const meshRef = useRef();

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.z = coin.z;
    meshRef.current.position.y = coin.y + Math.sin(Date.now() * 0.006 + coin.id) * 0.2;
    meshRef.current.rotation.y += delta * 4;
    meshRef.current.visible = coin.z < DESPAWN_Z;
  });

  return (
    <mesh ref={meshRef} position={[coin.x, coin.y, coin.z]}>
      <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
      <meshToonMaterial color="#ffd700" emissive="#bb8800" emissiveIntensity={0.3} />
    </mesh>
  );
}

/* ──────────────────────────────────────────────
   SCENERY MESH (tree or building)
   ────────────────────────────────────────────── */
function SceneryMesh({ item }) {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.z = item.z;
    groupRef.current.visible = item.z < DESPAWN_Z + 5;
  });

  if (item.type === 'tree') {
    const { x, z, h } = item;
    return (
      <group ref={groupRef} position={[x, 0, z]}>
        <mesh position={[0, h * 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, h * 0.6, 8]} />
          <meshToonMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, h * 0.55, 0]} castShadow>
          <coneGeometry args={[0.55, h * 0.55, 8]} />
          <meshToonMaterial color="#338833" />
        </mesh>
        <mesh position={[0, h * 0.75, 0]} castShadow>
          <coneGeometry args={[0.4, h * 0.45, 8]} />
          <meshToonMaterial color="#44aa44" />
        </mesh>
      </group>
    );
  }

  // building — rotate so windows face the road
  const { x, z, h, w, d, color, windowCount } = item;
  const faceRoad = x > 0 ? -Math.PI / 2 : Math.PI / 2; // right-side faces left, left-side faces right
  return (
    <group ref={groupRef} position={[x, h / 2, z]} rotation={[0, faceRoad, 0]}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshToonMaterial color={color} />
      </mesh>
      {Array.from({ length: windowCount }, (_, i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.9, d / 2 + 0.01]}>
          <boxGeometry args={[w * 0.4, 0.35, 0.02]} />
          <meshBasicMaterial color="#ffff88" />
        </mesh>
      ))}
    </group>
  );
}

/* ──────────────────────────────────────────────
   GAME SCENE
   ────────────────────────────────────────────── */
function GameScene({ gamePhase, setGamePhase, score, setScore }) {
  /* ── refs ── */
  const playerRef = useRef({
    lane: 1,
    playerY: 0,
    playerVelY: 0,
    isJumping: false,
  });
  const speed = useRef(INITIAL_SPEED);
  const groundOffset = useRef(0);
  const obstaclesRef = useRef([]);
  const coinsRef = useRef([]);
  const sceneryRef = useRef([]);
  const spawnTimerObstacle = useRef(1);
  const spawnTimerCoin = useRef(0.3);
  const scoreAccum = useRef(0);
  const inputQueue = useRef([]);

  // render tick for React reconciliation
  const [, setRenderTick] = useState(0);

  /* ── keyboard input ── */
  useEffect(() => {
    const handleKey = (e) => {
      if (gamePhase !== 'playing') return;
      inputQueue.current.push(e.code);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gamePhase]);

  /* ── spawn helpers ── */
  const spawnObstacle = useCallback(() => {
    const type = Math.random() < 0.3 ? 'barrier' : 'pillar';
    if (type === 'barrier') {
      obstaclesRef.current.push({
        id: nextId(),
        x: 0,
        z: -SPAWN_DISTANCE,
        type: 'barrier',
        width: GROUND_WIDTH - 1.5,
        height: 0.7,
        depth: 0.6,
      });
    } else {
      const lane = randInt(0, 2);
      obstaclesRef.current.push({
        id: nextId(),
        x: LANE_X[lane],
        z: -SPAWN_DISTANCE,
        type: 'pillar',
        width: 0.9 + Math.random() * 0.5,
        height: 1.4 + Math.random() * 2.0,
        depth: 0.7 + Math.random() * 0.4,
      });
    }
  }, []);

  const spawnCoin = useCallback(() => {
    const lane = randInt(0, 2);
    coinsRef.current.push({
      id: nextId(),
      x: LANE_X[lane],
      y: 0.6 + Math.random() * 1.4,
      z: -SPAWN_DISTANCE,
    });
  }, []);

  const spawnScenery = useCallback(() => {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (4.8 + Math.random() * 3);
    const type = Math.random() < 0.5 ? 'tree' : 'building';
    if (type === 'tree') {
      sceneryRef.current.push({
        id: nextId(),
        type: 'tree',
        x,
        z: -SPAWN_DISTANCE - Math.random() * 10,
        h: rand(1.2, 2.5),
      });
    } else {
      const colors = ['#667788', '#556677', '#778899', '#889999', '#6b7b8b'];
      sceneryRef.current.push({
        id: nextId(),
        type: 'building',
        x,
        z: -SPAWN_DISTANCE - Math.random() * 10,
        h: rand(2, 5),
        w: rand(0.8, 1.8),
        d: rand(0.8, 1.8),
        color: colors[randInt(0, colors.length - 1)],
        windowCount: randInt(1, 4),
      });
    }
  }, []);

  /* ── collision check ── */
  const checkCollision = useCallback((playerActualX, playerActualY) => {
    const px = playerActualX;
    const py = playerActualY + 0.75;
    const pHalfW = 0.28;
    const pHalfH = 0.75;
    const pHalfD = 0.2;

    for (const obs of obstaclesRef.current) {
      if (obs.z > 3 || obs.z < -1) continue; // quick z cull
      const oHalfW = obs.width / 2;
      const oHalfH = obs.height / 2;
      const oHalfD = obs.depth / 2;
      if (
        Math.abs(px - obs.x) < pHalfW + oHalfW &&
        Math.abs(py - obs.height / 2) < pHalfH + oHalfH &&
        Math.abs(PLAYER_Z - obs.z) < pHalfD + oHalfD
      ) {
        return true;
      }
    }
    return false;
  }, []);

  /* ── reset ── */
  const resetGame = useCallback(() => {
    playerRef.current = { lane: 1, playerY: 0, playerVelY: 0, isJumping: false };
    speed.current = INITIAL_SPEED;
    groundOffset.current = 0;
    obstaclesRef.current = [];
    coinsRef.current = [];
    sceneryRef.current = [];
    spawnTimerObstacle.current = 1;
    spawnTimerCoin.current = 0.3;
    scoreAccum.current = 0;
    inputQueue.current = [];
    setScore(0);
    setRenderTick((t) => t + 1);
  }, [setScore]);

  const startGame = useCallback(() => {
    resetGame();
    setGamePhase('playing');
  }, [resetGame, setGamePhase]);

  // expose startGame for the HUD overlay
  useEffect(() => {
    window.__startGame = startGame;
    return () => delete window.__startGame;
  }, [startGame]);

  /* ── MAIN GAME LOOP ── */
  useFrame((_, delta) => {
    if (gamePhase !== 'playing') return;

    const dt = Math.min(delta, 0.1);
    const p = playerRef.current;

    // process input
    while (inputQueue.current.length > 0) {
      const code = inputQueue.current.shift();
      switch (code) {
        case 'ArrowLeft':
        case 'KeyA':
          if (p.lane > 0) p.lane--;
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (p.lane < 2) p.lane++;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          if (!p.isJumping) {
            p.playerVelY = JUMP_VELOCITY;
            p.isJumping = true;
          }
          break;
      }
    }

    // speed ramp
    speed.current = Math.min(speed.current + SPEED_ACCEL * dt, MAX_SPEED);
    const spd = speed.current;

    // ground scroll
    groundOffset.current += spd * dt;
    if (groundOffset.current >= GROUND_TOTAL) groundOffset.current -= GROUND_TOTAL;

    // jump physics
    if (p.isJumping) {
      p.playerVelY -= GRAVITY * dt;
      p.playerY += p.playerVelY * dt;
      if (p.playerY <= 0) {
        p.playerY = 0;
        p.playerVelY = 0;
        p.isJumping = false;
      }
    }

    const playerActualX = LANE_X[p.lane];

    // move obstacles, coins, scenery
    for (const obs of obstaclesRef.current) obs.z += spd * dt;
    for (const coin of coinsRef.current) coin.z += spd * dt;
    for (const s of sceneryRef.current) s.z += spd * dt;

    // collision
    if (checkCollision(playerActualX, p.playerY)) {
      setGamePhase('gameover');
      setRenderTick((t) => t + 1);
      return;
    }

    // coin collection
    for (let i = coinsRef.current.length - 1; i >= 0; i--) {
      const coin = coinsRef.current[i];
      const dx = playerActualX - coin.x;
      const dz = PLAYER_Z - coin.z;
      const dy = p.playerY + 0.75 - coin.y;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.7) {
        coinsRef.current.splice(i, 1);
        scoreAccum.current += 10;
        setScore(Math.floor(scoreAccum.current));
      }
    }

    // cleanup despawned
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      if (obstaclesRef.current[i].z > DESPAWN_Z) obstaclesRef.current.splice(i, 1);
    }
    for (let i = coinsRef.current.length - 1; i >= 0; i--) {
      if (coinsRef.current[i].z > DESPAWN_Z) coinsRef.current.splice(i, 1);
    }
    for (let i = sceneryRef.current.length - 1; i >= 0; i--) {
      if (sceneryRef.current[i].z > DESPAWN_Z + 5) sceneryRef.current.splice(i, 1);
    }

    // distance score
    scoreAccum.current += spd * dt * 2;
    setScore(Math.floor(scoreAccum.current));

    // spawn
    spawnTimerObstacle.current -= dt;
    if (spawnTimerObstacle.current <= 0) {
      spawnObstacle();
      const interval = rand(0.7, 1.8);
      spawnTimerObstacle.current = interval / (spd / INITIAL_SPEED);
    }

    spawnTimerCoin.current -= dt;
    if (spawnTimerCoin.current <= 0) {
      spawnCoin();
      spawnTimerCoin.current = 0.5 + Math.random() * 0.6;
    }

    if (Math.random() < dt * 0.8) spawnScenery();

    // trigger React reconciliation for spawns/despawns
    setRenderTick((t) => t + 1);
  });

  /* ── render ── */
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 15, -10]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-5}
      />
      <hemisphereLight args={['#87ceeb', '#445533', 0.4]} />
      <fog attach="fog" args={['#ccddee', 25, 60]} />

      <MovingGround groundOffset={groundOffset} />

      {sceneryRef.current.map((s) => (
        <SceneryMesh key={s.id} item={s} />
      ))}

      {obstaclesRef.current.map((obs) => (
        <ObstacleMesh key={obs.id} obs={obs} speedRef={speed} />
      ))}

      {coinsRef.current.map((coin) => (
        <CoinMesh key={coin.id} coin={coin} speedRef={speed} />
      ))}

      <PlayerModel playerRef={playerRef} />
    </>
  );
}

/* ──────────────────────────────────────────────
   HUD OVERLAY
   ────────────────────────────────────────────── */
function HUD({ gamePhase, score, highScore, onStart }) {
  return (
    <div style={s.hudContainer}>
      {gamePhase === 'playing' && (
        <div style={s.scoreDisplay}>
          <span style={s.scoreLabel}>SCORE</span>
          <span style={s.scoreValue}>{score}</span>
        </div>
      )}

      {gamePhase === 'gameover' && (
        <div style={s.highScoreDisplay}>
          <span style={s.highScoreLabel}>BEST</span>
          <span style={s.highScoreValue}>{highScore}</span>
        </div>
      )}

      {gamePhase === 'menu' && (
        <div style={s.overlay}>
          <div style={s.titleCard}>
            <h1 style={s.title}>🏃 ENDLESS RUNNER</h1>
            <p style={s.subtitle}>Dodge obstacles. Collect coins. Run forever.</p>
            <button style={s.button} onClick={onStart}>
              ▶ PLAY
            </button>
            <div style={s.controls}>
              <p><kbd style={s.kbd}>A</kbd> / <kbd style={s.kbd}>←</kbd> Move Left</p>
              <p><kbd style={s.kbd}>D</kbd> / <kbd style={s.kbd}>→</kbd> Move Right</p>
              <p><kbd style={s.kbd}>W</kbd> / <kbd style={s.kbd}>Space</kbd> Jump</p>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'gameover' && (
        <div style={s.overlay}>
          <div style={s.titleCard}>
            <h1 style={s.gameOverTitle}>GAME OVER</h1>
            <div style={s.finalScore}>
              <span style={s.finalScoreLabel}>Score</span>
              <span style={s.finalScoreValue}>{score}</span>
            </div>
            <button style={s.button} onClick={onStart}>
              🔄 PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {gamePhase === 'playing' && (
        <div style={s.touchControls}>
          <button
            style={{ ...s.touchBtn, ...s.touchLeft }}
            onTouchStart={(e) => {
              e.preventDefault();
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
            }}
          >
            ◀
          </button>
          <button
            style={{ ...s.touchBtn, ...s.touchJump }}
            onTouchStart={(e) => {
              e.preventDefault();
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
            }}
          >
            ▲ JUMP
          </button>
          <button
            style={{ ...s.touchBtn, ...s.touchRight }}
            onTouchStart={(e) => {
              e.preventDefault();
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
            }}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   STYLES
   ────────────────────────────────────────────── */
const s = {
  hudContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    zIndex: 10,
  },
  scoreDisplay: {
    position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  scoreLabel: { fontSize: 12, color: '#ffffffcc', letterSpacing: 3, fontWeight: 700 },
  scoreValue: {
    fontSize: 48, color: '#fff', fontWeight: 800,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1,
  },
  highScoreDisplay: {
    position: 'absolute', top: 20, right: 20,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  },
  highScoreLabel: { fontSize: 11, color: '#ffffff99', letterSpacing: 2, fontWeight: 700 },
  highScoreValue: {
    fontSize: 24, color: '#ffd700', fontWeight: 800,
    textShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    pointerEvents: 'auto',
  },
  titleCard: {
    background: 'rgba(20,20,40,0.9)', borderRadius: 20, padding: '40px 48px',
    textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxWidth: 380,
  },
  title: {
    fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 8px',
    textShadow: '0 3px 10px rgba(68,136,255,0.5)',
  },
  subtitle: { fontSize: 14, color: '#aabbcc', margin: '0 0 24px' },
  gameOverTitle: {
    fontSize: 32, fontWeight: 800, color: '#ff4444', margin: '0 0 16px',
    textShadow: '0 3px 12px rgba(255,68,68,0.4)',
  },
  finalScore: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 },
  finalScoreLabel: { fontSize: 13, color: '#aabbcc', letterSpacing: 2 },
  finalScoreValue: {
    fontSize: 52, fontWeight: 800, color: '#fff',
    textShadow: '0 3px 12px rgba(255,215,0,0.4)', lineHeight: 1.1,
  },
  button: {
    background: 'linear-gradient(135deg, #4488ff, #6644ff)',
    color: '#fff', border: 'none', borderRadius: 12, padding: '14px 36px',
    fontSize: 18, fontWeight: 700, cursor: 'pointer', letterSpacing: 1,
    boxShadow: '0 6px 20px rgba(68,136,255,0.4)',
  },
  controls: { marginTop: 24, textAlign: 'left', fontSize: 12, color: '#8899aa', lineHeight: 2.2 },
  kbd: {
    background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 7px',
    fontFamily: 'monospace', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)',
  },
  touchControls: {
    position: 'absolute', bottom: 30, left: 0, right: 0,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 20px', pointerEvents: 'auto',
  },
  touchBtn: {
    background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 14,
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
    backdropFilter: 'blur(8px)', touchAction: 'manipulation',
  },
  touchLeft: { padding: '16px 24px' },
  touchJump: {
    padding: '16px 28px', fontSize: 14,
    background: 'rgba(68,136,255,0.3)', border: '1px solid rgba(68,136,255,0.4)',
  },
  touchRight: { padding: '16px 24px' },
};

/* ──────────────────────────────────────────────
   TOP-LEVEL GAME
   ────────────────────────────────────────────── */
export default function Game() {
  const [gamePhase, setGamePhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('endlessRunnerHighScore') || '0', 10); }
    catch { return 0; }
  });

  const handleStart = useCallback(() => {
    if (score > highScore) {
      setHighScore(score);
      try { localStorage.setItem('endlessRunnerHighScore', String(score)); } catch {}
    }
    if (window.__startGame) window.__startGame();
  }, [score, highScore]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [0, 5.5, 6], fov: 55, near: 0.5, far: 80 }}
        onCreated={({ scene, camera }) => {
          scene.background = new THREE.Color('#87CEEB');
          scene.fog = new THREE.Fog('#ccddee', 25, 60);
          camera.lookAt(0, 0, -10);
        }}
      >
        <GameScene
          gamePhase={gamePhase}
          setGamePhase={setGamePhase}
          score={score}
          setScore={setScore}
        />
      </Canvas>
      <HUD gamePhase={gamePhase} score={score} highScore={highScore} onStart={handleStart} />
    </div>
  );
}