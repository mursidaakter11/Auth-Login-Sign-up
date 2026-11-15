import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getJointTargetsForPose, type AvatarPose } from '../utils/avatarPose';

interface Avatar3DProps {
  pose: AvatarPose;
  lookProgress: number;
  isDark: boolean;
}

const POSE_CAPTIONS: Record<AvatarPose, string> = {
  idle: 'Ready when you are',
  watching: 'Following your entry',
  covering: 'Eyes covered for privacy',
  peeking: 'Peeking while password is visible',
  happy: 'Identity verified',
};

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.18)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoundedHandMesh(
  skinMat: THREE.Material,
  cuffMat: THREE.Material,
  side: 'left' | 'right'
): THREE.Group {
  const handGroup = new THREE.Group();

  // Wrist cuff accent
  const cuffGeo = new THREE.CylinderGeometry(0.068, 0.072, 0.045, 18);
  const cuff = new THREE.Mesh(cuffGeo, cuffMat);
  cuff.position.y = -0.015;
  handGroup.add(cuff);

  // Sculpted rounded palm
  const palmShape = new THREE.Shape();
  const w = 0.095;
  const h = 0.105;
  const r = 0.045;
  palmShape.moveTo(-w + r, -h);
  palmShape.lineTo(w - r, -h);
  palmShape.quadraticCurveTo(w, -h, w, -h + r);
  palmShape.lineTo(w, h - r);
  palmShape.quadraticCurveTo(w, h, w - r, h);
  palmShape.lineTo(-w + r, h);
  palmShape.quadraticCurveTo(-w, h, -w, h - r);
  palmShape.lineTo(-w, -h + r);
  palmShape.quadraticCurveTo(-w, -h, -w + r, -h);

  const palmGeo = new THREE.ExtrudeGeometry(palmShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 4,
  });
  palmGeo.center();
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.set(0, -0.115, 0);
  palm.castShadow = true;
  handGroup.add(palm);

  // 4 sculpted fingers extending downward from palm
  const fingerOffsets = [-0.066, -0.022, 0.022, 0.066];
  const fingerLengths = [0.078, 0.092, 0.088, 0.070];
  fingerOffsets.forEach((fx, idx) => {
    const fGeo = new THREE.CapsuleGeometry(0.021, fingerLengths[idx], 6, 12);
    const finger = new THREE.Mesh(fGeo, skinMat);
    finger.position.set(fx, -0.235 - fingerLengths[idx] * 0.25, 0.008);
    finger.rotation.x = 0.14;
    finger.castShadow = true;
    handGroup.add(finger);
  });

  // Thumb on inner side
  const thumbGeo = new THREE.CapsuleGeometry(0.023, 0.062, 6, 12);
  const thumb = new THREE.Mesh(thumbGeo, skinMat);
  const thumbSign = side === 'left' ? -1 : 1;
  thumb.position.set(thumbSign * 0.112, -0.135, 0.022);
  thumb.rotation.z = thumbSign * 0.55;
  thumb.rotation.x = 0.2;
  thumb.castShadow = true;
  handGroup.add(thumb);

  return handGroup;
}

export function Avatar3D({ pose, lookProgress, isDark }: Avatar3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const targetStateRef = useRef({ pose, lookProgress, isDark });
  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    targetStateRef.current = { pose, lookProgress, isDark };
    requestRenderRef.current?.();
  }, [pose, lookProgress, isDark]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL from GPU renderer string (never user agent)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Mandatory studio environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 168;
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);
    camera.position.set(0, 1.02, 3.88);
    camera.lookAt(0, 0.90, 0);
    renderer.setSize(width, height, false);

    // 3-point warm/cool studio lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x475569, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.85);
    keyLight.position.set(2.4, 3.6, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.25);
    rimLight.position.set(-2.5, 2.2, -2.5);
    scene.add(rimLight);

    // Calibrated PBR materials with >= 0.25 roughness separation
    const ceramicShellMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.62,
      metalness: 0.04,
    });
    const collarMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.28,
      metalness: 0.65,
    });
    const cobaltAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.22,
      metalness: 0.72,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.16,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.0,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x1e40af,
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.2,
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.78,
      metalness: 0.05,
    });

    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    // Root Avatar Group grounded at y = 0
    const avatarRoot = new THREE.Group();
    scene.add(avatarRoot);

    // 1. Studio Pedestal & Contact Shadow Disc
    const pedestalGeo = new THREE.CylinderGeometry(0.76, 0.84, 0.12, 36);
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.06;
    pedestal.receiveShadow = true;
    avatarRoot.add(pedestal);

    const shadowPlaneGeo = new THREE.CircleGeometry(0.68, 32);
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    avatarRoot.add(shadowPlane);

    // 2. Sculpted Lathe Torso
    const torsoPoints = [
      new THREE.Vector2(0.01, 0.02),
      new THREE.Vector2(0.41, 0.04),
      new THREE.Vector2(0.44, 0.28),
      new THREE.Vector2(0.39, 0.56),
      new THREE.Vector2(0.24, 0.72),
      new THREE.Vector2(0.01, 0.74),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
    const torso = new THREE.Mesh(torsoGeo, ceramicShellMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    avatarRoot.add(torso);

    // Chest cobalt emblem inlay
    const chestBadgeGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.03, 24);
    const chestBadge = new THREE.Mesh(chestBadgeGeo, cobaltAccentMat);
    chestBadge.rotation.x = Math.PI / 2 - 0.18;
    chestBadge.position.set(0, 0.43, 0.415);
    avatarRoot.add(chestBadge);

    // Collar metallic ring
    const collarGeo = new THREE.TorusGeometry(0.245, 0.038, 16, 32);
    const collar = new THREE.Mesh(collarGeo, collarMetalMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.73;
    avatarRoot.add(collar);

    // 3. Head Group (Neck pivot at y = 0.80)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.80, 0);
    avatarRoot.add(headGroup);

    const headShellGeo = new THREE.SphereGeometry(0.45, 32, 24);
    const headShell = new THREE.Mesh(headShellGeo, ceramicShellMat);
    headShell.scale.set(1.08, 0.94, 0.92);
    headShell.position.set(0, 0.42, 0);
    headShell.castShadow = true;
    headGroup.add(headShell);

    // Recessed obsidian visor
    const visorGeo = new THREE.SphereGeometry(0.37, 28, 20);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.scale.set(1.12, 0.74, 0.48);
    visor.position.set(0, 0.41, 0.255);
    headGroup.add(visor);

    // Ear cuffs (anodized cobalt + brushed slate)
    [-1, 1].forEach((sideSign) => {
      const cuffBaseGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.06, 24);
      const cuffBase = new THREE.Mesh(cuffBaseGeo, collarMetalMat);
      cuffBase.rotation.z = Math.PI / 2;
      cuffBase.position.set(sideSign * 0.49, 0.42, 0);
      headGroup.add(cuffBase);

      const cuffRingGeo = new THREE.TorusGeometry(0.088, 0.018, 12, 24);
      const cuffRing = new THREE.Mesh(cuffRingGeo, cobaltAccentMat);
      cuffRing.rotation.y = Math.PI / 2;
      cuffRing.position.set(sideSign * 0.525, 0.42, 0);
      headGroup.add(cuffRing);
    });

    // Crown crest stem + cobalt tip
    const stemGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.14, 12);
    const stem = new THREE.Mesh(stemGeo, collarMetalMat);
    stem.position.set(0, 0.90, -0.02);
    headGroup.add(stem);

    const tipGeo = new THREE.SphereGeometry(0.044, 16, 16);
    const tip = new THREE.Mesh(tipGeo, cobaltAccentMat);
    tip.position.set(0, 0.98, -0.02);
    headGroup.add(tip);

    // Expressive eyes on visor
    const eyeScleraGeo = new THREE.CapsuleGeometry(0.046, 0.042, 8, 14);
    const pupilGeo = new THREE.SphereGeometry(0.028, 14, 14);

    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(0.155, 0.42, 0.425);
    const leftEyeMesh = new THREE.Mesh(eyeScleraGeo, eyeGlowMat);
    leftEyeMesh.scale.set(1, 1, 0.45);
    const leftPupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupilMesh.position.set(0, 0, 0.018);
    leftPupilMesh.scale.set(1, 1, 0.5);
    leftEyeGroup.add(leftEyeMesh, leftPupilMesh);
    headGroup.add(leftEyeGroup);

    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(-0.155, 0.42, 0.425);
    const rightEyeMesh = new THREE.Mesh(eyeScleraGeo, eyeGlowMat);
    rightEyeMesh.scale.set(1, 1, 0.45);
    const rightPupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupilMesh.position.set(0, 0, 0.018);
    rightPupilMesh.scale.set(1, 1, 0.5);
    rightEyeGroup.add(rightEyeMesh, rightPupilMesh);
    headGroup.add(rightEyeGroup);

    // 4. Articulated Left & Right Arms + Hands
    const upperArmGeo = new THREE.CapsuleGeometry(0.082, 0.20, 8, 16);
    const elbowJointGeo = new THREE.SphereGeometry(0.080, 14, 14);
    const forearmGeo = new THREE.CapsuleGeometry(0.072, 0.19, 8, 16);

    function createArm(side: 'left' | 'right') {
      const sign = side === 'left' ? 1 : -1;
      const shoulderPivot = new THREE.Group();
      shoulderPivot.rotation.order = 'XYZ';
      shoulderPivot.position.set(sign * 0.46, 0.62, 0.10);

      const shoulderCap = new THREE.Mesh(elbowJointGeo, collarMetalMat);
      shoulderPivot.add(shoulderCap);

      const upperArm = new THREE.Mesh(upperArmGeo, ceramicShellMat);
      upperArm.position.y = -0.18;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.36, 0);
      shoulderPivot.add(elbowPivot);

      const elbowCap = new THREE.Mesh(elbowJointGeo, collarMetalMat);
      elbowCap.scale.setScalar(0.88);
      elbowPivot.add(elbowCap);

      const forearm = new THREE.Mesh(forearmGeo, ceramicShellMat);
      forearm.position.y = -0.17;
      forearm.castShadow = true;
      elbowPivot.add(forearm);

      const handGroup = createRoundedHandMesh(ceramicShellMat, collarMetalMat, side);
      handGroup.position.set(0, -0.34, 0);
      elbowPivot.add(handGroup);

      return { shoulderPivot, elbowPivot };
    }

    const leftArm = createArm('left');
    const rightArm = createArm('right');
    avatarRoot.add(leftArm.shoulderPivot, rightArm.shoulderPivot);

    // Current animated joint state for smooth exponential damping
    const currentJoints = { ...getJointTargetsForPose('idle', 0.5) };
    let blinkAmount = 0;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();

    function applyThemeColors(dark: boolean) {
      if (dark) {
        pedestalMat.color.setHex(0x1e293b);
        shadowMat.opacity = 0.6;
      } else {
        pedestalMat.color.setHex(0xe2e8f0);
        shadowMat.opacity = 0.38;
      }
    }
    applyThemeColors(targetStateRef.current.isDark);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepAndRender() {
      if (disposed) return;
      renderDirty = false;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.16);
      lastTime = now;

      const { pose: activePose, lookProgress: activeLook, isDark: activeDark } =
        targetStateRef.current;
      applyThemeColors(activeDark);

      const target = getJointTargetsForPose(activePose, activeLook);
      const lambda = isSoftwareGl ? 18 : 14;

      const keys = Object.keys(target) as (keyof typeof target)[];
      let maxDiff = 0;
      for (const k of keys) {
        const nextVal = THREE.MathUtils.damp(currentJoints[k], target[k], lambda, delta);
        const diff = Math.abs(target[k] - nextVal);
        if (diff > maxDiff) maxDiff = diff;
        currentJoints[k] = nextVal;
      }

      if (blinkAmount > 0.005) {
        blinkAmount = THREE.MathUtils.damp(blinkAmount, 0, 14, delta);
        if (blinkAmount > maxDiff) maxDiff = blinkAmount;
      } else {
        blinkAmount = 0;
      }

      headGroup.rotation.x = currentJoints.headPitch;
      headGroup.rotation.y = currentJoints.headYaw;

      leftArm.shoulderPivot.rotation.x = currentJoints.leftShoulderPitch;
      leftArm.shoulderPivot.rotation.z = currentJoints.leftShoulderRoll;
      leftArm.elbowPivot.rotation.x = currentJoints.leftElbowPitch;

      rightArm.shoulderPivot.rotation.x = currentJoints.rightShoulderPitch;
      rightArm.shoulderPivot.rotation.z = currentJoints.rightShoulderRoll;
      rightArm.elbowPivot.rotation.x = currentJoints.rightElbowPitch;

      const eyeY = Math.max(0.12, currentJoints.eyeScaleY * (1 - blinkAmount));
      leftEyeGroup.scale.y = eyeY;
      rightEyeGroup.scale.y = eyeY;
      leftPupilMesh.position.x = currentJoints.pupilOffsetX;
      leftPupilMesh.position.y = currentJoints.pupilOffsetY;
      rightPupilMesh.position.x = currentJoints.pupilOffsetX;
      rightPupilMesh.position.y = currentJoints.pupilOffsetY;

      renderer.render(scene, camera);

      const stillMoving = maxDiff > 0.002;
      const done = () => {
        renderBusy = false;
        if (!disposed && (renderDirty || stillMoving)) {
          requestRender();
        } else {
          isAnimating = false;
        }
      };

      if (isSoftwareGl) {
        afterDraw(done);
      } else {
        done();
      }
    }

    let isAnimating = false;
    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      if (!isAnimating) {
        lastTime = performance.now();
        isAnimating = true;
      }
      frameId = requestAnimationFrame(() => {
        stepAndRender();
      });
    }

    requestRenderRef.current = requestRender;
    requestRender();

    // Gentle periodic natural blink when eyes are visible
    const blinkInterval = window.setInterval(() => {
      if (disposed) return;
      if (targetStateRef.current.pose !== 'covering') {
        blinkAmount = 0.92;
        requestRender();
      }
    }, 4200);

    const resizeObserver = new ResizeObserver((entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      window.clearInterval(blinkInterval);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      data-testid="avatar-3d-stage"
      data-avatar-pose={pose}
      className="relative mb-5 h-36 sm:h-40 w-full overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-slate-100/90 to-slate-200/45 dark:from-slate-900/90 dark:to-slate-950/90"
    >
      {/* Dedicated isolated WebGL mount div */}
      <div
        ref={mountRef}
        aria-hidden="true"
        className="h-full w-full"
      />

      {/* Fallback if WebGL is unavailable */}
      {webglUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          3D Avatar unavailable
        </div>
      )}

      {/* Subtle semantic status caption */}
      <div className="pointer-events-none absolute left-3.5 bottom-2.5">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {POSE_CAPTIONS[pose]}
        </span>
      </div>
    </div>
  );
}
