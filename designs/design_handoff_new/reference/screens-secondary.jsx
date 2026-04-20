// Secondary screens: Exercises, Profile, Nutrition, Sleep

// ─────────────────────────────────────────── EXERCISES (list/browse)
const Exercises = () => (
  <>
    <div className="body scroll">
      <div className="page-hd">
        <h1>Exercises</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <div className="back-btn" style={{ marginLeft: 0 }}><Icons.Filter /></div>
          <div className="back-btn" style={{ marginLeft: 0, background: "var(--blue)", color: "#fff", borderColor: "var(--blue)" }}><Icons.Plus /></div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <input className="input" placeholder="Search 420 exercises" style={{ paddingLeft: 32 }} />
        <div style={{ position: "absolute", left: 10, top: 10, color: "var(--text-4)" }}><Icons.Search /></div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
        {[
          { t: "All", a: true, n: "420" },
          { t: "Chest", n: "38" },
          { t: "Back", n: "52" },
          { t: "Legs", n: "64" },
          { t: "Shoulders", n: "41" },
        ].map((c, i) => (
          <span key={i} style={{
            padding: "5px 10px",
            background: c.a ? "var(--blue)" : "var(--bg-1)",
            color: c.a ? "#fff" : "var(--text-2)",
            border: "1px solid " + (c.a ? "var(--blue)" : "var(--line)"),
            borderRadius: 999,
            fontSize: 10.5, fontWeight: 500,
            whiteSpace: "nowrap",
            display: "inline-flex", alignItems: "center", gap: 4 }}>
            {c.t} <span style={{ opacity: c.a ? 0.75 : 0.8, fontFamily: "var(--ff-mono)", fontSize: 9.5 }}>{c.n}</span>
          </span>
        ))}
      </div>

      {/* Section */}
      <div className="uppercase-xs" style={{ marginBottom: 6 }}>Recent</div>
      <div className="row-list" style={{ marginBottom: 12 }}>
        {[
          { n: "Bench Press", c: "Barbell · Chest", d: "95×5 · yesterday", r: 112, ring: 72 },
          { n: "Overhead Press", c: "Barbell · Shoulders", d: "55×5 · yesterday", r: 68, ring: 64 },
          { n: "Back Squat", c: "Barbell · Quads", d: "130×5 · Fri", r: 150, ring: 88, pr: true },
        ].map((e, i) => (
          <div key={i} className="row">
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid", placeItems: "center",
              position: "relative" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: "absolute", inset: 2 }}>
                <circle cx="14" cy="14" r="12" stroke="var(--bg-3)" strokeWidth="1.5" fill="none"/>
                <circle cx="14" cy="14" r="12" stroke="var(--blue)" strokeWidth="1.5" fill="none"
                  strokeDasharray={2 * Math.PI * 12}
                  strokeDashoffset={2 * Math.PI * 12 * (1 - e.ring / 100)}
                  transform="rotate(-90 14 14)"
                  strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 8, fontWeight: 700, color: "var(--blue-2)", fontFamily: "var(--ff-mono)" }}>{e.ring}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.n}</div>
                {e.pr && <span className="chip blue" style={{ padding: "2px 6px", fontSize: 10 }}>PR</span>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>{e.c}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="bignum" style={{ fontSize: 12 }}>{e.r}<span style={{ fontSize: 8, color: "var(--text-3)", marginLeft: 1 }}>kg</span></div>
              <div style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--ff-mono)" }}>1RM</div>
            </div>
          </div>
        ))}
      </div>

      <div className="uppercase-xs" style={{ marginBottom: 6 }}>All · A</div>
      <div className="row-list">
        {[
          { n: "Arnold Press", c: "Dumbbell · Shoulders" },
          { n: "Ab Wheel Rollout", c: "Bodyweight · Core" },
          { n: "Assisted Pull-up", c: "Machine · Back" },
        ].map((e, i) => (
          <div key={i} className="row">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-soft)", display: "grid", placeItems: "center", color: "var(--text-3)" }}>
              <Icons.Dumbbell />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{e.n}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>{e.c}</div>
            </div>
            <Icons.ChevronRight />
          </div>
        ))}
      </div>
    </div>
    <TabBar current="exercises" />
  </>
);

// ─────────────────────────────────────────── PROFILE
const Profile = () => (
  <>
    <div className="body scroll">
      {/* Hero */}
      <div style={{
        margin: "-20px -16px 14px",
        padding: "40px 16px 20px",
        background: "linear-gradient(180deg, rgba(0,119,255,0.12), transparent 80%)",
        position: "relative" }}>
        <div style={{ position: "absolute", top: 12, right: 14, display: "flex", gap: 8, color: "var(--text-2)" }}>
          <Icons.Settings />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            display: "grid", placeItems: "center",
            fontSize: 22, fontWeight: 600,
            boxShadow: "0 0 0 2px var(--bg), 0 0 0 3px var(--blue), 0 8px 24px -8px var(--blue-glow)",
            fontFamily: "var(--ff-display)" }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 600 }}>Alex Carter</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
              <span>@alexlifts</span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span>Intermediate</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <span className="chip blue" style={{ padding: "3px 8px", fontSize: 10.5 }}>Lv 12</span>
              <span className="chip amber" style={{ padding: "3px 8px", fontSize: 10.5 }}>42d streak</span>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginTop: 16, borderTop: "1px solid var(--line-soft)", paddingTop: 12 }}>
          {[
            { l: "Workouts", v: "124" },
            { l: "PRs", v: "38" },
            { l: "Hours", v: "168" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", borderLeft: i > 0 ? "1px solid var(--line-soft)" : "none" }}>
              <div className="bignum" style={{ fontSize: 18 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="uppercase-xs" style={{ marginBottom: 6 }}>Training</div>
      <div className="row-list" style={{ marginBottom: 12 }}>
        {[
          { i: Icons.Calendar, l: "My program", s: "Upper/Lower · wk 3 of 8", c: "var(--blue-2)" },
          { i: Icons.Trophy, l: "Records", s: "38 lifetime PRs", c: "var(--amber)" },
          { i: Icons.Target, l: "Goals", s: "2 active", c: "var(--purple)" },
          { i: Icons.Camera, l: "Progress photos", s: "14 photos · 8 wk", c: "var(--green)" },
        ].map((r, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-soft)", color: r.c, display: "grid", placeItems: "center" }}><r.i /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.l}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{r.s}</div>
            </div>
            <Icons.ChevronRight />
          </div>
        ))}
      </div>

      <div className="uppercase-xs" style={{ marginBottom: 6 }}>Recovery</div>
      <div className="row-list" style={{ marginBottom: 12 }}>
        {[
          { i: Icons.Utensils, l: "Nutrition", s: "2,340 cal today", c: "var(--green)" },
          { i: Icons.Moon, l: "Sleep", s: "7h 42m · 82 score", c: "var(--purple)" },
          { i: Icons.Heart, l: "Wellness", s: "RHR 54 · HRV 62", c: "var(--red)" },
        ].map((r, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-soft)", color: r.c, display: "grid", placeItems: "center" }}><r.i /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.l}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{r.s}</div>
            </div>
            <Icons.ChevronRight />
          </div>
        ))}
      </div>

      <div className="uppercase-xs" style={{ marginBottom: 6 }}>Social</div>
      <div className="row-list">
        {[
          { i: Icons.Users, l: "Friends", s: "12 · 3 active now", c: "var(--blue-2)" },
          { i: Icons.Shield, l: "Privacy", s: "Public profile", c: "var(--text-2)" },
        ].map((r, i) => (
          <div key={i} className="row">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-soft)", color: r.c, display: "grid", placeItems: "center" }}><r.i /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.l}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{r.s}</div>
            </div>
            <Icons.ChevronRight />
          </div>
        ))}
      </div>
    </div>
    <TabBar current="profile" />
  </>
);

// ─────────────────────────────────────────── NUTRITION
const Nutrition = () => (
  <>
    <div className="body scroll">
      <TopBar title="Nutrition" right={<div className="back-btn" style={{ marginLeft: 0 }}><Icons.Plus /></div>} />

      {/* Calorie ring */}
      <div className="card" style={{ marginBottom: 10, textAlign: "center", padding: "16px 14px 14px" }}>
        <div className="uppercase-xs" style={{ marginBottom: 12 }}>Today · 2,340 / 2,600 cal</div>
        <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r="58" stroke="var(--bg-3)" strokeWidth="6" fill="none"/>
            <circle cx="70" cy="70" r="58" stroke="var(--green)" strokeWidth="6" fill="none"
              strokeDasharray={2 * Math.PI * 58}
              strokeDashoffset={2 * Math.PI * 58 * (1 - 0.9)}
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 8px var(--green))" }}/>
            {/* inner macro rings */}
            <circle cx="70" cy="70" r="46" stroke="var(--bg-3)" strokeWidth="3" fill="none"/>
            <circle cx="70" cy="70" r="46" stroke="var(--blue)" strokeWidth="3" fill="none"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * (1 - 0.78)}
              strokeLinecap="round" />
            <circle cx="70" cy="70" r="36" stroke="var(--bg-3)" strokeWidth="3" fill="none"/>
            <circle cx="70" cy="70" r="36" stroke="var(--amber)" strokeWidth="3" fill="none"
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={2 * Math.PI * 36 * (1 - 0.62)}
              strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600 }}>Remaining</div>
            <div className="bignum" style={{ fontSize: 26, marginTop: 2 }}>260</div>
            <div style={{ fontSize: 10, color: "var(--text-4)" }}>cal</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 14 }}>
          {[
            { l: "Protein", v: "182", t: "200", c: "var(--blue-2)", bg: "var(--blue)", u: "g" },
            { l: "Carbs", v: "210", t: "260", c: "var(--amber)", bg: "var(--amber)", u: "g" },
            { l: "Fat", v: "64", t: "80", c: "var(--green)", bg: "var(--green)", u: "g" },
          ].map(m => (
            <div key={m.l}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                <span style={{ color: "var(--text-3)" }}>{m.l}</span>
                <span className="num" style={{ color: "var(--text-2)" }}>{m.v}<span style={{ color: "var(--text-4)" }}>/{m.t}{m.u}</span></span>
              </div>
              <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2, marginTop: 4 }}>
                <div style={{ width: (parseInt(m.v) / parseInt(m.t) * 100) + "%", height: "100%", background: m.bg, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meal list */}
      <div className="row-list">
        {[
          { m: "Breakfast", cal: 620, foods: "Oats · Banana · Greek yogurt · Whey", t: "7:24 AM", i: "☀" },
          { m: "Lunch", cal: 840, foods: "Chicken rice bowl · Avocado", t: "12:48 PM", i: "◐" },
          { m: "Snack", cal: 280, foods: "Protein bar · Almonds", t: "3:15 PM", i: "●" },
          { m: "Dinner", cal: 600, foods: "Add meal", t: "—", i: "◑", empty: true },
        ].map((m, i) => (
          <div key={i} className="row" style={{ alignItems: "flex-start", padding: "12px 14px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: m.empty ? "var(--bg-2)" : "var(--green-soft)", color: m.empty ? "var(--text-4)" : "var(--green)", display: "grid", placeItems: "center", fontSize: 13 }}>{m.i}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{m.m}</span>
                <span style={{ fontSize: 9.5, color: "var(--text-4)", fontFamily: "var(--ff-mono)" }}>{m.t}</span>
              </div>
              <div style={{ fontSize: 10.5, color: m.empty ? "var(--text-4)" : "var(--text-3)", marginTop: 2, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{m.foods}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {m.empty ? <div style={{ color: "var(--blue-2)", fontSize: 18 }}>+</div> : (
                <>
                  <div className="bignum" style={{ fontSize: 13 }}>{m.cal}</div>
                  <div style={{ fontSize: 8.5, color: "var(--text-4)", fontFamily: "var(--ff-mono)" }}>cal</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="btn ghost" style={{ marginTop: 12 }}>
        <Icons.Camera /> Scan barcode
      </button>
    </div>
  </>
);

// ─────────────────────────────────────────── SLEEP
const Sleep = () => (
  <>
    <div className="body scroll">
      <TopBar title="Sleep" right={<div style={{ fontSize: 10.5, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, background: "var(--green)", borderRadius: 3, boxShadow: "0 0 4px var(--green)" }} /> Synced</div>} />

      {/* Last night hero */}
      <div style={{
        background: "linear-gradient(180deg, rgba(139,92,246,0.12), rgba(139,92,246,0.02) 80%)",
        border: "1px solid rgba(139,92,246,0.25)",
        borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="uppercase-xs" style={{ color: "var(--purple)" }}>Last night</div>
          <span style={{ fontSize: 10, color: "var(--text-4)" }}>Sat → Sun</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 4 }}>
          <span className="bignum num" style={{ fontSize: 36 }}>7:42</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>hr</span>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="bignum" style={{ fontSize: 22, color: "var(--purple)" }}>82</div>
            <div style={{ fontSize: 9, color: "var(--text-4)", fontFamily: "var(--ff-mono)" }}>score</div>
          </div>
        </div>

        {/* Hypnogram */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-4)", fontFamily: "var(--ff-mono)", marginBottom: 4 }}>
            <span>23:20</span><span>02:00</span><span>04:40</span><span>07:00</span>
          </div>
          <svg width="100%" height="64" viewBox="0 0 260 64" preserveAspectRatio="none" style={{ display: "block" }}>
            {/* Stage rows: Awake=8, REM=22, Light=40, Deep=56 */}
            {[
              { x: 0, w: 10, y: 8 }, { x: 10, w: 30, y: 40 }, { x: 40, w: 20, y: 56 },
              { x: 60, w: 25, y: 40 }, { x: 85, w: 20, y: 22 }, { x: 105, w: 15, y: 40 },
              { x: 120, w: 18, y: 56 }, { x: 138, w: 28, y: 40 }, { x: 166, w: 22, y: 22 },
              { x: 188, w: 14, y: 40 }, { x: 202, w: 4, y: 8 }, { x: 206, w: 22, y: 40 },
              { x: 228, w: 16, y: 22 }, { x: 244, w: 16, y: 40 },
            ].map((b, i, a) => {
              const prev = i > 0 ? a[i - 1] : null;
              return <g key={i}>
                <rect x={b.x} y={b.y - 2} width={b.w} height="4" rx="1" fill={
                  b.y === 8 ? "var(--red)" : b.y === 22 ? "var(--purple)" : b.y === 40 ? "var(--blue-2)" : "#1E40AF"
                }/>
                {prev && <line x1={b.x} y1={prev.y} x2={b.x} y2={b.y} stroke="var(--line)" strokeWidth="1"/>}
              </g>;
            })}
            {["Awake", "REM", "Light", "Deep"].map((l, i) => (
              <text key={l} x="0" y={[8, 22, 40, 56][i] + 3} fontSize="7" fill="var(--text-4)" fontFamily="var(--ff-mono)">{l}</text>
            ))}
          </svg>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 10 }}>
          {[
            { l: "Deep", v: "1:12", c: "#1E40AF" },
            { l: "REM", v: "1:48", c: "var(--purple)" },
            { l: "Light", v: "4:22", c: "var(--blue-2)" },
            { l: "Awake", v: "0:20", c: "var(--red)" },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 9, color: "var(--text-4)", display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 5, height: 5, background: s.c, borderRadius: 1 }} /> {s.l}
              </div>
              <div className="num" style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Biometrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="uppercase-xs">Resting HR</div>
            <Icons.Heart />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 4 }}>
            <span className="bignum" style={{ fontSize: 22, color: "var(--red)" }}>54</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>bpm</span>
          </div>
          <Spark data={[58, 56, 55, 57, 55, 54, 54]} height={22} color="var(--red)" strokeWidth="1.4" />
        </div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="uppercase-xs">HRV</div>
            <Icons.Activity />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 4 }}>
            <span className="bignum" style={{ fontSize: 22, color: "var(--green)" }}>62</span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>ms</span>
          </div>
          <Spark data={[48, 52, 55, 58, 60, 61, 62]} height={22} color="var(--green)" strokeWidth="1.4" />
        </div>
      </div>

      {/* Weekly sleep bars */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="uppercase-xs">7-day sleep</div>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>Avg <span className="num" style={{ color: "var(--text)" }}>7:18</span></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, alignItems: "end", height: 80 }}>
          {[6.8, 7.2, 8.1, 6.4, 7.9, 8.3, 7.7].map((h, i) => {
            const pct = (h / 9) * 100;
            return <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: pct + "%", background: i === 6 ? "var(--purple)" : "var(--bg-3)", borderRadius: "3px 3px 0 0", position: "relative" }}>
                {i === 6 && <div style={{ position: "absolute", inset: 0, boxShadow: "0 0 8px rgba(139,92,246,.4)", borderRadius: "3px 3px 0 0" }} />}
              </div>
              <div style={{ fontSize: 8.5, color: i === 6 ? "var(--text-2)" : "var(--text-4)", fontFamily: "var(--ff-mono)" }}>{["M", "T", "W", "T", "F", "S", "S"][i]}</div>
            </div>;
          })}
        </div>
      </div>
    </div>
  </>
);

Object.assign(window, { Exercises, Profile, Nutrition, Sleep });
