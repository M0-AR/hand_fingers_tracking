import * as THREE from 'three';
import { HAND_POINTS, HAND_BONES, LANDMARK_GROUPS, LANDMARKS } from './hand-model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pad = (value) => String(value).padStart(2, '0');

const COLOR_BY_INDEX = {};
for (const group of LANDMARK_GROUPS) {
  for (const index of group.indices) COLOR_BY_INDEX[index] = group.color;
}

const KEY_TOUR = [0, 4, 8, 12, 16, 20, 9];
const KEY_LABELS = new Set(KEY_TOUR);
const DEFAULT_HINT = 'Drag to orbit · Scroll to zoom · Click a point';

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function numberTexture(index, color) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.beginPath();
  context.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
  context.fillStyle = 'rgba(4, 10, 18, 0.9)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = color;
  context.stroke();
  context.fillStyle = '#f4fbff';
  context.font = '700 52px Inter, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(index), size / 2, size / 2 + 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function initLandmarkExplorer() {
  const stage = $('#landmark-stage');
  const canvas = $('#landmark-canvas');
  const loader = $('#landmark-loader');
  const fallback = $('#landmark-fallback');
  const hint = $('#landmark-hover');
  const list = $('#landmark-list');
  const legend = $('#landmark-legend');
  const tourBtn = $('#landmark-tour');
  const labelsBtn = $('#landmark-labels');
  const resetBtn = $('#landmark-reset');
  const info = {
    panel: $('#landmark-panel'),
    index: $('#landmark-index'),
    name: $('#landmark-name'),
    group: $('#landmark-group'),
    role: $('#landmark-role'),
    x: $('#landmark-x'),
    y: $('#landmark-y'),
    z: $('#landmark-z'),
  };

  if (!stage || !canvas || !list) return;

  let selected = 0;
  let hovered = null;
  let labelsVisible = true;
  let tourTimer = null;
  let tourIndex = 0;

  const buttons = LANDMARKS.map((landmark, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'landmark-dot';
    button.dataset.index = String(index);
    button.style.setProperty('--dot', COLOR_BY_INDEX[index]);
    button.setAttribute('aria-label', `Landmark ${index}, ${landmark.name}`);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = String(index);
    button.addEventListener('click', () => select(index));
    list.appendChild(button);
    return button;
  });

  if (legend) {
    for (const group of LANDMARK_GROUPS) {
      const item = document.createElement('span');
      item.className = 'landmark-legend-item';
      item.style.setProperty('--dot', group.color);
      item.innerHTML = `<i aria-hidden="true"></i>${group.label}`;
      legend.appendChild(item);
    }
  }

  function updateInfo(index) {
    const landmark = LANDMARKS[index];
    const point = HAND_POINTS[index];
    if (info.index) info.index.textContent = pad(index);
    if (info.name) info.name.textContent = landmark.name;
    if (info.group) info.group.textContent = `${landmark.group} · ${index === 0 ? 'anchor' : 'joint'}`;
    if (info.role) info.role.textContent = landmark.role;
    if (info.x) info.x.textContent = point[0].toFixed(2);
    if (info.y) info.y.textContent = point[1].toFixed(2);
    if (info.z) info.z.textContent = point[2].toFixed(2);
    if (info.panel) info.panel.style.setProperty('--accent', COLOR_BY_INDEX[index]);
    buttons.forEach((button, i) => {
      button.classList.toggle('is-active', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
  }

  /* ------------------------------------------------------------- 3D scene */

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    showFallback();
  }

  if (!renderer) {
    selected = 0;
    updateInfo(0);
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  const defaultZ = 4.35;
  camera.position.set(0, 0.05, defaultZ);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(new THREE.HemisphereLight(0x9fdcff, 0x05080f, 1.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(2.5, 3, 4);
  scene.add(keyLight);
  const rimCyan = new THREE.PointLight(0x35e0d0, 16, 12, 2);
  rimCyan.position.set(-2.2, 1.2, 2.2);
  scene.add(rimCyan);
  const rimViolet = new THREE.PointLight(0xa78bfa, 10, 12, 2);
  rimViolet.position.set(2.2, -1.2, 1.6);
  scene.add(rimViolet);

  const hand = new THREE.Group();
  hand.position.set(0.19, 0.25, 0);
  hand.rotation.set(-0.08, -0.32, 0.02);
  scene.add(hand);

  const points = HAND_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const centroid = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(points.length);

  const boneMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c6f86,
    emissive: 0x2bd9cf,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.1,
  });
  for (const [a, b] of HAND_BONES) {
    const start = points[a];
    const end = points[b];
    const direction = end.clone().sub(start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(0.011, 0.011, length, 8);
    const mesh = new THREE.Mesh(geometry, boneMaterial);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    hand.add(mesh);
  }

  const palmZ = points.reduce((sum, point) => sum + point.z, 0) / points.length - 0.02;
  const palmGeometry = new THREE.BufferGeometry();
  palmGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    points[0].x, points[0].y, palmZ,
    points[5].x, points[5].y, palmZ,
    points[9].x, points[9].y, palmZ,
    points[0].x, points[0].y, palmZ,
    points[9].x, points[9].y, palmZ,
    points[13].x, points[13].y, palmZ,
    points[0].x, points[0].y, palmZ,
    points[13].x, points[13].y, palmZ,
    points[17].x, points[17].y, palmZ,
  ], 3));
  palmGeometry.computeVertexNormals();
  hand.add(new THREE.Mesh(palmGeometry, new THREE.MeshStandardMaterial({
    color: 0x0d3a49,
    emissive: 0x0a2a36,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.55,
    roughness: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  })));

  const glow = glowTexture();
  const jointGeometry = new THREE.SphereGeometry(0.042, 20, 16);
  const hitGeometry = new THREE.SphereGeometry(0.09, 12, 10);
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const joints = [];
  const hitMeshes = [];
  const labels = [];
  const glows = [];

  points.forEach((point, index) => {
    const color = new THREE.Color(COLOR_BY_INDEX[index]);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.35,
      metalness: 0.25,
    });
    const joint = new THREE.Mesh(jointGeometry, material);
    joint.position.copy(point);
    hand.add(joint);
    joints.push(joint);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow,
      color,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.position.copy(point);
    halo.scale.setScalar(0.26);
    hand.add(halo);
    glows.push(halo);

    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    hit.position.copy(point);
    hit.userData.index = index;
    hand.add(hit);
    hitMeshes.push(hit);

    const offset = point.clone().sub(centroid);
    offset.z = 0;
    if (offset.lengthSq() < 0.0001) offset.set(0, 1, 0);
    offset.normalize().multiplyScalar(0.105);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: numberTexture(index, COLOR_BY_INDEX[index]),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }));
    label.position.copy(point).add(offset).add(new THREE.Vector3(0, 0, 0.04));
    label.scale.setScalar(KEY_LABELS.has(index) ? 0.128 : 0.108);
    label.renderOrder = 20;
    hand.add(label);
    labels.push(label);
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.072, 0.094, 40),
    new THREE.MeshBasicMaterial({ color: 0xffcf6e, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.visible = false;
  hand.add(ring);

  const stars = new THREE.BufferGeometry();
  const starPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    const radius = 1.7 + Math.random() * 1.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi) * 0.6 - 0.5;
  }
  stars.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({
    color: 0x4c8dff,
    size: 0.017,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })));

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.0035, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0x35e0d0, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  orbitRing.position.z = -0.55;
  scene.add(orbitRing);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let moved = false;
  let activePointer = null;
  let lastX = 0;
  let lastY = 0;
  let startX = 0;
  let startY = 0;
  let pauseUntil = 0;

  function showFallback() {
    if (loader) loader.hidden = true;
    if (fallback) fallback.hidden = false;
    canvas.hidden = true;
    stage.classList.add('is-fallback');
  }

  function setHover(index) {
    if (hovered === index) return;
    hovered = index;
    joints.forEach((joint, i) => {
      joint.scale.setScalar(i === selected ? 1.55 : i === hovered ? 1.3 : 1);
    });
    canvas.style.cursor = hovered !== null ? 'pointer' : 'grab';
    if (hint) hint.textContent = hovered !== null ? `${pad(hovered)} · ${LANDMARKS[hovered].name}` : DEFAULT_HINT;
  }

  function select(index, source = 'user') {
    selected = index;
    updateInfo(index);
    if (source !== 'tour') stopTour();
    joints.forEach((joint, i) => {
      joint.scale.setScalar(i === selected ? 1.55 : i === hovered ? 1.3 : 1);
    });
    ring.visible = true;
    ring.position.copy(points[index]).add(new THREE.Vector3(0, 0, 0.045));
    labels.forEach((label, i) => {
      label.visible = labelsVisible || i === index;
    });
    pauseUntil = performance.now() + 7000;
  }

  function stopTour() {
    if (tourTimer) window.clearInterval(tourTimer);
    tourTimer = null;
    tourIndex = 0;
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', 'false');
      tourBtn.textContent = 'Guided tour';
    }
  }

  function startTour() {
    stopTour();
    if (!tourBtn) return;
    tourBtn.setAttribute('aria-pressed', 'true');
    tourBtn.textContent = 'Stop tour';
    select(KEY_TOUR[0], 'tour');
    tourIndex = 1;
    tourTimer = window.setInterval(() => {
      if (tourIndex >= KEY_TOUR.length) {
        stopTour();
        return;
      }
      select(KEY_TOUR[tourIndex], 'tour');
      tourIndex += 1;
    }, 2200);
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    return hits.length ? hits[0].object.userData.index : null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    moved = false;
    activePointer = event.pointerId;
    lastX = startX = event.clientX;
    lastY = startY = event.clientY;
    pauseUntil = performance.now() + 7000;
    stopTour();
    canvas.style.cursor = 'grabbing';
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* pointer capture is a convenience, not a requirement */
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    setPointer(event);
    if (dragging && event.pointerId === activePointer) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 6) moved = true;
      if (moved) {
        hand.rotation.y += dx * 0.008;
        hand.rotation.x = clamp(hand.rotation.x + dy * 0.008, -1.25, 1.25);
      }
      lastX = event.clientX;
      lastY = event.clientY;
      return;
    }
    if (!dragging) setHover(pick());
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    canvas.style.cursor = hovered !== null ? 'pointer' : 'grab';
    if (!moved) {
      setPointer(event);
      const index = pick();
      if (index !== null) select(index);
    }
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
  });

  canvas.addEventListener('pointercancel', () => {
    dragging = false;
    activePointer = null;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('pointerleave', () => {
    if (!dragging) setHover(null);
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    camera.position.z = clamp(camera.position.z + event.deltaY * 0.002, 3.1, 6.2);
  }, { passive: false });

  canvas.addEventListener('keydown', (event) => {
    const step = 0.12;
    if (event.key === 'ArrowLeft') hand.rotation.y -= step;
    else if (event.key === 'ArrowRight') hand.rotation.y += step;
    else if (event.key === 'ArrowUp') hand.rotation.x = clamp(hand.rotation.x - step, -1.25, 1.25);
    else if (event.key === 'ArrowDown') hand.rotation.x = clamp(hand.rotation.x + step, -1.25, 1.25);
    else if (event.key === '+' || event.key === '=') camera.position.z = clamp(camera.position.z - 0.3, 3.1, 6.2);
    else if (event.key === '-' || event.key === '_') camera.position.z = clamp(camera.position.z + 0.3, 3.1, 6.2);
    else if (event.key === 'Home') resetView();
    else return;
    event.preventDefault();
    pauseUntil = performance.now() + 7000;
  });

  if (labelsBtn) {
    labelsBtn.addEventListener('click', () => {
      labelsVisible = !labelsVisible;
      labelsBtn.setAttribute('aria-pressed', String(labelsVisible));
      labelsBtn.textContent = labelsVisible ? 'Numbers on' : 'Numbers off';
      labels.forEach((label, i) => {
        label.visible = labelsVisible || i === selected;
      });
    });
  }

  if (resetBtn) resetBtn.addEventListener('click', resetView);

  if (tourBtn) {
    tourBtn.addEventListener('click', () => {
      if (tourTimer) stopTour();
      else startTour();
    });
  }

  function resetView() {
    hand.rotation.set(-0.08, -0.32, 0.02);
    camera.position.z = defaultZ;
    pauseUntil = performance.now() + 7000;
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  let visible = false;
  let running = false;
  let frame = 0;
  let last = performance.now();
  let firstFrame = true;

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const time = now / 1000;

    if (!dragging && !reducedMotion && now > pauseUntil) {
      hand.rotation.y += dt * 0.16;
    }
    if (ring.visible) {
      const pulse = 1 + Math.sin(time * 3.2) * 0.12;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.6 + Math.sin(time * 3.2) * 0.22;
    }
    glows.forEach((halo, i) => {
      const base = i === selected ? 0.34 : 0.24;
      halo.scale.setScalar(base + Math.sin(time * 2.4 + i) * 0.02);
    });

    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      if (loader) loader.hidden = true;
      stage.classList.add('is-ready');
    }
    frame = window.requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    frame = window.requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else stop();
    }, { rootMargin: '160px', threshold: 0.01 });
    observer.observe(stage);
  } else {
    visible = true;
    start();
  }

  select(0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandmarkExplorer, { once: true });
} else {
  initLandmarkExplorer();
}