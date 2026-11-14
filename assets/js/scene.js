import * as THREE from 'three';
import { HAND_POINTS, HAND_BONES } from './hand-model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rand = (min, max) => min + Math.random() * (max - min);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SA = window.SA || {};

const sig = {
  pinch: 0,
  open: 0.3,
  rot: 0,
  aimX: 0,
  aimY: 0,
  fps: 0,
};

const tgt = {
  pinch: 0,
  open: 0.3,
  rot: 0,
  aimX: 0,
  aimY: 0,
  present: false,
};

const input = {
  mode: 'mouse',
  mouseActive: false,
  labDown: false,
  gameDown: false,
  keyFocus: false,
};

const keys = new Set();

/* ------------------------------------------------------------- utilities */

function glowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const GLOW = glowTexture();

function createRenderer(canvas, alpha) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x03060c, alpha ? 0 : 1);
    return renderer;
  } catch (error) {
    console.warn('WebGL is unavailable:', error);
    return null;
  }
}

function fit(renderer, camera, canvas) {
  if (!renderer || !canvas) return { width: 0, height: 0 };
  const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setSize(width, height, false);
  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  return { width, height };
}

function particleSphere(count, radius, color, size = 0.045, shell = true) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(rand(-1, 1));
    const distance = shell ? radius * rand(0.82, 1) : radius * Math.cbrt(Math.random());
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[i * 3 + 1] = Math.cos(phi) * distance;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    map: GLOW,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.01,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

function createHandSkeleton({ pointSize = 0.075, color = 0xd8ffff, lineColor = 0x6ff5e8 } = {}) {
  const group = new THREE.Group();
  const points = HAND_POINTS.map((p) => new THREE.Vector3(p[0], p[1], p[2]));

  const pointsGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const pointMaterial = new THREE.PointsMaterial({
    color,
    size: pointSize,
    map: GLOW,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.01,
  });
  const pointCloud = new THREE.Points(pointsGeometry, pointMaterial);
  group.add(pointCloud);

  const linePositions = [];
  for (const [a, b] of HAND_BONES) {
    linePositions.push(points[a].clone(), points[b].clone());
  }
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePositions);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: lineColor,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  group.add(lines);

  const palmGeometry = new THREE.BufferGeometry();
  const palmVerts = [];
  for (const [a, b, c] of [[0, 5, 9], [0, 9, 13], [0, 13, 17]]) {
    palmVerts.push(points[a], points[b], points[c]);
  }
  palmGeometry.setFromPoints(palmVerts);
  palmGeometry.computeVertexNormals();
  const palmMaterial = new THREE.MeshBasicMaterial({
    color: 0x35e0d0,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Mesh(palmGeometry, palmMaterial));

  return { group, pointCloud, lines };
}

function createLiveHand() {
  const group = new THREE.Group();
  const positions = new Float32Array(HAND_POINTS.length * 3);
  HAND_POINTS.forEach((point, index) => {
    positions[index * 3] = point[0];
    positions[index * 3 + 1] = point[1];
    positions[index * 3 + 2] = point[2];
  });
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointCloud = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      color: 0xd8ffff,
      size: 0.07,
      map: GLOW,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    }),
  );

  const linePositions = new Float32Array(HAND_BONES.length * 6);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: 0x8ff8ee,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  group.add(pointCloud, lines);
  group.visible = false;
  return { group, pointGeometry, lineGeometry, positions, linePositions };
}

function updateLiveHand(hand, landmarks) {
  if (!landmarks || landmarks.length < 21) return;
  const pos = hand.pointGeometry.attributes.position;
  for (let i = 0; i < 21; i += 1) {
    const landmark = landmarks[i];
    pos.setXYZ(i, (0.5 - landmark.x) * 2.6, (0.5 - landmark.y) * 2.6, -landmark.z * 2.6);
  }
  pos.needsUpdate = true;

  const linePos = hand.lineGeometry.attributes.position;
  HAND_BONES.forEach(([a, b], index) => {
    const first = landmarks[a];
    const second = landmarks[b];
    linePos.setXYZ(index * 2, (0.5 - first.x) * 2.6, (0.5 - first.y) * 2.6, -first.z * 2.6);
    linePos.setXYZ(index * 2 + 1, (0.5 - second.x) * 2.6, (0.5 - second.y) * 2.6, -second.z * 2.6);
  });
  linePos.needsUpdate = true;
}

/* --------------------------------------------------------------- signals */

function updateSignals(dt) {
  const k = 1 - Math.exp(-dt * 11);
  sig.pinch += (tgt.pinch - sig.pinch) * k;
  sig.open += (tgt.open - sig.open) * k;
  sig.rot += (tgt.rot - sig.rot) * k;
  sig.aimX += (tgt.aimX - sig.aimX) * Math.min(1, dt * 12);
  sig.aimY += (tgt.aimY - sig.aimY) * Math.min(1, dt * 12);
}

/* -------------------------------------------------------------- hero scene */

function initHero() {
  const canvas = $('#hero-canvas');
  if (!canvas) return null;
  const renderer = createRenderer(canvas, true);
  if (!renderer) return null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const rig = new THREE.Group();
  scene.add(rig);

  const hand = createHandSkeleton({ pointSize: 0.14 });
  hand.group.rotation.set(-0.2, -0.55, 0.03);
  hand.group.userData.baseY = 0;
  rig.add(hand.group);

  const halo = new THREE.Group();
  const haloColors = [0x35e0d0, 0x4c8dff, 0xa78bfa];
  for (let i = 0; i < 3; i += 1) {
    const geometry = new THREE.TorusGeometry(1.65 + i * 0.38, 0.006, 8, 140);
    const material = new THREE.MeshBasicMaterial({
      color: haloColors[i],
      transparent: true,
      opacity: 0.16 - i * 0.03,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(1.05 + i * 0.35, i * 0.6, 0.2);
    halo.add(ring);
  }
  rig.add(halo);

  const particles = particleSphere(720, 3.5, 0x5f9dff, 0.035, false);
  rig.add(particles);

  const hero = { canvas, renderer, camera, hand, halo, particles, pointer: { x: 0, y: 0 } };

  function resize() {
    const { width, height } = fit(renderer, camera, canvas);
    if (!width || !height) return;
    const wide = width / Math.max(1, height) > 1.1;
    hand.group.scale.setScalar(wide ? 2.15 : 1.45);
    hand.group.position.x = wide ? 2.05 : 0.35;
    hand.group.userData.baseY = wide ? 0 : 0.15;
    halo.position.x = hand.group.position.x;
    halo.position.y = hand.group.userData.baseY;
    halo.scale.setScalar(wide ? 1 : 0.72);
    particles.position.x = hand.group.position.x * 0.75;
    particles.scale.setScalar(wide ? 1 : 0.8);
  }

  window.addEventListener('pointermove', (event) => {
    hero.pointer.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    hero.pointer.y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  }, { passive: true });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement || canvas);
  else window.addEventListener('resize', resize);
  resize();

  hero.update = (dt, time) => {
    const motion = reducedMotion ? 0.18 : 1;
    hand.group.rotation.y = -0.55 + Math.sin(time * 0.24) * 0.13 * motion + hero.pointer.x * 0.08;
    hand.group.rotation.x = -0.2 + hero.pointer.y * 0.06;
    hand.group.position.y = hand.group.userData.baseY + Math.sin(time * 0.7) * 0.045 * motion;
    halo.rotation.y = time * 0.12 * motion;
    halo.rotation.z = Math.sin(time * 0.18) * 0.08;
    particles.rotation.y = -time * 0.035 * motion;
    particles.rotation.x = time * 0.012 * motion;

    camera.position.x += (hero.pointer.x * 0.32 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (-hero.pointer.y * 0.22 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  return hero;
}

/* ---------------------------------------------------------------- lab scene */

function buildHolo() {
  const group = new THREE.Group();
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x35e0d0,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 28, 20),
    new THREE.MeshBasicMaterial({
      color: 0x35e0d0,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const shell = particleSphere(170, 1.85, 0x8ff8ee, 0.04);
  group.add(wire, core, shell);
  group.userData = { wire, core, shell };
  return group;
}

function buildNeural() {
  const group = new THREE.Group();
  const count = 42;
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(rand(-1, 1));
    const radius = rand(1.25, 1.95);
    nodes.push(
      new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius,
        Math.sin(phi) * Math.sin(theta) * radius,
      ),
    );
  }
  const nodeGeometry = new THREE.BufferGeometry().setFromPoints(nodes);
  const points = new THREE.Points(
    nodeGeometry,
    new THREE.PointsMaterial({
      color: 0x9ff8ff,
      size: 0.075,
      map: GLOW,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    }),
  );

  const linePoints = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (nodes[i].distanceTo(nodes[j]) < 0.9 && Math.random() < 0.45) {
        linePoints.push(nodes[i], nodes[j]);
      }
    }
  }
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    new THREE.LineBasicMaterial({
      color: 0x4c8dff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(points, lines);
  return group;
}

function buildField() {
  const group = new THREE.Group();
  const colors = [0x35e0d0, 0x4c8dff, 0xa78bfa, 0x35e0d0];
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05 + i * 0.25, 0.008, 8, 120),
      new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.42 - i * 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.set(1.1 + i * 0.35, 0.4 * i, 0.15 * i);
    group.add(ring);
  }
  const grid = new THREE.GridHelper(9, 22, 0x1f4d63, 0x0d2230);
  grid.position.y = -1.9;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  group.add(grid);
  return group;
}

function initLab() {
  const canvas = $('#lab-canvas');
  if (!canvas) return null;
  const renderer = createRenderer(canvas, false);
  if (!renderer) {
    const status = $('#status-text');
    if (status) status.textContent = '3D unavailable in this browser · signals still work';
    const light = $('#status-light');
    if (light) light.className = 'status-light error';
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const root = new THREE.Group();
  scene.add(root);

  const holo = buildHolo();
  const neural = buildNeural();
  const field = buildField();
  const particles = particleSphere(260, 3.3, 0x4c8dff, 0.035, false);
  neural.visible = false;
  field.visible = false;
  root.add(holo, neural, field, particles);

  const liveHand = createLiveHand();
  root.add(liveHand.group);

  let currentScene = 'holo';
  const pulse = { pinch: 0, open: 0, rot: 0 };
  let wide = true;

  document.addEventListener('sa:scene', (event) => {
    currentScene = event.detail || 'holo';
  });
  document.addEventListener('sa:signal', (event) => {
    if (event.detail in pulse) pulse[event.detail] = 1;
  });

  function resize() {
    const size = fit(renderer, camera, canvas);
    if (!size.width || !size.height) return;
    wide = size.width / Math.max(1, size.height) > 1.15;
    camera.position.z = wide ? 8 : 9.6;
    camera.updateProjectionMatrix();
    root.position.x = wide ? 0.75 : 0.1;
    liveHand.group.position.set(wide ? -1.85 : -0.8, -0.1, 0.9);
    liveHand.group.scale.setScalar(wide ? 1.15 : 0.9);
  }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas.parentElement || canvas);
  else window.addEventListener('resize', resize);
  resize();

  const lab = { canvas, renderer, camera, root, holo, neural, field, particles, liveHand, pulse };

  lab.update = (dt, time) => {
    const pinch = sig.pinch;
    const open = sig.open;
    const rotation = THREE.MathUtils.degToRad(sig.rot);
    const motion = reducedMotion ? 0.2 : 1;

    holo.visible = currentScene === 'holo';
    neural.visible = currentScene === 'neural';
    field.visible = currentScene === 'field';
    liveHand.group.visible = input.mode === 'camera' && Boolean(lab.handLandmarks);

    if (lab.handLandmarks) updateLiveHand(liveHand, lab.handLandmarks);

    holo.rotation.y = time * 0.14 * motion + rotation * 0.6;
    holo.rotation.x = Math.sin(time * 0.37) * 0.08;
    holo.userData.wire.scale.setScalar(1 + pinch * 0.22 + pulse.pinch * 0.16);
    holo.userData.core.scale.setScalar(0.7 + pinch * 0.8 + pulse.pinch * 0.2);
    holo.userData.shell.scale.setScalar(0.92 + open * 0.52 + pulse.open * 0.12);

    neural.rotation.y = -time * 0.1 * motion + rotation * 0.45;
    neural.rotation.x = time * 0.03 * motion;
    neural.scale.setScalar(0.92 + pinch * 0.18 + open * 0.15 + pulse.open * 0.1);

    field.rotation.y = time * 0.1 * motion;
    field.rotation.z = rotation * 0.55;
    field.scale.setScalar(0.9 + open * 0.25 + pinch * 0.12);

    particles.rotation.y = time * 0.03 * motion + rotation * 0.2;
    particles.rotation.x = time * 0.012 * motion;
    particles.scale.setScalar(0.85 + open * 0.55 + pinch * 0.14 + pulse.open * 0.15);

    for (const key of Object.keys(pulse)) pulse[key] *= Math.exp(-dt * 3);

    renderer.render(scene, camera);
  };

  return lab;
}

/* --------------------------------------------------------------- game scene */

function initGame() {
  const stage = $('#game-stage');
  const canvas = $('#game-canvas');
  if (!stage || !canvas) return null;

  const overlay = $('#game-overlay');
  const endPanel = $('#game-end');
  const startButton = $('#game-start');
  const handButton = $('#game-hand');
  const handNote = $('#game-hand-note');
  const scoreEl = $('#game-score');
  const comboEl = $('#game-combo');
  const ringsEl = $('#game-rings');
  const focusEl = $('#game-focus');
  const timeEl = $('#game-time');
  const endScore = $('#end-score');
  const endBest = $('#end-best');
  const endRings = $('#end-rings');
  const endConcepts = $('#end-concepts');
  const endTitle = $('#end-title');
  const endNote = $('#end-note');
  const replay = $('#game-replay');

  const renderer = createRenderer(canvas, false);
  if (!renderer) {
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = '3D unavailable';
    }
    if (handButton) handButton.disabled = true;
    if (handNote) handNote.textContent = 'This browser cannot start WebGL. The quiz, curriculum, and ROI model still work.';
    return null;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060c, 0.022);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 140);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, -30);

  const staticRig = new THREE.Group();
  scene.add(staticRig);

  const starGeometry = new THREE.BufferGeometry();
  {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = rand(-18, 18);
      positions[i * 3 + 1] = rand(-11, 11);
      positions[i * 3 + 2] = rand(-95, 8);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x9fd8ff,
      size: 0.055,
      map: GLOW,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
    }),
  );
  staticRig.add(stars);

  const ringGeometry = new THREE.TorusGeometry(0.55, 0.028, 8, 64);
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const probe = new THREE.Group();
  probe.add(
    new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: 0xbdfcff, transparent: true, opacity: 0.95 }),
    ),
  );
  const probeGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: GLOW,
      color: 0x35e0d0,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  probeGlow.scale.setScalar(1.05);
  probe.add(probeGlow);
  scene.add(probe);

  const reticle = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.006, 6, 48),
    new THREE.MeshBasicMaterial({
      color: 0x35e0d0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  reticle.position.z = -2.6;
  scene.add(reticle);

  const game = {
    active: false,
    demo: new URLSearchParams(window.location.search).get('demo') === '1',
    score: 0,
    combo: 1,
    ringsPassed: 0,
    lives: 3,
    timeLeft: 60,
    spawnTimer: 0,
    lastX: 0,
    lastY: 0,
    rings: [],
    lastHud: '',
    shake: 0,
    elapsed: 0,
    renderer,
    scene,
    camera,
    stars,
    ringGroup,
    probe,
    reticle,
    canvas,
  };

  function resize() {
    const size = fit(renderer, camera, canvas);
    if (!size.width || !size.height) return;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  resize();

  function clearRings() {
    for (const ring of game.rings) {
      game.ringGroup.remove(ring);
      if (ring.material) ring.material.dispose();
    }
    game.rings.length = 0;
    game.lastX = 0;
    game.lastY = 0;
  }

  function spawnRing(z = -58) {
    const first = game.rings.length === 0;
    const x = first ? 0 : clamp(game.lastX + rand(-1.25, 1.25), -1.75, 1.75);
    const y = first ? 0 : clamp(game.lastY + rand(-0.85, 0.85), -1.05, 1.05);
    game.lastX = x;
    game.lastY = y;

    const material = new THREE.MeshBasicMaterial({
      color: 0x35e0d0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.position.set(x, y, z);
    ring.userData = { judged: false, spin: rand(-0.5, 0.5) };
    game.ringGroup.add(ring);
    game.rings.push(ring);
  }

  function focusActive() {
    return input.keyFocus || (input.mode === 'mouse' && input.gameDown) || sig.pinch > 0.55;
  }

  function updateHud(force = false) {
    const focus = focusActive();
    const signature = [
      game.score,
      game.combo,
      game.ringsPassed,
      Math.ceil(game.timeLeft),
      focus ? 1 : 0,
    ].join('|');
    if (!force && signature === game.lastHud) return;
    game.lastHud = signature;
    if (scoreEl) scoreEl.textContent = game.score.toLocaleString('en-US');
    if (comboEl) comboEl.textContent = `x${game.combo}`;
    if (ringsEl) ringsEl.textContent = String(game.ringsPassed);
    if (timeEl) timeEl.textContent = String(Math.max(0, Math.ceil(game.timeLeft)));
    if (focusEl) {
      focusEl.textContent = focus ? 'SLOW-MO' : 'READY';
      focusEl.classList.toggle('hot', focus);
    }
  }

  function endGame(reason) {
    if (!game.active) return;
    game.active = false;
    const conceptCount = typeof SA.getConceptCount === 'function' ? SA.getConceptCount() : 0;
    let best = 0;
    try {
      best = Number(window.localStorage.getItem('sa_game_best_v1') || 0) || 0;
    } catch {
      best = 0;
    }
    if (game.score > best) {
      best = game.score;
      try {
        window.localStorage.setItem('sa_game_best_v1', String(best));
      } catch {
        /* storage may be unavailable */
      }
    }
    if (endScore) endScore.textContent = game.score.toLocaleString('en-US');
    if (endBest) endBest.textContent = best.toLocaleString('en-US');
    if (endRings) endRings.textContent = String(game.ringsPassed);
    if (endConcepts) endConcepts.textContent = `${conceptCount} / 12`;
    if (endTitle) {
      endTitle.textContent =
        game.score >= 2500
          ? 'Surgical precision.'
          : game.score >= 1200
            ? 'Steady hands.'
            : game.score >= 400
              ? 'Good run.'
              : 'Warm-up complete.';
    }
    if (endNote) {
      const why = reason === 'time' ? 'Time expired.' : 'Hull integrity lost.';
      endNote.textContent = `${why} You passed ${game.ringsPassed} rings and unlocked ${conceptCount} of 12 concepts. Every ring is a concept; every concept is a node.`;
    }
    if (endPanel) endPanel.hidden = false;
    if (overlay) overlay.classList.add('hidden');
    updateHud(true);
  }

  function startGame() {
    game.active = true;
    game.score = 0;
    game.combo = 1;
    game.ringsPassed = 0;
    game.lives = 3;
    game.timeLeft = 60;
    game.spawnTimer = 1.2;
    game.elapsed = 0;
    game.shake = 0;
    game.lastHud = '';
    clearRings();
    spawnRing(-18);
    spawnRing(-31);
    spawnRing(-44);
    spawnRing(-57);
    tgt.aimX = 0;
    tgt.aimY = 0;
    sig.aimX = 0;
    sig.aimY = 0;
    if (typeof SA.resetConcepts === 'function') SA.resetConcepts();
    if (overlay) overlay.classList.add('hidden');
    if (endPanel) endPanel.hidden = true;
    updateHud(true);
    if (typeof SA.toast === 'function') {
      SA.toast('Move to steer. Pinch or hold Space to focus time.', 2600);
    }
  }

  function judgeRing(ring) {
    ring.userData.judged = true;
    const distance = Math.hypot(probe.position.x - ring.position.x, probe.position.y - ring.position.y);
    if (distance < 0.46) {
      game.score += 100 * game.combo;
      game.ringsPassed += 1;
      game.combo = Math.min(9, game.combo + 1);
      ring.material.color.setHex(0xffcf6e);
      if (typeof SA.unlockConcept === 'function') SA.unlockConcept(game.ringsPassed - 1);
      game.shake = Math.min(game.shake + 0.15, 0.4);
    } else {
      game.combo = 1;
      game.lives -= 1;
      ring.material.color.setHex(0xff6b8a);
      game.shake = 0.9;
      if (typeof SA.toast === 'function') {
        SA.toast(`Missed ring · ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`, 1800);
      }
      if (game.lives <= 0) endGame('lives');
    }
    updateHud(true);
  }

  function update(dt, time) {
    const motion = reducedMotion ? 0.2 : 1;
    stars.rotation.z = time * 0.004 * motion;
    probeGlow.material.opacity = 0.55 + Math.sin(time * 2.5) * 0.12;

    if (!game.active) {
      probe.position.x = Math.sin(time * 0.4) * 0.08;
      probe.position.y = Math.cos(time * 0.32) * 0.06;
      probe.position.z = 0;
      reticle.position.x = probe.position.x;
      reticle.position.y = probe.position.y;
      camera.position.x += (0 - camera.position.x) * Math.min(1, dt * 2);
      camera.position.y += (0 - camera.position.y) * Math.min(1, dt * 2);
      renderer.render(scene, camera);
      return;
    }

    game.timeLeft -= dt;
    game.elapsed += dt;
    if (game.timeLeft <= 0) {
      endGame('time');
      return;
    }

    if (game.demo) {
      let next = null;
      for (const ring of game.rings) {
        if (ring.userData.judged || ring.position.z > 0.8) continue;
        if (!next || ring.position.z > next.position.z) next = ring;
      }
      if (next) {
        tgt.aimX = clamp(next.position.x / 1.9, -1, 1);
        tgt.aimY = clamp(next.position.y / 1.9, -1, 1);
      }
    }

    const focus = focusActive();
    const timeScale = focus ? 0.38 : 1;

    const targetX = clamp(sig.aimX, -1, 1) * 2.05;
    const targetY = clamp(sig.aimY, -1, 1) * 1.35;
    probe.position.x += (targetX - probe.position.x) * Math.min(1, dt * 7);
    probe.position.y += (targetY - probe.position.y) * Math.min(1, dt * 7);
    probe.position.z = 0;
    probe.scale.setScalar(focus ? 1.18 : 1);

    reticle.position.x = probe.position.x;
    reticle.position.y = probe.position.y;
    reticle.material.opacity = focus ? 0.55 : 0.28;
    reticle.rotation.z = time * 0.6;

    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnRing();
      game.spawnTimer = 1.35;
    }

    const dz = (7.6 + game.ringsPassed * 0.14) * timeScale * dt;
    for (let i = game.rings.length - 1; i >= 0; i -= 1) {
      const ring = game.rings[i];
      ring.position.z += dz;
      ring.rotation.z += ring.userData.spin * dt * timeScale;
      if (!ring.userData.judged && ring.position.z > 0.9) judgeRing(ring);
      if (ring.position.z > 8) {
        game.ringGroup.remove(ring);
        ring.material.dispose();
        game.rings.splice(i, 1);
      }
    }

    game.shake *= Math.exp(-dt * 4);
    camera.position.x = Math.sin(time * 52) * game.shake * 0.045 + probe.position.x * 0.12;
    camera.position.y = Math.cos(time * 47) * game.shake * 0.035 + probe.position.y * 0.1;
    camera.lookAt(probe.position.x * 0.3, probe.position.y * 0.3, -24);

    updateHud();
    renderer.render(scene, camera);
  }

  if (startButton) startButton.addEventListener('click', startGame);
  if (replay) replay.addEventListener('click', startGame);

  if (handButton) {
    handButton.addEventListener('click', async () => {
      handButton.disabled = true;
      const previous = handButton.textContent;
      handButton.textContent = 'Starting camera…';
      const ok = await startCamera();
      handButton.disabled = false;
      if (ok) {
        handButton.textContent = previous;
        if (handNote) handNote.textContent = 'Camera live. Move your hand to steer; pinch to focus.';
        startGame();
      } else {
        handButton.textContent = previous;
        if (handNote) handNote.textContent = 'Camera unavailable. Mouse and keyboard are ready — no hardware required.';
      }
    });
  }

  canvas.addEventListener('pointermove', (event) => {
    if (input.mode !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    tgt.aimX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2.2, -1, 1);
    tgt.aimY = clamp((0.5 - (event.clientY - rect.top) / rect.height) * 2.2, -1, 1);
    tgt.present = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    input.gameDown = true;
    if (input.mode === 'mouse') tgt.pinch = 1;
  });
  canvas.style.touchAction = 'none';

  window.addEventListener('pointerup', () => {
    input.gameDown = false;
    if (input.mode === 'mouse') tgt.pinch = 0;
  });

  game.update = update;
  game.start = startGame;

  if (game.demo) window.setTimeout(() => startGame(), 700);

  return game;
}

/* ----------------------------------------------------------- camera engine */

const camera = {
  stream: null,
  video: null,
  landmarker: null,
  raf: 0,
  lastVideoTime: -1,
  frames: 0,
  fpsStarted: 0,
  starting: false,
};

const labEls = {
  statusLight: $('#status-light'),
  statusText: $('#status-text'),
  modePill: $('#lab-mode-pill'),
  fps: $('#lab-fps'),
  hint: $('#hand-hint'),
  cameraNote: $('#camera-note'),
  cameraButton: $('#btn-camera'),
  mouseButton: $('#btn-mouse'),
  valPinch: $('#val-pinch'),
  valOpen: $('#val-open'),
  valRot: $('#val-rot'),
  barPinch: $('#bar-pinch'),
  barOpen: $('#bar-open'),
  barRot: $('#bar-rot'),
};

function setStatus(text, kind = 'idle') {
  if (labEls.statusText && labEls.statusText.textContent !== text) labEls.statusText.textContent = text;
  if (labEls.statusLight) labEls.statusLight.className = `status-light ${kind}`;
}

function syncModeUi() {
  const active = Boolean(camera.stream) && input.mode === 'camera';
  if (labEls.modePill) {
    labEls.modePill.textContent = active ? 'CAMERA' : 'MOUSE';
    labEls.modePill.className = `pill${active ? ' live' : ''}`;
  }
  if (labEls.cameraButton) {
    labEls.cameraButton.textContent = active ? 'Stop camera' : 'Start camera';
    labEls.cameraButton.setAttribute('aria-pressed', String(active));
  }
  if (labEls.mouseButton) labEls.mouseButton.setAttribute('aria-pressed', String(!active));
  if (labEls.cameraNote) {
    labEls.cameraNote.textContent = active
      ? 'Camera on. Frames are processed in this tab and never uploaded.'
      : 'Mouse mode. Video is processed in this tab and never uploaded. Camera needs HTTPS or localhost.';
  }
  if (labEls.hint) {
    labEls.hint.textContent = active
      ? 'One hand · pinch to tighten · tilt to rotate'
      : 'Move: rotation & openness · hold click: pinch';
  }
}

function handleLandmarks(landmarks) {
  const wrist = landmarks[0];
  const middle = landmarks[9];
  const handSize =
    Math.hypot(wrist.x - middle.x, wrist.y - middle.y, (wrist.z - middle.z) * 0.6) || 1e-6;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.6);
  const pinchRatio = distance(landmarks[4], landmarks[8]) / handSize;
  tgt.pinch = clamp(1 - (pinchRatio - 0.14) / 0.7, 0, 1);

  const tips = [4, 8, 12, 16, 20];
  const meanReach = tips.reduce((sum, index) => sum + distance(landmarks[index], wrist), 0) / tips.length / handSize;
  tgt.open = clamp((meanReach - 0.45) / 1.1, 0, 1);

  const up = -1;
  const angle = Math.atan2(middle.x - wrist.x, (middle.y - wrist.y) * up) * (180 / Math.PI);
  tgt.rot = clamp(angle, -80, 80);

  tgt.aimX = clamp((0.5 - middle.x) * 3.2, -1, 1);
  tgt.aimY = clamp((0.5 - middle.y) * 3.2, -1, 1);
  tgt.present = true;
  camera.lastHandAt = performance.now();
  if (lab) lab.handLandmarks = landmarks;
}

async function getLandmarker() {
  if (camera.landmarker) return camera.landmarker;
  const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14');
  const fileset = await vision.FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  );
  const options = {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  };
  try {
    camera.landmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
  } catch {
    options.baseOptions.delegate = 'CPU';
    camera.landmarker = await vision.HandLandmarker.createFromOptions(fileset, options);
  }
  return camera.landmarker;
}

function detectLoop(now) {
  if (!camera.video || !camera.landmarker) return;
  if (document.hidden) {
    camera.raf = window.requestAnimationFrame(detectLoop);
    return;
  }
  if (camera.video.readyState >= 2 && camera.video.currentTime !== camera.lastVideoTime) {
    camera.lastVideoTime = camera.video.currentTime;
    try {
      const result = camera.landmarker.detectForVideo(camera.video, now);
      if (result.landmarks && result.landmarks[0]) {
        handleLandmarks(result.landmarks[0]);
        if (input.mode === 'camera') setStatus('Tracking 21 landmarks', 'live');
      } else if (performance.now() - (camera.lastHandAt || 0) > 420) {
        tgt.present = false;
        tgt.pinch = 0;
        tgt.open = 0.28;
        tgt.rot *= 0.96;
        if (lab) lab.handLandmarks = null;
        if (input.mode === 'camera') setStatus('Camera live · show your hand', 'warn');
      }
      camera.frames += 1;
    } catch (error) {
      console.warn('Hand tracking frame failed:', error);
    }
  }
  if (now - camera.fpsStarted > 1000) {
    sig.fps = camera.frames;
    camera.frames = 0;
    camera.fpsStarted = now;
  }
  camera.raf = window.requestAnimationFrame(detectLoop);
}

async function startCamera() {
  if (camera.stream && camera.video) {
    input.mode = 'camera';
    syncModeUi();
    setStatus('Camera live · show your hand', 'warn');
    return true;
  }
  if (camera.starting) return false;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('Camera needs HTTPS or localhost · mouse mode', 'error');
    syncModeUi();
    if (typeof SA.toast === 'function') SA.toast('Camera is unavailable here. Mouse mode still works.');
    return false;
  }

  camera.starting = true;
  setStatus('Requesting camera…', 'warn');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
    camera.stream = stream;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = 'position:fixed;left:-8px;top:-8px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(video);
    camera.video = video;
    video.srcObject = stream;
    await video.play();

    setStatus('Loading hand model…', 'warn');
    await getLandmarker();

    input.mode = 'camera';
    camera.lastHandAt = 0;
    camera.lastVideoTime = -1;
    camera.frames = 0;
    camera.fpsStarted = performance.now();
    syncModeUi();
    setStatus('Camera live · show your hand', 'warn');
    camera.raf = window.requestAnimationFrame(detectLoop);
    camera.stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => stopCamera());
    });
    return true;
  } catch (error) {
    console.warn('Camera could not start:', error);
    stopCamera(true);
    input.mode = 'mouse';
    syncModeUi();
    setStatus('Camera unavailable · mouse mode', 'error');
    if (typeof SA.toast === 'function') SA.toast('Camera unavailable. Mouse mode is active.');
    return false;
  } finally {
    camera.starting = false;
  }
}

function stopCamera(silent = false) {
  window.cancelAnimationFrame(camera.raf);
  camera.raf = 0;
  if (camera.stream) {
    camera.stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* already stopped */
      }
    });
  }
  if (camera.video) {
    camera.video.pause();
    camera.video.srcObject = null;
    camera.video.remove();
  }
  camera.stream = null;
  camera.video = null;
  camera.lastVideoTime = -1;
  camera.frames = 0;
  sig.fps = 0;
  tgt.present = false;
  tgt.pinch = 0;
  tgt.open = 0.28;
  if (lab) lab.handLandmarks = null;
  if (input.mode === 'camera') input.mode = 'mouse';
  syncModeUi();
  if (!silent) setStatus('Mouse mode · move inside the lab and hold click to pinch', 'idle');
}

/* ------------------------------------------------------------------- ui glue */

const labViewport = $('.lab-viewport');
const heroEls = {
  label: $('.orbit-head span:first-child'),
  pinch: $('#hero-pinch'),
  pinchBar: $('#hero-pinch-bar'),
  open: $('#hero-open'),
  openBar: $('#hero-open-bar'),
  rot: $('#hero-rot'),
  rotBar: $('#hero-rot-bar'),
};

if (labViewport) {
  labViewport.addEventListener('pointermove', (event) => {
    if (input.mode !== 'mouse') return;
    const rect = labViewport.getBoundingClientRect();
    const nx = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const ny = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    tgt.rot = (nx - 0.5) * 110;
    tgt.open = clamp(1 - ny * 1.08, 0, 1);
    tgt.aimX = (nx - 0.5) * 2;
    tgt.aimY = (0.5 - ny) * 2;
    tgt.present = true;
    input.mouseActive = true;
  }, { passive: true });

  labViewport.addEventListener('pointerleave', () => {
    if (input.mode !== 'mouse') return;
    input.mouseActive = false;
    input.labDown = false;
    tgt.present = false;
    tgt.pinch = 0;
    tgt.open = 0.28;
    tgt.rot = 0;
  });

  labViewport.addEventListener('pointerdown', (event) => {
    if (input.mode !== 'mouse' || (event.button !== undefined && event.button !== 0)) return;
    input.labDown = true;
    tgt.pinch = 1;
    tgt.present = true;
  });

  window.addEventListener('pointerup', () => {
    input.labDown = false;
    if (input.mode === 'mouse') tgt.pinch = 0;
  });
}

if (labEls.cameraButton) {
  labEls.cameraButton.addEventListener('click', async () => {
    if (camera.stream) {
      stopCamera();
      setStatus('Camera stopped · mouse mode', 'idle');
      return;
    }
    labEls.cameraButton.disabled = true;
    const ok = await startCamera();
    labEls.cameraButton.disabled = false;
    if (!ok) syncModeUi();
  });
}

if (labEls.mouseButton) {
  labEls.mouseButton.addEventListener('click', () => {
    if (camera.stream) stopCamera();
    input.mode = 'mouse';
    syncModeUi();
    setStatus('Mouse mode · move inside the lab and hold click to pinch', 'idle');
    if (typeof SA.toast === 'function') SA.toast('Mouse mode active. Move inside the lab; hold click to pinch.');
  });
}

window.addEventListener('keydown', (event) => {
  const game = sceneGame;
  if (!game || !game.active) return;
  if (event.key === ' ') {
    event.preventDefault();
    input.keyFocus = true;
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)) {
    event.preventDefault();
    keys.add(event.key);
    const step = 0.16;
    if (event.key === 'ArrowLeft' || event.key === 'a') tgt.aimX = clamp(tgt.aimX - step, -1, 1);
    if (event.key === 'ArrowRight' || event.key === 'd') tgt.aimX = clamp(tgt.aimX + step, -1, 1);
    if (event.key === 'ArrowUp' || event.key === 'w') tgt.aimY = clamp(tgt.aimY + step, -1, 1);
    if (event.key === 'ArrowDown' || event.key === 's') tgt.aimY = clamp(tgt.aimY - step, -1, 1);
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key);
  if (event.key === ' ') input.keyFocus = false;
});

window.addEventListener('blur', () => {
  input.keyFocus = false;
  input.labDown = false;
  input.gameDown = false;
  keys.clear();
  if (input.mode === 'mouse') tgt.pinch = 0;
});

window.addEventListener('pagehide', () => stopCamera(true));

/* ------------------------------------------------------------------ boot */

let lab = null;
let sceneGame = null;
let hero = null;

function updateHeroCard(time) {
  if (!heroEls.pinch) return;
  let pinch;
  let open;
  let rotation;
  if (input.mode === 'camera') {
    if (heroEls.label) heroEls.label.textContent = 'LIVE SIGNAL';
    pinch = sig.pinch;
    open = sig.open;
    rotation = sig.rot;
  } else if (input.mouseActive) {
    if (heroEls.label) heroEls.label.textContent = 'MOUSE SIGNAL';
    pinch = sig.pinch;
    open = sig.open;
    rotation = sig.rot;
  } else {
    if (heroEls.label) heroEls.label.textContent = 'SIGNAL PREVIEW';
    pinch = 0.38 + Math.sin(time * 0.7) * 0.22;
    open = 0.68 + Math.sin(time * 0.52 + 1) * 0.18;
    rotation = Math.sin(time * 0.42) * 18;
  }
  const p = clamp(pinch, 0, 1);
  const o = clamp(open, 0, 1);

  if (heroEls.pinch) heroEls.pinch.textContent = p.toFixed(2);
  if (heroEls.pinchBar) heroEls.pinchBar.style.width = `${p * 100}%`;
  if (heroEls.open) heroEls.open.textContent = o.toFixed(2);
  if (heroEls.openBar) heroEls.openBar.style.width = `${o * 100}%`;
  if (heroEls.rot) heroEls.rot.textContent = `${Math.round(rotation)}°`;
  if (heroEls.rotBar) heroEls.rotBar.style.width = `${clamp(Math.abs(rotation) / 60, 0, 1) * 100}%`;
}

const uiCache = { pinch: '', open: '', rot: '', fps: '' };

function updateLabUi() {
  const pinchText = `${Math.round(sig.pinch * 100)}%`;
  const openText = `${Math.round(sig.open * 100)}%`;
  const rotText = `${Math.round(sig.rot)}°`;
  if (pinchText !== uiCache.pinch) {
    uiCache.pinch = pinchText;
    if (labEls.valPinch) labEls.valPinch.textContent = pinchText;
    if (labEls.barPinch) labEls.barPinch.style.width = `${sig.pinch * 100}%`;
  }
  if (openText !== uiCache.open) {
    uiCache.open = openText;
    if (labEls.valOpen) labEls.valOpen.textContent = openText;
    if (labEls.barOpen) labEls.barOpen.style.width = `${sig.open * 100}%`;
  }
  if (rotText !== uiCache.rot) {
    uiCache.rot = rotText;
    if (labEls.valRot) labEls.valRot.textContent = rotText;
    if (labEls.barRot) labEls.barRot.style.width = `${clamp(Math.abs(sig.rot) / 60, 0, 1) * 100}%`;
  }
  const fpsText = input.mode === 'camera' ? `${sig.fps} fps` : '-- fps';
  if (fpsText !== uiCache.fps) {
    uiCache.fps = fpsText;
    if (labEls.fps) labEls.fps.textContent = fpsText;
  }
}

const visible = { hero: true, lab: true, game: true };

function observeVisibility(element, key) {
  if (!element || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      visible[key] = entries.some((entry) => entry.isIntersecting);
    },
    { rootMargin: '80px', threshold: 0.01 },
  );
  io.observe(element);
}

function boot() {
  hero = initHero();
  lab = initLab();
  sceneGame = initGame();

  observeVisibility($('#hero-canvas'), 'hero');
  observeVisibility($('.lab-viewport'), 'lab');
  observeVisibility($('#game-stage'), 'game');

  syncModeUi();
  setStatus('Mouse mode · move inside the lab and hold click to pinch', 'idle');
  updateLabUi();

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const time = now / 1000;

    updateSignals(dt);
    updateHeroCard(time);
    updateLabUi();

    if (hero && visible.hero) hero.update(dt, time);
    if (lab && visible.lab) lab.update(dt, time);
    if (sceneGame && visible.game) sceneGame.update(dt, time);

    window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
