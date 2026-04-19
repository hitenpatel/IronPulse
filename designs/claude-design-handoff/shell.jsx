// Phone shell primitives (Android)
const { useState } = React;

// Android status bar
const StatusBar = ({ time = "9:41" }) => (
  <div className="sb">
    <span className="sb-left num">{time}</span>
    <div style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)" }}>
      {/* punch-hole camera */}
      <div style={{ width: 10, height: 10, background: "#000", borderRadius: "50%", boxShadow: "0 0 0 1px #1a2230" }} />
    </div>
    <div className="sb-right">
      {/* Signal */}
      <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="7" width="1.6" height="3" rx=".3"/><rect x="2.6" y="5" width="1.6" height="5" rx=".3"/><rect x="5.2" y="3" width="1.6" height="7" rx=".3"/><rect x="7.8" y="1" width="1.6" height="9" rx=".3"/></svg>
      {/* Wifi */}
      <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><path d="M6 8a.9.9 0 1 1 0 1.8A.9.9 0 0 1 6 8zm0-3a3 3 0 0 1 3 3l-1.2-.2A1.8 1.8 0 0 0 6 6.2 1.8 1.8 0 0 0 4.2 7.8L3 8a3 3 0 0 1 3-3zm0-3a6 6 0 0 1 6 6l-1.2-.2A4.8 4.8 0 0 0 6 3.2 4.8 4.8 0 0 0 1.2 7.8L0 8a6 6 0 0 1 6-6z"/></svg>
      {/* Battery */}
      <svg width="18" height="9" viewBox="0 0 18 9" fill="none" stroke="currentColor" strokeWidth="1"><rect x=".5" y=".5" width="15" height="8" rx="1.6"/><rect x="2" y="2" width="11" height="5" rx=".6" fill="currentColor" stroke="none"/><rect x="16.5" y="3" width="1.2" height="3" rx=".4" fill="currentColor" stroke="none"/></svg>
    </div>
  </div>
);

// Phone — wraps screen content with status bar (top) and gesture pill (bottom)
const Phone = ({ children, size = "sm", time = "9:41", statusBar = true }) => (
  <div className={`phone ${size === "lg" ? "lg" : ""}`}>
    <div className="phone-screen">
      {statusBar && <StatusBar time={time} />}
      {children}
    </div>
  </div>
);

// Tab bar — Android bottom nav
const TabBar = ({ current = "home" }) => {
  const tabs = [
    { k: "home", l: "Home", i: Icons.Home },
    { k: "stats", l: "Stats", i: Icons.Chart },
    { k: "add", fab: true },
    { k: "exercises", l: "Exercises", i: Icons.Dumbbell },
    { k: "profile", l: "Profile", i: Icons.User },
  ];
  return (
    <>
      <div className="tabs">
        {tabs.map(t => t.fab ? (
          <div key={t.k} className="tab-fab"><Icons.Plus /></div>
        ) : (
          <div key={t.k} className={`tab-item ${current === t.k ? "active" : ""}`}>
            <t.i />
            <span>{t.l}</span>
          </div>
        ))}
      </div>
      <div className="gesture-pill" />
    </>
  );
};

// Screen caption (under the phone)
const PhoneCell = ({ label, tag, size = "sm", time, children, statusBar = true }) => (
  <div className="phone-cell">
    <Phone size={size} time={time} statusBar={statusBar}>{children}</Phone>
    <div className="phone-caption">
      <b>{label}</b>
      <span>{tag}</span>
    </div>
  </div>
);

// Back button + title bar
const TopBar = ({ title, back = true, right }) => (
  <div className="page-hd with-back" style={{ padding: back ? "4px 0 12px" : undefined }}>
    {back && <div className="back-btn"><Icons.ChevronLeft /></div>}
    <h1 style={{ fontSize: back ? 18 : 22, flex: 1 }}>{title}</h1>
    {right}
  </div>
);

// Sparkline
const Spark = ({ data, color = "var(--blue)", height = 32, fill = true, strokeWidth = 1.6 }) => {
  const w = 120, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (w - 2) + 1,
    h - 2 - ((v - min) / range) * (h - 4),
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  const area = `${d} L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
  const id = "s" + Math.random().toString(36).slice(2, 8);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

Object.assign(window, { Phone, PhoneCell, StatusBar, TabBar, TopBar, Spark });
