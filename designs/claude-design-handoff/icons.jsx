// Minimal icon set — lucide-style line icons
const I = ({ d, children, stroke = 1.6, size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Logo: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="11" width="3" height="10" rx="1" fill="#0077FF"/>
      <rect x="27" y="11" width="3" height="10" rx="1" fill="#22C55E"/>
      <rect x="5.5" y="13.5" width="2" height="5" rx=".5" fill="#3391FF"/>
      <rect x="24.5" y="13.5" width="2" height="5" rx=".5" fill="#4ADE80"/>
      <path d="M7 16 L11 16 L13.5 10.5 L16 21 L18.5 13 L21 17 L25 16"
        stroke="#3391FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  Home: () => <I d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  Dumbbell: () => <I><path d="M6.5 6.5 17.5 17.5"/><path d="M3 10v4"/><path d="M21 10v4"/><path d="M5 8v8"/><path d="M19 8v8"/><path d="M7 6.5 10.5 3"/><path d="M17 17.5 13.5 21"/></I>,
  Chart: () => <I><path d="M3 3v18h18"/><path d="M7 15l3-3 3 2 4-6"/></I>,
  User: () => <I><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></I>,
  Users: () => <I><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>,
  Plus: () => <I d="M12 5v14M5 12h14" />,
  Play: () => <I d="M6 4 20 12 6 20z" fill="currentColor" stroke="none" />,
  Pause: () => <I><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></I>,
  Search: () => <I><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>,
  Clock: () => <I><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  Check: () => <I d="M4 12l5 5L20 6" />,
  ChevronRight: () => <I d="m9 6 6 6-6 6" />,
  ChevronLeft: () => <I d="m15 6-6 6 6 6" />,
  ChevronDown: () => <I d="m6 9 6 6 6-6" />,
  Arrow: () => <I d="M4 12h16M13 5l7 7-7 7" />,
  ArrowUp: () => <I d="M12 19V5M5 12l7-7 7 7" />,
  ArrowDown: () => <I d="M12 5v14M5 12l7 7 7-7" />,
  More: () => <I><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></I>,
  Trophy: () => <I><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 4h3v3a3 3 0 0 1-3 3"/><path d="M7 4H4v3a3 3 0 0 0 3 3"/></I>,
  Flame: () => <I d="M8.5 14.5A2.5 2.5 0 0 0 11 17a7 7 0 0 0 0-14c2 2 3 5 2 7a5.5 5.5 0 0 1-5.5 5.5"/>,
  Heart: () => <I d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
  HeartFill: () => <I d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" fill="currentColor" />,
  Route: () => <I><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v-1"/></I>,
  TrendUp: () => <I d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
  Bell: () => <I><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></I>,
  Settings: () => <I><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></I>,
  Target: () => <I><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></I>,
  Apple: () => <I d="M12 2a3 3 0 0 0-3 3M5 10c0-3 2-5 5-5 2 0 3 1 4 1s2-1 4-1c2 0 4 1 4 4 0 6-4 11-7 11-1 0-2-1-3-1s-2 1-3 1c-3 0-7-5-7-11 0-3 1-4 3-4z" />,
  Google: () => <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M22 12a10 10 0 1 1-3-7l-3 3a6 6 0 1 0-1 9 5 5 0 0 0 3-4h-5v-4h10c.7 2 0 3 0 3z"/></svg>,
  Eye: () => <I><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></I>,
  X: () => <I d="M6 6l12 12M18 6 6 18" />,
  Minus: () => <I d="M5 12h14" />,
  Bolt: () => <I d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none" />,
  Camera: () => <I><path d="M3 8h4l2-3h6l2 3h4v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></I>,
  Utensils: () => <I d="M3 2v7a3 3 0 0 0 3 3v10M7 2v7M17 2c-2 0-4 3-4 7v4h4v9M17 2v20"/>,
  Moon: () => <I d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
  Calendar: () => <I><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></I>,
  Link: () => <I><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></I>,
  Filter: () => <I d="M3 5h18l-7 8v6l-4 2v-8z"/>,
  Edit: () => <I d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/>,
  Trash: () => <I><path d="M4 6h16M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></I>,
  Activity: () => <I d="M3 12h4l3-9 4 18 3-9h4"/>,
  Zap: () => <I d="M13 2 4 14h7l-1 8 9-12h-7z"/>,
  Star: () => <I d="M12 2l3 7 7 .9-5.2 4.8 1.6 7.3L12 18l-6.4 4 1.6-7.3L2 9.9 9 9z" fill="currentColor" stroke="none"/>,
  Shield: () => <I d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5z"/>,
  Message: () => <I d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 5V5z"/>,
  Bluetooth: () => <I d="M7 7l10 10L12 22V2l5 5L7 17"/>,
  Wifi: () => <I><path d="M12 19v.01"/><path d="M8 15a5 5 0 0 1 8 0"/><path d="M4 11a10 10 0 0 1 16 0"/></I>,
};

window.Icons = Icons;
