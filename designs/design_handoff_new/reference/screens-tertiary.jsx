// Tertiary screens: Goals, Progress Photos, Connected Apps, Templates, My Program

// ─────────────────────────────────────────── GOALS
const Goals = () => (
  <>
    <div className="body scroll">
      <TopBar title="Goals" right={<div className="back-btn" style={{ marginLeft: 0, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}><Icons.Plus /></div>} />

      <div style={{ display: "flex", gap: 3, padding: 2, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 12 }}>
        {["Active · 2", "Done · 8", "Paused"].map((t, i) => (
          <span key={t} style={{
            flex: 1,
            textAlign: "center",
            padding: "6px 0",
            fontSize: 11, fontWeight: 500,
            color: i === 0 ? "var(--text)" : "var(--text-3)",
            background: i === 0 ? "var(--bg-3)" : "transparent",
            borderRadius: 6 }}>{t}</span>
        ))}
      </div>

      {/* Goal 1 — big */}
      <div style={{
        background: "linear-gradient(180deg, var(--bg-1), rgba(11,18,29,.3))",
        border: "1px solid var(--line-soft)",
        borderRadius: 14, padding: 14, marginBottom: 10, position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--blue-soft)", color: "var(--blue-2)", display: "grid", placeItems: "center" }}><Icons.Dumbbell /></div>
              <span className="chip blue" style={{ padding: "2px 6px", fontSize: 10 }}>Strength</span>
            </div>
            <div className="display" style={{ fontSize: 15, fontWeight: 600 }}>Bodyweight bench press</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>78 kg · by Jul 1</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "var(--text-4)" }}>Progress</div>
            <div className="bignum" style={{ fontSize: 22, color: "var(--blue-2)" }}>84<span style={{ fontSize: 11, color: "var(--text-4)" }}>%</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, position: "relative", marginBottom: 4 }}>
          <div style={{ width: "84%", height: "100%", background: "linear-gradient(90deg, var(--blue), var(--blue-2))", borderRadius: 3, boxShadow: "0 0 8px var(--blue)" }}/>
          <div style={{ position: "absolute", left: "84%", top: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--blue)", transform: "translateX(-50%)", border: "2px solid var(--bg)", boxShadow: "0 0 0 1px var(--blue)" }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-4)", fontFamily: "var(--ff-mono)", marginTop: 4 }}>
          <span>Start · 92kg</span>
          <span style={{ color: "var(--blue-2)", fontWeight: 600 }}>Now · 112kg</span>
          <span>Goal · 115kg</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
          {[
            { l: "Pace", v: "+1.2", u: "kg/wk", c: "var(--green)", up: true },
            { l: "Left", v: "2.8", u: "kg", c: "var(--text)" },
            { l: "ETA", v: "3.1", u: "wk", c: "var(--text)" },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 9, color: "var(--text-4)", letterSpacing: ".1em" }}>{m.l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 2 }}>
                <span className="bignum" style={{ fontSize: 16, color: m.c }}>{m.v}</span>
                <span style={{ fontSize: 8.5, color: "var(--text-4)" }}>{m.u}</span>
                {m.up && <Icons.ArrowUp size={10} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goal 2 */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icons.Activity /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Sub-20 5K</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>By Sept 15 · currently 21:48</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="bignum" style={{ fontSize: 16, color: "var(--green)" }}>62%</div>
          </div>
        </div>
        <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: "62%", height: "100%", background: "var(--green)", borderRadius: 2 }}/>
        </div>
      </div>

      {/* Suggested goals */}
      <div className="uppercase-xs" style={{ marginTop: 16, marginBottom: 8 }}>Suggested</div>
      <div className="row-list">
        {[
          { l: "Squat 2× BW", s: "Currently 1.8× · reachable in 6 wk", i: Icons.Trophy, c: "var(--amber)" },
          { l: "100 pull-ups / week", s: "Weekly volume goal · 62 now", i: Icons.Target, c: "var(--purple)" },
        ].map((g, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-2)", color: g.c, display: "grid", placeItems: "center", border: "1px solid var(--line-soft)" }}><g.i /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{g.l}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{g.s}</div>
            </div>
            <div className="back-btn" style={{ marginLeft: 0, width: 22, height: 22 }}><Icons.Plus /></div>
          </div>
        ))}
      </div>
    </div>
  </>
);

// ─────────────────────────────────────────── PROGRESS PHOTOS
const ProgressPhotos = () => {
  // Placeholder bodies via SVG silhouettes
  const Silhouette = ({ glow = false, month }) => (
    <div style={{
      aspectRatio: "3/4",
      background: "linear-gradient(180deg, #0e1623, #081120)",
      borderRadius: 10,
      position: "relative",
      overflow: "hidden",
      border: glow ? "1px solid var(--blue-soft)" : "1px solid var(--line-soft)",
      boxShadow: glow ? "0 0 0 1px rgba(0,119,255,.25), 0 12px 32px -10px var(--blue-glow)" : "none" }}>
      <svg width="100%" height="100%" viewBox="0 0 60 80" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`sil${month}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={glow ? "#3391FF" : "#1e2a3d"} stopOpacity="0.3"/>
            <stop offset="1" stopColor={glow ? "#3391FF" : "#1e2a3d"} stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        {/* head + torso silhouette */}
        <circle cx="30" cy="14" r="5" fill={`url(#sil${month})`} stroke={glow ? "rgba(51,145,255,.3)" : "#273244"} strokeWidth=".5"/>
        <path d="M18 26 Q14 27 14 32 L16 52 L20 66 L26 76 L34 76 L40 66 L44 52 L46 32 Q46 27 42 26 Q36 22 30 22 Q24 22 18 26 Z"
              fill={`url(#sil${month})`} stroke={glow ? "rgba(51,145,255,.3)" : "#273244"} strokeWidth=".5"/>
        {/* arms */}
        <path d="M16 30 L10 46 L12 58 M44 30 L50 46 L48 58" stroke={glow ? "rgba(51,145,255,.4)" : "#273244"} strokeWidth="3" strokeLinecap="round" fill="none"/>
      </svg>
      <div style={{ position: "absolute", left: 6, top: 6, padding: "2px 5px", background: "rgba(0,0,0,.5)", borderRadius: 3, fontSize: 8.5, fontFamily: "var(--ff-mono)", color: "var(--text-2)" }}>{month}</div>
      {glow && <div style={{ position: "absolute", right: 6, top: 6, width: 16, height: 16, background: "var(--blue)", borderRadius: 4, display: "grid", placeItems: "center", color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: "var(--ff-mono)" }}>NOW</div>}
    </div>
  );
  return (
    <>
      <div className="body scroll">
        <TopBar title="Progress photos" right={<div className="back-btn" style={{ marginLeft: 0, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}><Icons.Camera /></div>} />

        {/* Side by side compare */}
        <div style={{
          border: "1px solid var(--line-soft)",
          borderRadius: 12, padding: 10, marginBottom: 12,
          background: "var(--bg-1)" }}>
          <div className="uppercase-xs" style={{ marginBottom: 8 }}>Compare</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Silhouette month="FEB 24" />
            <Silhouette glow month="APR 19" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, fontSize: 10 }}>
            <div style={{ textAlign: "center", color: "var(--text-3)" }}>
              <div className="num" style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>78.4 kg</div>
              <div>8 wk ago</div>
            </div>
            <div style={{ textAlign: "center", color: "var(--blue-2)" }}>
              <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>74.8 kg</div>
              <div>Now · -3.6 kg</div>
            </div>
          </div>
        </div>

        {/* Body stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
          {[
            { l: "Weight", v: "74.8", u: "kg", d: "-3.6", c: "var(--green)" },
            { l: "Body fat", v: "14.2", u: "%", d: "-2.1", c: "var(--green)" },
            { l: "Waist", v: "81", u: "cm", d: "-4.0", c: "var(--green)" },
          ].map(s => (
            <div key={s.l} style={{ padding: 10, background: "var(--bg-1)", border: "1px solid var(--line-soft)", borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: "var(--text-4)" }}>{s.l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 3 }}>
                <span className="bignum" style={{ fontSize: 16 }}>{s.v}</span>
                <span style={{ fontSize: 9, color: "var(--text-4)" }}>{s.u}</span>
              </div>
              <div style={{ fontSize: 9, color: s.c, marginTop: 2, fontFamily: "var(--ff-mono)" }}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <div className="uppercase-xs" style={{ marginBottom: 8 }}>Timeline · 14 photos</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          {["FEB 24", "MAR 03", "MAR 10", "MAR 17", "MAR 24", "APR 01", "APR 08", "APR 14", "APR 19"].map((m, i) =>
            <Silhouette key={m} month={m} glow={i === 8} />
          )}
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────── CONNECTED APPS
const ConnectedApps = () => {
  const DeviceIcon = ({ kind, c }) => (
    <div style={{ width: 36, height: 36, borderRadius: 9, background: c + "15", color: c, display: "grid", placeItems: "center", border: `1px solid ${c}30` }}>
      {kind === "watch" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="6" y="7" width="12" height="10" rx="2"/><path d="M9 7V4h6v3M9 17v3h6v-3"/><circle cx="12" cy="12" r="2.5"/></svg>}
      {kind === "ring" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="13" rx="6" ry="4"/><path d="M6 13a6 3 0 0 1 12 0"/></svg>}
      {kind === "scale" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9v3M12 9v5M17 9v3"/></svg>}
      {kind === "phone" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/></svg>}
      {kind === "heart" && <Icons.Heart />}
      {kind === "cloud" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 19a5 5 0 0 1-.5-10 7 7 0 0 1 13.5 2 4 4 0 0 1 0 8z"/></svg>}
    </div>
  );
  return (
    <>
      <div className="body scroll">
        <TopBar title="Connected" />

        {/* Active device hero */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0,119,255,0.14), transparent 70%)",
          border: "1px solid var(--blue-soft)",
          borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <DeviceIcon kind="watch" c="#0077FF" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Apple Watch · Alex's</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 4px var(--green)" }}/>
                Synced · 2 min ago
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11.5, fontWeight: 500 }}>62%</div>
              <div style={{ width: 20, height: 9, border: "1px solid var(--text-3)", borderRadius: 2, marginTop: 2, padding: 1 }}>
                <div style={{ width: "62%", height: "100%", background: "var(--green)", borderRadius: 1 }}/>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, paddingTop: 10, borderTop: "1px solid var(--blue-soft)" }}>
            {[
              { l: "HR", v: "68", u: "bpm" },
              { l: "Steps", v: "8.2k", u: "" },
              { l: "Cal", v: "482", u: "" },
              { l: "Min", v: "54", u: "" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--text-4)", letterSpacing: ".1em" }}>{s.l}</div>
                <div className="bignum" style={{ fontSize: 14, marginTop: 2 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected list */}
        <div className="uppercase-xs" style={{ marginBottom: 6 }}>Connected · 3</div>
        <div className="row-list" style={{ marginBottom: 12 }}>
          {[
            { i: "ring", n: "Oura Ring Gen 4", s: "Sleep · Recovery · HRV", c: "#8B5CF6", on: true },
            { i: "scale", n: "Withings Body+", s: "Weight · Body fat · BMI", c: "#22C55E", on: true },
            { i: "heart", n: "Polar H10", s: "Chest strap · HR during workouts", c: "#EF4444", on: true },
          ].map((d, i) => (
            <div key={i} className="row">
              <DeviceIcon kind={d.i} c={d.c} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.n}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{d.s}</div>
              </div>
              {/* toggle */}
              <div style={{ width: 30, height: 18, borderRadius: 10, background: d.on ? "var(--blue)" : "var(--bg-3)", padding: 2, position: "relative", transition: "all .2s" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", transform: d.on ? "translateX(12px)" : "translateX(0)", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Available */}
        <div className="uppercase-xs" style={{ marginBottom: 6 }}>Available</div>
        <div className="row-list">
          {[
            { i: "heart", n: "Apple Health", s: "Sync all health data", c: "#EF4444" },
            { i: "cloud", n: "Strava", s: "Share runs & rides", c: "#FB923C" },
            { i: "phone", n: "Google Fit", s: "Google fitness platform", c: "#22C55E" },
            { i: "watch", n: "Garmin Connect", s: "Multi-sport tracking", c: "#0077FF" },
          ].map((d, i) => (
            <div key={i} className="row">
              <DeviceIcon kind={d.i} c={d.c} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.n}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{d.s}</div>
              </div>
              <button style={{ padding: "4px 10px", background: "transparent", color: "var(--blue-2)", border: "1px solid var(--blue-soft)", borderRadius: 6, fontSize: 10.5, fontWeight: 600 }}>Connect</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────── WORKOUT TEMPLATES (Library)
const Templates = () => (
  <>
    <div className="body scroll">
      <TopBar title="Templates" right={<div className="back-btn" style={{ marginLeft: 0, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}><Icons.Plus /></div>} />

      <div style={{ display: "flex", gap: 3, padding: 2, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 8, marginBottom: 12 }}>
        {["Mine · 6", "Community", "AI"].map((t, i) => (
          <span key={t} style={{
            flex: 1, textAlign: "center", padding: "6px 0",
            fontSize: 11, fontWeight: 500,
            color: i === 0 ? "var(--text)" : "var(--text-3)",
            background: i === 0 ? "var(--bg-3)" : "transparent",
            borderRadius: 6 }}>{t}</span>
        ))}
      </div>

      {/* Featured */}
      <div className="uppercase-xs" style={{ marginBottom: 8 }}>In rotation</div>

      {[
        { n: "Push A · Heavy", m: "5 ex · 62 min", d: "Last · yesterday", tags: ["Chest", "Triceps"], c: "var(--blue-2)", icon: "P", sets: "22 sets · 14.2t avg" },
        { n: "Pull A · Heavy", m: "5 ex · 58 min", d: "Last · 3 days", tags: ["Back", "Biceps"], c: "var(--green)", icon: "P", sets: "20 sets · 12.8t avg" },
        { n: "Legs · Volume", m: "6 ex · 72 min", d: "Last · Fri", tags: ["Quads", "Glutes"], c: "var(--amber)", icon: "L", sets: "28 sets · 21.6t avg" },
      ].map((t, i) => (
        <div key={i} style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 6,
          display: "flex",
          gap: 10,
          alignItems: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, " + t.c + "20, " + t.c + "05)",
            border: "1px solid " + t.c + "30",
            color: t.c,
            display: "grid", placeItems: "center",
            fontFamily: "var(--ff-display)", fontSize: 18, fontWeight: 600 }}>{t.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.n}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{t.m} · {t.sets}</div>
            <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ padding: "1px 5px", background: "var(--bg-2)", border: "1px solid var(--line-soft)", borderRadius: 3, fontSize: 9, color: "var(--text-3)" }}>{tag}</span>
              ))}
            </div>
          </div>
          <button style={{ padding: "6px 10px", background: "var(--blue)", color: "#fff", border: 0, borderRadius: 6, fontSize: 11, fontWeight: 600, boxShadow: "0 4px 10px -4px var(--blue-glow)" }}>Start</button>
        </div>
      ))}

      {/* Archive */}
      <div className="uppercase-xs" style={{ marginTop: 16, marginBottom: 6 }}>Archive · 3</div>
      <div className="row-list">
        {[
          { n: "Full body 3×", m: "Used winter cycle · 34 uses" },
          { n: "Upper hypertrophy", m: "Used fall cycle · 28 uses" },
          { n: "Conditioning EMOM", m: "Finisher · 12 uses" },
        ].map((t, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-2)", color: "var(--text-3)", display: "grid", placeItems: "center", border: "1px solid var(--line-soft)" }}><Icons.Dumbbell /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{t.n}</div>
              <div style={{ fontSize: 10, color: "var(--text-4)" }}>{t.m}</div>
            </div>
            <Icons.ChevronRight />
          </div>
        ))}
      </div>
    </div>
  </>
);

// ─────────────────────────────────────────── MY PROGRAM (weekly calendar)
const Program = () => {
  const days = [
    { d: "Mon", n: 15, w: "Push A", c: "var(--blue-2)", done: true, sub: "62m · 14.2t" },
    { d: "Tue", n: 16, w: "Pull A", c: "var(--green)", done: true, sub: "58m · 12.8t" },
    { d: "Wed", n: 17, w: "Rest", c: null },
    { d: "Thu", n: 18, w: "Legs A", c: "var(--amber)", done: true, sub: "72m · 21.6t" },
    { d: "Fri", n: 19, w: "Push B", c: "var(--blue-2)", today: true, sub: "Heavy · 5×5" },
    { d: "Sat", n: 20, w: "Pull B", c: "var(--green)" },
    { d: "Sun", n: 21, w: "Rest", c: null },
  ];
  return (
    <>
      <div className="body scroll">
        <TopBar title="My program" right={<Icons.More />} />

        {/* Program hero */}
        <div style={{
          background: "var(--bg-1)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span className="chip blue" style={{ padding: "2px 6px", fontSize: 10 }}>Active</span>
                <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: ".08em" }}>6 day split</span>
              </div>
              <div className="display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>PPL · Hypertrophy</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>Week 3 of 8 · deload wk 4</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="bignum" style={{ fontSize: 20, color: "var(--blue-2)" }}>38%</div>
              <div style={{ fontSize: 9, color: "var(--text-4)", marginTop: 1 }}>done</div>
            </div>
          </div>
          {/* weekly progress */}
          <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const isPast = i < 2;
              const current = i === 2;
              return <div key={i} style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: isPast ? "var(--blue)" : current ? "var(--blue)" : "var(--bg-3)",
                opacity: current ? 0.6 : 1,
                boxShadow: current ? "0 0 4px var(--blue)" : "none" }}/>;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--text-4)", fontFamily: "var(--ff-mono)" }}>
            <span>W1</span><span>W4 · deload</span><span>W8 · test</span>
          </div>
        </div>

        {/* Week view */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div className="uppercase-xs">This week · Apr 15–21</div>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>3/4 done</span>
        </div>

        {/* Rail layout — continuous timeline on the left */}
        <div style={{ position: "relative", paddingLeft: 40 }}>
          {/* Vertical rail */}
          <div style={{
            position: "absolute", left: 16, top: 12, bottom: 12,
            width: 2,
            background: "linear-gradient(180deg, var(--line-soft) 0%, var(--line) 30%, var(--line-soft) 70%, transparent 100%)" }}/>

          {days.map((day, i) => (
            <div key={i} style={{
              position: "relative",
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px",
              marginBottom: 4,
              background: day.today ? "linear-gradient(100deg, rgba(0,119,255,0.14), rgba(0,119,255,0.02) 50%)" : "var(--bg-1)",
              border: "1px solid " + (day.today ? "var(--blue-soft)" : "var(--line-soft)"),
              borderRadius: 10,
              opacity: !day.c ? 0.5 : 1,
              boxShadow: day.today ? "inset 0 1px 0 rgba(51,145,255,.15), 0 0 0 2px rgba(0,119,255,.12)" : "none" }}>
              {/* Rail node — floats into the gutter */}
              <div style={{
                position: "absolute",
                left: -32,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16, height: 16,
                borderRadius: "50%",
                background: "var(--bg)",
                border: `2px solid ${day.today ? "var(--blue)" : day.done ? "var(--green)" : day.c || "var(--line-2)"}`,
                display: "grid", placeItems: "center",
                boxShadow: day.today ? "0 0 0 4px rgba(0,119,255,.15), 0 0 12px var(--blue-glow)" : "none",
                zIndex: 2 }}>
                {day.done && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }}/>}
                {day.today && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)", boxShadow: "0 0 6px var(--blue)" }}/>}
              </div>

              {/* Date */}
              <div style={{ width: 32, textAlign: "center" }}>
                <div style={{ fontSize: 8.5, color: day.today ? "var(--blue-2)" : "var(--text-4)", fontWeight: 600 }}>{day.d}</div>
                <div className="bignum" style={{ fontSize: 18, color: day.today ? "var(--blue-2)" : "var(--text)" }}>{day.n}</div>
              </div>

              {/* Color tag — fresh treatment: tiny underline swatch under the title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: day.c ? "var(--text)" : "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
                  {day.w}
                  {day.today && <span style={{ fontSize: 10, color: "var(--blue-2)", fontFamily: "var(--ff-mono)", fontWeight: 700 }}>Today</span>}
                </div>
                {day.c && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <div style={{ width: 14, height: 2, background: day.c, borderRadius: 1 }}/>
                    {day.sub && <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: day.done ? "var(--ff-mono)" : "inherit" }}>{day.sub}</div>}
                  </div>
                )}
              </div>

              {day.done && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center" }}>
                  <Icons.Check />
                </div>
              )}
              {day.today && (
                <button style={{ padding: "5px 10px", background: "var(--blue)", color: "#fff", border: 0, borderRadius: 6, fontSize: 10.5, fontWeight: 600 }}>Start</button>
              )}
              {!day.done && !day.today && day.c && (
                <Icons.ChevronRight />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 14 }}>
          <div className="card" style={{ padding: 10 }}>
            <div className="uppercase-xs">Weekly goal</div>
            <div className="bignum" style={{ fontSize: 18, marginTop: 4 }}>5 <span style={{ fontSize: 10, color: "var(--text-4)" }}>of 6 sessions</span></div>
          </div>
          <div className="card" style={{ padding: 10 }}>
            <div className="uppercase-xs">Projected volume</div>
            <div className="bignum" style={{ fontSize: 18, marginTop: 4, color: "var(--green)" }}>↑ 8.4<span style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 400 }}>%</span></div>
          </div>
        </div>
      </div>
    </>
  );
};

Object.assign(window, { Goals, ProgressPhotos, ConnectedApps, Templates, Program });
