import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Img,
  staticFile,
} from "remotion";

const BRAND = "#2563EB";
const BG = "#0f172a";

// ── Utilities ──────────────────────────────────────────────────────────────

function useFadeIn(start: number, dur = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function useSlideUp(start: number, from = 50) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 130 } });
  return interpolate(p, [0, 1], [from, 0]);
}

function useSpringScale(start: number, fromScale = 0, toScale = 1) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 180 } });
  return interpolate(p, [0, 1], [fromScale, toScale]);
}

// ── Logo Component ────────────────────────────────────────────────────────

const Logo = ({ size = 72, showName = true, start = 0 }: { size?: number; showName?: boolean; start?: number }) => {
  const op = useFadeIn(start, 15);
  const sc = useSpringScale(start, 0.5, 1);
  return (
    <div style={{ opacity: op, transform: `scale(${sc})`, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.27, background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 ${size * 0.8}px ${BRAND}66, 0 0 ${size * 1.5}px ${BRAND}22` }}>
        <Img src={staticFile("nexdrive-logo.png")} style={{ width: size * 0.65, height: size * 0.65, objectFit: "contain" }} />
      </div>
      {showName && (
        <span style={{ fontSize: size * 0.75, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: -1 }}>NexDrive</span>
      )}
    </div>
  );
};

// ── Story 1: Hook ─────────────────────────────────────────────────────────

const Story1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const emojiScale = useSpringScale(8, 0.3, 1);
  const emojiRotate = interpolate(
    spring({ frame: frame - 8, fps, config: { damping: 8, stiffness: 200 } }),
    [0, 1],
    [-15, 0]
  );

  // Orbiting background
  const orb1 = Math.sin((frame / 40) * Math.PI);
  const orb2 = Math.cos((frame / 55) * Math.PI);

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      {/* Animated orbs */}
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, #1e3a8a44 0%, transparent 70%)`, top: "20%", left: "50%", transform: `translate(-50%, ${orb1 * 30}px)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed22 0%, transparent 70%)", bottom: "20%", right: "-10%", transform: `translateX(${orb2 * 20}px)`, pointerEvents: "none" }} />
      {/* Grid */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "80px 56px" }}>
        {/* Emoji */}
        <div style={{ transform: `scale(${emojiScale}) rotate(${emojiRotate}deg)`, fontSize: 110 }}>😤</div>

        {/* Title */}
        <div style={{ opacity: useFadeIn(18), transform: `translateY(${useSlideUp(18)})`, textAlign: "center" }}>
          <h1 style={{ fontSize: 62, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", lineHeight: 1.08, margin: 0 }}>
            Cansado de
            <br />
            <span style={{ background: "linear-gradient(135deg, #f87171, #fb923c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              perder vendas
            </span>
            <br />
            por falta de
            <br />
            organização?
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: useFadeIn(42), transform: `translateY(${useSlideUp(42)})`, textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: 26, fontFamily: "Inter, sans-serif", lineHeight: 1.5, margin: 0 }}>
            Planilha? WhatsApp solto?
            <br />
            Papel e caneta? 😬
          </p>
        </div>

        {/* Bottom cue */}
        <div style={{ opacity: useFadeIn(48), display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Tem jeito muito melhor 👇</div>
          <div style={{ width: 2, height: 24, background: `linear-gradient(to bottom, ${BRAND}, transparent)`, borderRadius: 4 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Story 2: Solution ─────────────────────────────────────────────────────

const Story2 = () => {
  const frame = useCurrentFrame();

  const features = [
    { icon: "🚗", text: "Estoque organizado", f: 15, color: "#60a5fa" },
    { icon: "💬", text: "IA no WhatsApp 24h", f: 26, color: "#34d399" },
    { icon: "📊", text: "CRM com pipeline", f: 37, color: "#a78bfa" },
    { icon: "💰", text: "Financeiro completo", f: 48, color: "#fbbf24" },
    { icon: "🏪", text: "Loja virtual própria", f: 59, color: "#fb7185" },
  ];

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 20%, #1e40af44 0%, transparent 60%)`, pointerEvents: "none" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "80px 52px" }}>
        <Logo size={68} start={0} />

        <div style={{ opacity: useFadeIn(12), transform: `translateY(${useSlideUp(12, 30)}px)`, textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#93c5fd", fontFamily: "Inter, sans-serif", margin: 0 }}>Gestão para revendas</h2>
        </div>

        {features.map(({ icon, text, f, color }) => {
          const op = useFadeIn(f);
          const y = useSlideUp(f, 40);
          const sc = useSpringScale(f, 0.85, 1);
          return (
            <div key={text} style={{ opacity: op, transform: `translateY(${y}px) scale(${sc})`, display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}33`, borderRadius: 18, padding: "18px 26px", width: "100%", backdropFilter: "blur(10px)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{icon}</div>
              <span style={{ color: "#e2e8f0", fontSize: 26, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>{text}</span>
              <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Story 3: AI WhatsApp ──────────────────────────────────────────────────

const Story3 = () => {
  const frame = useCurrentFrame();

  const typingChars = Math.floor(interpolate(frame, [20, 58], [0, 46], { extrapolateRight: "clamp" }));
  const fullText = "Olá! Vi o Polo 2024 no site. Ainda disponível?";

  const showResponse = frame >= 65;
  const responseOp = interpolate(frame, [65, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const responseY = interpolate(frame, [65, 80], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const typingDots = frame > 60 && frame < 65;

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 60%, #14532d33 0%, transparent 65%)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "80px 52px" }}>
        {/* Header */}
        <div style={{ opacity: useFadeIn(0), textAlign: "center" }}>
          <div style={{ fontSize: 80 }}>🤖</div>
          <h2 style={{ fontSize: 52, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", margin: "12px 0 0", lineHeight: 1.1 }}>
            Agente IA
            <br />
            <span style={{ background: "linear-gradient(135deg, #34d399, #059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              no WhatsApp
            </span>
          </h2>
        </div>

        {/* WhatsApp chat mockup */}
        <div style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "20px", backdropFilter: "blur(10px)" }}>
          {/* Chat header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #25d366, #128c7e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💬</div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>NexDrive AI</div>
              <div style={{ color: "#34d399", fontSize: 12, fontFamily: "Inter, sans-serif" }}>● Online agora</div>
            </div>
          </div>

          {/* Incoming message */}
          <div style={{ opacity: useFadeIn(15), display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "18px 18px 18px 4px", padding: "12px 18px", maxWidth: "80%", color: "#e2e8f0", fontSize: 20, fontFamily: "Inter, sans-serif", lineHeight: 1.4 }}>
              {fullText.slice(0, typingChars)}
              {typingChars < fullText.length && <span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>▌</span>}
            </div>
          </div>

          {/* Typing indicator */}
          {typingDots && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <div style={{ background: `linear-gradient(135deg, ${BRAND}, #059669)`, borderRadius: "18px 18px 4px 18px", padding: "12px 18px" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.8)", transform: `translateY(${Math.sin((frame / 6 + i) * Math.PI) * 3}px)` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI response */}
          {showResponse && (
            <div style={{ opacity: responseOp, transform: `translateY(${responseY}px)`, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: `linear-gradient(135deg, ${BRAND}, #059669)`, borderRadius: "18px 18px 4px 18px", padding: "12px 18px", maxWidth: "85%", color: "#fff", fontSize: 19, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
                Olá! Sim, o Polo 2024 está disponível 🚗
                <br /><br />
                <strong>VW Polo Sense 1.0</strong>
                <br />
                📍 23.500 km · 2024/2024
                <br />
                💰 R$ 89.900
                <br /><br />
                Quando posso agendar um test drive? 😊
              </div>
            </div>
          )}
        </div>

        <div style={{ opacity: useFadeIn(80), display: "flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 40, padding: "10px 20px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
          <span style={{ color: "#6ee7b7", fontSize: 18, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Respondendo automaticamente 24h/dia</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Story 4: Numbers ──────────────────────────────────────────────────────

const Story4 = () => {
  const stats = [
    { value: "+48", label: "veículos gerenciados", color: "#60a5fa", icon: "🚗", f: 15 },
    { value: "24h", label: "atendimento com IA", color: "#34d399", icon: "🤖", f: 30 },
    { value: "5min", label: "para configurar tudo", color: "#fbbf24", icon: "⚡", f: 45 },
    { value: "100%", label: "na nuvem, sem instalar", color: "#c4b5fd", icon: "☁️", f: 60 },
  ];

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, #6d28d933 0%, transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "80px 52px" }}>
        <div style={{ opacity: useFadeIn(0), textAlign: "center" }}>
          <Logo size={58} start={0} />
          <h2 style={{ fontSize: 52, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", margin: "20px 0 0", lineHeight: 1.1 }}>
            Números que
            <br />
            <span style={{ background: "linear-gradient(135deg, #c4b5fd, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              falam por si
            </span>
          </h2>
        </div>

        {stats.map(({ value, label, color, icon, f }) => {
          const op = useFadeIn(f);
          const y = useSlideUp(f, 40);
          const sc = useSpringScale(f, 0.8, 1);
          return (
            <div key={label} style={{ opacity: op, transform: `translateY(${y}px) scale(${sc})`, display: "flex", alignItems: "center", gap: 16, width: "100%", background: `${color}0d`, border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: "0 16px 16px 0", padding: "18px 24px", boxShadow: `inset 0 0 30px ${color}08` }}>
              <span style={{ fontSize: 32 }}>{icon}</span>
              <span style={{ color, fontSize: 48, fontWeight: 900, fontFamily: "Inter, sans-serif", minWidth: 100 }}>{value}</span>
              <span style={{ color: "#cbd5e1", fontSize: 22, fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Story 5: CTA ──────────────────────────────────────────────────────────

const Story5 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btnScale = spring({ frame: frame - 35, fps, config: { damping: 12, stiffness: 150 } });
  const pulse = interpolate(Math.sin((frame / 10) * Math.PI), [-1, 1], [0.96, 1.05]);

  const orb1X = Math.cos((frame / 50) * Math.PI * 2) * 200;
  const orb1Y = Math.sin((frame / 50) * Math.PI * 2) * 100;

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND}33 0%, transparent 70%)`, top: "50%", left: "50%", transform: `translate(calc(-50% + ${orb1X}px), calc(-50% + ${orb1Y}px))` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: "80px 52px" }}>
        {/* Logo + rocket */}
        <div style={{ opacity: useFadeIn(0), textAlign: "center" }}>
          <div style={{ fontSize: 80, marginBottom: 12 }}>🚀</div>
          <Logo size={64} start={5} />
        </div>

        {/* Title */}
        <div style={{ opacity: useFadeIn(20), transform: `translateY(${useSlideUp(20, 40)}px)`, textAlign: "center" }}>
          <h2 style={{ fontSize: 60, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", margin: 0, lineHeight: 1.1 }}>
            Comece grátis
            <br />
            <span style={{ background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              agora mesmo
            </span>
          </h2>
        </div>

        {/* Benefits */}
        <div style={{ opacity: useFadeIn(28), display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          {["✓ Sem cartão de crédito", "✓ Configuração em 5 minutos", "✓ Suporte incluso"].map((item) => (
            <div key={item} style={{ color: "#94a3b8", fontSize: 22, fontFamily: "Inter, sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>{item.slice(0, 1)}</span>
              {item.slice(1)}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div style={{ opacity: useFadeIn(35), transform: `scale(${interpolate(btnScale, [0, 1], [0.7, 1])}) scale(${pulse})`, background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, borderRadius: 22, padding: "26px 52px", color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Inter, sans-serif", textAlign: "center", boxShadow: `0 0 80px ${BRAND}88, 0 20px 50px rgba(0,0,0,0.4)`, width: "100%" }}>
          Criar conta gratuita →
        </div>

        {/* URL */}
        <div style={{ opacity: useFadeIn(55), display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 28px", color: "#e2e8f0", fontSize: 22, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
            nexdrive.com.br
          </div>
          <p style={{ color: "#475569", fontSize: 18, fontFamily: "Inter, sans-serif", margin: 0 }}>Link na bio 👆</p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main Stories composition ───────────────────────────────────────────────

export const StoriesVideo = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Sequence from={0} durationInFrames={60}>
      <Story1 />
    </Sequence>
    <Sequence from={60} durationInFrames={72}>
      <Story2 />
    </Sequence>
    <Sequence from={132} durationInFrames={68}>
      <Story3 />
    </Sequence>
    <Sequence from={200} durationInFrames={60}>
      <Story4 />
    </Sequence>
    <Sequence from={260} durationInFrames={60}>
      <Story5 />
    </Sequence>
  </AbsoluteFill>
);
