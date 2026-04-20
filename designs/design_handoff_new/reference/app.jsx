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
              <span>IronPulse · Android · v4.0</span>
            </div>
            <h1>A fitness app that <span style={{ color: "var(--blue-2)" }}>moves with you</span> — not against you.</h1>
            <div className="sub">
              Full redesign. 13 screens covering the whole loop — from lacing up to crushing a set to crashing out.
              Punchier color, chunkier type, copy that actually talks to you.
              Shown at Pixel 7 and Pixel 7 Pro widths.
            </div>
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end",
            color: "var(--text-4)", fontFamily: "var(--ff-body)", fontSize: 12.5,
            textAlign: "right", fontWeight: 500, whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            <span style={{ color: "var(--blue-2)", fontWeight: 700, fontSize: 13 }}>☀️ Sunday · Apr 19</span>
            <span>Pixel 7 Pro · 412×892</span>
            <span>Pixel 7 · 360×780</span>
            <span style={{ opacity: .6 }}>By Alex C.</span>
          </div>
        </div>

        {/* ═════ CORE LOOP ═════ */}
        <Section label="The daily loop" sub="Sign in, check in, sweat" count={3}>
          <PhoneCell label="Login" tag="Welcome back" size={sz}><Login /></PhoneCell>
          <PhoneCell label="Dashboard" tag="Today's the day" size={sz}><Dashboard /></PhoneCell>
          <PhoneCell label="Active Workout" tag="Let's go" size={sz} time="9:43"><ActiveWorkout /></PhoneCell>
        </Section>

        {/* ═════ TRACK PROGRESS ═════ */}
        <Section label="See how far you've come" sub="Stats, moves, your plan" count={3}>
          <PhoneCell label="Stats" tag="Your numbers" size={sz}><Stats /></PhoneCell>
          <PhoneCell label="Exercises" tag="Move library" size={sz}><Exercises /></PhoneCell>
          <PhoneCell label="My Program" tag="Your roadmap" size={sz}><Program /></PhoneCell>
        </Section>

        {/* ═════ PROFILE + RECOVERY ═════ */}
        <Section label="You, fueled & rested" sub="Profile, food, sleep" count={3}>
          <PhoneCell label="Profile" tag="That's you" size={sz}><Profile /></PhoneCell>
          <PhoneCell label="Nutrition" tag="Fuel up" size={sz}><Nutrition /></PhoneCell>
          <PhoneCell label="Sleep" tag="Good night" size={sz}><Sleep /></PhoneCell>
        </Section>

        {/* ═════ TOOLS ═════ */}
        <Section label="Your toolkit" sub="Goals, photos, gear, templates" count={4}>
          <PhoneCell label="Goals" tag="Big dreams" size={sz}><Goals /></PhoneCell>
          <PhoneCell label="Progress Photos" tag="Before & now" size={sz}><ProgressPhotos /></PhoneCell>
          <PhoneCell label="Connected Apps" tag="Your gear" size={sz}><ConnectedApps /></PhoneCell>
          <PhoneCell label="Templates" tag="Quick starts" size={sz}><Templates /></PhoneCell>
        </Section>

        {/* Footer marker */}
        <div style={{
          marginTop: 80, paddingTop: 24,
          borderTop: "1px solid var(--line-soft)",
          display: "flex", justifyContent: "space-between",
          color: "var(--text-4)", fontFamily: "var(--ff-body)", fontSize: 12.5,
          letterSpacing: "-0.005em", textTransform: "none", fontWeight: 500,
        }}>
          <span>— That's a wrap · 13 screens —</span>
          <span>Pop open Tweaks to switch frame size →</span>
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
