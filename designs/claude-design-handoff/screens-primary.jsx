// Primary screens: Login, Dashboard, Active Workout, Stats
const { useState: u2 } = React;

// ─────────────────────────────────────────── LOGIN
const Login = () => (
  <>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 20px 28px", position: "relative" }}>
      {/* brand hero */}
      <div style={{ marginTop: 56, marginBottom: 40, textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, margin: "0 auto 18px",
          borderRadius: 16,
          background: "linear-gradient(135deg, #0B121D, #0B121D 70%, #0A1E34)",
          border: "1px solid var(--line-2)",
          display: "grid", placeItems: "center",
          boxShadow: "0 0 0 1px rgba(0,119,255,.2), 0 12px 32px -12px var(--blue-glow)",
        }}>
          <Icons.Logo size={28} />
        </div>
        <div className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em" }}>
          Iron<span style={{ color: "var(--blue-2)" }}>Pulse</span>
        </div>
        <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 6, letterSpacing: ".02em" }}>
          Strength · Cardio · One place
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 600, marginBottom: 6 }}>Email</div>
          <input className="input" placeholder="you@example.com" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 600 }}>Password</div>
            <span style={{ fontSize: 10, color: "var(--blue-2)", fontWeight: 600 }}>Forgot?</span>
          </div>
          <div style={{ position: "relative" }}>
            <input className="input" placeholder="••••••••" type="password" defaultValue="••••••••" />
            <div style={{ position: "absolute", right: 10, top: 10, color: "var(--text-4)" }}><Icons.Eye /></div>
          </div>
        </div>
      </div>

      <button className="btn primary" style={{ marginBottom: 18 }}>Log in</button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px", color: "var(--text-4)", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        or continue with
        <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button className="btn ghost" style={{ gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1h-9.17v2.87h5.23c-.22 1.38-.86 2.55-1.84 3.34l2.97 2.3c1.73-1.6 2.73-3.97 2.73-6.8 0-.64-.06-1.25-.16-1.71z"/><path fill="#fff" opacity=".7" d="M12.18 21c2.48 0 4.55-.82 6.07-2.22l-2.97-2.3a5.52 5.52 0 0 1-8.26-2.9H3.9v2.38A9.18 9.18 0 0 0 12.18 21z"/></svg>
          Google
        </button>
        <button className="btn ghost" style={{ gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Apple
        </button>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 30, textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
        Don't have an account? <span style={{ color: "var(--blue-2)", fontWeight: 600 }}>Sign up</span>
      </div>
    </div>
  </>
);

// ─────────────────────────────────────────── DASHBOARD
const Dashboard = () => (
  <>
    <div className="body scroll">
      {/* Top row: brand + offline */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.Logo size={20} />
          <span className="display" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>IronPulse</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icons.Bell />
        </div>
      </div>

      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--blue-2)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600, marginBottom: 4 }}>Sun · 19 Apr · Week 3</div>
        <div className="display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em" }}>Morning, Alex</div>
        <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 2 }}>Push day — 5 exercises queued</div>
      </div>

      {/* Next up hero */}
      <div style={{
        position: "relative", overflow: "hidden",
        border: "1px solid var(--blue-soft)",
        background: "linear-gradient(135deg, rgba(0,119,255,0.22), rgba(0,119,255,0.02) 70%)",
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
      }}>
        {/* deco */}
        <svg style={{ position: "absolute", right: -14, top: -14, opacity: 0.08 }} width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="var(--blue)" strokeWidth="1" fill="none"/>
          <circle cx="50" cy="50" r="30" stroke="var(--blue)" strokeWidth="1" fill="none"/>
          <circle cx="50" cy="50" r="20" stroke="var(--blue)" strokeWidth="1" fill="none"/>
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--blue)", boxShadow: "0 0 8px var(--blue)" }} />
          <span style={{ fontSize: 10, color: "var(--blue-2)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>Next up · 62 min</span>
        </div>
        <div className="display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 2 }}>Push A — Heavy</div>
        <div style={{ color: "var(--text-3)", fontSize: 11.5, marginBottom: 14 }}>Bench · OHP · Incline DB · Fly · Pushdown</div>
        <button className="btn primary" style={{ padding: "10px 12px", fontSize: 13 }}>
          <Icons.Play /> Start workout
        </button>
      </div>

      {/* Streak */}
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        borderRadius: 14,
        marginBottom: 12,
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--amber-soft)", display: "grid", placeItems: "center", color: "var(--amber)" }}>
          <Icons.Flame />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}><span className="num">42</span>-day streak</div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>Longest: 58 · Next: Mon</div>
        </div>
        {/* mini heatmap */}
        <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(3, 6px)", gap: 2 }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const v = Math.random();
            const done = v > 0.3;
            return <div key={i} style={{
              width: 6, height: 6,
              borderRadius: 1.5,
              background: done ? `rgba(245,158,11,${0.3 + v * 0.6})` : "var(--bg-3)",
            }} />;
          })}
        </div>
      </div>

      {/* This week stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
        {[
          { l: "Sessions", v: "3", u: "/5", c: "var(--blue-2)" },
          { l: "Volume", v: "14.2", u: "t", c: "var(--green)" },
          { l: "Time", v: "2:48", u: "hr", c: "var(--purple)" },
        ].map(s => (
          <div key={s.l} style={{ padding: 10, background: "var(--bg-1)", border: "1px solid var(--line-soft)", borderRadius: 10 }}>
            <div style={{ fontSize: 9.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>{s.l}</div>
            <div className="bignum" style={{ fontSize: 20, marginTop: 3, color: s.c }}>
              {s.v}<span style={{ color: "var(--text-4)", fontSize: 10, fontWeight: 400, marginLeft: 2 }}>{s.u}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="uppercase-xs">Recent</div>
        <span style={{ fontSize: 10.5, color: "var(--blue-2)", fontWeight: 600 }}>View all</span>
      </div>

      <div className="row-list" style={{ marginBottom: 14 }}>
        {[
          { t: "Pull A — Heavy", m: "54m · 14,280 kg · 3 PRs", w: "Yesterday", i: Icons.Dumbbell, c: "var(--blue-2)", bg: "var(--blue-soft)", pr: true },
          { t: "Morning trail run", m: "8.2 km · 42:18", w: "Sat", i: Icons.Activity, c: "var(--green)", bg: "var(--green-soft)" },
          { t: "Legs — Volume", m: "62m · 21,650 kg", w: "Fri", i: Icons.Dumbbell, c: "var(--blue-2)", bg: "var(--blue-soft)" },
        ].map((a, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: a.bg, color: a.c, display: "grid", placeItems: "center" }}>
              <a.i />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                {a.t} {a.pr && <span className="chip blue" style={{ padding: "1px 5px", fontSize: 9 }}>PR</span>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1 }}>{a.m}</div>
            </div>
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>{a.w}</span>
          </div>
        ))}
      </div>
    </div>
    <TabBar current="home" />
  </>
);

// ─────────────────────────────────────────── ACTIVE WORKOUT
const ActiveWorkout = () => (
  <>
    <div className="body scroll" style={{ paddingBottom: 0 }}>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="back-btn" style={{ marginLeft: 0 }}><Icons.X /></div>
          <div>
            <div style={{ fontSize: 9.5, color: "var(--blue-2)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>Push A · wk 3</div>
            <div className="bignum num" style={{ fontSize: 18 }}>22:54</div>
          </div>
        </div>
        <button className="btn sm primary" style={{ padding: "5px 10px" }}>Finish</button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i < 4 ? "var(--blue)" : "var(--bg-3)",
          }} />
        ))}
      </div>

      {/* Rest timer */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,119,255,0.18), rgba(0,119,255,0.02) 60%)",
        border: "1px solid var(--blue-soft)",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" stroke="var(--bg-3)" strokeWidth="2.5" fill="none"/>
            <circle cx="20" cy="20" r="16" stroke="var(--blue)" strokeWidth="2.5" fill="none"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * 0.28}
              strokeLinecap="round"
              transform="rotate(-90 20 20)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, fontFamily: "var(--ff-display)" }}>1:27</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, color: "var(--blue-2)", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600 }}>Rest</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>Next: Bench · 102.5 × 5</div>
        </div>
        <button className="btn sm ghost" style={{ padding: "4px 8px", fontSize: 10 }}>+30s</button>
        <button className="btn sm ghost" style={{ padding: "4px 8px", fontSize: 10 }}>Skip</button>
      </div>

      {/* Active exercise card */}
      <div style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 8,
        position: "relative",
        overflow: "hidden",
        boxShadow: "inset 0 1px 0 rgba(51,145,255,.25)",
      }}>
        {/* Corner label badge replaces left accent */}
        <div style={{
          position: "absolute", top: 0, left: 14,
          padding: "2px 8px 3px",
          background: "var(--blue)",
          color: "#fff",
          fontSize: 8.5, fontWeight: 700, letterSpacing: ".16em",
          fontFamily: "var(--ff-mono)",
          borderRadius: "0 0 5px 5px",
          boxShadow: "0 2px 8px -2px var(--blue-glow)",
        }}>A1 · ACTIVE</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <div className="display" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Bench Press</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>Chest · 1RM 112 kg</div>
          </div>
          <Icons.More />
        </div>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "18px 44px 52px 52px 1fr",
          gap: 6,
          marginTop: 10,
          paddingBottom: 4,
          borderBottom: "1px solid var(--line-soft)",
          fontSize: 8.5, color: "var(--text-3)",
          textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 600,
        }}>
          <span>#</span><span>Prev</span><span>kg</span><span>Reps</span><span />
        </div>

        {[
          { w: "95", r: "5", done: true, prev: "95×5" },
          { w: "102.5", r: "5", done: true, prev: "100×5" },
          { w: "102.5", r: "5", done: false, active: true, prev: "100×5", pr: true },
          { w: "102.5", r: "5", done: false, prev: "100×4" },
          { w: "102.5", r: "5", done: false, prev: "100×3" },
        ].map((s, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "18px 44px 52px 52px 1fr",
            gap: 6,
            alignItems: "center",
            padding: "7px 0",
            borderTop: i === 0 ? 0 : "1px solid var(--line-soft)",
            background: s.active ? "rgba(0,119,255,0.06)" : "transparent",
            margin: s.active ? "0 -8px" : undefined,
            paddingLeft: s.active ? 8 : 0,
            paddingRight: s.active ? 8 : 0,
            borderRadius: s.active ? 6 : 0,
          }}>
            <span className="mono" style={{ fontSize: 10, color: s.done ? "var(--green)" : "var(--text-4)" }}>{s.done ? "✓" : i + 1}</span>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--text-4)" }}>{s.prev}</span>
            <span className="bignum" style={{ fontSize: 13, color: s.done ? "var(--text-3)" : "var(--text)" }}>{s.w}</span>
            <span className="bignum" style={{ fontSize: 13, color: s.done ? "var(--text-3)" : "var(--text)" }}>{s.r}</span>
            {s.active ? (
              <button style={{ background: "var(--blue)", color: "#fff", fontSize: 9.5, fontWeight: 700, border: 0, borderRadius: 5, padding: "4px 6px", letterSpacing: ".1em" }}>LOG</button>
            ) : s.done ? (
              <span style={{ fontSize: 9, color: "var(--text-4)", textAlign: "right" }}>RPE 7</span>
            ) : s.pr ? (
              <span style={{ fontSize: 9, color: "var(--blue-2)", textAlign: "right", fontWeight: 600 }}>PR</span>
            ) : <span />}
          </div>
        ))}
      </div>

      {/* Superset — bracket treatment: thin vertical hinge BETWEEN the two, not on the edge */}
      <div style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        padding: "10px 12px",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 6px", background: "var(--purple-soft)", color: "var(--purple)", borderRadius: 4, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}><Icons.Link /> Superset</div>
          <div style={{ fontSize: 8.5, color: "var(--text-4)", fontFamily: "var(--ff-mono)", letterSpacing: ".1em" }}>B1 ⟷ B2</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "stretch" }}>
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--purple)", letterSpacing: ".12em", fontWeight: 700 }}>B1</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 1 }}>Incline DB</div>
            <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>3 × 10 · 32 kg</div>
          </div>
          {/* Hinge bracket */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <div style={{ width: 1, flex: 1, background: "linear-gradient(180deg, transparent, var(--purple) 50%, transparent)", opacity: .5 }}/>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--purple)", background: "var(--bg-1)", display: "grid", placeItems: "center", color: "var(--purple)" }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="2"/></svg>
            </div>
            <div style={{ width: 1, flex: 1, background: "linear-gradient(180deg, transparent, var(--purple) 50%, transparent)", opacity: .5 }}/>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 9, color: "var(--purple)", letterSpacing: ".12em", fontWeight: 700 }}>B2</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 1 }}>Cable Fly</div>
            <div style={{ fontSize: 9.5, color: "var(--text-3)" }}>3 × 12 · 18 kg</div>
          </div>
        </div>
      </div>
    </div>
    <div className="gesture-pill" />
  </>
);

// ─────────────────────────────────────────── STATS
const Stats = () => (
  <>
    <div className="body scroll">
      <div className="page-hd">
        <h1>Stats</h1>
        <div style={{ display: "flex", gap: 3, padding: 2, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 6 }}>
          {["4w", "12w", "1y"].map((r, i) => (
            <span key={r} style={{
              padding: "3px 8px", fontSize: 10,
              color: i === 1 ? "var(--text)" : "var(--text-3)",
              background: i === 1 ? "var(--bg-3)" : "transparent",
              borderRadius: 4, fontFamily: "var(--ff-mono)", fontWeight: 500,
            }}>{r}</span>
          ))}
        </div>
      </div>

      {/* Hero metric */}
      <div style={{
        background: "linear-gradient(180deg, var(--bg-1), rgba(11,18,29,.5))",
        border: "1px solid var(--line-soft)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="uppercase-xs">Back Squat · est 1RM</div>
          <Icons.ChevronDown />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 6 }}>
          <span className="bignum" style={{ fontSize: 36 }}>162.5</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>kg</span>
          <span style={{ fontSize: 11, color: "var(--green)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}><Icons.ArrowUp /> 14.4%</span>
        </div>
        <div style={{ marginTop: 10, marginLeft: -4, marginRight: -4 }}>
          <Spark data={[142, 145, 148, 150, 152, 155, 158, 160, 162.5]} height={50} color="var(--blue)" strokeWidth="1.8" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-4)", fontSize: 9, marginTop: 2, fontFamily: "var(--ff-mono)" }}>
          <span>12w</span><span>now</span>
        </div>
      </div>

      {/* Training status (keep from original, prettier) */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="uppercase-xs">Training status</div>
          <span className="chip green"><span className="dot" />Optimal</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { l: "Fatigue", s: "ATL", v: "12.0", c: "var(--amber)" },
            { l: "Fitness", s: "CTL", v: "7.5", c: "var(--blue-2)" },
            { l: "Form", s: "TSB", v: "-4.6", c: "var(--purple)" },
          ].map(m => (
            <div key={m.l} style={{ textAlign: "left" }}>
              <div style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--ff-mono)", letterSpacing: ".12em" }}>{m.s}</div>
              <div className="bignum" style={{ fontSize: 22, color: m.c, marginTop: 2 }}>{m.v}</div>
              <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 1 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly volume bars */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="uppercase-xs">Weekly volume</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span className="bignum" style={{ fontSize: 16 }}>14.2</span>
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>t · wk 11</span>
          </div>
        </div>
        <svg width="100%" height="70" viewBox="0 0 240 70" preserveAspectRatio="none" style={{ display: "block" }}>
          {[12.4, 14.1, 13.8, 15.2, 16.7, 15.9, 18.3, 19.1, 17.8, 20.4, 21.1, 14.2].map((v, i, a) => {
            const max = Math.max(...a) * 1.1;
            const bh = (v / max) * 58;
            const x = 2 + i * 20;
            const y = 64 - bh;
            const active = i === 11;
            return <g key={i}>
              <rect x={x} y={y} width="14" height={bh} rx="2" fill={active ? "var(--blue)" : "var(--bg-3)"} style={{ filter: active ? "drop-shadow(0 0 6px var(--blue))" : "none" }} />
              <text x={x + 7} y={69} textAnchor="middle" fontSize="7" fill="var(--text-4)" fontFamily="var(--ff-mono)">W{i + 1}</text>
            </g>;
          })}
        </svg>
      </div>

      {/* Muscle groups */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="uppercase-xs" style={{ marginBottom: 12 }}>Top muscle groups · 7d</div>
        {[
          { m: "Chest", pct: 72 },
          { m: "Shoulders", pct: 58 },
          { m: "Triceps", pct: 44 },
          { m: "Quads", pct: 32 },
        ].map(r => (
          <div key={r.m} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
              <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{r.m}</span>
              <span className="mono num" style={{ color: "var(--text-3)", fontSize: 10.5 }}>{r.pct}%</span>
            </div>
            <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2 }}>
              <div style={{ width: r.pct + "%", height: "100%", background: "linear-gradient(90deg, var(--blue), var(--blue-2))", borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {/* PR list compact */}
      <div className="uppercase-xs" style={{ marginBottom: 6, marginTop: 12 }}>Records</div>
      {[
        { n: "Deadlift", v: "195", d: [175, 180, 185, 188, 190, 192, 195] },
        { n: "Bench", v: "112", d: [95, 100, 100, 105, 108, 110, 112] },
        { n: "OHP", v: "68", d: [55, 58, 60, 62, 65, 66, 68] },
      ].map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 60px 1fr", alignItems: "center", gap: 8, padding: "9px 12px", background: "var(--bg-1)", border: "1px solid var(--line-soft)", borderRadius: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 11.5, fontWeight: 500 }}>{r.n}</span>
          <span className="bignum" style={{ fontSize: 13 }}>{r.v}<span style={{ fontSize: 8, color: "var(--text-3)", marginLeft: 2 }}>kg</span></span>
          <Spark data={r.d} height={20} color="var(--blue)" fill={false} strokeWidth="1.5" />
        </div>
      ))}
    </div>
    <TabBar current="stats" />
  </>
);

Object.assign(window, { Login, Dashboard, ActiveWorkout, Stats });
