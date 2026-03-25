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
const BRAND2 = "#3B82F6";
const BG = "#0f172a";
const SURFACE = "#1e293b";
const BORDER = "rgba(255,255,255,0.08)";

// ── Utilities ─────────────────────────────────────────────────────────────

function useFade(start: number, dur = 20) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function useSlide(start: number, from = 50, dur = 28) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 120 } });
  return interpolate(p, [0, 1], [from, 0]);
}

function useScale(start: number, fromScale = 0.85) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 130 } });
  return interpolate(p, [0, 1], [fromScale, 1]);
}

// ── Browser Shell ──────────────────────────────────────────────────────────

const BrowserShell = ({ children, opacity = 1, scale = 1 }: { children: React.ReactNode; opacity?: number; scale?: number }) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
    }}
  >
    {/* Chrome bar */}
    <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
      </div>
      <div style={{ flex: 1, background: "#f8fafc", borderRadius: 999, padding: "6px 14px", fontSize: 12, color: "#94a3b8", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
        app.nexdrive.com.br
      </div>
    </div>
    {children}
  </div>
);

// ── App Layout Shell ────────────────────────────────────────────────────────

const AppShell = ({ children, activeNav = 1 }: { children: React.ReactNode; activeNav?: number }) => {
  const navItems = ["📊", "🚗", "👥", "💰", "💬", "🤖"];
  return (
    <div style={{ display: "flex", height: 520 }}>
      {/* Sidebar */}
      <div style={{ width: 64, background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20, paddingBottom: 20, gap: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: `0 0 20px ${BRAND}88` }}>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, fontFamily: "Inter, sans-serif" }}>ND</span>
        </div>
        {navItems.map((icon, i) => (
          <div key={i} style={{
            width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
            background: i === activeNav ? BRAND : "transparent",
            boxShadow: i === activeNav ? `0 4px 16px ${BRAND}44` : "none",
            fontSize: 16,
          }}>
            {icon}
          </div>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, background: "#f8fafc", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

// ── Scene 1: Hero ──────────────────────────────────────────────────────────

const SceneHero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOp = useFade(0);
  const logoScale = useScale(0, 0.7);
  const titleOp = useFade(18);
  const titleY = useSlide(18);
  const subOp = useFade(38);
  const subY = useSlide(38);
  const badgeOp = useFade(55);
  const badge2Op = useFade(65);
  const badge3Op = useFade(75);

  // Orbiting glow
  const orb1X = Math.cos((frame / 80) * Math.PI * 2) * 200;
  const orb1Y = Math.sin((frame / 80) * Math.PI * 2) * 80;
  const orb2X = Math.cos((frame / 60 + 1) * Math.PI * 2) * 180;
  const orb2Y = Math.sin((frame / 60 + 1) * Math.PI * 2) * 90;

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND}22 0%, transparent 70%)`, top: "50%", left: "50%", transform: `translate(calc(-50% + ${orb1X}px), calc(-50% + ${orb1Y}px))`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed22 0%, transparent 70%)", top: "50%", left: "50%", transform: `translate(calc(-50% + ${orb2X}px), calc(-50% + ${orb2Y}px))`, pointerEvents: "none" }} />

      {/* Grid overlay */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        {/* Logo */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${BRAND}66, 0 0 120px ${BRAND}22` }}>
            <Img src={staticFile("nexdrive-logo.png")} style={{ width: 54, height: 54, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 60, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: -2 }}>NexDrive</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 86, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", lineHeight: 1.0, margin: 0, letterSpacing: -3 }}>
            Gestão Completa
            <br />
            <span style={{ background: `linear-gradient(135deg, ${BRAND}, #7c3aed, #06b6d4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              para sua Revenda
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontSize: 26, color: "#94a3b8", fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: 2, textTransform: "uppercase", fontWeight: 500 }}>
            Estoque · Financeiro · CRM · IA · Loja Virtual
          </p>
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { op: badgeOp, icon: "🚗", text: "FIPE Automático", color: BRAND },
            { op: badge2Op, icon: "🤖", text: "IA no WhatsApp 24h", color: "#7c3aed" },
            { op: badge3Op, icon: "📊", text: "Dashboard em Tempo Real", color: "#059669" },
          ].map(({ op, icon, text, color }) => (
            <div key={text} style={{ opacity: op, background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 40, padding: "10px 22px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2: Vehicle Registration ──────────────────────────────────────────

const SceneVehicle = () => {
  const frame = useCurrentFrame();

  const shellOp = useFade(0);
  const shellScale = useScale(0, 0.9);

  // Typing simulation for form fields
  const brandChars = Math.min(Math.floor(interpolate(frame, [15, 30], [0, 10], { extrapolateRight: "clamp" })), 10);
  const modelChars = Math.min(Math.floor(interpolate(frame, [32, 52], [0, 16], { extrapolateRight: "clamp" })), 16);
  const yearChars = Math.min(Math.floor(interpolate(frame, [54, 65], [0, 9], { extrapolateRight: "clamp" })), 9);
  const plateChars = Math.min(Math.floor(interpolate(frame, [67, 78], [0, 8], { extrapolateRight: "clamp" })), 8);

  const fipeLoading = frame > 80 && frame < 95;
  const fipeVisible = frame >= 95;
  const marginVisible = frame >= 100;
  const publishVisible = frame >= 105;

  const fipeOpacity = interpolate(frame, [95, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const marginOpacity = interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const brandFull = "Volkswagen";
  const modelFull = "Polo GTS 250 TSI";
  const yearFull = "2024/2024";
  const plateFull = "ABC-1D23";

  const cursor = frame % 30 < 15 ? "▌" : "";

  return (
    <AbsoluteFill style={{ background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 70%, #1e40af22 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Title */}
      <div style={{ position: "absolute", top: 50, left: 80, opacity: useFade(0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${BRAND}66` }}>
            <Img src={staticFile("nexdrive-logo.png")} style={{ width: 30, height: 30, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>Cadastrando Veículo</div>
            <div style={{ color: "#94a3b8", fontSize: 16, fontFamily: "Inter, sans-serif" }}>Volkswagen Polo GTS · FIPE + Margem Automáticos</div>
          </div>
        </div>
      </div>

      {/* Browser */}
      <div style={{ opacity: shellOp, transform: `scale(${shellScale})`, width: "100%", marginTop: 60 }}>
        <BrowserShell>
          <AppShell activeNav={1}>
            <div style={{ padding: "20px 24px", height: "100%", overflow: "hidden" }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", fontFamily: "Inter, sans-serif" }}>Cadastrar Novo Veículo</div>
                  <div style={{ fontSize: 12, color: "#6b6b8a", fontFamily: "Inter, sans-serif" }}>Adicione as fotos e defina as margens de lucro</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ fontSize: 11, padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 8, color: "#6b6b8a", fontFamily: "Inter, sans-serif" }}>Cancelar</div>
                  <div style={{ fontSize: 11, padding: "6px 14px", background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`, borderRadius: 8, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, opacity: publishVisible ? 1 : 0.3, boxShadow: publishVisible ? `0 4px 20px ${BRAND}66` : "none", transition: "all 0.3s" }}>✓ Publicar Venda</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, height: "calc(100% - 60px)" }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Ficha Técnica */}
                  <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1px solid #e8e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🚗</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "Inter, sans-serif" }}>Ficha Técnica</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        ["Marca", brandFull.slice(0, brandChars) + (brandChars < brandFull.length ? cursor : ""), brandChars < brandFull.length],
                        ["Modelo", modelFull.slice(0, modelChars) + (modelChars < modelFull.length ? cursor : ""), modelChars < modelFull.length],
                        ["Ano", yearFull.slice(0, yearChars) + (yearChars < yearFull.length ? cursor : ""), yearChars < yearFull.length],
                        ["Placa", plateFull.slice(0, plateChars) + (plateChars < plateFull.length ? cursor : ""), plateChars < plateFull.length],
                      ].map(([label, value, typing]) => (
                        <div key={label as string}>
                          <div style={{ fontSize: 10, color: "#6b6b8a", marginBottom: 4, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{label}</div>
                          <div style={{ border: typing ? `2px solid ${BRAND}` : "1px solid #e8e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#1a1a2e", background: typing ? "#eff6ff" : "#f8fafc", fontFamily: "Inter, sans-serif", boxShadow: typing ? `0 0 12px ${BRAND}22` : "none" }}>
                            {value as string || <span style={{ color: "#cbd5e1" }}>-</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1px solid #e8e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💰</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "Inter, sans-serif" }}>Precificação & FIPE</span>
                      {fipeLoading && (
                        <div style={{ marginLeft: "auto", background: "#dbeafe", borderRadius: 20, padding: "2px 10px", fontSize: 10, color: BRAND, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>Consultando FIPE...</div>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#6b6b8a", marginBottom: 4, fontFamily: "Inter, sans-serif" }}>Custo Total</div>
                        <div style={{ border: "1px solid #e8e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#6b6b8a", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>R$ 102.000</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#6b6b8a", marginBottom: 4, fontFamily: "Inter, sans-serif" }}>FIPE Atual</div>
                        <div style={{ border: "1px solid #e8e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#2563eb", background: "#eff6ff", fontFamily: "Inter, sans-serif", fontWeight: 600, opacity: fipeOpacity, transform: `scale(${interpolate(fipeOpacity, [0, 1], [0.95, 1])})` }}>
                          {fipeLoading ? "..." : "R$ 115.490"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: BRAND, marginBottom: 4, fontFamily: "Inter, sans-serif", fontWeight: 700 }}>Preço de Venda</div>
                        <div style={{ border: `2px solid ${BRAND}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: BRAND, background: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 700, boxShadow: `0 0 16px ${BRAND}22` }}>R$ 118.990</div>
                      </div>
                    </div>
                    {/* Margin bar */}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e8e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: marginOpacity }}>
                      <span style={{ fontSize: 11, color: "#6b6b8a", fontFamily: "Inter, sans-serif" }}>Margem Bruta Estimada:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "3px 10px", borderRadius: 6, fontFamily: "Inter, sans-serif" }}>+ 14.3% (R$ 16.990)</span>
                    </div>
                  </div>
                </div>

                {/* Right column - car photo */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", border: "1px solid #e8e8f0", flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, fontFamily: "Inter, sans-serif" }}>Mídia Principal</div>
                    <div style={{ borderRadius: 10, overflow: "hidden", background: "#e2e8f0", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative" }}>
                      {/* Car silhouette */}
                      <div style={{ fontSize: 60 }}>🚗</div>
                      <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>Foto Capa</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, color: BRAND, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                      📁 Enviar Galeria (0/10)
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>Publicar na Vitrine Digital</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif" }}>Aparece no site + WhatsApp automático</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AppShell>
        </BrowserShell>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: CRM Pipeline ──────────────────────────────────────────────────

const SceneCRM = () => {
  const frame = useCurrentFrame();

  const stages = [
    { label: "Novos Leads", color: "#3b82f6", count: 7, cards: [{ name: "Maria S.", car: "HB20 2023", time: "5min" }, { name: "João P.", car: "Polo GTS", time: "12min" }] },
    { label: "Em Contato", color: "#f59e0b", count: 4, cards: [{ name: "Carlos M.", car: "Civic 2024", time: "1h" }] },
    { label: "Proposta", color: "#8b5cf6", count: 3, cards: [{ name: "Ana R.", car: "Creta 2023", time: "2h" }] },
    { label: "Fechado ✓", color: "#22c55e", count: 2, cards: [{ name: "Fabio L.", car: "Corolla", time: "ontem" }] },
  ];

  const aiVisible = frame >= 60;
  const aiOp = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aiY = interpolate(frame, [60, 80], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 30%, #7c3aed22 0%, transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: 50, left: 80, opacity: useFade(0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Img src={staticFile("nexdrive-logo.png")} style={{ width: 30, height: 30, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>CRM & Pipeline de Vendas</div>
            <div style={{ color: "#94a3b8", fontSize: 16, fontFamily: "Inter, sans-serif" }}>Nenhum lead esquecido · Follow-up automático com IA</div>
          </div>
        </div>
      </div>

      <div style={{ opacity: useFade(0), transform: `scale(${useScale(0, 0.92)})`, width: "100%", marginTop: 60 }}>
        <BrowserShell>
          <AppShell activeNav={2}>
            <div style={{ padding: "16px 20px", height: "100%" }}>
              <div style={{ display: "flex", gap: 12, height: "100%" }}>
                {stages.map(({ label, color, count, cards }, si) => {
                  const colOp = interpolate(frame, [si * 12, si * 12 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const colY = interpolate(frame, [si * 12, si * 12 + 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <div key={label} style={{ flex: 1, opacity: colOp, transform: `translateY(${colY}px)` }}>
                      {/* Column header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: "Inter, sans-serif" }}>{label}</span>
                        <div style={{ marginLeft: "auto", background: "#f1f5f9", borderRadius: 20, padding: "1px 8px", fontSize: 11, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>{count}</div>
                      </div>

                      {/* Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cards.map((card) => (
                          <div key={card.name} style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", border: "1px solid #e8e8f0", borderLeft: `3px solid ${color}` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", fontFamily: "Inter, sans-serif", marginBottom: 3 }}>{card.name}</div>
                            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>{card.car}</div>
                            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4, fontFamily: "Inter, sans-serif" }}>{card.time} atrás</div>
                          </div>
                        ))}

                        {/* Add card placeholder */}
                        <div style={{ border: "2px dashed #e2e8f0", borderRadius: 12, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "#cbd5e1" }}>+</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </AppShell>
        </BrowserShell>
      </div>

      {/* AI badge floating */}
      <div style={{ position: "absolute", bottom: 80, right: 100, opacity: aiOp, transform: `translateY(${aiY}px)`, background: "linear-gradient(135deg, #7c3aed, #2563eb)", borderRadius: 16, padding: "14px 20px", boxShadow: "0 8px 40px rgba(124,58,237,0.5)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>🤖</span>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>IA enviando follow-up agora</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter, sans-serif" }}>João P. recebeu mensagem no WhatsApp</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: Dashboard KPIs ────────────────────────────────────────────────

const SceneDashboard = () => {
  const frame = useCurrentFrame();

  const kpis = [
    { title: "Veículos em Estoque", value: "48", sub: "+3 esta semana", color: "#60a5fa", icon: "🚗", frame: 10 },
    { title: "Faturamento do Mês", value: "R$ 1,2M", sub: "↑ 23% vs mês anterior", color: "#34d399", icon: "💰", frame: 20 },
    { title: "Leads no CRM", value: "137", sub: "28 aguardam follow-up", color: "#a78bfa", icon: "👥", frame: 30 },
    { title: "Lucro Líquido", value: "R$ 84k", sub: "Margem média: 14.3%", color: "#fbbf24", icon: "📈", frame: 40 },
  ];

  return (
    <AbsoluteFill style={{ background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, #05966922 0%, transparent 60%)", pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: 50, left: 80, opacity: useFade(0) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${BRAND}, ${BRAND2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Img src={staticFile("nexdrive-logo.png")} style={{ width: 30, height: 30, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>Dashboard em Tempo Real</div>
            <div style={{ color: "#94a3b8", fontSize: 16, fontFamily: "Inter, sans-serif" }}>KPIs da sua revenda · Atualizado ao segundo</div>
          </div>
        </div>
      </div>

      <div style={{ opacity: useFade(0), transform: `scale(${useScale(0, 0.92)})`, width: "100%", marginTop: 60 }}>
        <BrowserShell>
          <AppShell activeNav={0}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                {kpis.map(({ title, value, sub, color, icon, frame: f }) => {
                  const op = interpolate(frame, [f, f + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const y = interpolate(frame, [f, f + 22], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  const counterVal = interpolate(frame, [f + 5, f + 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <div key={title} style={{ opacity: op, transform: `translateY(${y}px)`, background: "#fff", borderRadius: 16, padding: "16px", border: "1px solid #e8e8f0", borderTop: `3px solid ${color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>{title}</div>
                        <div style={{ fontSize: 18 }}>{icon}</div>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: "#22c55e", marginTop: 4, fontFamily: "Inter, sans-serif", fontWeight: 500 }}>{sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Mini chart area */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "16px", border: "1px solid #e8e8f0", opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", fontFamily: "Inter, sans-serif" }}>Faturamento — Últimos 6 meses</span>
                  <span style={{ fontSize: 11, color: "#22c55e", fontFamily: "Inter, sans-serif", fontWeight: 600, background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>↑ 23%</span>
                </div>
                {/* Bar chart simulation */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 80 }}>
                  {[55, 70, 45, 80, 65, 95].map((h, i) => {
                    const barOp = interpolate(frame, [60 + i * 5, 75 + i * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const barH = interpolate(frame, [60 + i * 5, 80 + i * 5], [0, h], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    const isLast = i === 5;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: barOp }}>
                        <div style={{ width: "100%", background: isLast ? `linear-gradient(to top, ${BRAND}, ${BRAND2})` : "#e2e8f0", borderRadius: "4px 4px 0 0", height: barH, boxShadow: isLast ? `0 -4px 16px ${BRAND}44` : "none", transition: "height 0.3s" }} />
                        <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "Inter, sans-serif" }}>{["Out", "Nov", "Dez", "Jan", "Fev", "Mar"][i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI row */}
              <div style={{ marginTop: 12, background: `linear-gradient(135deg, ${BRAND}11, #7c3aed11)`, border: `1px solid ${BRAND}33`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <span style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                  Agente IA respondeu <strong style={{ color: "#fff" }}>14 clientes</strong> no WhatsApp hoje · Todos os leads qualificados no CRM
                </span>
              </div>
            </div>
          </AppShell>
        </BrowserShell>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: CTA ────────────────────────────────────────────────────────────

const SceneCTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = useFade(0);
  const titleY = useSlide(0);
  const subOp = useFade(22);
  const btnOp = useFade(40);
  const btnScale = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 140 } });
  const pulse = interpolate(Math.sin((frame / 10) * Math.PI), [-1, 1], [0.97, 1.04]);

  const orb1X = Math.cos((frame / 60) * Math.PI * 2) * 300;
  const orb1Y = Math.sin((frame / 60) * Math.PI * 2) * 120;

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND}33 0%, transparent 70%)`, top: "50%", left: "50%", transform: `translate(calc(-50% + ${orb1X}px), calc(-50% + ${orb1Y}px))` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        {/* Logo */}
        <div style={{ opacity: titleOp, display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 50px ${BRAND}55` }}>
            <Img src={staticFile("nexdrive-logo.png")} style={{ width: 44, height: 44, objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: -1 }}>NexDrive</span>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 72, fontWeight: 900, color: "#fff", fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: -2, lineHeight: 1.05 }}>
            Comece hoje mesmo.
            <br />
            <span style={{ background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              É grátis para testar.
            </span>
          </h2>
        </div>

        <p style={{ opacity: subOp, color: "#94a3b8", fontSize: 24, fontFamily: "Inter, sans-serif", margin: "0 0 36px", textAlign: "center", lineHeight: 1.6 }}>
          Sem cartão de crédito · Configuração em 5 minutos
          <br />
          Suporte incluso desde o primeiro dia
        </p>

        {/* CTA Button */}
        <div
          style={{
            opacity: btnOp,
            transform: `scale(${interpolate(btnScale, [0, 1], [0.75, 1])} ) scale(${pulse})`,
            background: `linear-gradient(135deg, ${BRAND}, #7c3aed)`,
            borderRadius: 22,
            padding: "24px 64px",
            color: "#fff",
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "Inter, sans-serif",
            boxShadow: `0 0 80px ${BRAND}88, 0 20px 60px rgba(0,0,0,0.4)`,
            marginBottom: 24,
          }}
        >
          Criar conta gratuita →
        </div>

        <div style={{ opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 28px", color: "#e2e8f0", fontSize: 20, fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
          nexdrive.com.br
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Main composition ────────────────────────────────────────────────────────

export const LandingVideo = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Sequence from={0} durationInFrames={90}>
      <SceneHero />
    </Sequence>
    <Sequence from={90} durationInFrames={120}>
      <SceneVehicle />
    </Sequence>
    <Sequence from={210} durationInFrames={110}>
      <SceneCRM />
    </Sequence>
    <Sequence from={320} durationInFrames={110}>
      <SceneDashboard />
    </Sequence>
    <Sequence from={430} durationInFrames={80}>
      <SceneCTA />
    </Sequence>
  </AbsoluteFill>
);
