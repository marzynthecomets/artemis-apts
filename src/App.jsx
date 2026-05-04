import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}

// Drop legacy hand-rolled session key so existing users land on the SDK's storage cleanly.
localStorage.removeItem("sb_session");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================
// ICONS (SVG)
// ============================================
const icons = {
  realtor: (size = 24, fill = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  link: (size = 24, fill = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  map: (size = 24, fill = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  calendar: (size = 24, fill = "#fff") => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  chevronDown: (size = 14) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  kebab: () => (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--navy)" }} />
      ))}
    </div>
  ),
  edit: (size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  ),
  menu: (size = 24) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (size = 20) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  minus: () => <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1, color: "var(--navy)" }}>—</span>,
  plus: () => <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1, color: "var(--navy)" }}>+</span>,
  copy: (size = 18) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

function formatBedrooms(n) {
  if (n == null) return "—";
  if (n === 0) return "Studio";
  return `${n} bed`;
}

function IconCircle({ icon, bg = "var(--navy)", size = 38, iconSize = 20 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: `1px solid var(--navy)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icons[icon]?.(iconSize, "#fff")}
    </div>
  );
}

// ============================================
// STATUS COLORS
// ============================================
const STATUS_STYLES = {
  Interested: { bg: "#ffffff", border: "#000", color: "#000" },
  Contacted: { bg: "#ffffff", border: "#000", color: "#000" },
  Scheduled: { bg: "#e8f5e0", border: "#4a7c2e", color: "#2d5016" },
  Toured: { bg: "#f5ecd7", border: "#8b7642", color: "#5a4a20" },
};

// ============================================
// POPOVER COMPONENT
// ============================================
function Popover({ children, isOpen, onClose, style = {} }) {
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          borderRadius: 12,
          padding: "28px 32px",
          minWidth: 280,
          maxWidth: "90vw",
          ...style,
        }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: style.color || "#fff" }}>
          {icons.close(20)}
        </button>
        {children}
      </div>
    </>
  );
}

// ============================================
// DATE/TIME PICKER POPOVER
// ============================================
function DateTimePopover({ isOpen, onClose, onSubmit, title = "Schedule showing", initialDate = "", initialTime = "" }) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
      setTime(initialTime);
      setError("");
    }
  }, [isOpen, initialDate, initialTime]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!date || !time) {
      setError("Pick a date and a time.");
      return;
    }
    onSubmit(date, time);
  }

  return (
    <Popover isOpen={isOpen} onClose={onClose} style={{ background: "#fff", color: "#000", border: "2px solid #FF8C20" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <IconCircle icon="calendar" bg="#FF8C20" size={38} iconSize={20} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: "var(--navy)" }}>{title}</span>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#555" }}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontFamily: "inherit", fontSize: 15 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#555" }}>
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontFamily: "inherit", fontSize: 15 }} />
        </label>
        {error && <p style={{ color: "#c33", fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" style={{ marginTop: 6, padding: "10px 20px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          Save
        </button>
      </form>
    </Popover>
  );
}

// ============================================
// CONFIRMATION DIALOG
// ============================================
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Delete", danger = true }) {
  return (
    <Popover isOpen={isOpen} onClose={onClose} style={{ background: "#fff", color: "#000", border: `2px solid ${danger ? "#c33" : "#FF8C20"}` }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--navy)", marginBottom: 8 }}>{title}</div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#333", margin: "0 0 18px" }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "8px 18px", background: "transparent", color: "var(--navy)", border: "1px solid var(--navy)", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{ padding: "8px 18px", background: danger ? "#c33" : "var(--navy)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {confirmLabel}
        </button>
      </div>
    </Popover>
  );
}

// ============================================
// STATUS DROPDOWN
// ============================================
function StatusDropdown({ value, onChange, showSchedule = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const s = STATUS_STYLES[value] || STATUS_STYLES.Interested;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const options = ["Interested", "Contacted", ...(showSchedule ? ["Schedule?"] : []), "Toured", "Remove?"];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 12px",
          borderRadius: 63,
          border: `1px solid ${s.border}`,
          background: s.bg,
          color: s.color,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: "clamp(13px, 2vw, 16px)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {value} {icons.chevronDown(12)}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: "8px 0",
            zIndex: 50,
            minWidth: 140,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {options
            .filter((o) => o !== value)
            .map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  setOpen(false);
                  onChange(opt);
                }}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: opt === "Remove?" ? "#a33" : "#000",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.target.style.background = "transparent")}
              >
                {opt}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMMUTE CHIP
// ============================================
function CommuteChip({ name, listingAddress, destAddress }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(listingAddress)}&destination=${encodeURIComponent(destAddress)}&travelmode=transit`;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 12px",
        borderRadius: 63,
        border: "0.5px solid #000",
        background: "#fff",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "clamp(12px, 1.8vw, 15px)",
        textDecoration: "none",
        color: "#000",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{ fontWeight: 300, opacity: 0.6 }}>↗</span>
    </a>
  );
}

// ============================================
// LISTING ITEM COMPONENT
// ============================================
// ============================================
// REQUIREMENTS UI (group mode)
// ============================================
function ScorecardPill({ met, total }) {
  if (total === 0) return null;
  const ratio = met / total;
  const bg = ratio === 1 ? "#e8f5e0" : ratio >= 0.5 ? "var(--bg)" : "#f5f5f5";
  const border = ratio === 1 ? "#4a7c2e" : "#888";
  const color = ratio === 1 ? "#2d5016" : "#000";
  return (
    <span
      title={`${met} of ${total} requirements met`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 63,
        border: `0.5px solid ${border}`,
        background: bg,
        color,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "clamp(12px, 1.8vw, 14px)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {met}/{total}
    </span>
  );
}

function RequirementsBlock({ listing, requirements, listingRequirements, onToggle }) {
  const [open, setOpen] = useState(false);
  if (requirements.length === 0) return null;

  const rowsForListing = listingRequirements.filter((r) => r.listing_id === listing.id);
  const metCount = rowsForListing.filter((r) => r.met).length;

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--navy)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s" }}>▶</span>
        Requirements <ScorecardPill met={metCount} total={requirements.length} />
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: "10px 14px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {requirements.map((req) => {
            const row = rowsForListing.find((r) => r.requirement_id === req.id);
            const met = !!row?.met;
            return (
              <label key={req.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={met}
                  onChange={(e) => onToggle(listing.id, req.id, e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <span style={{ textDecoration: met ? "none" : "none", color: met ? "#000" : "#333" }}>{req.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListingItem({ listing, destinations, onStatusChange, onDelete, isMobile, requirements = [], listingRequirements = [], onToggleRequirement }) {
  const [realtorOpen, setRealtorOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notesText, setNotesText] = useState(listing.notes || "");

  async function saveNotes() {
    await supabase.from("listings").update({ notes: notesText }).eq("id", listing.id);
    setNotesOpen(false);
  }

  function handleStatusChange(newStatus) {
    if (newStatus === "Remove?") {
      setConfirmOpen(true);
    } else if (newStatus === "Schedule?") {
      setScheduleOpen(true);
    } else {
      onStatusChange(listing.id, newStatus);
    }
  }

  function handleScheduleSubmit(date, time) {
    setScheduleOpen(false);
    onStatusChange(listing.id, "Scheduled", date, time);
  }

  function handleConfirmDelete() {
    setConfirmOpen(false);
    onDelete(listing.id);
  }


  if (isMobile) {
    return (
      <div style={{ borderTop: "1px solid #000", paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {listing.status === "Toured" && (
            <button onClick={() => setNotesOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <IconCircle icon="edit" bg="transparent" size={32} iconSize={20} />
            </button>
          )}
          <StatusDropdown value={listing.status} onChange={handleStatusChange} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setRealtorOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <IconCircle icon="realtor" size={30} iconSize={18} />
            </button>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {listing.address || "No address"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={listing.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
              <IconCircle icon="link" size={30} iconSize={16} />
            </a>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18 }}>${listing.price?.toLocaleString() || "—"}</span>
            <span style={{ borderLeft: "1px solid #000", paddingLeft: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 18 }}>
              {formatBedrooms(listing.bedrooms)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address || "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0 }}
          >
            <IconCircle icon="map" size={30} iconSize={16} />
          </a>
          {destinations.map((dest) => (
            <CommuteChip
              key={dest.id}
              name={dest.name}
              listingAddress={listing.address || ""}
              destAddress={dest.address || ""}
            />
          ))}
        </div>
        <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
        <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
      <RealtorPopover listing={listing} isOpen={realtorOpen} onClose={() => setRealtorOpen(false)} />
        <NotesPopover notes={notesText} setNotes={setNotesText} isOpen={notesOpen} onClose={() => setNotesOpen(false)} onSave={saveNotes} />
        <DateTimePopover isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} onSubmit={handleScheduleSubmit} title="Schedule showing" />
        <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Remove listing?" message={`Remove the listing at ${listing.address || "this address"}? This can't be undone.`} confirmLabel="Remove" />
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ borderTop: "1px solid #000", padding: "18px 0", display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {listing.status === "Toured" && (
          <button onClick={() => setNotesOpen(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <IconCircle icon="edit" bg="transparent" size={34} iconSize={18} />
          </button>
        )}
        <StatusDropdown value={listing.status} onChange={handleStatusChange} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={() => setRealtorOpen(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <IconCircle icon="realtor" size={38} iconSize={20} />
        </button>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            width: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.address || "No address"}
        </span>
      </div>
      <div style={{ borderLeft: "1px solid #000", paddingLeft: 16, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <a href={listing.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          <IconCircle icon="link" size={38} iconSize={18} />
        </a>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, width: 80 }}>${listing.price?.toLocaleString() || "—"}</span>
      </div>
      <div style={{ borderLeft: "1px solid #000", paddingLeft: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 20, width: 65, flexShrink: 0 }}>
        {formatBedrooms(listing.bedrooms)}
      </div>
      <div style={{ borderLeft: "1px solid #000", paddingLeft: 16, display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flexShrink: 0 }}
        >
          <IconCircle icon="map" size={38} iconSize={18} />
        </a>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {destinations.map((dest) => (
            <CommuteChip
              key={dest.id}
              name={dest.name}
              listingAddress={listing.address || ""}
              destAddress={dest.address || ""}
            />
          ))}
        </div>
      </div>
      <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
      <RealtorPopover listing={listing} isOpen={realtorOpen} onClose={() => setRealtorOpen(false)} />
      <NotesPopover notes={notesText} setNotes={setNotesText} isOpen={notesOpen} onClose={() => setNotesOpen(false)} onSave={saveNotes} />
      <DateTimePopover isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} onSubmit={handleScheduleSubmit} title="Schedule showing" />
      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Remove listing?" message={`Remove the listing at ${listing.address || "this address"}? This can't be undone.`} confirmLabel="Remove" />
    </div>
  );
}

// ============================================
// SHOWING ITEM COMPONENT
// ============================================
function ShowingItem({ listing, destinations, onKebabAction, onReschedule, onDelete, isMobile, requirements = [], listingRequirements = [], onToggleRequirement }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [realtorOpen, setRealtorOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notesText, setNotesText] = useState(listing.notes || "");
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function saveNotes() {
    await supabase.from("listings").update({ notes: notesText }).eq("id", listing.id);
    setNotesOpen(false);
  }

  function handleRescheduleSubmit(date, time) {
    setRescheduleOpen(false);
    onReschedule(listing.id, date, time);
  }

  function handleConfirmDelete() {
    setConfirmOpen(false);
    onDelete(listing.id);
  }

  const showingDate = listing.showing_date ? new Date(listing.showing_date + "T00:00:00") : null;
  const dateStr = showingDate
    ? showingDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "TBD";
  const timeStr = listing.showing_time
    ? new Date("2000-01-01T" + listing.showing_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";


  const kebabMenu = (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
        {icons.kebab()}
      </button>
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: "14px 20px",
            zIndex: 50,
            minWidth: 170,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <button onClick={() => { setMenuOpen(false); setNotesOpen(true); }} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer" }}>
            {icons.close(16)}
          </button>
          {["Add Notes", "Reschedule", "Cancel", "Delete Listing?"].map((action) => (
            <div
              key={action}
              onClick={() => {
                setMenuOpen(false);
                if (action === "Add Notes") setNotesOpen(true);
                else if (action === "Reschedule") setRescheduleOpen(true);
                else if (action === "Delete Listing?") setConfirmOpen(true);
                else onKebabAction(listing.id, action);
              }}
              style={{
                padding: "8px 0",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                fontWeight: action === "Add Notes" ? 700 : 400,
                color: action === "Delete Listing?" ? "#a33" : "#000",
              }}
              onMouseEnter={(e) => (e.target.style.opacity = 0.7)}
              onMouseLeave={(e) => (e.target.style.opacity = 1)}
            >
              {action}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ borderTop: "1px solid #000", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 0 }}>{kebabMenu}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconCircle icon="calendar" bg="#FF8C20" size={42} iconSize={22} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>{dateStr}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>{timeStr}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setRealtorOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <IconCircle icon="realtor" size={30} iconSize={18} />
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {listing.address || "No address"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={listing.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
              <IconCircle icon="link" size={30} iconSize={16} />
            </a>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>${listing.price?.toLocaleString() || "—"}</span>
            <span style={{ borderLeft: "1px solid #000", paddingLeft: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>
              {formatBedrooms(listing.bedrooms)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address || "")}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
            <IconCircle icon="map" size={30} iconSize={16} />
          </a>
          {destinations.map((dest) => (
            <CommuteChip key={dest.id} name={dest.name} listingAddress={listing.address || ""} destAddress={dest.address || ""} />
          ))}
        </div>
        <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
        <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
      <RealtorPopover listing={listing} isOpen={realtorOpen} onClose={() => setRealtorOpen(false)} />
        <NotesPopover notes={notesText} setNotes={setNotesText} isOpen={notesOpen} onClose={() => setNotesOpen(false)} onSave={saveNotes} />
        <DateTimePopover isOpen={rescheduleOpen} onClose={() => setRescheduleOpen(false)} onSubmit={handleRescheduleSubmit} title="Reschedule showing" initialDate={listing.showing_date || ""} initialTime={listing.showing_time || ""} />
        <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Delete listing?" message={`Delete the listing at ${listing.address || "this address"}? This can't be undone.`} confirmLabel="Delete" />
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ borderTop: "1px solid #000", padding: "20px 0", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 0 }}>{kebabMenu}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <IconCircle icon="calendar" bg="#FF8C20" size={38} iconSize={20} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26 }}>{dateStr}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26 }}>{timeStr}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setRealtorOpen(true)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <IconCircle icon="realtor" size={38} iconSize={20} />
            </button>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, width: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {listing.address || "No address"}
            </span>
          </div>
          <div style={{ borderLeft: "1px solid #000", paddingLeft: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <a href={listing.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
              <IconCircle icon="link" size={38} iconSize={18} />
            </a>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, width: 80 }}>${listing.price?.toLocaleString() || "—"}</span>
          </div>
          <div style={{ borderLeft: "1px solid #000", paddingLeft: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 20, width: 65 }}>
            {formatBedrooms(listing.bedrooms)}
          </div>
          <div style={{ borderLeft: "1px solid #000", paddingLeft: 16, display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address || "")}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
              <IconCircle icon="map" size={38} iconSize={18} />
            </a>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {destinations.map((dest) => (
                <CommuteChip key={dest.id} name={dest.name} listingAddress={listing.address || ""} destAddress={dest.address || ""} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <RequirementsBlock listing={listing} requirements={requirements} listingRequirements={listingRequirements} onToggle={onToggleRequirement} />
      <RealtorPopover listing={listing} isOpen={realtorOpen} onClose={() => setRealtorOpen(false)} />
      <NotesPopover notes={notesText} setNotes={setNotesText} isOpen={notesOpen} onClose={() => setNotesOpen(false)} onSave={saveNotes} />
      <DateTimePopover isOpen={rescheduleOpen} onClose={() => setRescheduleOpen(false)} onSubmit={handleRescheduleSubmit} title="Reschedule showing" initialDate={listing.showing_date || ""} initialTime={listing.showing_time || ""} />
      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Delete listing?" message={`Delete the listing at ${listing.address || "this address"}? This can't be undone.`} confirmLabel="Delete" />
    </div>
  );
}

// ============================================
// REALTOR POPOVER
// ============================================
function RealtorPopover({ listing, isOpen, onClose }) {
  async function copyText(text) {
    await navigator.clipboard.writeText(text);
  }
  return (
    <Popover isOpen={isOpen} onClose={onClose} style={{ background: "var(--navy)", color: "#fff", border: "2px solid #FF8C20" }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Realtor</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 16 }}>
        {listing.realtor_name || "No name"}
      </div>
      {listing.realtor_contact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {listing.realtor_contact.includes("@") ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => copyText(listing.realtor_contact)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
                {icons.copy(18)}
              </button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17 }}>{listing.realtor_contact}</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => copyText(listing.realtor_contact)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff" }}>
                {icons.copy(18)}
              </button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17 }}>{listing.realtor_contact}</span>
            </div>
          )}
        </div>
      )}
    </Popover>
  );
}

// ============================================
// NOTES POPOVER
// ============================================
function NotesPopover({ notes, setNotes, isOpen, onClose, onSave }) {
  return (
    <Popover isOpen={isOpen} onClose={onClose} style={{ background: "#fff", color: "#000", border: "2px solid #FF8C20" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {icons.edit(22)}
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: "var(--navy)" }}>Notes</span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={4000}
        style={{
          width: "100%",
          minHeight: 160,
          padding: 14,
          borderRadius: 8,
          border: "1px solid #ccc",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          resize: "vertical",
          boxSizing: "border-box",
        }}
        placeholder="How was the tour? What stood out?"
      />
      <button
        onClick={onSave}
        style={{
          marginTop: 10,
          padding: "8px 20px",
          background: "var(--navy)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Save notes
      </button>
    </Popover>
  );
}

// ============================================
// SORT DROPDOWN
// ============================================
function SortDropdown({ value, onChange, options, isMobile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: isMobile ? "4px 12px" : "8px 16px",
          borderRadius: 63,
          background: "var(--orange)",
          color: "#000",
          border: "none",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: isMobile ? 12 : 15,
          cursor: "pointer",
        }}
      >
        {value} {icons.chevronDown(12)}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: "6px 0", zIndex: 50, minWidth: 130, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: "7px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: opt === value ? 700 : 400 }}
              onMouseEnter={(e) => (e.target.style.background = "#f5f5f5")}
              onMouseLeave={(e) => (e.target.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// AUTH SCREEN
// ============================================
function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "reset") {
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email: trimmedEmail, password });
        if (err) throw err;
        if (data.session) onAuth(data.user);
        else setInfo("Check your email to confirm your account, then sign in.");
      } else if (mode === "reset") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setInfo("If an account exists for that email, a reset link is on the way.");
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (err) throw err;
        onAuth(data.user);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const titleByMode = { signin: "Sign in to track listings", signup: "Create your account", reset: "Reset your password" };
  const ctaByMode = { signin: "Sign in", signup: "Sign up", reset: "Send reset link" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 360, border: "1px solid #ddd" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28, color: "var(--navy)", margin: "0 0 4px" }}>ArtemisApts</h1>
        <p style={{ color: "#666", fontSize: 14, margin: "0 0 24px" }}>{titleByMode[mode]}</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" autoComplete="email" placeholder="Email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, fontFamily: "inherit" }} />
          {mode !== "reset" && (
            <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Password" minLength={6} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 14, fontFamily: "inherit" }} />
          )}
          <button type="submit" disabled={loading} style={{ padding: "10px", borderRadius: 8, background: "var(--navy)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "..." : ctaByMode[mode]}
          </button>
        </form>
        {error && <p style={{ color: "#c33", fontSize: 13, marginTop: 10 }}>{error}</p>}
        {info && <p style={{ color: "var(--navy)", fontSize: 13, marginTop: 10 }}>{info}</p>}
        {mode === "signin" && (
          <p style={{ textAlign: "right", fontSize: 13, marginTop: 10 }}>
            <span onClick={() => switchMode("reset")} style={{ color: "var(--navy)", cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>
          </p>
        )}
        <p style={{ textAlign: "center", fontSize: 13, marginTop: 16, color: "#666" }}>
          {mode === "signin" && (<>No account? <span onClick={() => switchMode("signup")} style={{ color: "var(--navy)", cursor: "pointer", fontWeight: 600 }}>Sign up</span></>)}
          {mode === "signup" && (<>Already have one? <span onClick={() => switchMode("signin")} style={{ color: "var(--navy)", cursor: "pointer", fontWeight: 600 }}>Sign in</span></>)}
          {mode === "reset" && (<>Remembered it? <span onClick={() => switchMode("signin")} style={{ color: "var(--navy)", cursor: "pointer", fontWeight: 600 }}>Sign in</span></>)}
        </p>
      </div>
    </div>
  );
}

// ============================================
// GROUPS SECTION (inside Settings)
// ============================================
function GroupsSection({ user, groups, pendingInvites, onAcceptInvite, onDeclineInvite, onGroupsChange, onSwitchView }) {
  const [newGroupName, setNewGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [managingGroupId, setManagingGroupId] = useState(null);

  async function createGroup() {
    setError("");
    const name = newGroupName.trim();
    if (!name) {
      setError("Name your group.");
      return;
    }
    if (name.length > 100) {
      setError("Group name must be 100 characters or fewer.");
      return;
    }
    setBusy(true);
    try {
      // Read the live session user id directly so we never insert a stale id
      // from React state (which can lag behind a token refresh).
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      const createdBy = liveUser?.id;
      if (!createdBy) throw new Error("Not signed in.");
      const { data: groupRows, error: gErr } = await supabase
        .from("groups").insert([{ name, created_by: createdBy }]).select();
      if (gErr) throw gErr;
      const group = groupRows?.[0];
      if (!group) throw new Error("Group create failed.");
      // Add creator as the active owner member.
      const { error: mErr } = await supabase.from("group_members").insert([
        { group_id: group.id, user_id: createdBy, role: "owner", status: "active" },
      ]);
      if (mErr) throw mErr;
      setNewGroupName("");
      await onGroupsChange();
      onSwitchView({ id: group.id, name: group.name });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, margin: "0 0 14px" }}>Groups</h3>

      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--navy)", fontWeight: 600, marginBottom: 6 }}>Pending invites</p>
          {pendingInvites.map((inv) => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", border: "1px solid var(--orange)", borderRadius: 8, marginBottom: 8, background: "#fff" }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>{inv.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#666" }}>
                  Members can see all shared listings, addresses, showings, and realtor contacts. They can also edit or delete shared listings.
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => onAcceptInvite(inv.id)} style={{ padding: "6px 14px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>Accept</button>
                <button onClick={() => onDeclineInvite(inv.id)} style={{ padding: "6px 14px", background: "transparent", color: "#a33", border: "1px solid #a33", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.id} style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 8, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>{g.name}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#888" }}>{g.role === "owner" ? "Owner" : "Member"}</div>
            </div>
            <button onClick={() => setManagingGroupId(managingGroupId === g.id ? null : g.id)} style={{ padding: "6px 12px", background: "transparent", color: "var(--navy)", border: "1px solid var(--navy)", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>
              {managingGroupId === g.id ? "Close" : "Manage"}
            </button>
          </div>
          {managingGroupId === g.id && (
            <GroupManager group={g} user={user} onGroupsChange={onGroupsChange} />
          )}
        </div>
      ))}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Group name (e.g. Roommate hunt)"
          maxLength={100}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}
        />
        {error && <p style={{ color: "#c33", fontSize: 13, margin: 0 }}>{error}</p>}
        <button onClick={createGroup} disabled={busy} style={{ padding: "8px 16px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1, alignSelf: "flex-start" }}>
          + Create group
        </button>
      </div>
    </div>
  );
}

// Per-group management: invite by email, manage requirements, leave/delete.
function GroupManager({ group, user, onGroupsChange }) {
  const [members, setMembers] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newReq, setNewReq] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = group.role === "owner";

  async function fetchMembers() {
    const { data } = await supabase
      .from("group_members")
      .select("id, user_id, role, status")
      .eq("group_id", group.id);
    setMembers(data ?? []);
  }
  async function fetchReqs() {
    const { data } = await supabase
      .from("requirements")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true });
    setReqs(data ?? []);
  }

  useEffect(() => {
    fetchMembers();
    fetchReqs();
  }, [group.id]);

  async function invite() {
    setError("");
    setInfo("");
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.rpc("invite_user_to_group", {
      p_group_id: group.id,
      p_email: email,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    setInviteEmail("");
    setInfo("Invited. They'll see the invite next time they sign in.");
    fetchMembers();
  }

  async function addRequirement() {
    setError("");
    const name = newReq.trim();
    if (!name) return;
    if (name.length > 100) {
      setError("Requirement must be 100 characters or fewer.");
      return;
    }
    const { data, error: err } = await supabase.from("requirements").insert([{ group_id: group.id, name }]).select();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setReqs((prev) => [...prev, ...data]);
    setNewReq("");
  }

  async function removeRequirement(id) {
    await supabase.from("requirements").delete().eq("id", id);
    setReqs((prev) => prev.filter((r) => r.id !== id));
  }

  async function removeMember(memberRowId) {
    await supabase.from("group_members").delete().eq("id", memberRowId);
    fetchMembers();
  }

  async function leaveGroup() {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id);
    onGroupsChange();
  }

  async function deleteGroup() {
    if (!window.confirm(`Permanently delete ${group.name}? All shared listings, destinations, and requirements will be lost. This can't be undone.`)) return;
    await supabase.from("groups").delete().eq("id", group.id);
    onGroupsChange();
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Members */}
      <div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Members ({members.length})</div>
        {members.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <span>
              {m.user_id === user.id ? "You" : m.user_id.slice(0, 8) + "…"}
              {m.role === "owner" && <span style={{ marginLeft: 6, color: "#888" }}>(owner)</span>}
              {m.status === "pending" && <span style={{ marginLeft: 6, color: "var(--orange)" }}>(pending)</span>}
            </span>
            {isOwner && m.user_id !== user.id && (
              <button onClick={() => removeMember(m.id)} style={{ background: "none", border: "none", color: "#a33", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>Remove</button>
            )}
          </div>
        ))}
        {isOwner && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Invite by email" style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
            <button onClick={invite} disabled={busy} style={{ padding: "6px 12px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>Invite</button>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Requirements ({reqs.length})</div>
        {reqs.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <span>{r.name}</span>
            <button onClick={() => removeRequirement(r.id)} style={{ background: "none", border: "none", color: "#a33", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>Remove</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newReq} onChange={(e) => setNewReq(e.target.value)} placeholder="e.g. Cat-friendly" maxLength={100} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
          <button onClick={addRequirement} style={{ padding: "6px 12px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      {error && <p style={{ color: "#c33", fontSize: 13, margin: 0 }}>{error}</p>}
      {info && <p style={{ color: "var(--navy)", fontSize: 13, margin: 0 }}>{info}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        {!isOwner && (
          <button onClick={leaveGroup} style={{ padding: "6px 12px", background: "transparent", color: "#a33", border: "1px solid #a33", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>Leave group</button>
        )}
        {isOwner && (
          <button onClick={deleteGroup} style={{ padding: "6px 12px", background: "transparent", color: "#a33", border: "1px solid #a33", borderRadius: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>Delete group</button>
        )}
      </div>
    </div>
  );
}

// ============================================
// SETTINGS SCREEN
// ============================================
function SettingsScreen({ onClose, destinations, setDestinations, isMobile, user, currentView, groups, pendingInvites, onAcceptInvite, onDeclineInvite, onGroupsChange, onSwitchView }) {
  const [newName, setNewName] = useState("");
  const [newAddr, setNewAddr] = useState("");
  const [error, setError] = useState("");

  async function addDestination() {
    setError("");
    const name = newName.trim();
    const address = newAddr.trim();
    if (!name || !address) {
      setError("Both name and address are required.");
      return;
    }
    if (name.length > 60) {
      setError("Name must be 60 characters or fewer.");
      return;
    }
    if (address.length > 200) {
      setError("Address must be 200 characters or fewer.");
      return;
    }
    const payload = { name, address, group_id: currentView?.id ?? null };
    const { data, error: err } = await supabase.from("destinations").insert([payload]).select();
    if (err) {
      setError(err.message);
      return;
    }
    if (data) setDestinations((prev) => [...prev, ...data]);
    setNewName("");
    setNewAddr("");
  }

  async function removeDestination(id) {
    await supabase.from("destinations").delete().eq("id", id);
    setDestinations((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 200, overflow: "auto" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "20px" : "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, color: "var(--navy)", margin: 0 }}>Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>{icons.close(24)}</button>
        </div>
        <GroupsSection
          user={user}
          groups={groups}
          pendingInvites={pendingInvites}
          onAcceptInvite={onAcceptInvite}
          onDeclineInvite={onDeclineInvite}
          onGroupsChange={onGroupsChange}
          onSwitchView={onSwitchView}
        />

        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, margin: "0 0 14px" }}>
          Commute destinations {currentView ? <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: "#888" }}>· {currentView.name}</span> : <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: "#888" }}>· Personal</span>}
        </h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#666", margin: "0 0 16px" }}>
          Add places you commute to regularly. Each listing will get a tappable chip per destination that opens Google Maps with directions.
        </p>
        {destinations.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 8, background: "#fff" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>{d.name}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis" }}>{d.address}</div>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--navy)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}
                title="Open in Google Maps to confirm this is the right place"
              >
                Verify ↗
              </a>
              <button onClick={() => removeDestination(d.id)} style={{ background: "none", border: "none", color: "#a33", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. Work)" maxLength={60} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }} />
          <input value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="Full address (street, city, state, zip)" maxLength={200} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#888", margin: 0 }}>
            Tip: include the city and state. Plain "200 Hudson" could resolve to NYC or NJ. Use the Verify link to double-check after saving.
          </p>
          {error && <p style={{ color: "#c33", fontSize: 13, margin: 0 }}>{error}</p>}
          <button onClick={addDestination} style={{ padding: "8px 16px", background: "var(--navy)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
            + Add destination
          </button>
        </div>
        <div style={{ borderTop: "1px solid #ddd", marginTop: 30, paddingTop: 20 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, margin: "0 0 10px" }}>Account</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#666" }}>{user?.email || "—"}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ padding: "6px 14px", border: "1px solid #a33", borderRadius: 6, background: "transparent", color: "#a33", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [listings, setListings] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showingsOpen, setShowingsOpen] = useState(true);
  const [listingsOpen, setListingsOpen] = useState(true);
  const [showingSort, setShowingSort] = useState("Date");
  const [listingSort, setListingSort] = useState("Price");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  // Group hunting state. currentView = null → solo. currentView = {id,name} → that group.
  const [currentView, setCurrentView] = useState(null);
  const [groups, setGroups] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [listingRequirements, setListingRequirements] = useState([]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load active group memberships and pending invites for the current user.
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    const { data: members } = await supabase
      .from("group_members")
      .select("status, role, group_id, groups(id, name, created_by)")
      .eq("user_id", user.id);
    const active = (members ?? []).filter((m) => m.status === "active" && m.groups);
    const pending = (members ?? []).filter((m) => m.status === "pending" && m.groups);
    setGroups(active.map((m) => ({ ...m.groups, role: m.role })));
    setPendingInvites(pending.map((m) => ({ ...m.groups, membershipId: m.group_id })));
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      // Listings + destinations are filtered by the active view.
      // Solo view: group_id IS NULL. Group view: group_id = current group.
      let listingsQ = supabase.from("listings").select("*");
      let destsQ = supabase.from("destinations").select("*");
      if (currentView) {
        listingsQ = listingsQ.eq("group_id", currentView.id);
        destsQ = destsQ.eq("group_id", currentView.id);
      } else {
        listingsQ = listingsQ.is("group_id", null);
        destsQ = destsQ.is("group_id", null);
      }
      const [l, d] = await Promise.all([listingsQ, destsQ]);
      if (l.error) throw l.error;
      if (d.error) throw d.error;
      setListings(l.data ?? []);
      setDestinations(d.data ?? []);

      // Group view: also fetch requirements + listing_requirements rows.
      if (currentView) {
        const [r, lr] = await Promise.all([
          supabase.from("requirements").select("*").eq("group_id", currentView.id),
          supabase
            .from("listing_requirements")
            .select("*")
            .in("listing_id", (l.data ?? []).map((row) => row.id).concat(["00000000-0000-0000-0000-000000000000"])),
        ]);
        setRequirements(r.data ?? []);
        setListingRequirements(lr.data ?? []);
      } else {
        setRequirements([]);
        setListingRequirements([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setDataLoading(false);
      setHasFetched(true);
    }
  }, [user, currentView]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(id, newStatus, showingDate, showingTime) {
    const update = { status: newStatus };
    if (showingDate) update.showing_date = showingDate;
    if (showingTime) update.showing_time = showingTime;
    if (newStatus !== "Scheduled") {
      update.showing_date = null;
      update.showing_time = null;
    }
    await supabase.from("listings").update(update).eq("id", id);
    fetchData();
  }

  async function handleDelete(id) {
    await supabase.from("listings").delete().eq("id", id);
    fetchData();
  }

  function handleKebabAction(id, action) {
    if (action === "Cancel") handleStatusChange(id, "Contacted");
  }

  function handleReschedule(id, date, time) {
    handleStatusChange(id, "Scheduled", date, time);
  }

  // Accept a pending invite: flip group_members.status to 'active'.
  async function acceptInvite(groupId) {
    await supabase
      .from("group_members")
      .update({ status: "active" })
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    fetchGroups();
  }

  // Decline a pending invite: delete the membership row.
  async function declineInvite(groupId) {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    fetchGroups();
  }

  // Toggle a listing_requirement checkbox. Upserts so the first toggle inserts,
  // subsequent ones flip.
  async function toggleRequirement(listingId, requirementId, met) {
    const { data } = await supabase
      .from("listing_requirements")
      .upsert(
        { listing_id: listingId, requirement_id: requirementId, met, checked_by: user.id, checked_at: new Date().toISOString() },
        { onConflict: "listing_id,requirement_id" }
      )
      .select();
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      setListingRequirements((prev) => {
        const without = prev.filter((r) => !(r.listing_id === listingId && r.requirement_id === requirementId));
        return [...without, row];
      });
    }
  }

  if (loading) return null;
  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); }} />;

  // Filter by search query (matches address, realtor name, or notes)
  const q = searchQuery.trim().toLowerCase();
  const matchesQuery = (l) => {
    if (!q) return true;
    return (
      (l.address || "").toLowerCase().includes(q) ||
      (l.realtor_name || "").toLowerCase().includes(q) ||
      (l.notes || "").toLowerCase().includes(q)
    );
  };
  const filteredListings = listings.filter(matchesQuery);
  const showings = filteredListings.filter((l) => l.status === "Scheduled");
  const regularListings = filteredListings.filter((l) => l.status !== "Scheduled");

  // Sort
  function sortListings(list, sort) {
    const sorted = [...list];
    if (sort === "Price") sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === "Status") sorted.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    else if (sort === "Date") sorted.sort((a, b) => (a.showing_date || "").localeCompare(b.showing_date || ""));
    else if (sort === "A–Z") sorted.sort((a, b) => (a.address || "").localeCompare(b.address || ""));
    else if (sort === "Z–A") sorted.sort((a, b) => (b.address || "").localeCompare(a.address || ""));
    else if (sort === "Newest") sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    else if (sort === "Oldest") sorted.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    else if (sort === "Requirements") {
      const metCount = (id) => listingRequirements.filter((r) => r.listing_id === id && r.met).length;
      sorted.sort((a, b) => metCount(b.id) - metCount(a.id));
    }
    return sorted;
  }

  const sortedShowings = sortListings(showings, showingSort);
  const sortedListings = sortListings(regularListings, listingSort);

  const baseSortOptions = ["Price", "Status", "A–Z", "Z–A", "Newest", "Oldest"];
  const baseShowingSortOptions = ["Date", "Price", "A–Z", "Z–A", "Newest", "Oldest"];
  const sortOptions = currentView ? [...baseSortOptions, "Requirements"] : baseSortOptions;
  const showingSortOptions = currentView ? [...baseShowingSortOptions, "Requirements"] : baseShowingSortOptions;

  return (
    <>
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* HEADER */}
        <header style={{ background: "var(--orange)", padding: isMobile ? "18px 20px" : "20px 60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: isMobile ? 24 : 36, color: "var(--navy)", margin: 0 }}>ArtemisApts</h1>
          {isMobile ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                {icons.menu(24)}
              </button>
              {mobileMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", borderRadius: 8, padding: "8px 0", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, minWidth: 140 }}>
                  <div onClick={() => { setSettingsOpen(true); setMobileMenuOpen(false); }} style={{ padding: "10px 18px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>Settings</div>
                  <div onClick={() => supabase.auth.signOut()} style={{ padding: "10px 18px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#a33" }}>Sign out</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: "var(--navy)" }}>
              <span onClick={() => setSettingsOpen(true)} style={{ cursor: "pointer", fontWeight: 500 }}>Settings</span>
              <span onClick={() => supabase.auth.signOut()} style={{ cursor: "pointer" }}>Sign Out</span>
            </div>
          )}
        </header>

        {/* MAIN CONTENT */}
        <main style={{ padding: isMobile ? "20px" : "30px 60px", maxWidth: 1300, margin: "0 auto" }}>
          {/* VIEW SWITCHER */}
          {(groups.length > 0 || pendingInvites.length > 0) && (
            <div style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setCurrentView(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 63,
                  border: currentView === null ? "1px solid var(--navy)" : "1px solid #ccc",
                  background: currentView === null ? "var(--navy)" : "#fff",
                  color: currentView === null ? "#fff" : "var(--navy)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: isMobile ? 13 : 14,
                  cursor: "pointer",
                }}
              >
                My Listings
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setCurrentView({ id: g.id, name: g.name })}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 63,
                    border: currentView?.id === g.id ? "1px solid var(--navy)" : "1px solid #ccc",
                    background: currentView?.id === g.id ? "var(--navy)" : "#fff",
                    color: currentView?.id === g.id ? "#fff" : "var(--navy)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: isMobile ? 13 : 14,
                    cursor: "pointer",
                  }}
                >
                  {g.name}
                </button>
              ))}
              {pendingInvites.length > 0 && (
                <span style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                  {pendingInvites.length} pending invite{pendingInvites.length === 1 ? "" : "s"} →
                  <button onClick={() => setSettingsOpen(true)} style={{ padding: "4px 12px", borderRadius: 63, background: "var(--orange)", color: "#000", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Review</button>
                </span>
              )}
            </div>
          )}

          {/* SEARCH */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, realtor, or notes…"
              maxLength={100}
              style={{
                width: "100%",
                padding: isMobile ? "10px 36px 10px 14px" : "12px 40px 12px 18px",
                borderRadius: 63,
                border: "1px solid #000",
                background: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: isMobile ? 14 : 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: isMobile ? 12 : 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {icons.close(16)}
              </button>
            )}
          </div>

          {/* SHOWINGS SECTION */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showingsOpen ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => setShowingsOpen(!showingsOpen)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {showingsOpen ? icons.minus() : icons.plus()}
                </button>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: isMobile ? 22 : 30, margin: 0 }}>Showings</h2>
                <SortDropdown value={showingSort} onChange={setShowingSort} options={showingSortOptions} isMobile={isMobile} />
              </div>
            </div>
            {showingsOpen && (
              <div>
                {dataLoading && !hasFetched ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#888", padding: "20px 0", borderTop: "1px solid #000" }}>Loading…</p>
                ) : sortedShowings.length === 0 ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#888", padding: "20px 0", borderTop: "1px solid #000" }}>
                    {q ? `No showings match "${searchQuery}".` : "No upcoming showings. Change a listing's status to \"Schedule?\" to add one."}
                  </p>
                ) : (
                  sortedShowings.map((l) => (
                    <ShowingItem key={l.id} listing={l} destinations={destinations} onKebabAction={handleKebabAction} onReschedule={handleReschedule} onDelete={handleDelete} isMobile={isMobile} requirements={requirements} listingRequirements={listingRequirements} onToggleRequirement={toggleRequirement} />
                  ))
                )}
              </div>
            )}
          </section>

          {/* LISTINGS SECTION */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: listingsOpen ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => setListingsOpen(!listingsOpen)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {listingsOpen ? icons.minus() : icons.plus()}
                </button>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: isMobile ? 22 : 30, margin: 0 }}>Listings</h2>
                <SortDropdown value={listingSort} onChange={setListingSort} options={sortOptions} isMobile={isMobile} />
              </div>
            </div>
            {listingsOpen && (
              <div>
                {dataLoading && !hasFetched ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#888", padding: "20px 0", borderTop: "1px solid #000" }}>Loading…</p>
                ) : sortedListings.length === 0 ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#888", padding: "20px 0", borderTop: "1px solid #000" }}>
                    {q ? `No listings match "${searchQuery}".` : "No listings yet. Use the Chrome extension to save your first listing!"}
                  </p>
                ) : (
                  sortedListings.map((l) => (
                    <ListingItem key={l.id} listing={l} destinations={destinations} onStatusChange={handleStatusChange} onDelete={handleDelete} isMobile={isMobile} requirements={requirements} listingRequirements={listingRequirements} onToggleRequirement={toggleRequirement} />
                  ))
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {settingsOpen && (
        <SettingsScreen
          onClose={() => { setSettingsOpen(false); fetchData(); }}
          destinations={destinations}
          setDestinations={setDestinations}
          isMobile={isMobile}
          user={user}
          currentView={currentView}
          groups={groups}
          pendingInvites={pendingInvites}
          onAcceptInvite={acceptInvite}
          onDeclineInvite={declineInvite}
          onGroupsChange={fetchGroups}
          onSwitchView={(v) => { setCurrentView(v); setSettingsOpen(false); }}
        />
      )}
    </>
  );
}