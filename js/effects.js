// effects.js — Wiederverwendbares, leichtgewichtiges Partikelsystem für Umgebungs-Feedback
// (Landestaub, Sprintstaub). Rein visuell, unabhängig von Gameplay-Logik.
import * as THREE from "three";

const DUST_COLOR = 0xcbd0d6;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  /** Kleiner Staubwirbel, z.B. beim Landen nach einem Sprung. */
  burstDust(position, count = 8, spread = 0.35, upward = 1.6) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const mat = new THREE.MeshBasicMaterial({ color: DUST_COLOR, transparent: true, opacity: 0.55 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y += 0.05;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * spread * 3;
      const velocity = new THREE.Vector3(Math.cos(angle) * speed, upward * (0.4 + Math.random() * 0.6), Math.sin(angle) * speed);
      this.particles.push({ mesh, velocity, life: 0.45 + Math.random() * 0.2, maxLife: 0.6, gravity: 6 });
    }
  }

  /** Einzelnes, dezentes Staubpartikel hinter den Füßen beim Sprinten. */
  footDust(position) {
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mat = new THREE.MeshBasicMaterial({ color: DUST_COLOR, transparent: true, opacity: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    const velocity = new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.4);
    this.particles.push({ mesh, velocity, life: 0.35, maxLife: 0.35, gravity: 3 });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.life -= dt;
      p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.55);
      p.mesh.scale.setScalar(0.6 + (1 - p.life / p.maxLife) * 0.8);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.particles = [];
  }
}
