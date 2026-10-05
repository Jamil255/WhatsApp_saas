"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ArrowUpRight, Check, CheckCheck, MessageCircle, Send, ShieldCheck } from "lucide-react";

const workflow = [
  { label: "API request", detail: "Message accepted", icon: Send },
  { label: "WhatsApp session", detail: "Number connected", icon: MessageCircle },
  { label: "Delivery", detail: "Recipient reached", icon: CheckCheck },
];

function AmbientRing() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.z = 5.5;

    const group = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x9de7b5,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x60b995,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.015, 8, 96), ringMaterial);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.01, 8, 96), outerMaterial);
    ring.rotation.x = 0.95;
    ring.rotation.y = 0.28;
    outerRing.rotation.x = 1.12;
    outerRing.rotation.y = -0.36;
    group.add(ring, outerRing);
    group.position.x = 0.4;
    scene.add(group);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let inView = true;
    let animationFrame = 0;
    let lastFrame = 0;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      renderer.render(scene, camera);
    };

    const render = (time: number) => {
      if (!inView || reducedMotion) return;
      if (time - lastFrame >= 32) {
        group.rotation.y = Math.sin(time * 0.00012) * 0.16;
        group.rotation.z = Math.sin(time * 0.0001) * 0.1;
        renderer.render(scene, camera);
        lastFrame = time;
      }
      animationFrame = window.requestAnimationFrame(render);
    };

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          if (inView && !reducedMotion) animationFrame = window.requestAnimationFrame(render);
          else window.cancelAnimationFrame(animationFrame);
        })
      : null;

    resize();
    window.addEventListener("resize", resize);
    observer?.observe(mount);
    if (!observer && !reducedMotion) animationFrame = window.requestAnimationFrame(render);

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      ring.geometry.dispose();
      outerRing.geometry.dispose();
      ringMaterial.dispose();
      outerMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="hero-ambient-canvas pointer-events-none absolute inset-0" aria-hidden="true" />;
}

export function HeroScene() {
  return (
    <div className="relative mx-auto min-w-0 w-full max-w-[620px] lg:ml-auto">
      <div className="pointer-events-none absolute -inset-6 rounded-[44px] bg-emerald-400/10 blur-3xl" />
      <div className="hero-preview relative overflow-hidden rounded-[28px] border border-white/15 bg-[#0b1f18] shadow-[0_32px_90px_-36px_rgba(0,0,0,.82)]">
        <AmbientRing />
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime/15 text-lime"><MessageCircle className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-bold text-white">Nexora workspace</p>
              <p className="mt-0.5 text-[10px] text-white/45">Messaging preview</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Connected
          </span>
        </div>

        <div className="relative z-10 grid gap-4 p-4 sm:p-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="flex min-h-[288px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#10271f]/95 shadow-[0_18px_40px_-24px_rgba(0,0,0,.9)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200"><MessageCircle className="h-4 w-4" /></span>
                <div><p className="text-xs font-semibold text-white">Customer conversation</p><p className="text-[10px] text-white/40">Connected via WhatsApp</p></div>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            </div>
            <div className="flex flex-1 flex-col gap-3 px-4 py-5">
              <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white/[.07] px-3.5 py-2.5 text-xs leading-5 text-white/75">Hi! Is my order ready for pickup?</div>
              <div className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#234d39] px-3.5 py-2.5 text-xs leading-5 text-white">Yes, it’s ready. We’ll see you soon!</div>
              <div className="flex items-center gap-1.5 self-end text-[10px] text-emerald-200"><CheckCheck className="h-3.5 w-3.5" />Delivered</div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/40"><span>One conversation, fully visible</span><ShieldCheck className="h-4 w-4 text-emerald-300/70" /></div>
          </div>

          <div className="hidden flex-col rounded-[20px] border border-white/10 bg-[#0e241c]/95 p-4 sm:p-5 lg:flex">
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-lime">Message journey</p><h3 className="mt-2 font-display text-lg font-bold tracking-[-.04em] text-white">Clear at every step.</h3></div>
              <ArrowUpRight className="h-4 w-4 text-white/35" />
            </div>
            <div className="relative mt-6 flex-1 space-y-5 before:absolute before:bottom-6 before:left-[15px] before:top-5 before:w-px before:bg-emerald-300/20">
              {workflow.map(({ label, detail, icon: Icon }) => (
                <div key={label} className="relative flex items-start gap-3">
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-[#183a2b] text-lime"><Icon className="h-3.5 w-3.5" /></span>
                  <div><p className="text-xs font-semibold text-white">{label}</p><p className="mt-1 text-[10px] text-white/45">{detail}</p></div>
                  <Check className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4 text-[10px] text-white/45">Your team sees what happened and when.</div>
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 px-4 py-3 text-[10px] font-medium text-white/55 lg:hidden">
          <span>API accepted</span><Check className="h-3 w-3 text-lime" /><span>Session connected</span><Check className="h-3 w-3 text-lime" /><span>Delivered</span>
        </div>
      </div>
    </div>
  );
}
