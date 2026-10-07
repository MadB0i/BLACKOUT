// Lazy-loaded post chain (keeps the 800kB postprocessing lib out of first paint).
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function Fx() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.27} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.18} darkness={0.82} />
    </EffectComposer>
  );
}
