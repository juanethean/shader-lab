import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normal;
    vPosition = position;
    vUv = uv;
    
    // Pulso orgánico muy ligero y seguro para el rendimiento
    vec3 newPosition = position + normal * sin(uTime * 2.0 + position.y * 4.0) * 0.02;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    // Iluminación en los bordes (Rim Light)
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float rim = 1.0 - max(dot(viewDirection, vNormal), 0.0);
    rim = pow(rim, 2.0);

    // Retícula/Wireframe generado por matemáticas (súper ligero para la GPU)
    vec2 gridCoord = vUv * 12.0;
    vec2 grid = abs(fract(gridCoord - 0.5) - 0.5) / fwidth(gridCoord);
    float line = min(grid.x, grid.y);
    float wireframeFactor = 1.0 - min(line, 1.0);

    // Líneas de escaneo verticales
    float scanline = sin(vPosition.y * 10.0 - uTime * 4.0) * 0.15 + 0.85;

    // Colores holográficos
    vec3 baseColor = vec3(0.0, 0.2, 0.5);
    vec3 neonColor = vec3(0.0, 0.9, 1.0);
    
    vec3 finalColor = mix(baseColor, neonColor, rim + wireframeFactor * 0.6) * scanline;

    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

function MonkeyModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene } = useGLTF('/monkey.glb');

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 } },
        side: THREE.DoubleSide,
        transparent: true,
      }),
    []
  );

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = shaderMaterial;
      }
    });
  }, [scene, shaderMaterial]);

  useFrame((state) => {
    shaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.004;
    }
  });

  return (
    <group ref={groupRef} scale={[1.8, 1.8, 1.8]}>
      <primitive object={scene} />
    </group>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020205' }}>
      <Canvas camera={{ position: [0, 0, 4] }}>
        <MonkeyModel />
        <OrbitControls enableZoom={true} />
        <EffectComposer>
          {/* Bloom moderado para evitar sobrecargar la gráfica */}
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.8} intensity={1.2} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}