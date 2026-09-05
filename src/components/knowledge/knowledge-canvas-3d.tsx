'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster } from '@/types/knowledge';
import { RotateCcw, ZoomIn, ZoomOut, Layers, Eye, Sparkles } from 'lucide-react';

interface KnowledgeCanvas3DProps {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  clusters: KnowledgeCluster[];
  activeCluster: KnowledgeCluster | null;
  selectedNodeId: string | null;
  onSelectNode: (node: KnowledgeNode | null) => void;
  onUpdatePositions3D?: (clusterId: string | null, positions: Record<string, { x: number; y: number; z: number }>) => void;
}

// 2D Canvas-based Label Sprite Cache
const _labelTextureCache = new Map<string, THREE.CanvasTexture>();

function getLabelSprite(text: string, color: string): THREE.Sprite {
  const cacheKey = `${text}_${color}`;
  let texture = _labelTextureCache.get(cacheKey);

  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
    const metrics = ctx.measureText(text);
    const textWidth = Math.min(metrics.width + 36, 500);
    const rh = 60;
    const rx = (512 - textWidth) / 2;
    const ry = (128 - rh) / 2;
    const r = 12;

    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + textWidth - r, ry);
    ctx.quadraticCurveTo(rx + textWidth, ry, rx + textWidth, ry + r);
    ctx.lineTo(rx + textWidth, ry + rh - r);
    ctx.quadraticCurveTo(rx + textWidth, ry + rh, rx + textWidth - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color || '#326CE5';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 64, 480);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    _labelTextureCache.set(cacheKey, texture);
  }

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4.2, 1.05, 1);
  sprite.position.y = 1.35;
  return sprite;
}

// Parametric 3D Geometries
function createNodeGeometry(shape: string): THREE.BufferGeometry {
  switch (shape) {
    case 'box': {
      const g = new THREE.BoxGeometry(1.2, 0.9, 1.2);
      return g;
    }
    case 'cylinder': {
      const g = new THREE.CylinderGeometry(0.7, 0.7, 1.1, 24);
      return g;
    }
    case 'star': {
      const s = new THREE.Shape();
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? 0.9 : 0.45;
        const a = (Math.PI / points) * i - Math.PI / 2;
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      }
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
      g.center();
      return g;
    }
    case 'shield': {
      const s = new THREE.Shape();
      s.moveTo(0, 0.6);
      s.quadraticCurveTo(0.6, 0.6, 0.6, 0.2);
      s.lineTo(0.6, -0.2);
      s.quadraticCurveTo(0.5, -0.6, 0, -0.7);
      s.quadraticCurveTo(-0.5, -0.6, -0.6, -0.2);
      s.lineTo(-0.6, 0.2);
      s.quadraticCurveTo(-0.6, 0.6, 0, 0.6);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
      g.center();
      return g;
    }
    case 'platform': {
      const g = new THREE.CylinderGeometry(1.4, 1.6, 0.4, 8);
      return g;
    }
    case 'hex':
    default: {
      const s = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = 0.8 * Math.cos(a);
        const y = 0.8 * Math.sin(a);
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      }
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
      g.center();
      return g;
    }
  }
}

export const KnowledgeCanvas3D: React.FC<KnowledgeCanvas3DProps> = ({
  nodes,
  relations,
  clusters,
  activeCluster,
  selectedNodeId,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const linesGroupRef = useRef<THREE.Group | null>(null);
  const particlesGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Nodes to display (filter by active cluster if selected)
  const visibleNodes = useMemo(() => {
    if (!activeCluster) return nodes;
    const ids = new Set(activeCluster.nodeIds || []);
    return nodes.filter((n) => ids.has(n.id));
  }, [nodes, activeCluster]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleRelations = useMemo(() => {
    return relations.filter(
      (r) => visibleNodeIds.has(r.sourceNodeId) && visibleNodeIds.has(r.targetNodeId)
    );
  }, [relations, visibleNodeIds]);

  // Compute 3D node coordinates
  const positions3D = useMemo(() => {
    const saved = activeCluster?.positions3D || {};
    const updated: Record<string, { x: number; y: number; z: number }> = { ...saved };

    const count = visibleNodes.length;
    const radius = Math.max(9, count * 2.2);

    visibleNodes.forEach((node, i) => {
      if (!updated[node.id]) {
        const angle = (2 * Math.PI * i) / (count || 1);
        updated[node.id] = {
          x: Math.round(Math.cos(angle) * radius * 10) / 10,
          y: 0,
          z: Math.round(Math.sin(angle) * radius * 10) / 10,
        };
      }
    });

    return updated;
  }, [visibleNodes, activeCluster]);

  // Initialize Three.js Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.FogExp2(0x0a0e14, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
    camera.position.set(16, 14, 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // 4. OrbitControls with cursor-focused zoom
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false; // We handle cursor zoom via custom wheel handler
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Stay above ground plane
    controls.minDistance = 4;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Helper to smoothly zoom camera and target relative to a 3D focus point
    const zoomRaycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const zoomAroundPoint = (focus: THREE.Vector3, factor: number) => {
      const currentDist = camera.position.distanceTo(controls.target);
      const newDist = currentDist * factor;
      if (factor < 1 && newDist < controls.minDistance) return;
      if (factor > 1 && newDist > controls.maxDistance) return;

      camera.position.set(
        focus.x + (camera.position.x - focus.x) * factor,
        focus.y + (camera.position.y - focus.y) * factor,
        focus.z + (camera.position.z - focus.z) * factor
      );
      controls.target.set(
        focus.x + (controls.target.x - focus.x) * factor,
        focus.y + (controls.target.y - focus.y) * factor,
        focus.z + (controls.target.z - focus.z) * factor
      );
      controls.update();
    };

    // Cursor-focused wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      zoomRaycaster.setFromCamera(ndc, camera);
      const hitPoint = new THREE.Vector3();
      const hit = zoomRaycaster.ray.intersectPlane(groundPlane, hitPoint);
      const focus = hit ? hitPoint : controls.target.clone();

      const delta = Math.sign(e.deltaY);
      if (delta === 0) return;
      const factor = delta > 0 ? 1.08 : 0.92;
      zoomAroundPoint(focus, factor);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Multitouch gesture handling (Pinch-to-zoom & Tap to inspect)
    let initialPinchDist = 0;
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let lastTapTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartTime = Date.now();
        touchStartPos = { x: t.clientX, y: t.clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (currentDist > 0 && Math.abs(currentDist - initialPinchDist) > 3) {
          const ratio = initialPinchDist / currentDist;
          const factor = THREE.MathUtils.clamp(1 + (ratio - 1) * 0.45, 0.88, 1.14);

          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          const rect = canvas.getBoundingClientRect();
          const ndc = new THREE.Vector2(
            ((midX - rect.left) / rect.width) * 2 - 1,
            -((midY - rect.top) / rect.height) * 2 + 1
          );
          zoomRaycaster.setFromCamera(ndc, camera);
          const hitPoint = new THREE.Vector3();
          const hit = zoomRaycaster.ray.intersectPlane(groundPlane, hitPoint);
          const focus = hit ? hitPoint : controls.target.clone();

          zoomAroundPoint(focus, factor);
          initialPinchDist = currentDist;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDist = 0;
      }
      if (e.changedTouches.length === 1 && e.touches.length === 0) {
        const t = e.changedTouches[0];
        const duration = Date.now() - touchStartTime;
        const dist = Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y);

        // Tap gesture (< 300ms duration and movement < 15px)
        if (duration < 300 && dist < 15) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTapTime;
          lastTapTime = now;

          const rect = canvas.getBoundingClientRect();
          const ndc = new THREE.Vector2(
            ((t.clientX - rect.left) / rect.width) * 2 - 1,
            -((t.clientY - rect.top) / rect.height) * 2 + 1
          );
          clickRaycaster.setFromCamera(ndc, camera);

          const pickables: THREE.Object3D[] = [];
          meshMapRef.current.forEach((grp) => pickables.push(...grp.children));
          const hits = clickRaycaster.intersectObjects(pickables, true);

          if (hits.length > 0) {
            let root: THREE.Object3D | null = hits[0].object;
            while (root && !root.userData.nodeId) {
              root = root.parent;
            }
            if (root && root.userData.node) {
              onSelectNode(root.userData.node);

              // Double-tap on node focuses camera smoothly
              if (timeSinceLastTap < 350) {
                const targetPos = root.position;
                controls.target.set(targetPos.x, targetPos.y, targetPos.z);
                controls.update();
              }
            }
          } else {
            // Tapped empty space
            if (timeSinceLastTap < 350) {
              // Double-tap resets camera view
              camera.position.set(16, 14, 16);
              controls.target.set(0, 0, 0);
              controls.update();
            } else {
              onSelectNode(null);
            }
          }
        }
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // 5. Lights
    const ambient = new THREE.AmbientLight(0x8899bb, 0.8);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x326ce5, 0x111625, 0.6);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(20, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // 6. Ground Grid & Subtle Circular Horizon
    const grid = new THREE.GridHelper(40, 40, 0x326ce5, 0x1a2333);
    grid.position.y = -0.01;
    scene.add(grid);

    const groundGeo = new THREE.CircleGeometry(24, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0c111a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.02;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Groups for lines and particles
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);
    linesGroupRef.current = linesGroup;

    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    // Raycast click detection
    const clickRaycaster = new THREE.Raycaster();
    const onPointerDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      clickRaycaster.setFromCamera(ndc, camera);

      const pickables: THREE.Object3D[] = [];
      meshMapRef.current.forEach((grp) => pickables.push(...grp.children));
      const hits = clickRaycaster.intersectObjects(pickables, true);

      if (hits.length > 0) {
        let root: THREE.Object3D | null = hits[0].object;
        while (root && !root.userData.nodeId) {
          root = root.parent;
        }
        if (root && root.userData.node) {
          onSelectNode(root.userData.node);
        }
      } else if (e.target === canvas) {
        onSelectNode(null);
      }
    };
    canvas.addEventListener('click', onPointerDown);

    // Resize Handler
    const onResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Render & Animation Loop
    let lastTime = 0;
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      controls.update();

      // Animate halo rings and hovering nodes gently
      meshMapRef.current.forEach((grp) => {
        const ring = grp.getObjectByName('glowRing');
        if (ring) {
          ring.rotation.z += 0.01;
        }
        const mesh = grp.getObjectByName('mainMesh');
        if (mesh && grp.userData.isSelected) {
          mesh.rotation.y += 0.02;
        }
      });

      // Animate particles flowing along relationship arcs
      particlesGroup.children.forEach((p: any) => {
        if (p.userData.curve) {
          p.userData.progress = (p.userData.progress + delta * p.userData.speed) % 1;
          const pos = p.userData.curve.getPointAt(p.userData.progress);
          p.position.copy(pos);
        }
      });

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onPointerDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, []);

  // Update 3D Nodes when data or positions change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous nodes
    meshMapRef.current.forEach((grp) => scene.remove(grp));
    meshMapRef.current.clear();

    visibleNodes.forEach((node) => {
      const pos = positions3D[node.id] || { x: 0, y: 0, z: 0 };
      const group = new THREE.Group();
      group.userData.nodeId = node.id;
      group.userData.node = node;
      group.userData.isSelected = selectedNodeId === node.id;
      group.position.set(pos.x, 0.45, pos.z);

      // Main Parametric 3D Geometry
      const geom = createNodeGeometry(node.visualShape);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.visualColor || '#326CE5'),
        metalness: 0.5,
        roughness: 0.35,
        emissive: new THREE.Color(node.visualColor || '#326CE5'),
        emissiveIntensity: selectedNodeId === node.id ? 0.45 : 0.15,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = 'mainMesh';
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Status Glow Ring on ground
      const ringGeo = new THREE.RingGeometry(0.9, 1.25, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.visualColor || '#326CE5'),
        transparent: true,
        opacity: selectedNodeId === node.id ? 0.45 : 0.2,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'glowRing';
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.42;
      group.add(ring);

      // Floating 3D Label Sprite
      const sprite = getLabelSprite(node.title, node.visualColor || '#326CE5');
      group.add(sprite);

      scene.add(group);
      meshMapRef.current.set(node.id, group);
    });
  }, [visibleNodes, positions3D, selectedNodeId]);

  // Update 3D Relationship Curves & Animated Particles
  useEffect(() => {
    const linesGroup = linesGroupRef.current;
    const particlesGroup = particlesGroupRef.current;
    if (!linesGroup || !particlesGroup) return;

    // Clear old lines & particles
    while (linesGroup.children.length > 0) linesGroup.remove(linesGroup.children[0]);
    while (particlesGroup.children.length > 0) particlesGroup.remove(particlesGroup.children[0]);

    visibleRelations.forEach((rel) => {
      const sourcePos = positions3D[rel.sourceNodeId];
      const targetPos = positions3D[rel.targetNodeId];
      if (!sourcePos || !targetPos) return;

      const p1 = new THREE.Vector3(sourcePos.x, 0.45, sourcePos.z);
      const p3 = new THREE.Vector3(targetPos.x, 0.45, targetPos.z);
      const mid = new THREE.Vector3().addVectors(p1, p3).multiplyScalar(0.5);
      // Lift relationship curve into the 3rd dimension!
      mid.y += Math.min(2.5, p1.distanceTo(p3) * 0.25);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p3);
      const points = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.55,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      linesGroup.add(line);

      // Add 2 animated flow particles per curve
      for (let i = 0; i < 2; i++) {
        const pGeo = new THREE.SphereGeometry(0.12, 12, 12);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff });
        const particle = new THREE.Mesh(pGeo, pMat) as any;
        particle.userData = {
          curve,
          progress: i * 0.5,
          speed: 0.35,
        };
        particlesGroup.add(particle);
      }
    });
  }, [visibleRelations, positions3D]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(16, 14, 16);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleZoom = (factor: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const focus = controlsRef.current.target.clone();
    const currentDist = cameraRef.current.position.distanceTo(focus);
    const newDist = currentDist * factor;
    if (factor < 1 && newDist < controlsRef.current.minDistance) return;
    if (factor > 1 && newDist > controlsRef.current.maxDistance) return;

    cameraRef.current.position.set(
      focus.x + (cameraRef.current.position.x - focus.x) * factor,
      focus.y + (cameraRef.current.position.y - focus.y) * factor,
      focus.z + (cameraRef.current.position.z - focus.z) * factor
    );
    controlsRef.current.update();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950 touch-none select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />

      {/* 3D Navigation Controls with Touch hit targets */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-lg">
        <button
          onClick={() => handleZoom(0.85)}
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(1.18)}
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-5 bg-border mx-0.5" />
        <button
          onClick={handleResetCamera}
          className="px-2.5 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-xs font-semibold active:scale-95"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <div className="w-[1px] h-5 bg-border mx-0.5" />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono px-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span className="hidden md:inline">Pinch to zoom • Drag to orbit • Double-tap to focus</span>
          <span className="md:hidden text-[10px]">3D Space</span>
        </div>
      </div>
    </div>
  );
};
