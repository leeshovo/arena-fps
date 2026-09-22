// postfx.js — Post-Processing: Bloom (lässt Energie-Risse/Tracer/HUD-Akzente leuchten),
// kurze Chromatic Aberration bei eigenem Treffer, Screen-Shake bei Explosionen/Nahkampf.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const ABERRATION_SHADER = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float r = texture2D(tDiffuse, vUv - dir * amount).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * amount).b;
      float a = texture2D(tDiffuse, vUv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `,
};

export function createPostFX(renderer, scene, camera, width, height) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Threshold bewusst hoch: unsere Szene ist ohnehin sehr hell (weiße Wände), Bloom soll nur
  // die selbstleuchtenden Akzente (Energie-Risse, Mündungsblitz, Treffer-Decals) erfassen.
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.5, 0.94);
  composer.addPass(bloom);

  const aberrationPass = new ShaderPass(ABERRATION_SHADER);
  composer.addPass(aberrationPass);
  composer.addPass(new OutputPass());

  let aberration = 0;
  let shakeTime = 0;
  let shakeDuration = 0.001;
  let shakeMagnitude = 0;

  return {
    composer,

    setSize(w, h) {
      composer.setSize(w, h);
    },

    setBloomEnabled(enabled) {
      bloom.enabled = enabled;
    },

    /** Kurzer Farbfransen-Puls, z.B. beim Einstecken von Schaden. */
    pulseAberration(amount = 0.006) {
      aberration = Math.max(aberration, amount);
    },

    /** Kurzer Kamera-Wackler, z.B. bei Explosionen/Nahkampf-Treffern. */
    shakeCamera(magnitude = 0.02, duration = 0.25) {
      shakeTime = duration;
      shakeDuration = duration;
      shakeMagnitude = magnitude;
    },

    /** @returns {{x:number,y:number,rot:number}} aktueller Shake-Offset für die Kamera */
    update(dt) {
      aberration = Math.max(0, aberration - dt * 0.025);
      aberrationPass.uniforms.amount.value = aberration;

      let offset = { x: 0, y: 0, rot: 0 };
      if (shakeTime > 0) {
        shakeTime = Math.max(0, shakeTime - dt);
        const t = shakeTime / shakeDuration;
        const m = shakeMagnitude * t;
        offset = { x: (Math.random() - 0.5) * m, y: (Math.random() - 0.5) * m, rot: (Math.random() - 0.5) * m * 0.6 };
      }
      return offset;
    },

    render() {
      composer.render();
    },
  };
}
