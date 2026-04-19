// IronPulse — mobile gallery app
const { useState: uS, useEffect: uE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "blue",
  "density": "comfortable",
  "frameSize": "sm"
}/*EDITMODE-END*/;

// ───── Section divider
const Section = ({ label, count, sub, children }) => (
  <>
    <div className="section-label">
      {label}
      {sub && <span style={{ color: "var(--text-4)", fontSize: 11, textTransform: "none", letterSpacing: "-.01em", fontFamily: "var(--ff-body)", fontWeight: 400 }}>· {sub}</span>}
      {count != null && <span className="count">{String(count).padStart(2, "0")} screen{count !== 1 ? "s" : ""}</span>}
    </div>
    <div className="phone-row">{children}</div>
  </>
);

const App = () => {
  const [tweaks, setTweaks] = uS(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = uS(false);

  // Edit mode wiring
  uE(() => {
    const handler = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent?.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const update = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent?.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  };

  const sz = tweaks.frameSize === "lg" ? "lg" : "sm";

  return (
    <>
      <div className="gallery">
        {/* Gallery head */}
        <div className="gallery-head">
          <div>
            <div className="brand-mark" style={{ marginBottom: 14 }}>
              <Icons.Logo size={18} />
              <span>IRONPULSE · ANDROID · v4.0</span>
            </div>
            <h1>A fitness app that <span style={{ color: "var(--blue-2)" }}>feels like one app</span> — not six.</h1>
            <div className="sub">
              Full redesign. 13 screens covering the daily loop — onboarding to active workout to recovery.
              Android design language: Material3 components, flatter chrome, proper status &amp; gesture bars.
              Shown below at Pixel 7 (300px frame) &amp; Pixel 7 Pro (360px frame) widths.
            </div>
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end",
            color: "var(--text-4)", fontFamily: "var(--ff-mono)", fontSize: 11,
            textAlign: "right",
          }}>
            <span style={{ color: "var(--blue-2)" }}>▲ Sun · Apr 19, 26</span>
            <span>412×892 · Pixel 7 Pro</span>
            <span>360×780 · Pixel 7</span>
            <span style={{ opacity: .6 }}>Designer: Alex C.</span>
          </div>
        </div>

        {/* ═════ CORE LOOP ═════ */}
        <Section label="Core loop" sub="Login, home, active training" count={3}>
          <PhoneCell label="Login" tag="0 · Auth" size={sz}><Login /></PhoneCell>
          <PhoneCell label="Dashboard" tag="1 · Home" size={sz}><Dashboard /></PhoneCell>
          <PhoneCell label="Active Workout" tag="2 · Train" size={sz} time="9:43"><ActiveWorkout /></PhoneCell>
        </Section>

        {/* ═════ TRACK PROGRESS ═════ */}
        <Section label="Track progress" sub="Stats, exercises, program" count={3}>
          <PhoneCell label="Stats" tag="3 · Analytics" size={sz}><Stats /></PhoneCell>
          <PhoneCell label="Exercises" tag="4 · Library" size={sz}><Exercises /></PhoneCell>
          <PhoneCell label="My Program" tag="5 · Plan" size={sz}><Program /></PhoneCell>
        </Section>

        {/* ═════ PROFILE + RECOVERY ═════ */}
        <Section label="Profile & recovery" sub="Account, nutrition, sleep" count={3}>
          <PhoneCell label="Profile" tag="6 · Me" size={sz}><Profile /></PhoneCell>
          <PhoneCell label="Nutrition" tag="7 · Fuel" size={sz}><Nutrition /></PhoneCell>
          <PhoneCell label="Sleep" tag="8 · Recovery" size={sz}><Sleep /></PhoneCell>
        </Section>

        {/* ═════ TOOLS ═════ */}
        <Section label="Tools & ecosystem" sub="Goals, photos, devices, templates" count={4}>
          <PhoneCell label="Goals" tag="9 · Goals" size={sz}><Goals /></PhoneCell>
          <PhoneCell label="Progress Photos" tag="10 · Compare" size={sz}><ProgressPhotos /></PhoneCell>
          <PhoneCell label="Connected Apps" tag="11 · Devices" size={sz}><ConnectedApps /></PhoneCell>
          <PhoneCell label="Templates" tag="12 · Library" size={sz}><Templates /></PhoneCell>
        </Section>

        {/* Footer marker */}
        <div style={{
          marginTop: 80, paddingTop: 24,
          borderTop: "1px solid var(--line-soft)",
          display: "flex", justifyContent: "space-between",
          color: "var(--text-4)", fontFamily: "var(--ff-mono)", fontSize: 11,
          letterSpacing: ".1em", textTransform: "uppercase",
        }}>
          <span>— End of reel · 13 screens —</span>
          <span>Open Tweaks to switch frame size</span>
        </div>
      </div>

      {/* Tweaks panel */}
      {tweaksOpen && (
        <div style={{
          position: "fixed",
          right: 20, bottom: 20,
          width: 260,
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
          zIndex: 1000,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--ff-display)", fontWeight: 600, fontSize: 13 }}>
              <Icons.Settings /> Tweaks
            </div>
            <button onClick={() => setTweaksOpen(false)} style={{ color: "var(--text-3)" }}><Icons.X /></button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600, marginBottom: 6 }}>Frame size</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: "var(--bg-2)", padding: 3, borderRadius: 8, border: "1px solid var(--line)" }}>
              {[["sm", "Pixel 7"], ["lg", "Pixel 7 Pro"]].map(([v, l]) => (
                <button key={v} onClick={() => update("frameSize", v)} style={{
                  padding: "6px 8px", borderRadius: 6,
                  background: tweaks.frameSize === v ? "var(--bg-3)" : "transparent",
                  color: tweaks.frameSize === v ? "var(--text)" : "var(--text-3)",
                  fontSize: 11, fontWeight: 500,
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--text-4)", lineHeight: 1.4, marginTop: 8 }}>
            All 13 screens rerender live when you switch frame sizes.
          </div>
        </div>
      )}
    </>
  );
};

window.App = App;
