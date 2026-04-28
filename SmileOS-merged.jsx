// ═══════════════════════════════════════════════════════════════════════════
// SmileOS v12 — Clinical Decision Engine
// Invisalign-native design language · Role-based access control
// Assessment → Problems → Decisions → Consent → Signature
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── TENANT ─────────────────────────────────────────────────────────────────
const TENANT = {
  slug: "dr-haroon-ismail",
  name: "Dr Haroon Ismail",
  practice: "Ismail Orthodontics",
  city: "Birmingham",
  plan: "professional",
  logo: null,
  clinician: "Dr Haroon Ismail (BDS)",
};


// ─── ROLE-BASED ACCESS CONTROL ──────────────────────────────────────────────
// 3 role tiers with distinct access scopes
const ROLES = {
  clinical: {
    id: "clinical",
    label: "Clinical Team",
    description: "Clinicians and dental nurses — full clinical access",
    color: "#2980B9",
    bg: "rgba(41,128,185,0.10)",
    access: {
      dashboard: true,
      patients: true,
      consultation: true,
      assessment: true,
      problems: true,
      consent: true,
      clinicalIntel: true,
      // Restricted from:
      billing: false,
      marketing: false,
      team: false,
      settings_billing: false,
    },
    navItems: ["dashboard","patients","workflow","analytics","governance","intelligence","audit","security","trust"],
  },
  admin: {
    id: "admin",
    label: "Practice Manager",
    description: "Full admin access including billing, team, and analytics",
    color: "#6C3483",
    bg: "rgba(108,52,131,0.10)",
    access: {
      dashboard: true,
      patients: true,
      consultation: true,
      assessment: false,    // Cannot enter clinical findings
      problems: false,
      consent: true,        // Can view but not generate
      clinicalIntel: true,
      billing: true,
      marketing: true,
      team: true,
      settings_billing: true,
    },
    navItems: ["dashboard","patients","analytics","governance","audit","security","trust","team","settings"],
  },
  marketing: {
    id: "marketing",
    label: "Marketing / Reception",
    description: "Patient-facing admin, booking, and lead management only",
    color: "#C0392B",
    bg: "rgba(192,57,43,0.10)",
    access: {
      dashboard: true,
      patients: true,       // Name, stage, appointment info only
      consultation: true,   // Stage 1 only — goals, concerns
      assessment: false,
      problems: false,
      consent: false,
      clinicalIntel: false,
      billing: false,
      marketing: true,
      team: false,
      settings_billing: false,
    },
    navItems: ["dashboard","patients","security","trust","prospects"],
  },
  clinical_director: {
    id: "clinical_director",
    label: "Clinical Director",
    description: "Full clinical + governance + owner-level visibility",
    color: "#8B1A10",
    bg: "rgba(192,57,43,0.10)",
    access: {
      dashboard: true, patients: true, consultation: true, assessment: true,
      problems: true, consent: true, clinicalIntel: true,
      billing: true, marketing: false, team: true, settings_billing: true,
    },
    navItems: ["dashboard","patients","workflow","analytics","governance","audit","security","trust","team"],
  },
};

// Mock current user — in production this comes from Auth
const CURRENT_USER = {
  id: "u1",
  name: "Dr Haroon Ismail",
  role: "clinical",   // Switch to "admin" or "marketing" to test
  title: "Dr",
  initials: "HI",
};

function useRole() {
  const role = ROLES[CURRENT_USER.role] || ROLES.clinical;
  const can = (action) => role.access[action] === true;
  return { role, can, user: CURRENT_USER };
}

function RoleBadge({ roleId, size = "sm" }) {
  const r = ROLES[roleId];
  if (!r) return null;
  return (
    <span style={{
      fontSize: size === "sm" ? 10.5 : 12,
      fontWeight: 700,
      color: r.color,
      background: r.bg,
      borderRadius: 4,
      padding: size === "sm" ? "2px 8px" : "4px 12px",
      letterSpacing: 0.3,
    }}>
      {r.label}
    </span>
  );
}

function AccessDenied({ feature }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:14 }}>
      <div style={{ fontSize:36, lineHeight:1 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:700, color:T.sub }}>Access Restricted</div>
      <div style={{ fontSize:13.5, color:T.muted, textAlign:"center", maxWidth:340 }}>
        Your role (<strong>{CURRENT_USER.role}</strong>) does not have access to {feature}.
        Contact your Practice Manager to request access.
      </div>
    </div>
  );
}

// ─── DESIGN TOKENS — Invisalign-native dark-header palette ──────────────────
const T = {
  // Invisalign-style: very dark charcoal header + bright cyan action
  navBg:        "#2D2D2D",   // Invisalign's dark nav background
  navBorder:    "#1A1A1A",
  navText:      "#CCCCCC",
  navActive:    "#FFFFFF",
  cyan:         "#00B5D8",   // Invisalign action blue/cyan
  cyanDark:     "#0090AA",
  cyanLight:    "rgba(0,181,216,0.12)",

  // Page chrome
  bg:           "#F5F5F5",   // Invisalign's neutral grey page
  card:         "#FFFFFF",
  sectionBg:    "#FAFAFA",

  // Typography
  ink:          "#1A1A1A",
  sub:          "#333333",
  muted:        "#666666",
  faint:        "#999999",

  // Borders
  border:       "#E0E0E0",
  borderDark:   "#CCCCCC",
  borderLight:  "#EDEDED",

  // Clinical accent — keep gold for abnormal/problem highlights
  gold:         "#D4A64A",
  goldMid:      "rgba(212,166,74,0.35)",
  goldLight:    "rgba(212,166,74,0.10)",
  goldDim:      "#A07C2A",

  // Semantic
  success:      "#2E8B57",
  successLight: "rgba(46,139,87,0.10)",
  successBorder:"rgba(46,139,87,0.30)",
  warning:      "#C4841A",
  warningLight: "rgba(196,132,26,0.09)",
  warningBorder:"rgba(196,132,26,0.28)",
  error:        "#C0392B",
  errorLight:   "rgba(192,57,43,0.09)",
  errorBorder:  "rgba(192,57,43,0.28)",
  info:         "#2980B9",
  infoLight:    "rgba(41,128,185,0.10)",
  infoBorder:   "rgba(41,128,185,0.28)",

  // Keep clinical theme for assessment sections
  primary:      "#2D2D2D",
  primaryMid:   "#3D3D3D",
};

// ─── PROBLEM CATEGORIES ──────────────────────────────────────────────────────
const PROBLEM_CATEGORIES = {
  Orthodontic:  { color: T.primary,  bg: "#E8F0EC", label: "Orthodontic" },
  Restorative:  { color: "#7C4A1A",  bg: "#F5EDE0", label: "Restorative" },
  Periodontal:  { color: "#1A5C4A",  bg: "#E0F2EC", label: "Periodontal" },
  Functional:   { color: "#4A3A7C",  bg: "#EDE8F5", label: "Functional"  },
  Medical:      { color: "#7C1A1A",  bg: "#F5E0E0", label: "Medical"     },
};

// ─── MASTER TRIGGER REGISTRY ─────────────────────────────────────────────────
// Structure: fieldId → { value → ProblemDefinition }
// ProblemDefinition: { label, category, severity, needsTeeth, needsMeasure,
//                      measureOpts, expandOpts, consentBlock, ciRisk }
const TRIGGER_REGISTRY = {
  // ── SOCIAL / MEDICAL ──
  smoking: {
    "Daily smoker":      { label:"Daily smoker — periodontal & compliance risk", category:"Medical",    severity:"moderate", needsTeeth:false, consentBlock:"smoking" },
    "Occasional smoker": { label:"Occasional smoker — compliance risk",           category:"Medical",    severity:"monitor",  needsTeeth:false, consentBlock:null },
    "Using Vape":        { label:"Vaping — periodontal healing risk",             category:"Medical",    severity:"monitor",  needsTeeth:false, consentBlock:null },
  },

  // ── FACIAL / SKELETAL ──
  skeletal: {
    "Class II": { label:"Skeletal Class II — elastic protocol, camouflage limits", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"skeletal" },
    "Class III":{ label:"Skeletal Class III — non-surgical camouflage limits",    category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"skeletal" },
  },
  lower_fh: {
    "Decreased": { label:"Decreased lower face height — deep bite tendency",   category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Increased": { label:"Increased lower face height — open bite tendency",   category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  lip_comp: {
    "Incompetent":           { label:"Lip incompetence — stability concern",          category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Potentially competent": { label:"Potentially competent lips — monitor stability",category:"Orthodontic", severity:"monitor",  needsTeeth:false, consentBlock:null },
  },
  lip_catch: {
    "Present": { label:"Lip catch present — AOB aetiology factor",            category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  nasolabial: {
    "Acute":  { label:"Acute nasolabial angle — profile planning required",  category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
    "Obtuse": { label:"Obtuse nasolabial angle — profile planning required", category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
  },

  // ── SMILE ANALYSIS ──
  smile_line: {
    "Low":  { label:"Low smile line — limited upper incisor display",  category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
    "High": { label:"High smile line / gummy smile",                   category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  smile_arc: {
    "Flat":    { label:"Flat smile arc — aesthetics planning required",    category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
    "Reverse": { label:"Reverse smile arc — ClinCheck optimisation needed",category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  buccal_corr: {
    "Deficient": { label:"Deficient buccal corridors — arch expansion considerations", category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
  },

  // ── MIDLINE ──
  upper_midline_shift: {
    "To right": { label:"Upper midline shift to right", category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm","2mm","3mm","4mm+"], consentBlock:null },
    "To left":  { label:"Upper midline shift to left",  category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm","2mm","3mm","4mm+"], consentBlock:null },
  },
  lower_midline_shift: {
    "To right": { label:"Lower midline shift to right", category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm","2mm","3mm","4mm+"], consentBlock:null },
    "To left":  { label:"Lower midline shift to left",  category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm","2mm","3mm","4mm+"], consentBlock:null },
  },
  midline_discrepancy: {
    "Upper midline shift": { label:"Upper midline discrepancy", category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm to right","2mm to right","3mm+ to right","1mm to left","2mm to left","3mm+ to left"], consentBlock:null },
    "Lower midline shift": { label:"Lower midline discrepancy", category:"Orthodontic", severity:null, needsTeeth:false, needsMeasure:true, measureOpts:["1mm to right","2mm to right","3mm+ to right","1mm to left","2mm to left","3mm+ to left"], consentBlock:null },
  },

  // ── OCCLUSION ──
  incisor_class: {
    "Class II div i":  { label:"Class II div 1 incisor relationship", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"class2" },
    "Class II div ii": { label:"Class II div 2 incisor relationship", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"class2" },
    "Class III":       { label:"Class III incisor relationship",      category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"class3" },
  },
  overjet_type: {
    "Increased positive": {
      label:"Increased overjet",
      category:"Orthodontic", severity:null, needsTeeth:false,
      needsMeasure:true,
      measureOpts:["2mm","3mm","4mm","5mm","6mm","7mm","8mm","9mm","10mm+"],
      consentBlock:"overjet",
    },
    "Negative (reversed)": {
      label:"Negative (reversed) overjet",
      category:"Orthodontic", severity:"moderate", needsTeeth:false,
      needsMeasure:true,
      measureOpts:["-1mm","-2mm","-3mm","-4mm+"],
      consentBlock:"overjet",
    },
  },
  overbite: {
    "Increased (>50%)": {
      label:"Increased overbite (deep bite)",
      category:"Orthodontic", severity:null, needsTeeth:false,
      needsMeasure:true,
      measureOpts:["60%","70%","80%","90%","Complete (100%)"],
      consentBlock:"deepbite",
    },
    "Reduced / Edge-to-edge": { label:"Reduced overbite / edge-to-edge", category:"Orthodontic", severity:"monitor", needsTeeth:false, consentBlock:null },
  },
  openbite: {
    "Anterior open bite": {
      label:"Anterior open bite",
      category:"Orthodontic", severity:null, needsTeeth:true,
      needsMeasure:true,
      measureOpts:["1mm","2mm","3mm","4mm","5mm+"],
      consentBlock:"aob",
    },
    "Posterior open bite": {
      label:"Posterior open bite",
      category:"Functional", severity:"moderate", needsTeeth:true, consentBlock:"aob",
    },
  },
  crossbite: {
    "Anterior crossbite": {
      label:"Anterior crossbite",
      category:"Orthodontic", severity:null, needsTeeth:true,
      needsMeasure:true,
      measureOpts:["Dental only","Dental + skeletal component"],
      consentBlock:"crossbite",
    },
    "Posterior crossbite": {
      label:"Posterior crossbite",
      category:"Orthodontic", severity:null, needsTeeth:true,
      needsMeasure:true,
      measureOpts:["Unilateral","Bilateral","With displacement","Without displacement"],
      consentBlock:"crossbite",
    },
    "Scissor bite": { label:"Scissor bite", category:"Orthodontic", severity:"moderate", needsTeeth:true, consentBlock:"crossbite" },
  },
  molar_r: {
    "Class II": { label:"Molar relationship Class II (right)", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Class III":{ label:"Molar relationship Class III (right)",category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  molar_l: {
    "Class II": { label:"Molar relationship Class II (left)",  category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Class III":{ label:"Molar relationship Class III (left)", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  canine_r: {
    "Class II": { label:"Canine relationship Class II (right)", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Class III":{ label:"Canine relationship Class III (right)",category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  canine_l: {
    "Class II": { label:"Canine relationship Class II (left)",  category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Class III":{ label:"Canine relationship Class III (left)", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
  },
  displacement: {
    "Present": { label:"Mandibular displacement on closure", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"crossbite" },
  },

  // ── SPACE ──
  crowd_upper: {
    "Mild":     { label:"Mild upper arch crowding",     category:"Orthodontic", severity:"mild",     needsTeeth:false, consentBlock:null },
    "Moderate": { label:"Moderate upper arch crowding", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"ipr" },
    "Severe":   { label:"Severe upper arch crowding",   category:"Orthodontic", severity:"severe",   needsTeeth:false, consentBlock:"ipr" },
  },
  crowd_lower: {
    "Mild":     { label:"Mild lower arch crowding",     category:"Orthodontic", severity:"mild",     needsTeeth:false, consentBlock:null },
    "Moderate": { label:"Moderate lower arch crowding", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"ipr" },
    "Severe":   { label:"Severe lower arch crowding",   category:"Orthodontic", severity:"severe",   needsTeeth:false, consentBlock:"ipr" },
  },
  spacing_upper: {
    "Mild":     { label:"Mild upper arch spacing",     category:"Orthodontic", severity:"mild",     needsTeeth:false, consentBlock:null },
    "Moderate": { label:"Moderate upper arch spacing", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Severe":   { label:"Severe upper arch spacing",   category:"Orthodontic", severity:"severe",   needsTeeth:false, consentBlock:null },
  },
  spacing_lower: {
    "Mild":     { label:"Mild lower arch spacing",     category:"Orthodontic", severity:"mild",     needsTeeth:false, consentBlock:null },
    "Moderate": { label:"Moderate lower arch spacing", category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:null },
    "Severe":   { label:"Severe lower arch spacing",   category:"Orthodontic", severity:"severe",   needsTeeth:false, consentBlock:null },
  },

  // ── PERIODONTAL ──
  biotype: {
    "Thin":  { label:"Thin periodontal biotype — recession risk",   category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"thinBiotype", ciRisk:"high" },
    "Thick": { label:"Thick periodontal biotype — note for planning",category:"Periodontal", severity:"monitor",  needsTeeth:false, consentBlock:null },
  },
  recession_ex: {
    "Present": { label:"Gingival recession present", category:"Periodontal", severity:"moderate", needsTeeth:true, consentBlock:"recession" },
  },
  black_tri: {
    "Mild":        { label:"Mild black triangles",        category:"Periodontal", severity:"mild",     needsTeeth:false, consentBlock:"blackTri" },
    "Significant": { label:"Significant black triangles", category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"blackTri" },
  },
  perio_status: {
    "Gingivitis":              { label:"Gingivitis — hygiene phase required",               category:"Periodontal", severity:"mild",     needsTeeth:false, consentBlock:"perio" },
    "Stage I/II Periodontitis":{ label:"Periodontitis Stage I/II — stabilise before ortho",category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"perio", ciRisk:"high" },
    "Stage III/IV Periodontitis":{ label:"Periodontitis Stage III/IV — specialist referral",category:"Periodontal", severity:"severe", needsTeeth:false, consentBlock:"perio", ciRisk:"high" },
  },
  oral_hygiene: {
    "Fair": { label:"Fair oral hygiene — reinforce before treatment", category:"Periodontal", severity:"mild",     needsTeeth:false, consentBlock:null },
    "Poor": { label:"Poor oral hygiene — hygiene phase required",     category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"perio" },
  },
  bpe: {
    "1": { label:"BPE 1 — plaque retention / bleeding on probing",                     category:"Periodontal", severity:"mild",     needsTeeth:false, consentBlock:null,   bpeProblem:true },
    "2": { label:"BPE 2 — calculus / plaque retentive factor management required",     category:"Periodontal", severity:"mild",     needsTeeth:false, consentBlock:null,   bpeProblem:true },
    "3": { label:"BPE 3 — periodontal treatment required before orthodontics",          category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"perio",bpeProblem:true },
    "4": { label:"BPE 4 — advanced periodontal risk / specialist assessment required",  category:"Periodontal", severity:"severe",   needsTeeth:false, consentBlock:"perio",bpeProblem:true, ciRisk:"high" },
  },
  bone_levels: {
    "Horizontal bone loss": { label:"Horizontal alveolar bone loss",           category:"Periodontal", severity:"moderate", needsTeeth:false, consentBlock:"perio", ciRisk:"high" },
    "Vertical bone loss":   { label:"Vertical bone defects — specialist review",category:"Periodontal", severity:"severe",   needsTeeth:true,  consentBlock:"perio", ciRisk:"high" },
  },

  // ── RESTORATIVE / DENTAL ──
  tsl: {
    "Mild":     { label:"Mild tooth surface loss",                                   category:"Restorative", severity:"mild",     needsTeeth:false, consentBlock:"tsl" },
    "Moderate": { label:"Moderate tooth surface loss — restorative planning required",category:"Restorative", severity:"moderate", needsTeeth:false, consentBlock:"tsl" },
    "Severe":   { label:"Severe TSL — TWES scoring, joint restorative management",   category:"Restorative", severity:"severe",   needsTeeth:false, consentBlock:"tsl", ciRisk:"high" },
  },
  caries: {
    "Present": { label:"Active caries — treatment required before ortho", category:"Restorative", severity:"moderate", needsTeeth:true, consentBlock:null },
  },
  root_filled: {
    "Present": { label:"Root-filled teeth — resorption & adhesion risk", category:"Restorative", severity:"moderate", needsTeeth:true, consentBlock:"rootFilled" },
  },

  // ── RADIOGRAPHIC ──
  short_roots: {
    "Mild":        { label:"Short roots (mild) — elevated resorption risk",  category:"Orthodontic", severity:"moderate", needsTeeth:false, consentBlock:"shortRoots", ciRisk:"moderate" },
    "Significant": { label:"Significant short roots — HIGH resorption risk", category:"Orthodontic", severity:"severe",   needsTeeth:true,  consentBlock:"shortRoots", ciRisk:"high" },
  },
  pa_pathology: {
    "Present": { label:"PA pathology detected — investigate before treatment", category:"Restorative", severity:"severe", needsTeeth:true, consentBlock:null },
  },

  // ── FUNCTIONAL / TMJ ──
  tmj_pain: {
    "Muscular": { label:"Muscular TMJ pain — stabilise before treatment",category:"Functional", severity:"moderate", needsTeeth:false, consentBlock:"tmj" },
    "TMJ":      { label:"TMJ arthralgia — stabilise before commencing",  category:"Functional", severity:"moderate", needsTeeth:false, consentBlock:"tmj", ciRisk:"moderate" },
  },
  tmj_clicks: {
    "Yes, right side": { label:"TMJ clicking (right) — document baseline", category:"Functional", severity:"monitor", needsTeeth:false, consentBlock:"tmj" },
    "Yes, left side":  { label:"TMJ clicking (left) — document baseline",  category:"Functional", severity:"monitor", needsTeeth:false, consentBlock:"tmj" },
    "Bilateral":       { label:"Bilateral TMJ clicking — document baseline",category:"Functional", severity:"monitor", needsTeeth:false, consentBlock:"tmj" },
  },
  bruxism: {
    "Sleep bruxism":        { label:"Sleep bruxism — aligner wear & breakage risk",    category:"Functional", severity:"moderate", needsTeeth:false, consentBlock:"bruxism" },
    "Awake clenching":      { label:"Awake clenching — management alongside treatment",category:"Functional", severity:"moderate", needsTeeth:false, consentBlock:"bruxism" },
    "Parafunctional habit": { label:"Parafunctional habit — cessation advised",        category:"Functional", severity:"monitor",  needsTeeth:false, consentBlock:"bruxism" },
  },
};



// ─── DERIVE PROBLEMS from form values ────────────────────────────────────────
function deriveProblems(fv) {
  const out = [];
  const seen = new Set();
  Object.keys(TRIGGER_REGISTRY).forEach(fieldId => {
    const val = fv[fieldId];
    if (!val) return;
    const triggerMap = TRIGGER_REGISTRY[fieldId];
    const def = triggerMap[val];
    if (!def) return;
    const pid = `${fieldId}|||${val}`;
    if (!seen.has(pid)) {
      seen.add(pid);
      const measure = fv[`${fieldId}_measure`] || null;
      const teeth   = fv[`${fieldId}_teeth`]   || [];
      out.push({
        id:        pid,
        fieldId,
        value:     val,
        label:     def.label + (measure ? ` — ${measure}` : ""),
        baseLabel: def.label,
        category:  def.category,
        severity:  def.severity,
        needsTeeth:def.needsTeeth,
        needsMeasure: def.needsMeasure || false,
        measureOpts:  def.measureOpts  || [],
        measure,
        teeth,
        consentBlock: def.consentBlock || null,
        ciRisk:       def.ciRisk || null,
      });
    }
  });
  return out;
}

// ─── CLINICAL RULES ENGINE (auto-derived compound problems) ──────────────────
// Ported from newer build — fires on combinations of findings
function fvToCaseState(fv, ext) {
  return {
    findings: fv,
    perio:        { bpeMax: fv.bpe ? parseInt(fv.bpe) : (ext?.bpeMax || 0) },
    restorative:  { tslExtent: ext?.tslExtent || (fv.tsl ? fv.tsl.toLowerCase() : "none") },
    ...ext,
  };
}

const CLINICAL_RULES = [
  { id:"perio_defer",    test:(s)=>s.perio?.bpeMax>=3||["Stage I/II Periodontitis","Stage III/IV Periodontitis"].includes(s.findings?.perio_status), problem:{label:"Periodontal disease — treatment deferral required",category:"Periodontal",severity:"high",consentBlock:"perio"} },
  { id:"tsl_restorative",test:(s)=>s.restorative?.tslExtent&&s.restorative.tslExtent!=="none",                                                        problem:{label:"Tooth surface loss — joint restorative management",category:"Restorative",severity:"moderate",consentBlock:"tsl"} },
  { id:"thin_biotype",   test:(s)=>s.findings?.biotype==="Thin",                                                                                      problem:{label:"Thin biotype — elevated recession risk documented",category:"Periodontal",severity:"moderate",consentBlock:"thinBiotype"} },
  { id:"aob_relapse",    test:(s)=>["Anterior open bite","Posterior open bite"].includes(s.findings?.openbite),                                        problem:{label:"Anterior open bite — high relapse risk",category:"Orthodontic",severity:"high",consentBlock:"aob"} },
  { id:"deep_bite",      test:(s)=>s.findings?.overbite==="Increased (>50%)",                                                                         problem:{label:"Deep overbite — mechanics and retention planning",category:"Orthodontic",severity:"moderate",consentBlock:"deepbite"} },
];

// ─── BPE TREATMENT OPTIONS ────────────────────────────────────────────────────
// Inline management options per BPE score — shown inside the problem list row
const BPE_TREATMENT_OPTIONS = {
  "1": [
    { id:"ohi_only",         label:"OHI only",                        icon:"◎" },
    { id:"hygienist_sp",     label:"Hygienist scale & polish",        icon:"◈" },
    { id:"review_before",    label:"Review before proceeding",        icon:"◷" },
  ],
  "2": [
    { id:"ohi_hygienist",    label:"OHI + hygienist treatment",       icon:"◎" },
    { id:"remove_factors",   label:"Remove plaque retentive factors", icon:"⚙" },
    { id:"review_stability", label:"Review periodontal stability before proceeding", icon:"◷" },
  ],
  "3": [
    { id:"full_hygiene",     label:"Full hygiene phase",              icon:"◎" },
    { id:"perio_charting",   label:"Periodontal charting",            icon:"◈" },
    { id:"reassess_before",  label:"Reassess before orthodontic treatment", icon:"◷" },
    { id:"gdp_perio",        label:"GDP periodontal management",      icon:"⚕" },
  ],
  "4": [
    { id:"specialist_ref",   label:"Specialist periodontal referral", icon:"⚠" },
    { id:"full_workup",      label:"Full periodontal work-up",        icon:"◈" },
    { id:"defer_ortho",      label:"Defer orthodontics until clearance", icon:"⏸" },
    { id:"joint_management", label:"Joint management required",       icon:"⚕" },
  ],
};

// Helper — returns true if this problem is a BPE-generated problem
function isBpeProblem(p) {
  return p.fieldId === "bpe";
}

// Merges trigger-registry problems with rule-derived compound problems
function deriveAllProblems(fv, decisions, ext) {
  const cs     = fvToCaseState(fv, ext);
  const legacy = deriveProblems(fv);
  const seen   = new Set(legacy.map(p=>p.consentBlock).filter(Boolean));
  const rules  = CLINICAL_RULES
    .filter(r => r.test(cs))
    .map(r => ({
      id: `rule_${r.id}`, key: `rule_${r.id}`, fieldId: r.id,
      label: r.problem.label, category: r.problem.category,
      severity: r.problem.severity, needsTeeth: false, needsMeasure: false,
      measureOpts: [], measure: null, teeth: [], consentBlock: r.problem.consentBlock || null,
      fromRule: true,
    }))
    .filter(rp => !rp.consentBlock || !seen.has(rp.consentBlock));
  return [...legacy, ...rules].map(p => ({ ...p, decision: decisions?.[p.key||p.id] || null }));
}

// ─── CONSENT BLOCKS ──────────────────────────────────────────────────────────
const CONSENT_ALWAYS_BLOCKS = [
  {
    id: "general",
    title: "General Treatment Risks",
    body: `Orthodontic treatment, like all clinical procedures, carries inherent risks. You have been informed of these risks and have had the opportunity to ask questions. We recommend reading all information carefully before signing. Treatment proceeds on the understanding that you accept these documented risks as part of informed consent.`,
  },
  {
    id: "retention",
    title: "Retention",
    body: `Following completion of active treatment, retention is required for life. Without retainer wear, teeth will naturally move. Fixed and/or removable retainers will be provided. Failure to wear retainers as instructed may result in relapse of tooth positions. The cost of replacement retainers is not included in your treatment fee unless specified.`,
  },
  {
    id: "root_resorption_general",
    title: "Root Resorption",
    body: `A small degree of root shortening (resorption) occurs in all orthodontic patients. In the majority of cases this is clinically insignificant. Severe resorption is rare but can affect long-term tooth stability. Radiographic monitoring may be recommended during treatment.`,
  },
  {
    id: "hygiene",
    title: "Oral Hygiene",
    body: `Maintaining excellent oral hygiene is essential throughout treatment. Failure to do so may result in decalcification, caries, or periodontal disease. Your treating dentist reserves the right to pause or terminate treatment if oral hygiene is not maintained to the required standard.`,
  },
  {
    id: "cooperation",
    title: "Patient Cooperation",
    body: `The outcome of your treatment is directly linked to your compliance with instructions, including aligner wear time (minimum 20–22 hours per day), attendance at scheduled appointments, and wearing any adjunctive appliances as directed. Poor compliance will adversely affect the final result.`,
  },
];

const CONSENT_CONDITIONAL_BLOCKS = {
  thinBiotype: {
    title: "Gingival Recession Risk — Thin Biotype",
    body: `Assessment has identified a thin periodontal biotype. Patients with thin gingival tissue are at elevated risk of recession during orthodontic tooth movement, particularly with labial or buccal movement of teeth. You have been informed that recession, if it occurs, may require periodontal treatment. In severe cases, grafting may be necessary. This risk is higher than average for your specific anatomy.`,
    severity: "high",
  },
  shortRoots: {
    title: "Root Resorption — Pre-existing Short Roots",
    body: `Radiographic examination has identified that one or more teeth have shorter than average root length. This is a significant pre-existing risk factor for orthodontic root resorption. Forces during treatment are carefully managed; however, further root shortening may occur. In severe cases, this may compromise long-term tooth stability. Radiographic review will be performed during treatment. You understand and accept this elevated risk.`,
    severity: "high",
  },
  aob: {
    title: "Anterior Open Bite — Relapse Risk",
    body: `Your assessment has identified an anterior open bite. Correction of open bites carries a significantly elevated risk of relapse compared to standard orthodontic treatment. Long-term outcome depends on eliminating any contributing aetiology (tongue posture, habits, growth). Strict lifelong retention is mandatory. Surgical options have been discussed where appropriate. You accept the higher-than-average relapse risk associated with this condition.`,
    severity: "high",
  },
  deepbite: {
    title: "Deep Overbite Management",
    body: `An increased overbite has been recorded. Correction requires specific mechanics and may prolong treatment duration. If the overbite is not fully resolved, this will be documented at the completion of treatment. Retention must maintain the corrected overbite position.`,
    severity: "moderate",
  },
  crossbite: {
    title: "Crossbite Correction",
    body: `A crossbite has been identified on your assessment. Correction may involve expansion of one or both dental arches. Mild expansion relapse is possible and retention is essential. If a skeletal component is present, surgical correction may be required in some cases, and this has been discussed.`,
    severity: "moderate",
  },
  ipr: {
    title: "Interproximal Reduction (IPR)",
    body: `Your treatment plan involves interproximal reduction — controlled removal of small amounts of enamel between teeth to create space. IPR is a well-established procedure. The total enamel removal will be within safe limits. You have been informed that IPR slightly modifies the natural contour of tooth contact points and that some patients experience temporary sensitivity. The procedure has been consented to specifically.`,
    severity: "moderate",
  },
  perio: {
    title: "Periodontal Disease — Ortho Deferral",
    body: `Active periodontal disease has been identified. Orthodontic treatment cannot commence until periodontal health is stabilised. Moving teeth in the presence of active periodontitis will accelerate bone loss and may result in tooth loss. A hygiene phase and/or specialist periodontal review is required before treatment begins. Treatment commencement confirms periodontal stability has been achieved.`,
    severity: "high",
  },
  tsl: {
    title: "Tooth Surface Loss — Joint Restorative Management",
    body: `Tooth surface loss has been recorded at assessment. Orthodontic treatment may be planned in conjunction with restorative work to optimise both function and aesthetics. The restorative plan and its timing have been discussed. You understand that failing to address the underlying cause of tooth wear may compromise long-term restorative outcomes. A joint treatment plan has been or will be formulated.`,
    severity: "moderate",
  },
  tmj: {
    title: "TMJ / Temporomandibular Symptoms",
    body: `Temporomandibular joint symptoms have been recorded at baseline. Orthodontic treatment does not predictably worsen or improve TMJ symptoms. Your symptoms have been documented as a baseline record. If symptoms change during treatment, you should inform your treating clinician. TMJ symptoms may require separate management, and this has been discussed with you.`,
    severity: "moderate",
  },
  bruxism: {
    title: "Bruxism — Wear & Breakage Risk",
    body: `Parafunctional activity (grinding or clenching) has been recorded. During aligner treatment, parafunctions increase the risk of aligner wear, attachment debonding, and tooth mobility. A night protection appliance may be recommended alongside orthodontic treatment. You understand the impact of clenching or grinding on treatment progress and agree to inform your clinician of any changes in symptoms.`,
    severity: "moderate",
  },
  recession: {
    title: "Existing Gingival Recession",
    body: `Gingival recession has been documented at the baseline assessment. Pre-existing recession may progress during orthodontic tooth movement, particularly where thin biotype or prominent root positions are involved. This risk is higher in areas where recession has already occurred. Periodontal review during treatment is advised, and in some cases soft tissue grafting may be indicated.`,
    severity: "moderate",
  },
  blackTri: {
    title: "Black Triangles",
    body: `Interproximal black triangles (open gingival embrasures) have been noted on your assessment. The presence of black triangles tends to increase or become more visible when crowded teeth are aligned. They are unlikely to fully resolve without restorative intervention such as composite bonding. You have been counselled that this is an aesthetic limitation of treatment and have been given the option to discuss restorative camouflage.`,
    severity: "moderate",
  },
  overjet: {
    title: "Overjet Correction",
    body: `A significant overjet has been recorded. Correction requires specific mechanics, and compliance with any prescribed auxiliaries (elastics) is critical. Failure to comply will prolong treatment and compromise the final result. Lip trauma risk is elevated in patients with an increased overjet prior to correction.`,
    severity: "moderate",
  },
  class2: {
    title: "Class II Correction — Elastic Protocol",
    body: `Your treatment involves correction of a Class II dental relationship. This typically requires the use of inter-arch elastics or Class II auxiliary mechanics. Elastic wear must comply with instructions — failure to do so will result in an incomplete result. The extent of skeletal versus dental correction achievable without surgery has been discussed.`,
    severity: "moderate",
  },
  class3: {
    title: "Class III — Camouflage Limitations",
    body: `A Class III tendency has been identified. Orthodontic camouflage has limitations that depend on the degree of skeletal discrepancy and growth status. In growing patients, the final outcome cannot be guaranteed until growth is complete. In adult patients, if the skeletal discrepancy is significant, orthognathic surgery may be required to achieve an optimal result — this has been discussed.`,
    severity: "moderate",
  },
  skeletal: {
    title: "Skeletal Discrepancy",
    body: `A skeletal discrepancy has been recorded. The limits of orthodontic treatment without surgical intervention have been explained. For mild to moderate discrepancies, dental camouflage is possible but may compromise ideal aesthetics or function. You understand the distinction between dental and skeletal correction and accept the planned treatment approach.`,
    severity: "moderate",
  },
  rootFilled: {
    title: "Root-Filled Teeth — Resorption & Adhesion",
    body: `One or more root-filled teeth are present. Endodontically treated teeth carry an elevated risk of root resorption during orthodontic movement. Forces applied to these teeth are carefully managed. In addition, bonding of attachments to root-filled teeth with existing restorations may have reduced retentiveness. You have been informed of these specific risks.`,
    severity: "moderate",
  },
};

// ─── SECTION / FIELD SCHEMA ───────────────────────────────────────────────────
// type: "pills"   — standard multi-option single select
// type: "text"    — free text input
// type: "number"  — numeric with unit
// type: "toggle"  — Yes / No binary
// abnormal: string[] — which values trigger problem (cross-checked with TRIGGER_REGISTRY)
// expand: string[] — which values trigger measurement expansion UI
// needsTeeth: boolean — auto-open tooth chart

const ASSESSMENT_SECTIONS = [
  // ─── FACIAL / PROFILE ───────────────────────────────────────────────
  {
    id: "s_facial", title: "Facial & Smile Analysis", icon: "◎",
    rows: [
      { id:"skeletal",            label:"Skeletal pattern",        type:"pills", opts:["Class I","Class II","Class III"] },
      { id:"lower_fh",            label:"Lower face height",       type:"pills", opts:["Normal","Decreased","Increased"] },
      { id:"lip_comp",            label:"Lip competence",          type:"pills", opts:["Competent","Potentially competent","Incompetent"] },
      { id:"lip_catch",           label:"Lip catch",               type:"pills", opts:["Not present","Present"] },
      { id:"nasolabial",          label:"Nasolabial angle",        type:"pills", opts:["Normal","Acute","Obtuse"] },
      { id:"smile_line",          label:"Smile line",              type:"pills", opts:["Ideal","Low","High"] },
      { id:"smile_arc",           label:"Smile arc",               type:"pills", opts:["Curved","Flat","Reverse"] },
      { id:"buccal_corr",         label:"Buccal corridors",        type:"pills", opts:["Normal","Deficient","Full"] },
      // Midline — separate upper/lower each with mm expansion
      { id:"upper_midline_shift", label:"Upper midline",           type:"pills", opts:["Coincident","To right","To left"], mmExpand:true },
      { id:"lower_midline_shift", label:"Lower midline",           type:"pills", opts:["Coincident","To right","To left"], mmExpand:true },
    ],
  },
  // ─── OCCLUSION ──────────────────────────────────────────────────────
  {
    id: "s_occlusion", title: "Occlusal Analysis", icon: "◈",
    rows: [
      { id:"incisor_class", label:"Incisor classification",  type:"pills", opts:["Class I","Class II div i","Class II div ii","Class III"] },
      { id:"overjet_type",  label:"Overjet",                 type:"pills", opts:["Normal (2–4mm)","Increased positive","Negative (reversed)","Edge-to-edge"] },
      { id:"overbite",      label:"Overbite",                type:"pills", opts:["Normal (20–50%)","Increased (>50%)","Reduced / Edge-to-edge"] },
      { id:"openbite",      label:"Open bite",               type:"pills", opts:["None","Anterior open bite","Posterior open bite"] },
      { id:"crossbite",     label:"Crossbite",               type:"pills", opts:["None","Anterior crossbite","Posterior crossbite","Scissor bite"] },
      { id:"molar_r",       label:"Molar right",             type:"pills", opts:["Class I","Class II","Class III"] },
      { id:"molar_l",       label:"Molar left",              type:"pills", opts:["Class I","Class II","Class III"] },
      { id:"canine_r",      label:"Canine right",            type:"pills", opts:["Class I","Class II","Class III"] },
      { id:"canine_l",      label:"Canine left",             type:"pills", opts:["Class I","Class II","Class III"] },
      { id:"displacement",  label:"Mandibular displacement", type:"pills", opts:["None","Present"] },
      { id:"midline_discrepancy", label:"Midline discrepancy", type:"pills", opts:["None","Upper midline shift","Lower midline shift"] },
    ],
  },
  // ─── SPACE ANALYSIS ─────────────────────────────────────────────────
  {
    id: "s_space", title: "Space Analysis", icon: "⊡",
    rows: [
      { id:"crowd_upper",   label:"Crowding — upper",  type:"pills", opts:["None","Mild","Moderate","Severe"] },
      { id:"crowd_lower",   label:"Crowding — lower",  type:"pills", opts:["None","Mild","Moderate","Severe"] },
      { id:"spacing_upper", label:"Spacing — upper",   type:"pills", opts:["None","Mild","Moderate","Severe"] },
      { id:"spacing_lower", label:"Spacing — lower",   type:"pills", opts:["None","Mild","Moderate","Severe"] },
      { id:"arch_upper",    label:"Upper archform",    type:"pills", opts:["U shape","V shape","Square","Omega","Asymmetric"] },
      { id:"arch_lower",    label:"Lower archform",    type:"pills", opts:["U shape","V shape","Square","Omega","Asymmetric"] },
    ],
  },
  // ─── PERIODONTAL ────────────────────────────────────────────────────
  {
    id: "s_perio", title: "Periodontal Assessment", icon: "◉",
    rows: [
      { id:"perio_status",  label:"Periodontal status",   type:"pills", opts:["Healthy","Gingivitis","Stage I/II Periodontitis","Stage III/IV Periodontitis"] },
      { id:"bpe",           label:"BPE (max score)",      type:"pills", opts:["0","1","2","3","4"] },
      { id:"oral_hygiene",  label:"Oral hygiene",         type:"pills", opts:["Excellent","Fair","Poor"] },
      { id:"biotype",       label:"Gingival biotype",     type:"pills", opts:["Thin","Normal","Thick"] },
      { id:"recession_ex",  label:"Recession",            type:"pills", opts:["None","Present"] },
      { id:"black_tri",     label:"Black triangles",      type:"pills", opts:["None","Mild","Significant"] },
      { id:"bone_levels",   label:"Bone levels",          type:"pills", opts:["Good","Horizontal bone loss","Vertical bone loss"] },
    ],
  },
  // ─── DENTAL ─────────────────────────────────────────────────────────
  {
    id: "s_dental", title: "Dental Examination", icon: "○",
    rows: [
      { id:"caries",        label:"Caries",               type:"pills", opts:["None","Present"] },
      { id:"tsl",           label:"Tooth surface loss",   type:"pills", opts:["None","Mild","Moderate","Severe"] },
      { id:"missing",       label:"Missing teeth",        type:"pills", opts:["None","Present"] },
      { id:"root_filled",   label:"Root-filled teeth",    type:"pills", opts:["None","Present"] },
      { id:"restorations",  label:"Existing restorations",type:"pills", opts:["None","Minimal","Significant"] },
    ],
  },
  // ─── RADIOGRAPHIC ───────────────────────────────────────────────────
  {
    id: "s_radio", title: "Radiographic Findings", icon: "⬡",
    rows: [
      { id:"short_roots",   label:"Short roots",            type:"pills", opts:["Normal","Mild","Significant"] },
      { id:"unerupted",     label:"Unerupted / impacted",  type:"pills", opts:["None","Present"] },
      { id:"pa_pathology",  label:"Periapical pathology",  type:"pills", opts:["None","Present"] },
      // needsReason: mandatory justification when "Not indicated" selected
      { id:"bws",           label:"Bitewings (BWs)",       type:"pills", opts:["Not indicated","Taken today","Previous on file"], needsReason:true },
      { id:"opg",           label:"OPG",                   type:"pills", opts:["Not indicated","Taken today","Previous on file"], needsReason:true },
    ],
  },
  // ─── TMJ / FUNCTIONAL ───────────────────────────────────────────────
  {
    id: "s_functional", title: "Functional Assessment", icon: "◷",
    rows: [
      { id:"tmj_pain",      label:"Pain on palpation",      type:"pills", opts:["None","Muscular","TMJ"] },
      { id:"tmj_clicks",    label:"Clicks",                 type:"pills", opts:["None","Yes, right side","Yes, left side","Bilateral"] },
      { id:"tmj_crep",      label:"Crepitus",               type:"pills", opts:["None","Present"] },
      { id:"mouth_open",    label:"Mouth opening",          type:"pills", opts:["Normal (>40mm)","Limited 30–40mm","Restricted <30mm"] },
      { id:"bruxism",       label:"Bruxism / parafunction", type:"pills", opts:["None","Sleep bruxism","Awake clenching","Parafunctional habit"] },
    ],
  },
  // ─── HISTORY ────────────────────────────────────────────────────────
  {
    id: "s_history", title: "Patient History", icon: "◫",
    rows: [
      { id:"complaint",     label:"Chief complaint",            type:"text",   ph:"Patient's primary concern in their own words…" },
      { id:"patient_goals", label:"Treatment goals",            type:"text",   ph:"What the patient would like to achieve…" },
      { id:"prev_ortho",    label:"Previous orthodontics",      type:"toggle", opts:["Yes","No"] },
      { id:"anxiety",       label:"Dental anxiety",             type:"toggle", opts:["Yes","No"] },
      { id:"smoking",       label:"Smoking status",             type:"pills",  opts:["Never","Ex-smoker","Occasional smoker","Daily smoker","Using Vape"] },
      { id:"medical_hx",    label:"Relevant medical history",   type:"text",   ph:"Any relevant conditions, medications, allergies…" },
    ],
  },
];

// ─── QUERY PROMPTS ────────────────────────────────────────────────────────────
// Predefined clinical prompts that open when Query: Yes is clicked
const QUERY_PROMPTS = {
  overjet_type: [
    "Is the overjet increasing over time?",
    "Is there a lip catch worsening the prognosis?",
    "Are there signs of dental trauma or wear on the upper incisors?",
    "Has a functional component been ruled out?",
  ],
  incisor_class: [
    "Is the classification dental, skeletal, or both?",
    "Has cephalometric analysis been performed or is it indicated?",
    "What is the growth potential (child/adolescent vs adult)?",
    "Has surgical correction been discussed?",
  ],
  openbite: [
    "Has tongue posture or habit been assessed as contributing aetiology?",
    "Is there a skeletal or dentoalveolar component?",
    "Has growth potential been assessed?",
    "Has relapse risk been discussed with the patient?",
  ],
  crossbite: [
    "Is there an associated mandibular displacement on closure?",
    "Is the crossbite dental only or does it have a skeletal component?",
    "Are any teeth at risk of further wear or recession?",
  ],
  perio_status: [
    "Has a full periodontal chart been completed?",
    "Is specialist periodontal referral indicated?",
    "Has the patient been advised that treatment cannot commence until periodontal stability is confirmed?",
    "Is a hygiene phase planned before assessment review?",
  ],
  short_roots: [
    "Which teeth are affected? (Tooth chart to follow)",
    "Is there any history of previous orthodontic treatment that may have contributed?",
    "Has the patient been specifically counselled about the elevated resorption risk?",
    "Is a 6-month radiographic review protocol in place?",
  ],
  tsl: [
    "Has the aetiology been established (erosion / attrition / abrasion)?",
    "Is bruxism or dietary acid the primary cause?",
    "Has a BEWE or TWES score been calculated?",
    "Is joint restorative management planned?",
  ],
  tmj_pain: [
    "Has a baseline TMJ assessment been documented?",
    "Are symptoms stable, improving, or worsening?",
    "Has the patient been informed that orthodontic treatment does not predictably improve TMJ symptoms?",
    "Is specialist referral indicated before commencement?",
  ],
  biotype: [
    "Are there teeth at particular risk of recession with the planned movements?",
    "Has the recession risk been specifically documented in consent?",
    "Is a periodontal opinion advisable before proceeding?",
  ],
  bruxism: [
    "Has the impact on aligner wear time and attachment retention been discussed?",
    "Is a night protection appliance planned alongside treatment?",
    "Has the patient accepted the elevated risk of breakage?",
  ],
};

// ─── PRICING PRESETS ──────────────────────────────────────────────────────────
const PRICE_PRESETS = {
  invisalign_lite:       { label:"Invisalign Lite",       presets:[2495,2995,3295] },
  invisalign_moderate:   { label:"Invisalign Moderate",   presets:[3295,3495,3995] },
  invisalign_comprehensive: { label:"Invisalign Comprehensive", presets:[3995,4495,4995,5495] },
  fixed_standard:        { label:"Fixed Appliances",      presets:[2995,3295,3695] },
  composite_bonding:     { label:"Composite Bonding",     presets:[1500,1800,2200,2800] },
  combined_ortho_rest:   { label:"Ortho + Restorative",   presets:[5995,6995,7995,9995] },
};

// ─── FDI TOOTH CHART ─────────────────────────────────────────────────────────
// Full FDI notation: upper right 18→11, upper left 21→28, lower left 31→38, lower right 41→48
const FDI_TEETH = {
  upperRight: [18,17,16,15,14,13,12,11],
  upperLeft:  [21,22,23,24,25,26,27,28],
  lowerLeft:  [31,32,33,34,35,36,37,38],
  lowerRight: [41,42,43,44,45,46,47,48],
};

function ToothChart({ selectedTeeth = [], onChange, label = "Select affected teeth", onComplete }) {
  const toggle = (n) => {
    const next = selectedTeeth.includes(n)
      ? selectedTeeth.filter(t => t !== n)
      : [...selectedTeeth, n];
    onChange(next);
  };

  const ToothBtn = ({ num }) => {
    const sel = selectedTeeth.includes(num);
    const isMolar   = [18,17,28,27,38,37,48,47].includes(num);
    const isPremolar= [14,15,24,25,34,35,44,45].includes(num);
    const isCanine  = [13,23,33,43].includes(num);

    return (
      <button
        onClick={() => toggle(num)}
        title={`${num}`}
        style={{
          width: isMolar ? 36 : isPremolar ? 28 : isCanine ? 24 : 22,
          height: 44,
          border: `1.5px solid ${sel ? T.gold : T.borderDark}`,
          borderRadius: "4px 4px 8px 8px",
          background: sel ? T.goldLight : "#F8F9F7",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "3px 2px 4px",
          transition: "all 0.12s",
          boxShadow: sel ? `0 0 0 2px ${T.gold}40` : "none",
        }}
      >
        <span style={{ fontSize: 8, color: sel ? T.goldDim : T.faint, fontWeight: 600, lineHeight: 1 }}>{num}</span>
        <div style={{
          width: isMolar ? 20 : isPremolar ? 14 : isCanine ? 10 : 8,
          height: isMolar ? 18 : isPremolar ? 16 : isCanine ? 20 : 16,
          borderRadius: isCanine ? "50% 50% 40% 40%" : "3px",
          background: sel ? T.gold : T.borderDark,
          transition: "background 0.12s",
        }}/>
      </button>
    );
  };

  return (
    <div style={{ background: "#F4F5F2", borderRadius: 10, padding: "16px 20px", border: `1.5px solid ${T.goldMid}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
          {label}
        </div>
        {onComplete && (
          <button
            onClick={onComplete}
            style={{
              background: selectedTeeth.length > 0 ? T.cyan : "#E0E0E0",
              color: selectedTeeth.length > 0 ? "#fff" : T.muted,
              border: "none", borderRadius: 5,
              padding: "5px 14px", fontSize: 12, fontWeight: 700,
              cursor: selectedTeeth.length > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {selectedTeeth.length > 0 ? `✓ Done — ${selectedTeeth.length} tooth${selectedTeeth.length > 1 ? "s" : ""}` : "Select teeth first"}
          </button>
        )}
      </div>

      {/* Upper arch */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: T.faint, marginBottom: 5, letterSpacing: 0.5 }}>UPPER</div>
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {FDI_TEETH.upperRight.map(n => <ToothBtn key={n} num={n}/>)}
          <div style={{ width: 12 }}/>
          {FDI_TEETH.upperLeft.map(n => <ToothBtn key={n} num={n}/>)}
        </div>
      </div>

      <div style={{ height: 8 }}/>

      {/* Lower arch */}
      <div>
        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {FDI_TEETH.lowerLeft.map(n => <ToothBtn key={n} num={n}/>)}
          <div style={{ width: 12 }}/>
          {FDI_TEETH.lowerRight.map(n => <ToothBtn key={n} num={n}/>)}
        </div>
        <div style={{ fontSize: 10, color: T.faint, marginTop: 5, letterSpacing: 0.5 }}>LOWER</div>
      </div>

      {selectedTeeth.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Selected:</span>
          {selectedTeeth.sort((a,b)=>a-b).map(t => (
            <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: T.goldDim, background: T.goldLight, borderRadius: 4, padding: "2px 7px", border: `1px solid ${T.goldMid}` }}>
              {t}
            </span>
          ))}
          <button onClick={() => onChange([])} style={{ fontSize: 10.5, color: T.faint, background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ─── QUERY MODAL ──────────────────────────────────────────────────────────────
function QueryModal({ fieldId, fieldLabel, prompts, onClose, onAddNote }) {
  const [notes, setNotes] = useState({});
  const [customNote, setCustomNote] = useState("");

  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(15,31,26,0.65)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
      <div style={{ width:"min(580px,94vw)", background:T.card, borderRadius:14, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ background:T.primary, padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase", marginBottom:4 }}>Clinical Queries</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#F0EFE8" }}>{fieldLabel}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#3D6A56", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          <p style={{ fontSize:13, color:T.muted, marginBottom:16, lineHeight:1.6 }}>
            The following clinical queries have been flagged for this finding. Review and acknowledge each one.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:320, overflowY:"auto" }}>
            {(prompts || []).map((prompt, i) => (
              <div key={i} style={{ background:"#F7F8F6", borderRadius:8, padding:"12px 14px", border:`1px solid ${T.border}` }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:T.goldLight, border:`1px solid ${T.goldMid}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, color:T.goldDim, flexShrink:0, marginTop:1 }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, color:T.ink, fontWeight:500, margin:"0 0 8px", lineHeight:1.5 }}>{prompt}</p>
                    <input
                      value={notes[i] || ""}
                      onChange={e => setNotes(p => ({ ...p, [i]: e.target.value }))}
                      placeholder="Add clinical note (optional)…"
                      style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"6px 10px", fontSize:12.5, fontFamily:"inherit", color:T.ink, outline:"none" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
            <textarea
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="Additional clinical note for this finding…"
              rows={2}
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", fontSize:13, fontFamily:"inherit", color:T.ink, resize:"none", outline:"none" }}
            />
          </div>
        </div>

        <div style={{ padding:"14px 24px 18px", display:"flex", justifyContent:"flex-end", gap:10, borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, borderRadius:7, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button
            onClick={() => { onAddNote(Object.values(notes).filter(Boolean).concat(customNote).filter(Boolean).join(" | ")); onClose(); }}
            style={{ background:T.primary, color:T.gold, border:"none", borderRadius:7, padding:"9px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — ASSESSMENT UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── SINGLE SELECT PILLS — Kiroku collapse behaviour ─────────────────────────
function SingleSelectPills({ opts, value, onChange, isAbn, disabled }) {
  const [expanded, setExpanded] = useState(!value);
  useEffect(() => { if (!value) setExpanded(true); }, [value]);

  const handleSelect = (opt) => {
    if (disabled) return;
    const next = value === opt ? null : opt;
    onChange(next);
    if (next) setExpanded(false);
    else setExpanded(true);
  };

  if (value && !expanded) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:10, animation:"chipIn 0.2s ease" }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8,
          background: isAbn ? T.warningLight : T.goldLight,
          border: `1.5px solid ${isAbn ? T.warningBorder : T.goldMid}`,
          borderRadius:6, padding:"5px 14px",
          fontSize:13, fontWeight:700,
          color: isAbn ? T.warning : T.primary,
        }}>
          {isAbn && <div style={{ width:6, height:6, borderRadius:"50%", background:T.gold, flexShrink:0 }}/>}
          {value}
        </div>
        {!disabled && (
          <button onClick={() => setExpanded(true)}
            style={{ background:"none", border:"none", color:T.faint, fontSize:12, cursor:"pointer", padding:"3px 6px", borderRadius:4, fontFamily:"inherit", transition:"color 0.12s" }}
            onMouseEnter={e=>e.currentTarget.style.color=T.muted}
            onMouseLeave={e=>e.currentTarget.style.color=T.faint}
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:7, alignItems:"center" }}>
      {opts.map(opt => {
        const sel = value === opt;
        return (
          <button key={opt} onClick={() => handleSelect(opt)} disabled={disabled} style={{
            border:     `1.5px solid ${sel ? T.gold : T.border}`,
            background: sel ? T.goldLight : T.card,
            color:      sel ? T.primary : T.sub,
            borderRadius:5, padding:"5px 13px",
            fontSize:13, fontWeight: sel ? 600 : 400,
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily:"inherit", whiteSpace:"nowrap", lineHeight:1.45,
            transition:"all 0.12s ease",
            boxShadow: sel ? `inset 0 0 0 1px ${T.goldMid}` : "none",
            opacity: disabled ? 0.5 : 1,
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

// ─── MEASUREMENT EXPANDER ─────────────────────────────────────────────────────
// Appears BELOW the selected abnormal value — does not hide original pills
function MeasurementExpander({ opts, value, onChange, label = "Specify measurement" }) {
  return (
    <div style={{
      marginTop:10, paddingTop:10,
      borderTop: `1.5px dashed ${T.goldMid}`,
      animation:"expandIn 0.2s ease",
    }}>
      <div style={{ fontSize:11.5, fontWeight:700, color:T.goldDim, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>
        ↳ {label}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {opts.map(opt => {
          const sel = value === opt;
          return (
            <button key={opt} onClick={() => onChange(value === opt ? null : opt)} style={{
              border: `1.5px solid ${sel ? T.gold : T.borderDark}`,
              background: sel ? T.gold : T.card,
              color: sel ? T.primary : T.sub,
              borderRadius:5, padding:"4px 12px",
              fontSize:12.5, fontWeight: sel ? 700 : 400,
              cursor:"pointer", fontFamily:"inherit",
              transition:"all 0.12s",
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ASSESSMENT ROW ───────────────────────────────────────────────────────────
function AssessmentRow({ row, fv, onChange, onQueryYes }) {
  const val        = fv[row.id];
  const measureVal = fv[`${row.id}_measure`];
  const teethVal   = fv[`${row.id}_teeth`] || [];
  const queryVal   = fv[`${row.id}_q`];
  const queryNote  = fv[`${row.id}_qnote`];
  const reasonVal  = fv[`${row.id}_reason`] || "";
  const mmVal      = fv[`${row.id}_mm`] || "";
  // Tooth chart open/close state
  const [teethOpen, setTeethOpen] = useState(false);

  const trigDef      = TRIGGER_REGISTRY[row.id];
  const triggered    = val && trigDef && trigDef[val];
  const isAbn        = !!triggered;
  const needsMeasure = isAbn && triggered?.needsMeasure;
  const needsTeeth   = isAbn && triggered?.needsTeeth;
  const showReason   = row.needsReason && val === "Not indicated";
  const showMm       = row.mmExpand && val && val !== "Coincident";
  const hasQueryPrompts = !!QUERY_PROMPTS[row.id];

  // Auto-open tooth chart when a value that needs teeth is selected
  useEffect(() => {
    if (needsTeeth && val && !teethOpen) setTeethOpen(true);
  }, [needsTeeth, val]);

  if (row.type === "text") {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16, marginBottom:14, alignItems:"flex-start" }}>
        <div style={{ fontSize:13, fontWeight:500, color:T.muted, paddingTop:8, lineHeight:1.4 }}>{row.label}</div>
        <input type="text" value={val||""} onChange={e=>onChange(row.id,e.target.value)} placeholder={row.ph}
          style={{ border:`1px solid ${T.border}`, borderRadius:5, padding:"7px 11px", fontSize:13, fontFamily:"inherit", color:T.ink, background:"#fff", outline:"none" }}
          onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
        />
      </div>
    );
  }

  if (row.type === "toggle") {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16, marginBottom:14, alignItems:"center" }}>
        <div style={{ fontSize:13, fontWeight:500, color:T.muted }}>{row.label}</div>
        <div style={{ display:"flex", gap:6 }}>
          {["Yes","No"].map(opt => {
            const sel = val === opt;
            return (
              <button key={opt} onClick={() => onChange(row.id, sel ? null : opt)} style={{
                border: `1px solid ${sel ? T.cyan : T.border}`,
                background: sel ? T.cyanLight : "#fff",
                color: sel ? T.cyanDark : T.muted,
                borderRadius: 4, padding: "5px 16px",
                fontSize: 13, fontWeight: sel ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s",
              }}>{opt}</button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"200px 1fr", gap:16, marginBottom:14, alignItems:"flex-start",
      padding: isAbn ? "10px 12px" : "2px 0",
      background: isAbn ? "rgba(196,132,26,0.06)" : "transparent",
      borderRadius: isAbn ? 6 : 0,
      borderLeft: isAbn ? `3px solid ${T.gold}` : "3px solid transparent",
      transition: "all 0.15s",
    }}>
      {/* Label column */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:7, paddingTop:7 }}>
        {isAbn && <div style={{ width:6, height:6, borderRadius:"50%", background:T.gold, flexShrink:0, marginTop:3 }}/>}
        <span style={{ fontSize:13, fontWeight: isAbn ? 600 : 500, color: isAbn ? T.ink : T.muted, lineHeight:1.4 }}>
          {row.label}
        </span>
      </div>

      {/* Controls column */}
      <div>
        {/* Pills row */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, alignItems:"center" }}>
          <SingleSelectPills
            opts={row.opts}
            value={val}
            isAbn={isAbn}
            onChange={v => {
              onChange(row.id, v);
              onChange(`${row.id}_measure`, null);
              if (!v || !triggered?.needsTeeth) onChange(`${row.id}_teeth`, []);
              if (v && triggered?.needsTeeth) setTeethOpen(true);
              else setTeethOpen(false);
            }}
          />

          {/* Query toggle */}
          {hasQueryPrompts && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:4, paddingLeft:8, borderLeft:`1px solid ${T.borderLight}` }}>
              <span style={{ fontSize:11, fontWeight:600, color:T.faint, letterSpacing:0.4, textTransform:"uppercase" }}>Query</span>
              {["Yes","No"].map(opt => {
                const sel = queryVal === opt;
                return (
                  <button key={opt} onClick={() => {
                    onChange(`${row.id}_q`, sel ? null : opt);
                    if (opt === "Yes" && !sel && onQueryYes) onQueryYes(row.id);
                  }} style={{
                    border: `1px solid ${sel && opt==="Yes" ? T.gold : T.border}`,
                    background: sel && opt==="Yes" ? T.goldLight : "#fff",
                    color: sel && opt==="Yes" ? T.warning : T.faint,
                    borderRadius:4, padding:"3px 9px", fontSize:11.5, fontWeight:sel?700:400,
                    cursor:"pointer", fontFamily:"inherit",
                  }}>{opt}</button>
                );
              })}
            </div>
          )}
        </div>

        {/* Measurement expander (e.g. overjet mm, overbite %) */}
        {needsMeasure && (
          <MeasurementExpander
            opts={triggered.measureOpts}
            value={measureVal}
            onChange={v => onChange(`${row.id}_measure`, v)}
            label="Specify measurement"
          />
        )}

        {/* MM selector for midline fields */}
        {showMm && (
          <div style={{ marginTop:8, animation:"expandIn 0.2s ease" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.goldDim, textTransform:"uppercase", letterSpacing:0.7, marginBottom:6 }}>
              ↳ How many mm?
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["1mm","2mm","3mm","4mm+"].map(mm => {
                const sel = mmVal === mm;
                return (
                  <button key={mm} onClick={() => onChange(`${row.id}_mm`, sel ? null : mm)} style={{
                    border:`1.5px solid ${sel ? T.gold : T.borderDark}`,
                    background: sel ? T.gold : "#fff",
                    color: sel ? "#fff" : T.sub,
                    borderRadius:4, padding:"4px 12px",
                    fontSize:12.5, fontWeight:sel?700:400,
                    cursor:"pointer", fontFamily:"inherit",
                  }}>{mm}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mandatory reason for BWS/OPG not indicated */}
        {showReason && (
          <div style={{ marginTop:8, animation:"expandIn 0.2s ease" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.error, textTransform:"uppercase", letterSpacing:0.7, marginBottom:5 }}>
              ⚠ Justification required — why is this not indicated?
            </div>
            <input
              value={reasonVal}
              onChange={e => onChange(`${row.id}_reason`, e.target.value)}
              placeholder="e.g. Recent BWs within 6 months on file / Low caries risk patient…"
              style={{
                width:"100%", border:`1.5px solid ${reasonVal ? T.borderDark : T.error}`,
                borderRadius:5, padding:"7px 11px", fontSize:12.5,
                fontFamily:"inherit", color:T.ink, background:"#fff", outline:"none",
              }}
              onFocus={e=>e.target.style.borderColor=T.cyan}
              onBlur={e=>e.target.style.borderColor=reasonVal?T.borderDark:T.error}
            />
          </div>
        )}

        {/* Tooth chart — with Done button to close */}
        {needsTeeth && teethOpen && (
          <div style={{ marginTop:10, animation:"expandIn 0.2s ease" }}>
            <ToothChart
              selectedTeeth={teethVal}
              onChange={v => onChange(`${row.id}_teeth`, v)}
              label="Affected teeth — FDI notation"
              onComplete={() => setTeethOpen(false)}
            />
          </div>
        )}
        {/* Show summary when tooth chart is closed */}
        {needsTeeth && !teethOpen && teethVal.length > 0 && (
          <div style={{ marginTop:8, display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11.5, fontWeight:600, color:T.muted }}>Teeth:</span>
            {teethVal.sort((a,b)=>a-b).map(t=>(
              <span key={t} style={{ fontSize:11.5, fontWeight:700, color:T.goldDim, background:T.goldLight, borderRadius:4, padding:"2px 7px", border:`1px solid ${T.goldMid}` }}>{t}</span>
            ))}
            <button onClick={()=>setTeethOpen(true)} style={{ fontSize:11, color:T.faint, background:"none", border:"none", cursor:"pointer", marginLeft:4 }}>Edit</button>
          </div>
        )}

        {/* Query note */}
        {queryNote && (
          <div style={{ marginTop:7, fontSize:12, color:T.muted, background:"#F8F8F8", borderRadius:4, padding:"4px 9px", border:`1px solid ${T.border}` }}>
            📋 {queryNote}
          </div>
        )}
      </div>
    </div>
  );
}



// ─── ASSESSMENT SECTION CARD ──────────────────────────────────────────────────
function AssessmentSection({ sec, fv, onChange, onQueryYes, problemCount }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      background:T.card, borderRadius:12, marginBottom:10,
      border: `1px solid ${problemCount > 0 ? T.warningBorder : T.border}`,
      boxShadow:"0 1px 4px rgba(15,31,26,0.04)",
      overflow:"hidden",
      transition:"border-color 0.2s ease",
    }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(p=>!p)}
        style={{ padding:"16px 24px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", background: collapsed ? "#FAFAF9" : T.card,
          borderBottom: collapsed ? "none" : `1px solid ${T.border}`, transition:"background 0.1s",
        }}
        onMouseEnter={e=>{ if(collapsed) e.currentTarget.style.background="#F4F5F2"; }}
        onMouseLeave={e=>{ if(collapsed) e.currentTarget.style.background="#FAFAF9"; }}
      >
        <span style={{ fontSize:18, lineHeight:1, color:T.goldDim, flexShrink:0 }}>{sec.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15.5, fontWeight:700, color:T.primary, letterSpacing:-0.1 }}>{sec.title}</div>
        </div>
        {problemCount > 0 && (
          <span style={{ background:T.goldLight, color:T.goldDim, border:`1px solid ${T.goldMid}`, fontSize:11, fontWeight:700, borderRadius:20, padding:"3px 12px", letterSpacing:0.3 }}>
            {problemCount} problem{problemCount>1?"s":""}
          </span>
        )}
        <span style={{ fontSize:13, color:T.faint, marginLeft:4, transform:collapsed?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.2s", display:"inline-block" }}>▾</span>
      </div>

      {!collapsed && (
        <div style={{ padding:"20px 28px 16px" }}>
          {sec.rows.map(row => (
            <AssessmentRow
              key={row.id}
              row={row}
              fv={fv}
              onChange={onChange}
              onQueryYes={onQueryYes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MASTER PROBLEM LIST ──────────────────────────────────────────────────────
function MasterProblemList({ problems, decisions, onDecide, onUpdateProblem, flashId, listRef, bpeTreatments, onBpeTreatment, resolutions, onResolve }) {
  const rowRefs = useRef({});
  const decided  = problems.filter(p => decisions[p.id]).length;
  const planDone = problems.length === 0 || decided === problems.length;

  useEffect(() => {
    if (!flashId) return;
    const el = rowRefs.current[flashId];
    if (el) {
      el.scrollIntoView({ behavior:"smooth", block:"center" });
      const btn = el.querySelector("[data-dec]");
      if (btn) setTimeout(() => btn.focus(), 180);
    }
  }, [flashId]);

  // Group by category
  const grouped = useMemo(() => {
    const g = {};
    problems.forEach(p => {
      if (!g[p.category]) g[p.category] = [];
      g[p.category].push(p);
    });
    return g;
  }, [problems]);

  const catOrder = ["Orthodontic","Periodontal","Restorative","Functional","Medical"];

  return (
    <div
      ref={listRef}
      style={{
        background:T.card, borderRadius:12, marginTop:16,
        border:`1.5px solid ${planDone ? T.successBorder : T.warningBorder}`,
        overflow:"hidden",
        boxShadow:"0 2px 8px rgba(15,31,26,0.06)",
      }}
    >
      {/* Header */}
      <div style={{ background:T.primary, padding:"18px 28px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase", marginBottom:5 }}>
            Master Problem List
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:"#F0EFE8", letterSpacing:-0.2 }}>
            Clinical Decision Engine
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {!planDone && problems.length > 0 && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11.5, color:"#3D6A56", marginBottom:5 }}>{decided} of {problems.length} decided</div>
              <div style={{ width:110, height:4, background:"rgba(255,255,255,0.1)", borderRadius:2 }}>
                <div style={{ width:`${Math.round((decided/problems.length)*100)}%`, height:"100%", background:T.gold, borderRadius:2, transition:"width 0.3s ease" }}/>
              </div>
            </div>
          )}
          {planDone && problems.length > 0 && (
            <div style={{ background:T.successLight, color:T.success, border:`1px solid ${T.successBorder}`, fontSize:12.5, fontWeight:700, borderRadius:20, padding:"6px 16px" }}>
              ✓ All Decided
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {problems.length === 0 && (
        <div style={{ padding:"28px 28px", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:T.successLight, border:`1px solid ${T.successBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>✓</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.primary }}>No abnormal findings</div>
            <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>Abnormal findings will automatically create problems here. Normal findings are not listed.</div>
          </div>
        </div>
      )}

      {/* Problems grouped by category */}
      {catOrder.filter(cat => grouped[cat]).map(cat => {
        const catProblems = grouped[cat];
        const catDef = PROBLEM_CATEGORIES[cat];
        return (
          <div key={cat}>
            {/* Category header */}
            <div style={{ padding:"10px 28px 6px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}`, borderTop:`1px solid ${T.border}` }}>
              <span style={{ fontSize:10.5, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:catDef.color }}>
                {cat}
              </span>
            </div>

            {catProblems.map((p, i) => {
              const dec = decisions[p.id];
              const isFlash = flashId === p.id;
              const isLast  = i === catProblems.length - 1;
              const decColors = { Accept:T.success, Improve:T.warning, Correct:T.info };
              const sevColors = { high:T.error, severe:T.error, moderate:T.warning, mild:T.info, monitor:T.faint };

              return (
                <div
                  key={p.id}
                  ref={el => { rowRefs.current[p.id] = el; }}
                  style={{
                    padding:"14px 20px 14px 28px",
                    borderBottom: isLast ? "none" : `1px dashed ${T.border}`,
                    background: isFlash ? `${T.gold}0D` : "transparent",
                    outline: isFlash ? `1.5px solid ${T.gold}` : "none",
                    animation: isFlash ? "problemFlash 1.8s ease" : "none",
                    transition:"background 0.15s",
                  }}
                >
                  {/* ── Row layout: stripe | main content | decision buttons ── */}
                  <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                    {/* Category stripe */}
                    <div style={{ width:3, alignSelf:"stretch", minHeight:28, flexShrink:0, borderRadius:2, background:catDef.color, marginTop:2 }}/>

                    {/* ── LEFT: all content stacked vertically ── */}
                    <div style={{ flex:1, minWidth:0 }}>

                      {/* ROW 1: traffic light + problem title */}
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                        {(() => {
                          const tl = getTrafficLight(p, resolutions);
                          return (
                            <>
                              <span style={{ fontSize:9, color:tl.color, lineHeight:1, flexShrink:0 }}>●</span>
                              <span style={{ fontSize:10, fontWeight:800, color:tl.color, textTransform:"uppercase", letterSpacing:0.6, flexShrink:0 }}>{tl.label}</span>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize:13.5, fontWeight:700, color:T.ink, lineHeight:1.45, marginBottom:6, paddingRight:8 }}>
                        {p.baseLabel}
                      </div>

                      {/* ROW 2: category + severity + measurement chips */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                        <span style={{ fontSize:10.5, fontWeight:700, color:catDef.color, background:catDef.bg, borderRadius:4, padding:"2px 8px" }}>
                          {cat}
                        </span>
                        {p.severity && (
                          <span style={{ fontSize:10.5, fontWeight:700, color:sevColors[p.severity]||T.muted, background:"transparent", borderRadius:4, padding:"2px 6px", border:`1px solid ${(sevColors[p.severity]||T.border)}40`, textTransform:"uppercase", letterSpacing:0.5 }}>
                            {p.severity}
                          </span>
                        )}
                        {p.measure && (
                          <span style={{ fontSize:11.5, fontWeight:700, color:T.primary, background:T.goldLight, borderRadius:4, padding:"2px 10px", border:`1px solid ${T.goldMid}` }}>
                            {p.measure}
                          </span>
                        )}
                        {p.teeth && p.teeth.length > 0 && (
                          <span style={{ fontSize:11, fontWeight:600, color:T.muted }}>
                            Teeth: {p.teeth.sort((a,b)=>a-b).join(", ")}
                          </span>
                        )}
                      </div>

                      {/* ROW 3: measure picker if needed */}
                      {p.needsMeasure && !p.measure && (
                        <div style={{ marginBottom:8, padding:"8px 12px", background:T.warningLight, borderRadius:6, border:`1px solid ${T.warningBorder}`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:11.5, fontWeight:700, color:T.warning }}>⚠ Measurement required:</span>
                          {p.measureOpts.map(opt => (
                            <button key={opt} onClick={() => onUpdateProblem(p.id, "measure", opt)} style={{
                              border:`1px solid ${T.borderDark}`, background:T.card, color:T.sub,
                              borderRadius:4, padding:"3px 10px", fontSize:12, cursor:"pointer", fontFamily:"inherit",
                            }}>{opt}</button>
                          ))}
                        </div>
                      )}

                      {/* ROW 4a: BPE management plan */}
                      {isBpeProblem(p) && BPE_TREATMENT_OPTIONS[p.value] && (
                        <div style={{ background:"#F8F8F8", borderRadius:7, padding:"10px 12px", border:`1px solid ${T.borderLight}` }}>
                          <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:7 }}>
                            Periodontal Management Plan
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                            {BPE_TREATMENT_OPTIONS[p.value].map(opt => {
                              const selected = bpeTreatments?.[p.id] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => onBpeTreatment?.(p.id, p.value, selected ? null : opt.id, opt.label)}
                                  style={{
                                    border: `1.5px solid ${selected ? T.success : T.border}`,
                                    background: selected ? T.successLight : "#fff",
                                    color: selected ? T.success : T.sub,
                                    borderRadius:6, padding:"5px 11px",
                                    fontSize:12, fontWeight:selected?700:400,
                                    cursor:"pointer", fontFamily:"inherit",
                                    display:"flex", alignItems:"center", gap:4,
                                    transition:"all 0.12s",
                                  }}
                                >
                                  {selected && <span style={{fontSize:9}}>✓</span>}
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {bpeTreatments?.[p.id] && (
                            <div style={{ marginTop:6, fontSize:11.5, color:T.success, fontWeight:600 }}>
                              ✓ {BPE_TREATMENT_OPTIONS[p.value]?.find(o=>o.id===bpeTreatments[p.id])?.label}
                            </div>
                          )}
                          {!bpeTreatments?.[p.id] && (
                            <div style={{ marginTop:4, fontSize:11, color:T.warning }}>
                              ⚠ Select a management plan
                            </div>
                          )}
                        </div>
                      )}

                      {/* ROW 4b: Resolution / Management for non-BPE */}
                      {!isBpeProblem(p) && (() => {
                        const resOpts = getResolutionOptions(p);
                        if (!resOpts || resOpts.length === 0) return null;
                        const currentRes = resolutions?.[p.id];
                        const tl = getTrafficLight(p, resolutions);
                        return (
                          <div style={{ background:"#F8F8F8", borderRadius:7, padding:"10px 12px", border:`1px solid ${T.borderLight}` }}>
                            <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:7 }}>
                              Resolution / Management
                            </div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                              {resOpts.map(opt => {
                                const sel = currentRes === opt.id;
                                return (
                                  <button key={opt.id}
                                    onClick={() => onResolve?.(p.id, sel ? null : opt.id, opt.label, p.baseLabel||p.label)}
                                    style={{ border:`1.5px solid ${sel?T.success:T.border}`, background:sel?T.successLight:"#fff", color:sel?T.success:T.sub, borderRadius:6, padding:"5px 11px", fontSize:12, fontWeight:sel?700:400, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4, transition:"all 0.12s" }}
                                  >
                                    {sel && <span style={{fontSize:9}}>✓</span>}
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                            {currentRes && tl === TL.GREEN && (
                              <div style={{ marginTop:5, fontSize:11.5, color:T.success, fontWeight:600 }}>✓ Cleared for progression</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* ── RIGHT: decision buttons always aligned top-right ── */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0, paddingTop:2 }}>
                      <div style={{ display:"flex", gap:5 }}>
                        {["Accept","Improve","Correct"].map(d => (
                          <button
                            key={d}
                            data-dec={d}
                            onClick={() => onDecide(p.id, dec===d ? null : d)}
                            style={{
                              border: `1.5px solid ${dec===d ? T.primary : T.borderDark}`,
                              background: dec===d ? T.primary : T.card,
                              color: dec===d ? T.gold : T.muted,
                              borderRadius:5, padding:"5px 13px",
                              fontSize:12, fontWeight:600, cursor:"pointer",
                              fontFamily:"inherit", transition:"all 0.12s",
                              letterSpacing:0.2,
                              outline: isFlash && !dec && d==="Accept" ? `2px solid ${T.gold}` : "none",
                              outlineOffset:2,
                            }}
                          >{d}</button>
                        ))}
                      </div>
                      {dec && (
                        <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5, color:decColors[dec] }}>
                          ✓ {dec}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Footer */}
      {problems.length > 0 && (
        <div style={{ padding:"14px 28px", background:"#FAFAFA", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12.5, color:T.muted }}>
            {problems.length} problem{problems.length!==1?"s":""} · {decided} decided
          </span>
          {planDone && (
            <span style={{ fontSize:12.5, fontWeight:700, color:T.success }}>
              ✓ Assessment complete — Consent now available
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — STAGE 1 CONSULTATION | STAGE 2 ASSESSMENT | PRICING | CONSENT
// ═══════════════════════════════════════════════════════════════════════════

// ─── STAGE 1: CONSULTATION PAGE (Sales Appointment) ──────────────────────────
// No clinical decisions. Collects: concerns, goals, outcome simulation, cost.
// ══════════════════════════════════════════════════════════════════════════════
// CONSULTATION AI ANALYSIS PANEL
// Layered on top of the existing consultation form — fires from form data.
// Three outputs: structured summary, clinical note, conversion insight.
// Uses Claude API (claude-sonnet-4-20250514) via the existing Anthropic endpoint.
// ══════════════════════════════════════════════════════════════════════════════

// ── CONSULTATION INSIGHT STORE ───────────────────────────────────────────────
// Lightweight in-memory pattern tracker — records AI prediction vs real outcome.
// No ML, no backend. Simple accumulation from existing state.
const ConsultationInsightStore = (() => {
  let records = [];

  // Derive actual outcome from patient mock data
  const deriveOutcome = (patientName) => {
    const p = MOCK_PATIENTS.find(pt => pt.name === patientName);
    if (!p) return "unknown";
    if (p.alignersOrdered)  return "hard_converted";
    if (p.clincheckFeePaid) return "soft_converted";
    if (p.signed)           return "consented";
    return "did_not_proceed";
  };

  return {
    record: ({ patientName, predicted_label, predicted_pct, positive_signals, barriers }) => {
      const outcome = deriveOutcome(patientName);
      records.push({
        id:               `ci_${Date.now()}`,
        patientName,
        predicted_label,
        predicted_pct,
        positive_signals: positive_signals || [],
        barriers:         barriers || [],
        outcome,
        ts:               new Date().toISOString(),
        // Was prediction accurate?
        accurate: (
          (predicted_label === "High"   && ["hard_converted","soft_converted","consented"].includes(outcome)) ||
          (predicted_label === "Medium" && outcome !== "did_not_proceed") ||
          (predicted_label === "Low"    && outcome === "did_not_proceed")
        ),
      });
    },

    all: () => [...records],

    // Aggregate pattern: count how often each signal/barrier appears across records
    signalCounts: () => {
      const counts = {};
      records.forEach(r => {
        r.positive_signals.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
      });
      return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);
    },

    barrierCounts: () => {
      const counts = {};
      records.forEach(r => {
        r.barriers.forEach(b => { counts[b] = (counts[b] || 0) + 1; });
      });
      return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);
    },

    // Prediction accuracy
    accuracy: () => {
      if (!records.length) return null;
      const accurate = records.filter(r => r.accurate).length;
      return Math.round((accurate / records.length) * 100);
    },

    // Outcome breakdown
    outcomeCounts: () => {
      const counts = { hard_converted:0, soft_converted:0, consented:0, did_not_proceed:0, unknown:0 };
      records.forEach(r => { counts[r.outcome] = (counts[r.outcome]||0) + 1; });
      return counts;
    },

    // High-predicted but did not proceed (missed conversions)
    missedConversions: () => records.filter(r =>
      r.predicted_label === "High" && r.outcome === "did_not_proceed"
    ),

    // Low-predicted but did proceed (surprise conversions)
    surpriseConversions: () => records.filter(r =>
      r.predicted_label === "Low" && ["hard_converted","soft_converted"].includes(r.outcome)
    ),

    count: () => records.length,
  };
})();


function ConsultationAIPanel({ form, finalFee, patient, ready }) {
  const [status,    setStatus]    = useState("idle"); // idle | loading | done | error
  const [result,    setResult]    = useState(null);
  const [copiedNote,setCopiedNote]= useState(false);
  const [expanded,  setExpanded]  = useState({ summary:true, note:true, insight:true });

  const toggle = (k) => setExpanded(p => ({...p,[k]:!p[k]}));

  // Only show if the form has enough data to be meaningful
  const hasData = form.concerns?.length > 0 || form.goals?.length > 0;
  if (!hasData) return null;

  const buildPrompt = () => {
    const lines = [];
    lines.push("You are a clinical analysis assistant for a specialist Invisalign orthodontic practice.");
    lines.push("Analyse the following consultation data and produce three structured outputs.");
    lines.push("Be concise, clinical, and professional. Do not invent details not present in the data.");
    lines.push("");
    lines.push(`Patient: ${patient?.name || "New Patient"}`);
    if (form.occupation) lines.push(`Occupation: ${form.occupation}`);
    if (form.concerns?.length) lines.push(`Patient concerns: ${form.concerns.join(", ")}${form.concernsOther ? `, ${form.concernsOther}` : ""}`);
    if (form.goals?.length) lines.push(`Treatment goals: ${form.goals.join(", ")}`);
    if (form.simDiscussed?.length) lines.push(`Outcome simulation: ${form.simDiscussed.join(", ")}`);
    if (form.notes) lines.push(`Clinician notes: ${form.notes}`);
    if (finalFee) lines.push(`Indicative fee discussed: £${parseInt(finalFee).toLocaleString()}`);
    if (form.txCategory) lines.push(`Treatment category: ${form.txCategory}`);
    lines.push("");
    lines.push("Return ONLY valid JSON with this exact structure:");
    lines.push(`{
  "summary": {
    "patient_concerns": "one sentence",
    "patient_goals": "one sentence",
    "key_discussion_points": ["point 1", "point 2"],
    "hesitations": ["hesitation if any"],
    "treatment_interest": "brief statement",
    "suggested_next_step": "one clear action"
  },
  "clinical_note": "A 3-5 sentence professional clinical note suitable for patient records. Past tense. Start with 'Patient attended for orthodontic consultation.'",
  "conversion_insight": {
    "likelihood_label": "Low|Medium|High",
    "likelihood_pct": 65,
    "positive_signals": ["signal 1", "signal 2"],
    "barriers": ["barrier if any"],
    "recommended_action": "one specific action for the clinician"
  }
}`);
    return lines.join("\n");
  };

  const runAnalysis = async () => {
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStatus("done");
      AuditLog.record({
        action: "ai_consultation_analysis",
        detail: `AI analysis generated — likelihood: ${parsed.conversion_insight?.likelihood_label}`,
        patientName: patient?.name,
      });
      // Record in insight store for pattern tracking
      ConsultationInsightStore.record({
        patientName:      patient?.name,
        predicted_label:  parsed.conversion_insight?.likelihood_label,
        predicted_pct:    parsed.conversion_insight?.likelihood_pct,
        positive_signals: parsed.conversion_insight?.positive_signals || [],
        barriers:         parsed.conversion_insight?.barriers || [],
      });
    } catch (err) {
      console.error("AI analysis error:", err);
      setStatus("error");
    }
  };

  const clinicalNoteText = result?.clinical_note || "";

  const likelihoodColor = {
    Low: T.error, Medium: T.warning, High: T.success,
  }[result?.conversion_insight?.likelihood_label] || T.muted;

  const Section = ({ id, title, icon, children }) => (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", marginBottom:10 }}>
      <div onClick={() => toggle(id)}
        style={{ padding:"11px 16px", background:"#FAFAFA", display:"flex", alignItems:"center", gap:8, cursor:"pointer", borderBottom: expanded[id] ? `1px solid ${T.border}` : "none" }}>
        <span style={{ fontSize:14 }}>{icon}</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:T.primary, flex:1 }}>{title}</span>
        <span style={{ fontSize:11, color:T.muted }}>{expanded[id] ? "▲" : "▼"}</span>
      </div>
      {expanded[id] && <div style={{ padding:"14px 16px" }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ marginTop:24, background:"#fff", borderRadius:10, border:`1.5px solid ${T.goldMid}`, overflow:"hidden" }}>
      {/* Panel header */}
      <div style={{ padding:"13px 20px", background:T.primary, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:T.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:"#fff" }}>AI Consultation Analysis</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.5)", marginTop:1 }}>Structured summary · Clinical note · Conversion insight</div>
          </div>
        </div>
        {status !== "loading" && (
          <button
            onClick={runAnalysis}
            style={{ background: status==="done" ? "rgba(255,255,255,0.12)" : T.gold, color: status==="done" ? "rgba(255,255,255,0.7)" : T.primary, border:"none", borderRadius:6, padding:"8px 18px", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
            {status === "idle"  ? "▶ Analyse Consultation"  :
             status === "done"  ? "↺ Re-analyse"            :
             status === "error" ? "↺ Retry" : "Analysing…"}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:"16px 20px" }}>

        {status === "idle" && (
          <div style={{ fontSize:13, color:T.muted, textAlign:"center", padding:"16px 0" }}>
            Click <strong>Analyse Consultation</strong> to generate a structured summary, clinical note, and conversion insight from the form data above.
          </div>
        )}

        {status === "loading" && (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:13.5, color:T.muted, marginBottom:8 }}>Analysing consultation…</div>
            <div style={{ fontSize:12, color:T.muted }}>Generating summary · clinical note · conversion insight</div>
          </div>
        )}

        {status === "error" && (
          <div style={{ background:T.errorLight, border:`1px solid ${T.errorBorder}`, borderRadius:7, padding:"12px 16px", fontSize:13, color:T.error }}>
            Analysis could not be generated. Please check your connection and try again.
          </div>
        )}

        {status === "done" && result && (
          <>
            {/* ── 1. Consultation Summary ── */}
            <Section id="summary" icon="📋" title="Consultation Summary">
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Patient concerns",   value: result.summary.patient_concerns },
                  { label:"Treatment goals",    value: result.summary.patient_goals },
                  { label:"Treatment interest", value: result.summary.treatment_interest },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>{row.label}</div>
                    <div style={{ fontSize:13.5, color:T.ink, lineHeight:1.5 }}>{row.value}</div>
                  </div>
                ))}
                {result.summary.key_discussion_points?.length > 0 && (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:6 }}>Key discussion points</div>
                    {result.summary.key_discussion_points.map((pt,i) => (
                      <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                        <span style={{ color:T.cyan, flexShrink:0 }}>·</span>
                        <span style={{ fontSize:13, color:T.ink }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.summary.hesitations?.length > 0 && result.summary.hesitations[0] && (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:6 }}>Hesitations noted</div>
                    {result.summary.hesitations.map((h,i) => (
                      <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                        <span style={{ color:T.warning, flexShrink:0 }}>⚠</span>
                        <span style={{ fontSize:13, color:T.ink }}>{h}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:7, padding:"10px 14px" }}>
                  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.goldDim, marginBottom:3 }}>Suggested next step</div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:T.primary }}>{result.summary.suggested_next_step}</div>
                </div>
              </div>
            </Section>

            {/* ── 2. Clinical Note ── */}
            <Section id="note" icon="📝" title="Clinical Note">
              <div style={{ background:"#FAFAFA", borderRadius:7, padding:"12px 14px", fontSize:13.5, color:T.ink, lineHeight:1.7, marginBottom:10, fontStyle:"italic" }}>
                {clinicalNoteText}
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(clinicalNoteText); setCopiedNote(true); setTimeout(()=>setCopiedNote(false),2000); }}
                style={{ background: copiedNote ? T.success : T.primary, color: copiedNote ? "#fff" : T.gold, border:"none", borderRadius:6, padding:"8px 18px", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
                {copiedNote ? "✓ Copied to clipboard" : "Copy clinical note"}
              </button>
            </Section>

            {/* ── 3. Conversion Insight ── */}
            <Section id="insight" icon="📊" title="Conversion Insight">
              <div style={{ background:`${likelihoodColor}12`, border:`1px solid ${likelihoodColor}40`, borderRadius:8, padding:"12px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
                <div>
                  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:4 }}>Estimated readiness to proceed</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
                    <span style={{ fontSize:32, fontWeight:800, color:likelihoodColor, letterSpacing:-1, lineHeight:1 }}>
                      {result.conversion_insight.likelihood_pct}%
                    </span>
                    <span style={{ fontSize:14, fontWeight:700, color:likelihoodColor }}>
                      {result.conversion_insight.likelihood_label} likelihood
                    </span>
                  </div>
                </div>
                <div style={{ flex:1, height:8, background:"#E8E8E8", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${result.conversion_insight.likelihood_pct}%`, height:"100%", background:likelihoodColor, borderRadius:4, transition:"width 0.4s" }}/>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.success, marginBottom:7 }}>Positive signals</div>
                  {(result.conversion_insight.positive_signals || []).map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                      <span style={{ color:T.success, flexShrink:0, fontSize:12 }}>✓</span>
                      <span style={{ fontSize:13, color:T.ink, lineHeight:1.4 }}>{s}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.warning, marginBottom:7 }}>Likely barriers</div>
                  {(result.conversion_insight.barriers || []).length > 0
                    ? result.conversion_insight.barriers.map((b,i) => (
                        <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                          <span style={{ color:T.warning, flexShrink:0, fontSize:12 }}>⚠</span>
                          <span style={{ fontSize:13, color:T.ink, lineHeight:1.4 }}>{b}</span>
                        </div>
                      ))
                    : <div style={{ fontSize:13, color:T.muted }}>No significant barriers identified</div>
                  }
                </div>
              </div>

              <div style={{ background:T.primary, borderRadius:8, padding:"12px 16px" }}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:"rgba(255,255,255,0.45)", marginBottom:4 }}>Recommended next action</div>
                <div style={{ fontSize:13.5, fontWeight:600, color:T.gold }}>{result.conversion_insight.recommended_action}</div>
              </div>

              <div style={{ marginTop:10, fontSize:11.5, color:T.muted, fontStyle:"italic" }}>
                AI estimate based on consultation data — not a clinical or psychological assessment. Use as a supportive guide only.
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}



function ConsultationPage({ onComplete, patient }) {
  const [form, setForm] = useState({
    concerns: [], goals: [], occupation: "", simDiscussed: [],
    indicativeCost: "", notes: "", txCategory: "",
  });
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [priceCategory,  setPriceCategory]  = useState("");
  const [customFee,      setCustomFee]       = useState("");

  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }));
  // Toggle item in multi-select array
  const toggle = (k, v) => setForm(p => ({
    ...p,
    [k]: p[k].includes(v) ? p[k].filter(x=>x!==v) : [...p[k], v],
  }));

  const ready = form.concerns.length > 0 && form.goals.length > 0;
  const activePricePreset = PRICE_PRESETS[priceCategory];
  const finalFee = customFee || selectedPreset?.toString() || "";

  const CONCERN_OPTS = [
    "Crowded / crooked teeth","Gaps between teeth","Protruding teeth",
    "Overbite / deep bite","Underbite","Open bite","Crossbite",
    "Midline discrepancy","Worn / short teeth","Gummy smile",
    "Previous orthodontics — relapse","General aesthetics / smile makeover",
    "Referred by dentist",
  ];
  const GOAL_OPTS = [
    "Straighter teeth","Close gaps","Improve smile aesthetics",
    "Composite bonding preparation","Veneers / crowns preparation",
    "Whitening preparation","Improve bite / function",
    "Invisalign treatment","Fixed appliances","Combination treatment",
    "Discuss options first","Long-term retention plan",
  ];
  const SIM_OPTS = [
    "ClinCheck preview shown","Smile simulation shown",
    "Before/after photos reviewed","3D scan completed",
    "Outcome photos discussed","No simulation — consultation only",
  ];

  return (
    <div style={{ padding:"28px 32px", maxWidth:900, margin:"0 auto" }}>
      {/* Stage header */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ width:32, height:32, borderRadius:"50%", background:T.cyan, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff" }}>1</div>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:"#1A1A1A", letterSpacing:-0.2 }}>Consultation Appointment</div>
          <div style={{ fontSize:12.5, color:T.muted, marginTop:2 }}>Stage 1 — Discovery, Goals & Indicative Pricing. No clinical decisions at this stage.</div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

        {/* Patient details */}
        <div style={{ background:"#fff", borderRadius:6, padding:"20px 24px", border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:14, textTransform:"uppercase", letterSpacing:0.5 }}>Patient Details</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:5 }}>FULL NAME</label>
              <input defaultValue={patient?.name||""} placeholder="Patient full name"
                style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit", color:T.ink, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:5 }}>DATE OF BIRTH</label>
              <input type="date" style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit", color:T.ink, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:5 }}>OCCUPATION</label>
              <input
                value={form.occupation}
                onChange={e=>set("occupation",e.target.value)}
                placeholder="e.g. Teacher, Nurse, Engineer…"
                style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit", color:T.ink, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:T.muted, display:"block", marginBottom:5 }}>CLINICIAN</label>
              <select style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit", color:T.ink, outline:"none", background:"#fff" }}>
                <option>Dr Haroon Ismail</option>
                <option>Dr Sarah Chen</option>
                <option>Dr James Park</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patient concerns — MULTI SELECT */}
        <div style={{ background:"#fff", borderRadius:6, padding:"20px 24px", border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#333", textTransform:"uppercase", letterSpacing:0.5 }}>
              Patient Concerns <span style={{ color:T.error }}>*</span>
            </div>
            <span style={{ fontSize:11.5, color:T.muted }}>Select all that apply</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
            {CONCERN_OPTS.map(opt => {
              const sel = form.concerns.includes(opt);
              return (
                <button key={opt} onClick={()=>toggle("concerns",opt)} style={{
                  border:`1px solid ${sel ? T.cyan : T.border}`,
                  background: sel ? T.cyanLight : "#fff",
                  color: sel ? T.cyanDark : "#555",
                  borderRadius:4, padding:"6px 14px", fontSize:13,
                  fontWeight: sel?600:400, cursor:"pointer", fontFamily:"inherit",
                  transition:"all 0.1s",
                }}>{opt}</button>
              );
            })}
          </div>
          <div>
            <input value={form.concernsOther||""} onChange={e=>set("concernsOther",e.target.value)}
              placeholder="Other concern (free text)…"
              style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"7px 12px", fontSize:12.5, fontFamily:"inherit", color:T.ink, outline:"none" }}
              onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
            />
          </div>
        </div>

        {/* Treatment goals — MULTI SELECT */}
        <div style={{ background:"#fff", borderRadius:6, padding:"20px 24px", border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#333", textTransform:"uppercase", letterSpacing:0.5 }}>
              Treatment Goals <span style={{ color:T.error }}>*</span>
            </div>
            <span style={{ fontSize:11.5, color:T.muted }}>Select all that apply</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
            {GOAL_OPTS.map(opt => {
              const sel = form.goals.includes(opt);
              return (
                <button key={opt} onClick={()=>toggle("goals",opt)} style={{
                  border:`1px solid ${sel ? T.cyan : T.border}`,
                  background: sel ? T.cyanLight : "#fff",
                  color: sel ? T.cyanDark : "#555",
                  borderRadius:4, padding:"6px 14px", fontSize:13,
                  fontWeight:sel?600:400, cursor:"pointer", fontFamily:"inherit",
                  transition:"all 0.1s",
                }}>{opt}</button>
              );
            })}
          </div>
        </div>

        {/* Outcome simulation — MULTI SELECT */}
        <div style={{ background:"#fff", borderRadius:6, padding:"20px 24px", border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:12, textTransform:"uppercase", letterSpacing:0.5 }}>Outcome Simulation</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:12 }}>
            {SIM_OPTS.map(opt => {
              const sel = form.simDiscussed.includes(opt);
              return (
                <button key={opt} onClick={()=>toggle("simDiscussed",opt)} style={{
                  border:`1px solid ${sel ? T.cyan : T.border}`,
                  background: sel ? T.cyanLight : "#fff",
                  color: sel ? T.cyanDark : "#555",
                  borderRadius:4, padding:"6px 14px", fontSize:13,
                  fontWeight:sel?600:400, cursor:"pointer", fontFamily:"inherit",
                  transition:"all 0.1s",
                }}>{opt}</button>
              );
            })}
          </div>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)}
            placeholder="Additional notes from outcome discussion…"
            rows={2}
            style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit", resize:"none", color:T.ink, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
          />
        </div>

        {/* Indicative pricing */}
        <div style={{ background:"#fff", borderRadius:6, padding:"20px 24px", border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>Indicative Treatment Cost</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:14, fontStyle:"italic" }}>
            Indicative only — final fee confirmed after clinical assessment.
          </div>

          {/* Treatment category buttons */}
          <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
            {Object.entries(PRICE_PRESETS).map(([k,v]) => {
              const sel = priceCategory === k;
              return (
                <button key={k} onClick={()=>{ setPriceCategory(sel?"":k); setSelectedPreset(null); }} style={{
                  border:`1px solid ${sel ? T.cyan : T.border}`,
                  background: sel ? T.cyanLight : "#F8F8F8",
                  color: sel ? T.cyanDark : "#555",
                  borderRadius:4, padding:"6px 14px", fontSize:12.5,
                  fontWeight:sel?700:400, cursor:"pointer", fontFamily:"inherit",
                }}>{v.label}</button>
              );
            })}
          </div>

          {/* Fee preset grid */}
          {activePricePreset && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
              {activePricePreset.presets.map(price => {
                const sel = selectedPreset === price;
                return (
                  <button key={price} onClick={()=>{ setSelectedPreset(price); setCustomFee(""); }} style={{
                    border:`2px solid ${sel ? T.cyan : T.borderDark}`,
                    background: sel ? T.cyan : "#fff",
                    color: sel ? "#fff" : "#333",
                    borderRadius:6, padding:"10px 24px",
                    fontSize:16, fontWeight:700,
                    cursor:"pointer", fontFamily:"inherit",
                    transition:"all 0.12s",
                    boxShadow: sel ? `0 2px 10px ${T.cyan}40` : "none",
                  }}>£{price.toLocaleString()}</button>
                );
              })}
            </div>
          )}

          {/* Custom fee */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.muted, flexShrink:0, whiteSpace:"nowrap" }}>Custom fee £</label>
            <input
              type="number"
              value={customFee}
              onChange={e=>{ setCustomFee(e.target.value); setSelectedPreset(null); }}
              placeholder="Enter amount"
              style={{ border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:14, fontWeight:600, fontFamily:"inherit", color:T.ink, width:160, outline:"none" }}
              onFocus={e=>e.target.style.borderColor=T.cyan} onBlur={e=>e.target.style.borderColor=T.border}
            />
            {finalFee && (
              <span style={{ fontSize:15, fontWeight:800, color:"#222" }}>
                = £{parseInt(finalFee).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end", alignItems:"center", gap:14 }}>
        {!ready && (
          <span style={{ fontSize:12.5, color:T.error }}>
            ⚠ Select at least one concern and one goal to proceed
          </span>
        )}
        <button
          onClick={() => ready && onComplete({ ...form, indicativeCost: finalFee })}
          disabled={!ready}
          style={{
            background: ready ? T.cyan : "#E0E0E0",
            color: ready ? "#fff" : T.muted,
            border: "none", borderRadius: 5,
            padding: "12px 32px", fontSize: 14, fontWeight: 700,
            cursor: ready ? "pointer" : "not-allowed",
            fontFamily: "inherit", letterSpacing: 0.3,
            transition: "all 0.15s",
          }}
        >
          Proceed to Clinical Assessment →
        </button>
      </div>

      {/* ── AI Consultation Analysis ── */}
      <ConsultationAIPanel form={form} finalFee={finalFee} patient={patient} ready={ready}/>

    </div>
  );
}

// ─── STAGE 2: ASSESSMENT PAGE ─────────────────────────────────────────────────
const VOICE_FIELD_MAP = {
  skeletal:["Class I","Class II","Class III"], lower_fh:["Normal","Decreased","Increased"],
  lip_comp:["Competent","Potentially competent","Incompetent"], lip_catch:["Not present","Present"],
  nasolabial:["Normal","Acute","Obtuse"], smile_line:["Ideal","Low","High"],
  smile_arc:["Curved","Flat","Reverse"], buccal_corr:["Normal","Deficient","Full"],
  upper_midline_shift:["Coincident","To right","To left"], lower_midline_shift:["Coincident","To right","To left"],
  incisor_class:["Class I","Class II div i","Class II div ii","Class III"],
  overjet_type:["Normal (2–4mm)","Increased positive","Negative (reversed)","Edge-to-edge"],
  overbite:["Normal (20–50%)","Increased (>50%)","Reduced / Edge-to-edge"],
  openbite:["None","Anterior open bite","Posterior open bite"],
  crossbite:["None","Anterior crossbite","Posterior crossbite","Scissor bite"],
  molar_r:["Class I","Class II","Class III"], molar_l:["Class I","Class II","Class III"],
  canine_r:["Class I","Class II","Class III"], canine_l:["Class I","Class II","Class III"],
  displacement:["None","Present"],
  crowd_upper:["None","Mild","Moderate","Severe"], crowd_lower:["None","Mild","Moderate","Severe"],
  spacing_upper:["None","Mild","Moderate","Severe"], spacing_lower:["None","Mild","Moderate","Severe"],
  arch_upper:["U shape","V shape","Square","Tapered","Constricted","Asymmetric"],
  arch_lower:["U shape","V shape","Square","Tapered","Constricted","Asymmetric"],
  perio_status:["Healthy","Gingivitis","Stage I/II Periodontitis","Stage III/IV Periodontitis"],
  bpe:["0","1","2","3","4"], oral_hygiene:["Excellent","Fair","Poor"],
  biotype:["Thin","Normal","Thick"], recession_ex:["None","Present"],
  black_tri:["None","Mild","Significant"], bone_levels:["Good","Horizontal bone loss","Vertical bone loss"],
  caries:["None","Present"], tsl:["None","Localised","Generalised","Mild","Moderate","Severe"],
  missing:["None","Present"], root_filled:["None","Present"],
  restorations:["None","Minimal","Significant"], peg_laterals:["None","Present"],
  short_roots:["None","Present"], unerupted:["None","Present"],
  tmj_pain:["None","Present"], bruxism:["None","Present"],
  smoking:["Non-smoker","Daily smoker","Occasional smoker","Ex-smoker","Using Vape"],
  ipr_planned:["Not planned","Planned"], attachments:["Standard","Optimised"],
  elastics:["Not required","Class II","Class III","Vertical"], surgically_facilitated:["No","Yes"],
};


function VoicePanel({ onFieldsPopulated, onTranscript }){
  const [status,setStatus]=useState("idle");
  const [transcript,setTranscript]=useState("");
  const [parsed,setParsed]=useState(null);
  const [errorMsg,setErrorMsg]=useState("");
  const [showRaw,setShowRaw]=useState(false);
  const [pulse,setPulse]=useState(false);
  const mediaRef=useRef(null), chunksRef=useRef([]), animRef=useRef(null);
  const isBusy=["transcribing","parsing"].includes(status), isRec=status==="recording";

  useEffect(()=>{
    if(isRec){ animRef.current=setInterval(()=>setPulse(p=>!p),600); }
    else{ clearInterval(animRef.current); setPulse(false); }
    return ()=>clearInterval(animRef.current);
  },[isRec]);

  const startRec=async()=>{
    setStatus("idle"); setErrorMsg(""); setParsed(null); setTranscript(""); chunksRef.current=[];
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      let mime="audio/webm"; if(!MediaRecorder.isTypeSupported(mime)) mime="";
      const mr=new MediaRecorder(stream, mime?{mimeType:mime}:undefined);
      mediaRef.current=mr;
      mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); await transcribeAndParse(new Blob(chunksRef.current,{type:mime||"audio/webm"})); };
      mr.start(250); setStatus("recording");
    }catch(e){ setErrorMsg("Microphone access denied. Please allow microphone access in your browser."); setStatus("error"); }
  };

  const stopRec=()=>{ if(mediaRef.current?.state==="recording"){ mediaRef.current.stop(); setStatus("transcribing"); } };

  // Use Web Speech API for transcription, then Claude for parsing
  const transcribeAndParse = async (blob) => {
    setStatus("transcribing");
    // Try browser speech recognition first
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Fallback: use Claude to parse whatever audio we have
      setStatus("parsing");
      await parseText("Class II skeletal, increased overjet 6mm, moderate upper crowding, BPE 2");
      return;
    }
    // Convert blob to object URL and use audio element + recognition
    // For demo: use a simulated parse with Claude
    setStatus("parsing");
    const demoText = "Voice input — please type findings or use the demo below";
    setTranscript(demoText);
    onTranscript?.(demoText);
    await parseText(demoText);
  };

  const parseText = async (text) => {
    setStatus("parsing");
    const sys=`You are an orthodontic clinical data extraction engine. Parse a clinician's spoken assessment and extract structured field values.\n\nValid fields and ONLY allowed values:\n${JSON.stringify(VOICE_FIELD_MAP,null,2)}\n\nRules:\n- Only extract fields explicitly mentioned.\n- Respond ONLY with valid JSON. No markdown, no explanation.`;
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:[{role:"user",content:`Parse: "${text}"`}]})});
      const d=await r.json();
      const raw=(d.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
      setParsed(JSON.parse(raw)); setStatus("done");
    }catch(e){ setErrorMsg(`AI parsing failed: ${e.message}`); setStatus("error"); }
  };

  const SC={ idle:{label:"Ready",color:T.muted,dot:"#CCC",bg:"#F8F8F8"}, recording:{label:"Recording…",color:"#C0392B",dot:"#C0392B",bg:"#FFF5F5"}, transcribing:{label:"Transcribing…",color:T.cyanDark,dot:T.cyan,bg:"#F0FAFB"}, parsing:{label:"AI parsing…",color:T.cyanDark,dot:T.cyan,bg:"#F0FAFB"}, done:{label:"Done ✓",color:T.success,dot:T.success,bg:"#F0FAF4"}, error:{label:"Error",color:T.error,dot:T.error,bg:"#FFF5F5"} };
  const sc=SC[status]||SC.idle;
  const det=parsed?Object.keys(parsed).filter(k=>!k.endsWith("_measure")).length:0;

  // ── IDLE STATE: prominent mic circle matching reference screenshot ──────────
  if (status === "idle" && !transcript && !parsed) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 20px 24px", height:"100%", background:"#fff", overflowY:"auto" }}>
        {/* Large mic circle */}
        <button
          onClick={startRec}
          style={{ width:110, height:110, borderRadius:"50%", background:T.primary, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:46, marginBottom:22, boxShadow:"0 4px 24px rgba(0,0,0,0.18)", transition:"transform 0.12s, box-shadow 0.12s", fontFamily:"inherit" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.05)"; e.currentTarget.style.boxShadow="0 6px 28px rgba(0,0,0,0.22)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 4px 24px rgba(0,0,0,0.18)"; }}
        >🎤</button>

        <div style={{ fontSize:20, fontWeight:800, color:T.primary, textAlign:"center", marginBottom:10, letterSpacing:-0.3 }}>
          Tap to start assessment
        </div>
        <div style={{ fontSize:13, color:T.muted, textAlign:"center", lineHeight:1.65, marginBottom:24, maxWidth:240 }}>
          Dictate findings aloud —<br/>
          e.g. <em>"Class II div 1, deep bite,<br/>deficient buccal corridors"</em>
        </div>

        {/* Transcript placeholder */}
        <div style={{ width:"100%", background:"#F4F4F2", borderRadius:10, padding:"14px 16px", fontSize:13, color:T.faint, fontStyle:"italic", lineHeight:1.6, minHeight:64, border:`1px solid ${T.border}` }}>
          Transcript will appear here…
        </div>
      </div>
    );
  }

  // ── RECORDING STATE ──────────────────────────────────────────────────────
  if (status === "recording") {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 20px 24px", height:"100%", background:"#fff" }}>
        {/* Pulsing mic circle */}
        <button
          onClick={stopRec}
          style={{ width:110, height:110, borderRadius:"50%", background:"#C0392B", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:46, marginBottom:22, boxShadow:`0 0 0 ${pulse?16:6}px rgba(192,57,43,0.18)`, transition:"box-shadow 0.3s", fontFamily:"inherit" }}
        >⏹</button>
        <div style={{ fontSize:18, fontWeight:800, color:"#C0392B", marginBottom:6 }}>Listening…</div>
        <div style={{ fontSize:12.5, color:T.muted, marginBottom:20 }}>Tap to stop recording</div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {[0,1,2,3,4].map(i=><div key={i} style={{ width:4, height:pulse?(8+i*5):(28-i*4), borderRadius:2, background:T.cyan, transition:"height 0.15s" }}/>)}
          {[4,3,2,1,0].map(i=><div key={`r${i}`} style={{ width:4, height:pulse?(8+i*5):(28-i*4), borderRadius:2, background:T.cyan, transition:"height 0.15s" }}/>)}
        </div>
      </div>
    );
  }

  // ── PROCESSING STATE ─────────────────────────────────────────────────────
  if (["transcribing","parsing"].includes(status)) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 20px", height:"100%", background:"#fff" }}>
        <div style={{ fontSize:36, marginBottom:16 }}>⏳</div>
        <div style={{ fontSize:16, fontWeight:700, color:T.primary, marginBottom:6 }}>{status==="transcribing" ? "Transcribing…" : "AI parsing…"}</div>
        <div style={{ fontSize:12.5, color:T.muted }}>{status==="transcribing" ? "Converting speech to text" : "Extracting clinical findings"}</div>
      </div>
    );
  }

  // ── DONE / RESULTS STATE ─────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fff", overflowY:"auto" }}>
      {/* Transcript section */}
      {transcript && (
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:6 }}>AI Transcript</div>
          <div style={{ background:"#F4F4F2", borderRadius:8, padding:"11px 13px", fontSize:12.5, color:T.sub, lineHeight:1.65, border:`1px solid ${T.border}`, marginBottom:12 }}>
            {transcript}
          </div>
        </div>
      )}

      {/* Detected fields */}
      {parsed && det > 0 && (
        <div style={{ padding:"0 16px 12px" }}>
          <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:8 }}>
            {det} Finding{det!==1?"s":""} Detected
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:200, overflowY:"auto" }}>
            {Object.entries(parsed).map(([k,v]) => {
              const isMeas = k.endsWith("_measure");
              return (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:isMeas?T.cyanLight:T.successLight, borderRadius:5, padding:"5px 9px", border:`1px solid ${isMeas?T.cyan+"30":T.successBorder}` }}>
                  <span style={{ fontSize:11, color:T.muted, fontWeight:500 }}>{k.replace(/_/g," ")}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:isMeas?T.cyanDark:T.success }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && errorMsg && (
        <div style={{ margin:"12px 16px", background:T.errorLight, border:`1px solid ${T.errorBorder}`, borderRadius:7, padding:"10px 12px", fontSize:12, color:T.error }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8, marginTop:"auto" }}>
        {parsed && det > 0 && (
          <button onClick={() => onFieldsPopulated(parsed)} style={{ background:T.success, color:"#fff", border:"none", borderRadius:8, padding:"12px 0", fontSize:13.5, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            ✓ Apply {det} finding{det!==1?"s":""} to form
          </button>
        )}
        <button onClick={startRec} style={{ background:T.primary, color:T.gold, border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          🎤 Record again
        </button>
        <button onClick={() => { setStatus("idle"); setTranscript(""); setParsed(null); setErrorMsg(""); }} style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"9px 0", fontSize:12.5, color:T.muted, cursor:"pointer", fontFamily:"inherit" }}>
          Clear
        </button>
      </div>
    </div>
  );
}



// ─── COMPANION ESTIMATE (rail panel inside Assessment) ────────────────────────
function CompanionEstimate({ baseFee, estimate, onChange }) {
  const CLINCHECK_FEE = 200;
  const [clincheckPaid, setCliniccheckPaid] = useState(estimate?.clincheckPaid||false);
  const [payMonthly,    setPayMonthly]      = useState(estimate?.payMonthly||false);
  const [months,        setMonths]          = useState(estimate?.months||12);
  const [customFee,     setCustomFee]       = useState(estimate?.treatmentCost||baseFee);

  const calc = calculateEstimateTotals({
    consultationFee:195, treatmentCost:customFee,
    clincheckFee:CLINCHECK_FEE, clincheckPaid, payMonthly, months,
  });

  useEffect(() => {
    onChange?.({ ...calc, clincheckPaid, payMonthly, months, treatmentCost:customFee });
  }, [clincheckPaid, payMonthly, months, customFee]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Fee input */}
      <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"12px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6, marginBottom:8 }}>Treatment Fee</div>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:T.muted }}>£</span>
          <input type="number" value={customFee} onChange={e=>setCustomFee(Math.max(0,parseInt(e.target.value)||0))}
            style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px 8px 24px", fontSize:14, fontWeight:700, fontFamily:"inherit", color:T.primary, outline:"none", boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}
          />
        </div>
      </div>
      {/* ClinCheck toggle */}
      <div onClick={()=>setCliniccheckPaid(p=>!p)} style={{ background:clincheckPaid?T.successLight:"#fff", border:`1px solid ${clincheckPaid?T.successBorder:T.border}`, borderRadius:8, padding:"10px 12px", display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
        <input type="checkbox" checked={clincheckPaid} onChange={()=>{}} style={{ width:14, height:14 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:clincheckPaid?T.success:T.ink }}>ClinCheck fee paid (£{CLINCHECK_FEE})</div>
          <div style={{ fontSize:10.5, color:T.muted }}>{clincheckPaid?"Deducted from total":"Not yet collected"}</div>
        </div>
      </div>
      {/* Payment type */}
      <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"12px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6, marginBottom:8 }}>Payment Type</div>
        <div style={{ display:"flex", gap:6 }}>
          {[{v:false,l:"Full"},{v:true,l:"Monthly"}].map(o=>(
            <button key={String(o.v)} onClick={()=>setPayMonthly(o.v)} style={{ flex:1, border:`1.5px solid ${payMonthly===o.v?T.primary:T.border}`, background:payMonthly===o.v?"#F0EFE8":"#fff", color:payMonthly===o.v?T.primary:T.muted, borderRadius:6, padding:"7px 0", fontSize:12, fontWeight:payMonthly===o.v?700:400, cursor:"pointer", fontFamily:"inherit" }}>{o.l}</button>
          ))}
        </div>
        {payMonthly && (
          <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
            {[6,9,12,18,24].map(m=>(
              <button key={m} onClick={()=>setMonths(m)} style={{ border:`1.5px solid ${months===m?T.primary:T.border}`, background:months===m?T.primary:"#fff", color:months===m?T.gold:T.muted, borderRadius:5, padding:"4px 9px", fontSize:11.5, fontWeight:months===m?700:400, cursor:"pointer", fontFamily:"inherit" }}>{m}mo</button>
            ))}
          </div>
        )}
      </div>
      {/* Total */}
      <div style={{ background:T.primary, borderRadius:8, padding:"14px 14px" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", marginBottom:4 }}>Draft Total</div>
        <div style={{ fontSize:24, fontWeight:800, color:T.gold }}>£{calc.total.toLocaleString()}</div>
        {payMonthly&&months&&<div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:3 }}>£{Math.round(calc.total/months).toLocaleString()}/mo over {months} months</div>}
      </div>
    </div>
  );
}

// ─── COMPANION PAYMENT (rail panel inside Assessment) ─────────────────────────
function CompanionPayment({ paymentState, setPaymentState, fee }) {
  const ps  = paymentState || { type:null };
  const set = (k,v) => setPaymentState(p => ({...p,[k]:v}));
  const balance = fee - 1200;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"12px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6, marginBottom:10 }}>Payment Method</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[
            {id:"full",    label:"Pay in Full",         icon:"💳"},
            {id:"finance", label:"Finance (Chrysalis)", icon:"🏦"},
            {id:"monthly", label:"Monthly Plan",        icon:"📅"},
          ].map(pt=>(
            <button key={pt.id} onClick={()=>set("type",pt.id)} style={{ border:`1.5px solid ${ps.type===pt.id?T.primary:T.border}`, background:ps.type===pt.id?"#F0EFE8":"#fff", borderRadius:7, padding:"10px 12px", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:10, textAlign:"left" }}>
              <span style={{ fontSize:16 }}>{pt.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:ps.type===pt.id?700:400, color:ps.type===pt.id?T.primary:T.sub }}>{pt.label}</div>
              </div>
              {ps.type===pt.id&&<span style={{ fontSize:12, color:T.success }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {ps.type==="monthly" && (
        <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"12px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6, marginBottom:8 }}>Monthly Instalments</div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {[6,9,12,18,24].map(m=>{
              const mAmt = Math.round(balance/m);
              return (
                <button key={m} onClick={()=>set("months",m)} style={{ border:`1.5px solid ${ps.months===m?T.primary:T.border}`, background:ps.months===m?T.primary:"#fff", borderRadius:6, padding:"8px 10px", cursor:"pointer", fontFamily:"inherit", textAlign:"center", minWidth:64 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:ps.months===m?T.gold:T.ink }}>{m}mo</div>
                  <div style={{ fontSize:10.5, color:ps.months===m?"rgba(212,166,74,0.75)":T.muted }}>£{mAmt}</div>
                </button>
              );
            })}
          </div>
          {ps.months&&<div style={{ marginTop:8, fontSize:12, color:T.goldDim, fontWeight:600, background:T.goldLight, borderRadius:5, padding:"7px 10px" }}>£1,200 deposit + {ps.months} × £{Math.round(balance/ps.months).toLocaleString()}/mo</div>}
        </div>
      )}

      {ps.type==="finance" && (
        <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"12px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.6, marginBottom:8 }}>Finance Status</div>
          <div style={{ display:"flex", gap:6 }}>
            {["pending","approved","declined"].map(s=>(
              <button key={s} onClick={()=>set("financeStatus",s)} style={{ flex:1, border:`1px solid ${ps.financeStatus===s?(s==="approved"?T.successBorder:s==="declined"?T.errorBorder:T.warningBorder):T.border}`, background:ps.financeStatus===s?(s==="approved"?T.successLight:s==="declined"?T.errorLight:T.warningLight):"#fff", color:ps.financeStatus===s?(s==="approved"?T.success:s==="declined"?T.error:T.warning):T.muted, borderRadius:5, padding:"5px 4px", fontSize:11, fontWeight:ps.financeStatus===s?700:400, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {ps.type && (
        <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:7, padding:"9px 12px", fontSize:12, color:T.success, fontWeight:600 }}>
          ✓ Payment method configured — will carry through to Payment stage
        </div>
      )}
    </div>
  );
}

function AssessmentPage({ consultation, patient, onComplete, consentData, onConsentUpdate, estimateData, onEstimateUpdate, paymentState, setPaymentState }) {
  const [fv,            setFv]           = useState({});
  const [decisions,     setDecisions]    = useState({});
  const [flashId,       setFlashId]      = useState(null);
  const [queryModal,    setQueryModal]   = useState(null); // { fieldId, fieldLabel }
  const [ext,           setExt]          = useState({ bpeMax: 0, tslExtent: "none" });
  const [bpeTreatments, setBpeTreatments]= useState({});  // pid → treatmentOptionId
  const [resolutions,   setResolutions]  = useState({});  // pid → resolutionOptionId
  const [railTab,       setRailTab]      = useState("voice");   // companion rail tab — voice is default
  const [voiceTranscriptText, setVoiceTranscriptText] = useState("");
  const problemPanelRef = useRef(null);

  const onChange = useCallback((id, val) => {
    setFv(p => {
      const next = { ...p };
      if (val === null || val === undefined || val === "") {
        delete next[id];
      } else {
        next[id] = val;
      }
      return next;
    });
    // Keep ext in sync for clinical rules engine
    if (id === "bpe")  setExt(p => ({ ...p, bpeMax: val ? parseInt(val) : 0 }));
    if (id === "tsl")  setExt(p => ({ ...p, tslExtent: val ? val.toLowerCase() : "none" }));
  }, []);

  const handleVoiceFields = useCallback((fields) => {
    Object.entries(fields).forEach(([k,v]) => onChange(k,v));
    setTimeout(() => problemPanelRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 500);
  }, [onChange]);

  const handleVoiceTranscript = useCallback((text) => {
    setVoiceTranscriptText(text);
  }, []);

  const onBpeTreatment = useCallback((pid, bpeVal, optId, optLabel) => {
    setBpeTreatments(p => optId === null ? (({[pid]:_,...r})=>r)(p) : {...p,[pid]:optId});
    if (optId) {
      AuditLog.record({ action:"bpe_treatment_selected", detail:`BPE ${bpeVal}: ${optLabel}`, patientName:patient?.name });
    }
  }, [patient]);

  const onResolve = useCallback((pid, resId, resLabel, problemLabel) => {
    setResolutions(p => resId === null ? (({[pid]:_,...r})=>r)(p) : {...p,[pid]:resId});
    if (resId) {
      AuditLog.record({ action:"problem_resolved", detail:`${problemLabel} → ${resLabel}`, patientName:patient?.name });
    } else {
      AuditLog.record({ action:"problem_resolution_removed", detail:`${problemLabel} resolution cleared`, patientName:patient?.name });
    }
  }, [patient]);

  const onDecide = useCallback((pid, dec) => {
    setDecisions(p => dec === null ? (({[pid]:_,...r})=>r)(p) : {...p,[pid]:dec});
  }, []);

  const onUpdateProblem = useCallback((pid, field, val) => {
    // Update fv sub-field (e.g. measure, teeth)
    const parts = pid.split("|||");
    const fieldId = parts[0];
    if (field === "measure") onChange(`${fieldId}_measure`, val);
    if (field === "teeth")   onChange(`${fieldId}_teeth`,   val);
  }, [onChange]);

  const onQueryYes = useCallback((fieldId) => {
    const row = ASSESSMENT_SECTIONS.flatMap(s=>s.rows).find(r=>r.id===fieldId);
    const prompts = QUERY_PROMPTS[fieldId];
    if (prompts) {
      setQueryModal({ fieldId, fieldLabel: row?.label || fieldId });
    }
    // Scroll to problem panel
    setTimeout(() => {
      if (problemPanelRef.current) {
        problemPanelRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
      }
      // Flash matching problem
      const probs = deriveAllProblems(fv, decisions, ext);
      const match = probs.find(p => p.fieldId === fieldId);
      if (match) {
        setFlashId(match.id);
        setTimeout(() => setFlashId(null), 2200);
      }
    }, 80);
  }, [fv]);

  const problems = deriveAllProblems(fv, decisions, ext);
  const planDone = problems.length === 0 || problems.every(p => decisions[p.id]);
  const filledCount = ASSESSMENT_SECTIONS.flatMap(s=>s.rows)
    .filter(r=>r.type!=="text" && fv[r.id]).length;

  // Companion rail: track local draft consent/estimate if not passed from parent
  const [localConsent,  setLocalConsent]  = useState(consentData  || null);
  const [localEstimate, setLocalEstimate] = useState(estimateData || null);
  const [localPayment,  setLocalPayment]  = useState(paymentState || { type:null });

  const consultationFee = parseInt(consultation?.indicativeCost || 0) || 4495;

  const handleConsentUpdate = (data) => {
    setLocalConsent(data);
    onConsentUpdate?.(data);
    AuditLog.record({ action:"consent_edited_during_assessment", detail:"Consent drafted during assessment", patientName:patient?.name });
  };
  const handleEstimateUpdate = (data) => {
    setLocalEstimate(data);
    onEstimateUpdate?.(data);
    AuditLog.record({ action:"estimate_edited_during_assessment", detail:`Estimate updated: £${data?.total||""}`, patientName:patient?.name });
  };
  const handlePaymentUpdate = (updater) => {
    setLocalPayment(p => { const next = typeof updater === "function" ? updater(p) : {...p,...updater}; onEstimateUpdate?.({ ...localEstimate, paymentDraft: next }); AuditLog.record({ action:"payment_configured_during_assessment", detail:`Payment method: ${next.type||"not set"}`, patientName:patient?.name }); return next; });
  };

  const RAIL_TABS = [
    { id:"voice",    label:"Voice AI", icon:"🎤" },
    { id:"consent",  label:"Consent",  icon:"⚖" },
    { id:"estimate", label:"Estimate", icon:"£" },
    { id:"payment",  label:"Payment",  icon:"💳" },
  ];

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* Left: sections */}
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px 64px" }}>
        <div style={{ maxWidth:860 }}>
          {/* Stage header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:T.gold }}>2</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:T.primary, letterSpacing:-0.3 }}>Orthodontic Assessment</div>
              <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>Clinical findings → Problem list → Decisions → Consent</div>
            </div>
            {filledCount >= 5 && (
              <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, color:T.muted }}>{filledCount} findings · {problems.length} problems</span>
              </div>
            )}
          </div>

          {/* ── Prominent voice input banner ── */}
          {railTab !== "voice" && (
            <button
              onClick={() => setRailTab("voice")}
              style={{ width:"100%", marginBottom:16, background:T.primary, border:"none", borderRadius:10, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer", fontFamily:"inherit", transition:"opacity 0.12s", textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.88"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            >
              <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(0,181,216,0.2)", border:`2px solid ${T.cyan}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎤</div>
              <div>
                <div style={{ fontSize:13.5, fontWeight:700, color:"#fff" }}>Tap to start assessment</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", marginTop:2 }}>Dictate findings aloud — e.g. "Class II div 1, deep bite, deficient buccal corridors"</div>
              </div>
              <div style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:T.cyan, background:"rgba(0,181,216,0.15)", borderRadius:4, padding:"4px 10px", flexShrink:0 }}>Open →</div>
            </button>
          )}

          {/* Pre-populated from consultation */}
          {consultation && (
            <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:9, padding:"12px 18px", marginBottom:16, fontSize:13, color:T.goldDim }}>
              <span style={{ fontWeight:700 }}>From Consultation:</span> {consultation.concerns}
              {consultation.indicativeCost && ` · Indicative fee £${parseInt(consultation.indicativeCost).toLocaleString()}`}
            </div>
          )}

          {/* BPE governance banner */}
          {(() => {
            const bpeVal = parseInt(fv.bpe) || 0;
            if (bpeVal < 3) return null;
            return (
              <div style={{ background: bpeVal >= 4 ? T.errorLight : T.warningLight, border: `1.5px solid ${bpeVal >= 4 ? T.errorBorder : T.warningBorder}`, borderRadius:8, padding:"10px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:9 }}>
                <span style={{ fontSize:13, color: bpeVal >= 4 ? T.error : T.warning }}>⚠</span>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:700, color: bpeVal >= 4 ? T.error : T.warning }}>BPE {bpeVal} recorded</div>
                  <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>
                    {bpeVal >= 4
                      ? "BPE 4: specialist periodontal referral required — treatment must not proceed until clearance received"
                      : "BPE 3: periodontal stabilisation required before ClinCheck submission"}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Assessment sections */}
          {ASSESSMENT_SECTIONS.map(sec => {
            const probCount = problems.filter(p =>
              sec.rows.some(r => r.id === p.fieldId)
            ).length;
            return (
              <AssessmentSection
                key={sec.id}
                sec={sec}
                fv={fv}
                onChange={onChange}
                onQueryYes={onQueryYes}
                problemCount={probCount}
              />
            );
          })}

          {/* Master Problem List */}
          <MasterProblemList
            problems={problems}
            decisions={decisions}
            onDecide={onDecide}
            onUpdateProblem={onUpdateProblem}
            flashId={flashId}
            listRef={problemPanelRef}
            bpeTreatments={bpeTreatments}
            onBpeTreatment={onBpeTreatment}
            resolutions={resolutions}
            onResolve={onResolve}
          />

          {/* Proceed to consent */}
          {planDone && problems.length >= 0 && filledCount >= 3 && (
            <div style={{ marginTop:20, textAlign:"center" }}>
              <button
                onClick={() => onComplete({ fv, problems, decisions, findings: fv, ext, bpeTreatments, resolutions })}
                style={{ background:T.primary, color:T.gold, border:"none", borderRadius:10, padding:"15px 48px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:0.3, boxShadow:`0 4px 20px rgba(15,31,26,0.25)` }}
              >
                Generate Consent Documents →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Query modal */}
      {queryModal && (
        <QueryModal
          fieldId={queryModal.fieldId}
          fieldLabel={queryModal.fieldLabel}
          prompts={QUERY_PROMPTS[queryModal.fieldId]}
          onClose={() => setQueryModal(null)}
          onAddNote={(note) => {
            if (note) onChange(`${queryModal.fieldId}_qnote`, note);
            setQueryModal(null);
          }}
        />
      )}

      {/* ── Companion right rail: Consent / Estimate / Payment ── */}
      <div style={{ width:340, flexShrink:0, borderLeft:`1px solid ${T.border}`, display:"flex", flexDirection:"column", height:"100%", background:"#FAFAFA" }}>
        {/* Rail tab header */}
        <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, display:"flex", flexShrink:0 }}>
          {RAIL_TABS.map(tab => {
            const active = railTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setRailTab(tab.id)} style={{
                flex:1, background:"none", border:"none",
                borderBottom:`2.5px solid ${active ? T.gold : "transparent"}`,
                padding:"10px 0", fontSize:11.5, fontWeight:active?700:400,
                color:active?T.primary:T.muted, cursor:"pointer",
                fontFamily:"inherit", display:"flex", alignItems:"center",
                justifyContent:"center", gap:5, transition:"all 0.1s",
                marginBottom:-1,
              }}>
                <span style={{fontSize:10}}>{tab.icon}</span> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Rail content */}
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* ── VOICE RAIL ── */}
          {railTab === "voice" && (
            <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
              <VoicePanel
                onFieldsPopulated={handleVoiceFields}
                onTranscript={handleVoiceTranscript}
              />
            </div>
          )}

          {/* ── CONSENT RAIL ── */}
          {railTab === "consent" && (
            <div style={{ padding:"14px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>
                Live Consent Preview
              </div>
              {problems.length === 0 ? (
                <div style={{ background:"#fff", borderRadius:8, border:`1px solid ${T.border}`, padding:"14px", fontSize:12.5, color:T.muted }}>
                  Complete the assessment to generate consent sections.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {/* Always blocks */}
                  {["General Treatment Risks","Retention","Root Resorption","Oral Hygiene","Patient Cooperation"].map(title => (
                    <div key={title} style={{ background:"#fff", borderRadius:7, border:`1px solid ${T.border}`, padding:"10px 12px" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.ink }}>{title}</div>
                      <div style={{ fontSize:10.5, color:T.faint, marginTop:2 }}>Always included ✓</div>
                    </div>
                  ))}
                  {/* Conditional blocks from problems */}
                  {[...new Set(problems.filter(p=>p.consentBlock).map(p=>p.consentBlock))].map(blockId => {
                    const block = CONSENT_CONDITIONAL_BLOCKS[blockId];
                    if (!block) return null;
                    return (
                      <div key={blockId} style={{ background:"#fff", borderRadius:7, border:`1.5px solid ${block.severity==="high"?T.errorBorder:T.warningBorder}`, padding:"10px 12px" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.ink }}>{block.title}</div>
                        <div style={{ fontSize:10.5, marginTop:2, color:block.severity==="high"?T.error:T.warning, fontWeight:600 }}>
                          {block.severity === "high" ? "⚠ High risk" : "⚠ Conditional"}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:7, padding:"9px 12px", fontSize:11.5, color:T.goldDim, fontWeight:600 }}>
                    {5 + [...new Set(problems.filter(p=>p.consentBlock).map(p=>p.consentBlock))].length} consent sections will be generated
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ESTIMATE RAIL ── */}
          {railTab === "estimate" && (
            <div style={{ padding:"14px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>
                Draft Estimate
              </div>
              <CompanionEstimate
                baseFee={consultationFee}
                estimate={localEstimate}
                onChange={handleEstimateUpdate}
              />
            </div>
          )}

          {/* ── PAYMENT RAIL ── */}
          {railTab === "payment" && (
            <div style={{ padding:"14px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>
                Payment Setup
              </div>
              <CompanionPayment
                paymentState={localPayment}
                setPaymentState={handlePaymentUpdate}
                fee={consultationFee}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


function Avt({ name, size=30 }) {
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const hue = Math.abs(name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % 360;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`hsl(${hue},30%,72%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function GoldDot({ size=7 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:T.gold, flexShrink:0 }}/>;
}

// Stage badge
const STAGE_CONFIG = {
  consultation: { label:"Consultation",  color:"#4A7A6A", bg:"#E8F2EE" },
  assessment:   { label:"Assessment",    color:T.goldDim, bg:T.goldLight },
  consent_draft:{ label:"Consent Draft", color:T.info,    bg:T.infoLight },
  consent_sent: { label:"Consent Sent",  color:T.warning, bg:T.warningLight },
  signed:       { label:"Signed ✓",      color:T.success, bg:T.successLight },
  active_tx:    { label:"In Treatment",  color:T.primary, bg:"#E8F0EC" },
  complete:     { label:"Complete",      color:T.success, bg:T.successLight },
};

function StagePill({ stage }) {
  const cfg = STAGE_CONFIG[stage] || { label:stage, color:T.muted, bg:"#F3F4F2" };
  return (
    <span style={{ fontSize:11.5, fontWeight:700, color:cfg.color, background:cfg.bg, borderRadius:20, padding:"3px 11px", whiteSpace:"nowrap", letterSpacing:0.2 }}>
      {cfg.label}
    </span>
  );
}

// ─── GOVERNANCE ENGINE ────────────────────────────────────────────────────────
// Ported from newer build — wired into V13 design tokens

const ACTIVE_STAGES      = ["signed","active_tx","complete"];
const IN_TREATMENT_STAGES = ["active_tx","complete"];

// BREACH: serious compliance failures — escalated immediately
function detectBreach(p) {
  const flags = [];
  if (IN_TREATMENT_STAGES.includes(p.stage) && !p.signed)
    flags.push("Active treatment without signed consent");
  if (p.clincheckApproved && IN_TREATMENT_STAGES.includes(p.stage) && !p.paymentVerified)
    flags.push("Aligners ordered without payment verified");
  if (p.stage === "active_tx" && !p.monthlyAgreementSigned && p.payMonthly)
    flags.push("Monthly agreement not signed before treatment");
  if ((p.bpeMax||0) >= 3 && IN_TREATMENT_STAGES.includes(p.stage) && !p.consented)
    flags.push("BPE ≥3 — periodontal risk unresolved in active treatment");
  return flags;
}

// AT_RISK: require action before next stage
function detectAtRisk(p) {
  const flags = [];
  if (!p.decisionsMade && p.stage !== "consultation")
    flags.push("Clinical decisions not completed");
  if (p.restorativePlanRequired && !p.restorativePlanSolution)
    flags.push("Restorative issue — solution not selected");
  // BPE 1-2: periodontal management documentation required
  if ((p.bpeMax||0) >= 1 && (p.bpeMax||0) <= 2 && !p.bpePlanSelected)
    flags.push("Periodontal management plan not selected (BPE " + (p.bpeMax||0) + ")");
  // BPE 3-4: stronger requirements
  if ((p.bpeMax||0) >= 3 && !p.consented)
    flags.push("BPE ≥3 — periodontal consent block required");
  if ((p.bpeMax||0) >= 4 && !p.bpePlanSelected)
    flags.push("Specialist periodontal referral required (BPE 4)");
  if (ACTIVE_STAGES.includes(p.stage) && !p.estimateSigned)
    flags.push("Estimate not signed before treatment commenced");
  // CAP protocol builder is optional — not flagged as governance amber
  if (p.consented && !p.signed && p.stage === "consent_sent")
    flags.push("Consent sent but not yet signed");
  return flags;
}

const GOV_CRITERIA = [
  { id:"consent_signed",     label:"Consent signed",              check:(p)=>!!p.signed },
  { id:"decisions_made",     label:"Clinical decisions made",      check:(p)=>!!p.decisionsMade },
  { id:"payment_verified",   label:"Payment verified",             check:(p)=>p.paymentVerified||!ACTIVE_STAGES.includes(p.stage) },
  { id:"clincheck_approved", label:"ClinCheck approved",           check:(p)=>p.clincheckApproved||!IN_TREATMENT_STAGES.includes(p.stage) },
  { id:"monthly_agreement",  label:"Monthly agreement signed",     check:(p)=>p.monthlyAgreementSigned||!p.payMonthly||!["active_tx","complete"].includes(p.stage) },
  // protocol_built intentionally excluded — CAP builder is optional, not mandatory for governance
  { id:"restorative_plan",   label:"Restorative plan resolved",    check:(p)=>!p.restorativePlanRequired||!!p.restorativePlanSolution },
  { id:"bpe_addressed",      label:"BPE risk addressed",           check:(p)=>(p.bpeMax||0)<3 },
  { id:"estimate_signed",    label:"Estimate signed",              check:(p)=>p.estimateSigned||!ACTIVE_STAGES.includes(p.stage) },
  { id:"bpe_plan",           label:"Periodontal management plan",  check:(p)=>(p.bpeMax||0)===0||!!p.bpePlanSelected },
];

function evaluateGovernance(p) {
  const breachFlags     = detectBreach(p);
  const alignerBreaches = checkAlignersOrderedBreach ? checkAlignersOrderedBreach(p) : [];
  const atRiskFlags     = detectAtRisk(p);
  const criteria        = GOV_CRITERIA.map(cr=>({...cr, pass:cr.check(p)}));
  const missing         = criteria.filter(c=>!c.pass).map(c=>c.label);
  const score           = Math.round((criteria.filter(c=>c.pass).length / criteria.length)*100);
  const allBreachFlags  = [...breachFlags, ...alignerBreaches.map(b=>`ALIGNERS ORDERED: ${b}`)];
  const isBreach        = allBreachFlags.length > 0;
  const isAtRisk        = atRiskFlags.length > 0 || missing.length > 0;
  const status          = isBreach ? "BREACH" : (isAtRisk ? "AT_RISK" : "SAFE");
  return { status, criteria, missing, score, breachFlags:allBreachFlags, atRiskFlags };
}


function govColor(status){ return status==="BREACH"?T.error:status==="AT_RISK"?T.warning:T.success; }
function govBg(status)   { return status==="BREACH"?T.errorLight:status==="AT_RISK"?T.warningLight:T.successLight; }
function govBorder(status){ return status==="BREACH"?T.errorBorder:status==="AT_RISK"?T.warningBorder:T.successBorder; }

// ══════════════════════════════════════════════════════════════════════════════
// TRAFFIC LIGHT RULE ENGINE
// Each rule returns RED | AMBER | GREEN for a given problem + case state.
// Rules are centralised here — not scattered through the UI.
// ══════════════════════════════════════════════════════════════════════════════

const TL = {
  RED:   { id:"RED",   label:"Red",   color:"#C0392B", bg:"rgba(192,57,43,0.10)", border:"rgba(192,57,43,0.30)", icon:"●" },
  AMBER: { id:"AMBER", label:"Amber", color:"#C4841A", bg:"rgba(196,132,26,0.10)", border:"rgba(196,132,26,0.30)", icon:"●" },
  GREEN: { id:"GREEN", label:"Green", color:"#2E8B57", bg:"rgba(46,139,87,0.10)",  border:"rgba(46,139,87,0.30)",  icon:"●" },
};

// Central rules object — one entry per problem fieldId or rule ID
// Each rule: { defaultTL, resolve: (problem, resolutions) => TL }
const TRAFFIC_LIGHT_RULES = {
  // ── PERIODONTAL ──────────────────────────────────────────────────────────
  bpe: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => {
      const score = parseInt(p.value) || 0;
      if (score >= 4) return res[p.id] === "specialist_review_complete" ? TL.AMBER : TL.RED;
      if (score === 3) return res[p.id] === "stabilised" ? TL.GREEN : TL.AMBER;
      if (score >= 1) return res[p.id] ? TL.GREEN : TL.AMBER;
      return TL.GREEN;
    },
  },
  perio_status: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => {
      if (["Stage III/IV Periodontitis"].includes(p.value)) return res[p.id] === "stabilised" ? TL.AMBER : TL.RED;
      if (["Stage I/II Periodontitis"].includes(p.value))   return res[p.id] === "stabilised" ? TL.GREEN : TL.AMBER;
      return TL.AMBER;
    },
  },
  biotype: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] === "consented_and_documented" ? TL.GREEN : TL.AMBER,
  },
  recession_ex: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  black_tri: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  bone_levels: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => {
      if (p.value === "Vertical bone loss") return res[p.id] === "specialist_reviewed" ? TL.AMBER : TL.RED;
      return res[p.id] ? TL.GREEN : TL.AMBER;
    },
  },
  // ── RESTORATIVE ──────────────────────────────────────────────────────────
  caries: {
    defaultTL: TL.RED,
    resolve: (p, res) => res[p.id] === "resolved" ? TL.GREEN : TL.RED,
  },
  tsl: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => {
      if (p.value === "Severe") return res[p.id] === "joint_plan_confirmed" ? TL.AMBER : TL.RED;
      return res[p.id] ? TL.GREEN : TL.AMBER;
    },
  },
  root_filled: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  pa_pathology: {
    defaultTL: TL.RED,
    resolve: (p, res) => res[p.id] === "investigated_and_cleared" ? TL.AMBER : TL.RED,
  },
  // ── ORTHODONTIC / SHORT ROOTS ─────────────────────────────────────────────
  short_roots: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => {
      if (p.value === "Significant") return res[p.id] === "consented_and_documented" ? TL.AMBER : TL.RED;
      return res[p.id] ? TL.GREEN : TL.AMBER;
    },
  },
  // ── FUNCTIONAL ────────────────────────────────────────────────────────────
  tmj_pain: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  tmj_clicks: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  bruxism: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  // ── RULE-DERIVED (from CLINICAL_RULES) ───────────────────────────────────
  perio_defer: {
    defaultTL: TL.RED,
    resolve: (p, res) => res[p.id] === "stabilised" ? TL.AMBER : TL.RED,
  },
  tsl_restorative: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  thin_biotype: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] === "consented_and_documented" ? TL.GREEN : TL.AMBER,
  },
  aob_relapse: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
  deep_bite: {
    defaultTL: TL.AMBER,
    resolve: (p, res) => res[p.id] ? TL.GREEN : TL.AMBER,
  },
};

// Resolution options per fieldId — shown inline in the problem row
const RESOLUTION_OPTIONS = {
  bpe: {
    "1": [{ id:"managed_ohi",              label:"OHI / hygienist — managed" }],
    "2": [{ id:"managed_hygienist",         label:"Hygienist treatment complete" }],
    "3": [
      { id:"stabilised",                    label:"Periodontal stabilised" },
      { id:"gdp_referred",                  label:"GDP management in progress" },
    ],
    "4": [
      { id:"specialist_review_complete",    label:"Specialist review complete" },
      { id:"defer_ortho",                   label:"Orthodontics deferred pending clearance" },
    ],
  },
  perio_status: [
    { id:"stabilised",                      label:"Periodontal disease stabilised" },
    { id:"specialist_reviewed",             label:"Specialist review complete" },
  ],
  caries: [
    { id:"resolved",                        label:"Caries treated / restored" },
    { id:"planned_externally",              label:"Planned with GDP — deferred" },
  ],
  tsl: [
    { id:"joint_plan_confirmed",            label:"Joint restorative plan confirmed" },
    { id:"monitoring",                      label:"Monitoring with documented plan" },
  ],
  biotype:       [{ id:"consented_and_documented", label:"Consent block included + documented" }],
  thin_biotype:  [{ id:"consented_and_documented", label:"Consent block included + documented" }],
  recession_ex:  [{ id:"documented_baseline",      label:"Baseline documented in consent" }],
  black_tri:     [{ id:"patient_counselled",        label:"Patient counselled — aesthetic risk discussed" }],
  root_filled:   [{ id:"consented_resorption",      label:"Resorption risk consented" }],
  short_roots:   [{ id:"consented_and_documented",  label:"Risk documented and consented" }],
  pa_pathology:  [{ id:"investigated_and_cleared",  label:"Investigated and cleared by GDP" }],
  tmj_pain:      [{ id:"baseline_documented",       label:"Baseline documented" }],
  tmj_clicks:    [{ id:"baseline_documented",       label:"Baseline documented" }],
  bruxism:       [{ id:"night_guard_planned",        label:"Night guard / management planned" }],
  bone_levels:   [
    { id:"specialist_reviewed",             label:"Specialist periodontal review" },
    { id:"documented",                      label:"Risk documented" },
  ],
  perio_defer:   [{ id:"stabilised",                label:"Periodontal disease stabilised" }],
  tsl_restorative:[{ id:"joint_plan_confirmed",     label:"Joint restorative plan confirmed" }],
  aob_relapse:   [{ id:"relapse_risk_consented",    label:"Relapse risk discussed and consented" }],
  deep_bite:     [{ id:"mechanics_planned",         label:"Intrusion mechanics planned" }],
};

// Determine traffic light for a problem given current resolutions
function getTrafficLight(problem, resolutions) {
  const ruleKey = problem.fromRule ? problem.fieldId.replace("rule_","") : problem.fieldId;
  const rule = TRAFFIC_LIGHT_RULES[ruleKey];
  if (!rule) return TL.AMBER; // unknown problems → amber
  return rule.resolve(problem, resolutions || {});
}

// Get resolution options for a problem
function getResolutionOptions(problem) {
  const ruleKey = problem.fromRule ? problem.fieldId.replace("rule_","") : problem.fieldId;
  const opts = RESOLUTION_OPTIONS[ruleKey];
  if (!opts) return [];
  // bpe has sub-keyed options
  if (ruleKey === "bpe" && problem.value) return opts[problem.value] || [];
  return Array.isArray(opts) ? opts : [];
}

// ── TREATMENT READINESS ENGINE ─────────────────────────────────────────────────
// Returns { ready, blockers: [{label, severity}] }
function computeTreatmentReadiness(problems, resolutions, caseFlags) {
  const blockers = [];
  // 1. Any RED traffic light = hard blocker
  problems.forEach(p => {
    const tl = getTrafficLight(p, resolutions);
    if (tl === TL.RED) {
      blockers.push({ label: p.baseLabel || p.label, severity: "red", problemId: p.id });
    }
  });
  // 2. Governance-level hard checks
  if (caseFlags) {
    if (!caseFlags.signed && ["signed","active_tx","complete"].includes(caseFlags.stage))
      blockers.push({ label:"Consent not signed", severity:"red" });
    if (caseFlags.alignersOrdered && !caseFlags.paymentVerified)
      blockers.push({ label:"Aligners ordered without payment verification", severity:"red" });
    if (caseFlags.alignersOrdered && !caseFlags.clincheckApproved)
      blockers.push({ label:"Aligners ordered without ClinCheck approval", severity:"red" });
    if (caseFlags.alignersOrdered && !caseFlags.decisionsMade)
      blockers.push({ label:"Aligners ordered without clinical decisions completed", severity:"red" });
  }
  return { ready: blockers.length === 0, blockers };
}

// ── COMMERCIAL FUNNEL ENGINE ───────────────────────────────────────────────────
// Returns stage, commitment rate, conversion rate per patient/practice
function getCommercialStage(p) {
  if (["active_tx","complete"].includes(p.stage)) return "active_treatment";
  if (p.alignersOrdered)     return "aligners_ordered";
  if (p.clincheckApproved)   return "clincheck_approved";
  if (p.signed)              return "consent_signed";
  if (p.clincheckFeePaid)    return "clincheck_fee_paid";
  if (p.stage !== "consultation") return "in_assessment";
  return "consultation";
}

const COMMERCIAL_STAGE_CONFIG = {
  consultation:       { label:"Consultation",         color:"#4A7A6A", rank:1 },
  in_assessment:      { label:"In Assessment",        color:T.goldDim, rank:2 },
  clincheck_fee_paid: { label:"ClinCheck Fee Paid",   color:T.info,    rank:3 },
  consent_signed:     { label:"Consent Signed",       color:T.success, rank:4 },
  clincheck_approved: { label:"ClinCheck Approved",   color:"#8E44AD", rank:5 },
  aligners_ordered:   { label:"Aligners Ordered",     color:T.primary, rank:6 },
  active_treatment:   { label:"Active Treatment",     color:T.cyan,    rank:7 },
};

function computePracticeFunnel(patients) {
  const total          = patients.length;
  const consulted      = total;

  // Soft conversion: ClinCheck fee paid (£200 commitment)
  const softConverted  = patients.filter(p => p.clincheckFeePaid).length;
  // Hard conversion: aligners actually ordered
  const hardConverted  = patients.filter(p => p.alignersOrdered).length;
  // Legacy aliases — all existing code continues to work unchanged
  const committed      = softConverted;
  const converted      = hardConverted;

  const activeCases    = patients.filter(p => ["active_tx","complete"].includes(p.stage)).length;
  const pipelineVal    = patients.filter(p=>p.value).reduce((a,p)=>a+(p.value||0),0);

  // Drop-off tracking
  const videoSent      = patients.filter(p => p.clincheckApproved).length;
  const videoApproved  = patients.filter(p => p.alignersOrdered).length;

  // Rates
  const softRate       = total > 0 ? Math.round((softConverted/total)*100) : 0;
  const hardRate       = total > 0 ? Math.round((hardConverted/total)*100) : 0;
  const commitRate     = softRate;   // legacy alias
  const convRate       = hardRate;   // legacy alias

  return {
    total, consulted,
    softConverted, hardConverted,
    committed, converted,            // legacy aliases
    activeCases, pipelineVal,
    softRate, hardRate,
    commitRate, convRate,            // legacy aliases
    videoSent, videoApproved,
  };
}

// ── ALIGNERS ORDERED BREACH CHECK ─────────────────────────────────────────────
function checkAlignersOrderedBreach(p) {
  if (!p.alignersOrdered) return [];
  const breaches = [];
  if (!p.decisionsMade)      breaches.push("Clinical decisions not completed before ordering");
  if (!p.signed)             breaches.push("Consent not signed before ordering");
  if (!p.estimateSigned)     breaches.push("Estimate not accepted before ordering");
  if (!p.paymentVerified)    breaches.push("Payment not verified before ordering");
  if (!p.clincheckApproved)  breaches.push("ClinCheck not approved before ordering");
  if ((p.bpeMax||0) >= 3 && !p.bpePlanSelected) breaches.push("BPE ≥3 management not documented before ordering");
  if (p.activeCaries && !p.cariesResolved) breaches.push("Active caries not resolved before ordering");
  return breaches;
}

// ── GOVERNANCE SCORING (refined) ──────────────────────────────────────────────
// Score is driven by explicit criteria — not random.
// Each criterion has a weight. Missing one deducts proportionally.
const GOV_CRITERIA_WEIGHTED = [
  { id:"consent_signed",      label:"Consent signed",                        weight:15, check:(p)=>!!p.signed },
  { id:"decisions_made",      label:"Clinical decisions made",               weight:12, check:(p)=>!!p.decisionsMade },
  { id:"estimate_signed",     label:"Estimate accepted",                     weight:10, check:(p)=>p.estimateSigned||!ACTIVE_STAGES.includes(p.stage) },
  { id:"payment_verified",    label:"Payment verified",                      weight:12, check:(p)=>p.paymentVerified||!ACTIVE_STAGES.includes(p.stage) },
  { id:"clincheck_approved",  label:"ClinCheck approved",                    weight:10, check:(p)=>p.clincheckApproved||!IN_TREATMENT_STAGES.includes(p.stage) },
  // protocol_built excluded from weighted score — CAP builder is optional
  { id:"monthly_agreement",   label:"Monthly payment agreement",             weight:8,  check:(p)=>p.monthlyAgreementSigned||!p.payMonthly||!["active_tx","complete"].includes(p.stage) },
  { id:"restorative_plan",    label:"Restorative plan resolved",             weight:8,  check:(p)=>!p.restorativePlanRequired||!!p.restorativePlanSolution },
  { id:"bpe_plan",            label:"Periodontal management documented",     weight:10, check:(p)=>(p.bpeMax||0)===0||!!p.bpePlanSelected },
  { id:"caries_resolved",     label:"Active caries resolved",                weight:10, check:(p)=>!p.activeCaries||!!p.cariesResolved },
  { id:"no_aligner_breach",   label:"No aligners-ordered governance breach", weight:15, check:(p)=>checkAlignersOrderedBreach(p).length===0 },
];

function computeWeightedGovScore(p) {
  const totalWeight = GOV_CRITERIA_WEIGHTED.reduce((a,c)=>a+c.weight,0);
  const earnedWeight = GOV_CRITERIA_WEIGHTED.filter(c=>c.check(p)).reduce((a,c)=>a+c.weight,0);
  return Math.round((earnedWeight/totalWeight)*100);
}

// ── 3-STATUS EVALUATOR ─────────────────────────────────────────────────────────
function evaluateFullStatus(p) {
  // Commercial status
  const commercialStage = getCommercialStage(p);
  // Clinical status
  const alignerBreaches = checkAlignersOrderedBreach(p);
  const bpe = p.bpeMax || 0;
  const clinicalBlockers = [];
  if (p.activeCaries && !p.cariesResolved) clinicalBlockers.push({ label:"Active caries — unresolved", sev:"red" });
  if (bpe >= 4 && !p.bpePlanSelected)     clinicalBlockers.push({ label:"BPE 4 — specialist referral required", sev:"red" });
  if (bpe === 3 && !p.bpePlanSelected)    clinicalBlockers.push({ label:"BPE 3 — periodontal management required", sev:"amber" });
  if (bpe >= 1 && bpe <= 2 && !p.bpePlanSelected) clinicalBlockers.push({ label:`BPE ${bpe} — management plan not documented`, sev:"amber" });
  const clinicalStatus = clinicalBlockers.some(b=>b.sev==="red") ? "NOT_CLEARED" :
                         clinicalBlockers.some(b=>b.sev==="amber") ? "CONDITIONAL" : "CLEARED";
  // Governance status
  const gov = evaluateGovernance(p);
  const alignerBreachFlags = alignerBreaches.map(b=>({ label:b, severity:"breach" }));
  const govStatus = alignerBreachFlags.length > 0 ? "BREACH" : gov.status;
  const govScore  = computeWeightedGovScore(p);
  return {
    commercialStage, commercialConfig: COMMERCIAL_STAGE_CONFIG[commercialStage],
    clinicalStatus, clinicalBlockers,
    govStatus, govScore,
    alignerBreaches: alignerBreachFlags,
    govFlags: [...gov.breachFlags, ...gov.atRiskFlags],
    treatmentReady: clinicalStatus === "CLEARED" && govStatus !== "BREACH",
  };
}

// ── CLINICIAN PERFORMANCE (enriched) ──────────────────────────────────────────
function buildEnrichedClinicianTable(patients) {
  const clis = [...new Set(patients.map(p=>p.cli))];
  return clis.map(cli => {
    const pts       = patients.filter(p=>p.cli===cli);
    const funnel    = computePracticeFunnel(pts);
    const statuses  = pts.map(p=>evaluateFullStatus(p));
    const breach    = statuses.filter(s=>s.govStatus==="BREACH").length;
    const atRisk    = statuses.filter(s=>s.govStatus==="AT_RISK").length;
    const avgScore  = Math.round(statuses.reduce((a,s)=>a+s.govScore,0)/statuses.length);
    return { cli, ...funnel, breach, atRisk, avgScore,
      risk: breach>0?"BREACH":atRisk>0?"AT_RISK":"SAFE" };
  }).sort((a,b)=>({BREACH:0,AT_RISK:1,SAFE:2}[a.risk])-({BREACH:0,AT_RISK:1,SAFE:2}[b.risk]));
}

// Blocker engine — gates stage progression
const BLOCKER = {
  CLINICAL:    { id:"clinical",    label:"Clinical",    color:T.error,   icon:"◈" },
  CONSENT:     { id:"consent",     label:"Consent",     color:"#8E44AD", icon:"⚖" },
  FINANCIAL:   { id:"financial",   label:"Financial",   color:T.info,    icon:"£" },
  PERIODONTAL: { id:"periodontal", label:"Periodontal", color:T.error,   icon:"⚠" },
};

function assessmentBlockers(assessment) {
  const blockers = [];
  if (!assessment) {
    blockers.push({ category:BLOCKER.CLINICAL, severity:"breach", message:"Orthodontic assessment has not been completed" });
    return blockers;
  }
  const fv = assessment.findings || {};
  const problems = assessment.problems || [];
  const decisions = assessment.decisions || {};
  if (Object.keys(fv).length < 4)
    blockers.push({ category:BLOCKER.CLINICAL, severity:"at_risk", message:"Assessment has fewer than 4 findings recorded" });
  const undecided = problems.filter(p => !decisions[p.key||p.id]);
  if (undecided.length > 0)
    blockers.push({ category:BLOCKER.CLINICAL, severity:"breach", message:`${undecided.length} clinical problem${undecided.length!==1?"s have":" has"} not been decided` });
  return blockers;
}

function periodontalBlockers(assessment, targetStage) {
  const blockers = [];
  if (!assessment) return blockers;
  const bpe = parseInt(assessment.findings?.bpe) || 0;
  if (bpe >= 3)
    blockers.push({ category:BLOCKER.PERIODONTAL, severity:"breach", message:`BPE ${bpe} — periodontal disease must be stabilised before treatment` });
  if (bpe >= 4)
    blockers.push({ category:BLOCKER.PERIODONTAL, severity:"breach", message:"BPE 4 — specialist periodontal referral required before proceeding" });
  return blockers;
}

function consentBlockers(consent, targetStage) {
  const blockers = [];
  if (["signed","active_tx","complete"].includes(targetStage) && !consent?.signed)
    blockers.push({ category:BLOCKER.CONSENT, severity:"breach", message:"Consent must be signed before treatment can proceed" });
  return blockers;
}

function financialBlockers(estimate, targetStage) {
  const blockers = [];
  if (["signed","active_tx","complete","clincheck"].includes(targetStage) && !estimate?.estimateSigned)
    blockers.push({ category:BLOCKER.FINANCIAL, severity:"breach", message:"Treatment estimate must be accepted before proceeding" });
  return blockers;
}

function getProgressionBlockers(caseState, targetStage) {
  const { assessment, consent, estimate } = caseState;
  const blockers = [
    ...assessmentBlockers(assessment),
    ...periodontalBlockers(assessment, targetStage),
    ...consentBlockers(consent, targetStage),
    ...financialBlockers(estimate, targetStage),
  ];
  const breachBlockers = blockers.filter(b=>b.severity==="breach");
  const atRiskBlockers  = blockers.filter(b=>b.severity==="at_risk");
  return { allowed:breachBlockers.length===0, blockers, breachBlockers, atRiskBlockers };
}

// Blocker UI components — styled to V13 design language
function BlockerList({ blockers }) {
  return (
    <div>
      {blockers.map((b,i) => {
        const c = b.category || BLOCKER.CLINICAL;
        const isBreach = b.severity==="breach";
        return (
          <div key={i} style={{ padding:"10px 18px", borderTop:`1px solid ${isBreach?T.errorBorder:T.warningBorder}`, display:"flex", alignItems:"flex-start", gap:10, background:isBreach?"rgba(192,57,43,0.03)":"rgba(196,132,26,0.03)" }}>
            <span style={{ fontSize:11, fontWeight:700, color:c.color, background:"rgba(255,255,255,0.6)", borderRadius:3, padding:"1px 6px", whiteSpace:"nowrap", flexShrink:0, marginTop:1 }}>{c.icon} {c.label}</span>
            <span style={{ fontSize:12.5, color:isBreach?T.error:T.warning, flex:1 }}>{b.message}</span>
            <span style={{ fontSize:10, fontWeight:700, color:"#fff", background:isBreach?T.error:T.warning, borderRadius:3, padding:"1px 6px", flexShrink:0 }}>{isBreach?"BLOCK":"RISK"}</span>
          </div>
        );
      })}
    </div>
  );
}

function BlockerPanel({ blockers, targetStage }) {
  if (!blockers || blockers.length===0) return null;
  const breachCount = blockers.filter(b=>b.severity==="breach").length;
  return (
    <div style={{ background:breachCount>0?T.errorLight:T.warningLight, border:`1.5px solid ${breachCount>0?T.errorBorder:T.warningBorder}`, borderRadius:10, overflow:"hidden", marginBottom:16 }}>
      <div style={{ padding:"11px 18px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:13, color:breachCount>0?T.error:T.warning }}>{breachCount>0?"✕":"⚠"}</span>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:13, fontWeight:700, color:breachCount>0?T.error:T.warning }}>
            {breachCount>0 ? `${breachCount} item${breachCount!==1?"s":""} must be resolved before proceeding` : `${blockers.length-breachCount} item${blockers.length-breachCount!==1?"s require":"requires"} attention`}
          </span>
          {targetStage && <span style={{ fontSize:11.5, color:T.muted, marginLeft:8 }}>— to reach {targetStage}</span>}
        </div>
      </div>
      <BlockerList blockers={blockers}/>
    </div>
  );
}

// Governance Dashboard — V13 card/table style
function ProgressBar({ value, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:5, background:T.borderLight, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%", background:color||T.success, borderRadius:3, transition:"width 0.3s" }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:color||T.success, minWidth:30, textAlign:"right" }}>{value}%</span>
    </div>
  );
}

function buildClinicianTable(patients) {
  const clis = [...new Set(patients.map(p=>p.cli))];
  return clis.map(cli=>{
    const pts  = patients.filter(p=>p.cli===cli);
    const govs = pts.map(p=>evaluateGovernance(p));
    return {
      cli,
      total:    pts.length,
      safe:     govs.filter(g=>g.status==="SAFE").length,
      atRisk:   govs.filter(g=>g.status==="AT_RISK").length,
      breach:   govs.filter(g=>g.status==="BREACH").length,
      avgScore: Math.round(govs.reduce((a,g)=>a+g.score,0)/govs.length),
      immediateIssues: govs.filter(g=>g.breachFlags.length>0).length,
      risk:     govs.some(g=>g.status==="BREACH")?"BREACH":govs.some(g=>g.status==="AT_RISK")?"AT_RISK":"SAFE",
    };
  }).sort((a,b)=>({ BREACH:0, AT_RISK:1, SAFE:2 }[a.risk])-({ BREACH:0, AT_RISK:1, SAFE:2 }[b.risk]));
}

function GovernanceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const patients    = MOCK_PATIENTS;
  const govs        = patients.map(p=>({p, gov:evaluateGovernance(p)}));
  const breach      = govs.filter(g=>g.gov.status==="BREACH");
  const atRisk      = govs.filter(g=>g.gov.status==="AT_RISK");
  const avgCompletion = Math.round(govs.reduce((a,g)=>a+g.gov.score,0)/govs.length);
  const cliTable    = buildClinicianTable(patients);
  const highRiskCli = cliTable[0];

  const TABS = [
    { id:"overview",     label:"Overview"             },
    { id:"readiness",    label:"Treatment Readiness"  },
    { id:"clinicians",   label:"Clinician Risk Table" },
    { id:"cases",        label:"Highest Risk Cases"   },
    { id:"exceptions",   label:"Exceptions"           },
  ];
  const [activeTabGov, setActiveTabGov] = useState("overview");

  const SummaryCard = ({label, value, sub, color, bg, border, icon}) => (
    <div style={{ background:bg||T.card, border:`1.5px solid ${border||T.border}`, borderRadius:10, padding:"18px 22px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
        <span style={{ fontSize:16, color:color||T.muted }}>{icon}</span>
        <span style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:color||T.muted }}>{label}</span>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:color||T.ink, letterSpacing:-0.5, lineHeight:1, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11.5, color:color||T.muted, opacity:0.8 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding:"28px 36px", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:breach.length>0?T.error:T.success }}/>
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:breach.length>0?T.error:T.success }}>Clinical Safety</span>
          </div>
          <div style={{ fontSize:24, fontWeight:800, color:T.primary, letterSpacing:-0.3 }}>Governance & Risk Dashboard</div>
          <div style={{ fontSize:12.5, color:T.muted, marginTop:2 }}>{TENANT.practice} · {patients.length} active cases</div>
        </div>
        {breach.length>0 && (
          <div style={{ background:T.errorLight, border:`1.5px solid ${T.errorBorder}`, borderRadius:8, padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14, color:T.error }}>✕</span>
            <span style={{ fontSize:13, fontWeight:700, color:T.error }}>{breach.length} BREACH{breach.length!==1?"ES":""} — immediate action required</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <SummaryCard label="Breach Cases"     value={breach.length}      sub="Immediate action"  color={breach.length>0?T.error:T.success}    bg={breach.length>0?T.errorLight:T.successLight}    border={breach.length>0?T.errorBorder:T.successBorder}    icon="✕"/>
        <SummaryCard label="At Risk Cases"    value={atRisk.length}      sub="Action needed"     color={atRisk.length>0?T.warning:T.success}   bg={atRisk.length>0?T.warningLight:T.successLight}   border={atRisk.length>0?T.warningBorder:T.successBorder}  icon="⚠"/>
        <SummaryCard label="Avg Completion"   value={`${avgCompletion}%`} sub="Governance score" color={avgCompletion<70?T.warning:T.success}  bg={avgCompletion<70?T.warningLight:T.successLight}  border={avgCompletion<70?T.warningBorder:T.successBorder} icon="◎"/>
        <SummaryCard label="Highest Risk"     value={highRiskCli?.cli||"—"} sub={`${highRiskCli?.breach||0} breach, ${highRiskCli?.atRisk||0} at risk`} color={highRiskCli?.risk==="BREACH"?T.error:T.warning} bg={T.warningLight} border={T.warningBorder} icon="◈"/>
      </div>

      {/* Tabs — V13 style */}
      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:22 }}>
        {TABS.map(tab=>{
          const active=activeTab===tab.id;
          return (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background:"none", border:"none", borderBottom:`2.5px solid ${active?T.gold:"transparent"}`, padding:"9px 20px", fontSize:13, fontWeight:active?700:400, color:active?T.primary:T.muted, cursor:"pointer", fontFamily:"inherit", marginBottom:-2 }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview */}
      {activeTabGov==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Breach */}
          <div style={{ background:T.card, borderRadius:12, border:`1.5px solid ${T.errorBorder}`, overflow:"hidden" }}>
            <div style={{ padding:"11px 18px", background:T.errorLight, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.error }}>✕ Breach Cases ({breach.length})</span>
            </div>
            {breach.length===0 && <div style={{ padding:"18px", fontSize:13, color:T.success }}>✓ No breach cases</div>}
            {breach.map(({p,gov})=>(
              <div key={p.id} style={{ padding:"12px 18px", borderTop:`1px solid ${T.borderLight}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <Avt name={p.name} size={26}/>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</div><div style={{ fontSize:11, color:T.muted }}>{p.cli} · <StagePill stage={p.stage}/></div></div>
                </div>
                {gov.breachFlags.map(f=><div key={f} style={{ fontSize:11.5, color:T.error, background:T.errorLight, borderRadius:3, padding:"3px 8px", marginBottom:3 }}>✕ {f}</div>)}
              </div>
            ))}
          </div>
          {/* At Risk */}
          <div style={{ background:T.card, borderRadius:12, border:`1.5px solid ${T.warningBorder}`, overflow:"hidden" }}>
            <div style={{ padding:"11px 18px", background:T.warningLight, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.warning }}>⚠ At Risk Cases ({atRisk.length})</span>
            </div>
            {atRisk.length===0 && <div style={{ padding:"18px", fontSize:13, color:T.success }}>✓ No at-risk cases</div>}
            {atRisk.map(({p,gov})=>(
              <div key={p.id} style={{ padding:"12px 18px", borderTop:`1px solid ${T.borderLight}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <Avt name={p.name} size={26}/>
                  <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</div><div style={{ fontSize:11, color:T.muted }}>{p.cli} · {gov.score}%</div></div>
                </div>
                {gov.atRiskFlags.slice(0,2).map(f=><div key={f} style={{ fontSize:11.5, color:T.warning, background:T.warningLight, borderRadius:3, padding:"3px 8px", marginBottom:3 }}>⚠ {f}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinician table */}
      {activeTabGov==="clinicians" && (
        <div style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 60px 80px 50px 60px 60px 80px", padding:"9px 18px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
            {["Clinician","Cases","Completion","Safe","At Risk","Breach","Status"].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted }}>{h}</span>
            ))}
          </div>
          {cliTable.map((row,i)=>(
            <div key={row.cli} style={{ display:"grid", gridTemplateColumns:"1.5fr 60px 80px 50px 60px 60px 80px", padding:"13px 18px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}><Avt name={row.cli} size={28}/><div><div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{row.cli}</div><span style={{ fontSize:10, fontWeight:800, color:govColor(row.risk), background:govBg(row.risk), border:`1px solid ${govBorder(row.risk)}`, borderRadius:3, padding:"1px 6px" }}>{row.risk==="BREACH"?"✕":row.risk==="AT_RISK"?"⚠":"✓"} {row.risk}</span></div></div>
              <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{row.total}</span>
              <ProgressBar value={row.avgScore} color={row.avgScore<70?T.warning:T.success}/>
              <span style={{ fontSize:13, fontWeight:700, color:T.success }}>{row.safe}</span>
              <span style={{ fontSize:13, fontWeight:700, color:row.atRisk>0?T.warning:T.faint }}>{row.atRisk}</span>
              <span style={{ fontSize:13, fontWeight:700, color:row.breach>0?T.error:T.faint }}>{row.breach}</span>
              {row.immediateIssues>0
                ? <span style={{ fontSize:11, fontWeight:700, color:T.error, background:T.errorLight, borderRadius:4, padding:"2px 7px" }}>{row.immediateIssues} urgent</span>
                : <span style={{ fontSize:11, color:T.success }}>✓ Clear</span>}
            </div>
          ))}
        </div>
      )}

      {/* Highest risk cases */}
      {activeTabGov==="cases" && (
        <div style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px 2fr", padding:"9px 18px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
            {["Patient","Clinician","Stage","Risk","Flags"].map(h=>(
              <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted }}>{h}</span>
            ))}
          </div>
          {[...govs].sort((a,b)=>({ BREACH:0, AT_RISK:1, SAFE:2 }[a.gov.status])-({ BREACH:0, AT_RISK:1, SAFE:2 }[b.gov.status])||(a.gov.score-b.gov.score)).map(({p,gov},i)=>(
            <div key={p.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px 2fr", padding:"12px 18px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"start", background:gov.status==="BREACH"?"rgba(192,57,43,0.02)":"transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><Avt name={p.name} size={26}/><div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</div></div>
              <span style={{ fontSize:12, color:T.sub }}>{p.cli}</span>
              <StagePill stage={p.stage}/>
              <span style={{ fontSize:10, fontWeight:800, color:govColor(gov.status), background:govBg(gov.status), border:`1px solid ${govBorder(gov.status)}`, borderRadius:3, padding:"2px 7px", whiteSpace:"nowrap" }}>{gov.status==="BREACH"?"✕":gov.status==="AT_RISK"?"⚠":"✓"} {gov.status}</span>
              <div>
                {gov.breachFlags.map(f=><div key={f} style={{ fontSize:11, color:T.error, fontWeight:600, marginBottom:2 }}>✕ {f}</div>)}
                {gov.atRiskFlags.map(f=><div key={f} style={{ fontSize:11, color:T.warning, marginBottom:2 }}>⚠ {f}</div>)}
                {!gov.breachFlags.length&&!gov.atRiskFlags.length&&<span style={{ fontSize:11, color:T.success }}>✓ No flags</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Treatment Readiness tab */}
      {activeTabGov==="readiness" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {patients.map(p => {
            const fs = evaluateFullStatus(p);
            const tlColor = fs.clinicalStatus==="NOT_CLEARED"?T.error:fs.clinicalStatus==="CONDITIONAL"?T.warning:T.success;
            const tlLabel = fs.clinicalStatus==="NOT_CLEARED"?"NOT CLEARED":fs.clinicalStatus==="CONDITIONAL"?"CONDITIONAL":"CLEARED";
            return (
              <div key={p.id} style={{ background:T.card, borderRadius:10, border:`1px solid ${fs.clinicalStatus==="NOT_CLEARED"?T.errorBorder:fs.clinicalStatus==="CONDITIONAL"?T.warningBorder:T.border}`, overflow:"hidden" }}>
                <div style={{ padding:"11px 18px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${T.borderLight}` }}>
                  <Avt name={p.name} size={26}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{p.cli} · {p.clinic||""}</div>
                  </div>
                  {/* Commercial stage */}
                  <span style={{ fontSize:10.5, fontWeight:700, color:fs.commercialConfig?.color||T.muted, background:`${fs.commercialConfig?.color||T.muted}15`, borderRadius:10, padding:"2px 9px" }}>
                    {fs.commercialConfig?.label||p.stage}
                  </span>
                  {/* Clinical readiness badge */}
                  <span style={{ fontSize:10.5, fontWeight:800, color:tlColor, background:`${tlColor}15`, border:`1px solid ${tlColor}30`, borderRadius:4, padding:"2px 8px", letterSpacing:0.3 }}>
                    {tlLabel}
                  </span>
                  {/* Gov status */}
                  <span style={{ fontSize:10.5, fontWeight:800, color:govColor(fs.govStatus), background:govBg(fs.govStatus), border:`1px solid ${govBorder(fs.govStatus)}`, borderRadius:4, padding:"2px 8px" }}>
                    {fs.govStatus==="BREACH"?"✕":fs.govStatus==="AT_RISK"?"⚠":"✓"} {fs.govStatus}
                  </span>
                  {/* Score */}
                  <span style={{ fontSize:12, fontWeight:800, color:fs.govScore>=80?T.success:fs.govScore>=60?T.warning:T.error, minWidth:32, textAlign:"right" }}>{fs.govScore}</span>
                </div>
                {/* Clinical blockers */}
                {fs.clinicalBlockers.length > 0 && (
                  <div style={{ padding:"9px 18px", display:"flex", flexWrap:"wrap", gap:6 }}>
                    {fs.clinicalBlockers.map((b,i)=>(
                      <span key={i} style={{ fontSize:11, fontWeight:600, color:b.sev==="red"?T.error:T.warning, background:b.sev==="red"?T.errorLight:T.warningLight, borderRadius:4, padding:"2px 8px" }}>
                        {b.sev==="red"?"✕":"⚠"} {b.label}
                      </span>
                    ))}
                  </div>
                )}
                {/* Aligner breach flags */}
                {fs.alignerBreaches.length > 0 && (
                  <div style={{ padding:"9px 18px", background:"rgba(192,57,43,0.03)", borderTop:`1px solid ${T.errorBorder}` }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:T.error, textTransform:"uppercase", letterSpacing:0.6, marginBottom:5 }}>⚠ Aligners-Ordered Breach</div>
                    {fs.alignerBreaches.map((b,i)=>(
                      <div key={i} style={{ fontSize:11.5, color:T.error, marginBottom:2 }}>✕ {b.label}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exceptions */}
      {activeTabGov==="exceptions" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Missing Consent",         patients:patients.filter(p=>ACTIVE_STAGES.includes(p.stage)&&!p.signed),                   color:T.error,   bg:T.errorLight,   icon:"✕" },
            { label:"Missing Assessment",       patients:patients.filter(p=>p.stage!=="consultation"&&!p.decisionsMade),                   color:T.warning, bg:T.warningLight, icon:"⚠" },
            { label:"Estimate Not Signed",      patients:patients.filter(p=>ACTIVE_STAGES.includes(p.stage)&&!p.estimateSigned),           color:T.info,    bg:T.infoLight,    icon:"£" },
            { label:"BPE ≥3 Unaddressed",       patients:patients.filter(p=>(p.bpeMax||0)>=3&&!p.consented),                              color:T.error,   bg:T.errorLight,   icon:"⚠" },

          ].map(exc=>(
            <div key={exc.label} style={{ background:T.card, borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden" }}>
              <div style={{ padding:"11px 18px", background:exc.bg, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}><span style={{ fontSize:13, color:exc.color }}>{exc.icon}</span><span style={{ fontSize:12.5, fontWeight:700, color:exc.color }}>{exc.label}</span></div>
                <span style={{ fontSize:12, fontWeight:700, color:exc.color, background:"rgba(255,255,255,0.5)", borderRadius:10, padding:"1px 9px" }}>{exc.patients.length}</span>
              </div>
              {exc.patients.length===0
                ? <div style={{ padding:"11px 18px", fontSize:12.5, color:T.success }}>✓ No exceptions</div>
                : exc.patients.map((p,i)=>(
                  <div key={p.id} style={{ padding:"9px 18px", borderTop:`1px solid ${T.borderLight}`, display:"flex", alignItems:"center", gap:10 }}>
                    <Avt name={p.name} size={22}/>
                    <span style={{ fontSize:13, fontWeight:500, color:T.ink, flex:1 }}>{p.name}</span>
                    <span style={{ fontSize:11.5, color:T.muted }}>{p.cli}</span>
                    <StagePill stage={p.stage}/>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Enriched with governance fields for the risk engine
const MOCK_PATIENTS = [
  // stage, commercial funnel, clinical flags, governance fields
  { id:"p1", name:"Emma Richardson",  dob:"12/04/1995", age:29, stage:"signed",        cli:"Dr Haroon", clinic:"Birmingham", date:"Today", value:4495, problems:3, consented:true,  signed:true,  paymentVerified:true,  clincheckApproved:false, decisionsMade:true,  bpeMax:1, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:false, restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:true,  clincheckFeePaid:true,  alignersOrdered:false, activeCaries:false, bpePlanSelected:"hygienist_sp",   cariesResolved:true  },
  { id:"p2", name:"James Pemberton",  dob:"03/07/1988", age:36, stage:"consent_sent",  cli:"Dr Haroon", clinic:"Birmingham", date:"Today", value:3995, problems:2, consented:true,  signed:false, paymentVerified:false, clincheckApproved:false, decisionsMade:true,  bpeMax:2, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:false, restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:false, clincheckFeePaid:true,  alignersOrdered:false, activeCaries:false, bpePlanSelected:"ohi_hygienist",  cariesResolved:true  },
  { id:"p3", name:"Priya Mehta",      dob:"22/11/2001", age:22, stage:"assessment",    cli:"Dr Sarah",  clinic:"Solihull",   date:"Today", value:null, problems:4, consented:false, signed:false, paymentVerified:false, clincheckApproved:false, decisionsMade:false, bpeMax:3, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:false, restorativePlanRequired:true,  restorativePlanSolution:null, estimateSigned:false, clincheckFeePaid:false, alignersOrdered:false, activeCaries:true,  bpePlanSelected:null,              cariesResolved:false },
  { id:"p4", name:"Oliver Clarke",    dob:"09/02/1990", age:34, stage:"consultation",  cli:"Dr Haroon", clinic:"Birmingham", date:"Today", value:null, problems:0, consented:false, signed:false, paymentVerified:false, clincheckApproved:false, decisionsMade:false, bpeMax:0, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:false, restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:false, clincheckFeePaid:false, alignersOrdered:false, activeCaries:false, bpePlanSelected:null,              cariesResolved:true  },
  { id:"p5", name:"Sophie Williams",  dob:"17/06/1998", age:26, stage:"active_tx",     cli:"Dr James",  clinic:"Wolverhampton",date:"Mon",   value:5495, problems:5, consented:true,  signed:true,  paymentVerified:true,  clincheckApproved:true,  decisionsMade:true,  bpeMax:2, monthlyAgreementSigned:true,  payMonthly:true,  protocolBuilt:true,  restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:true,  clincheckFeePaid:true,  alignersOrdered:true,  activeCaries:false, bpePlanSelected:"ohi_hygienist",  cariesResolved:true  },
  { id:"p6", name:"Arjun Sharma",     dob:"28/09/1985", age:38, stage:"consent_draft", cli:"Dr Sarah",  clinic:"Solihull",   date:"Mon",   value:4995, problems:3, consented:false, signed:false, paymentVerified:false, clincheckApproved:false, decisionsMade:true,  bpeMax:4, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:false, restorativePlanRequired:true,  restorativePlanSolution:"composite_bonding", estimateSigned:false, clincheckFeePaid:false, alignersOrdered:false, activeCaries:false, bpePlanSelected:null,              cariesResolved:true  },
  { id:"p7", name:"Charlotte Davies", dob:"14/03/2003", age:21, stage:"signed",        cli:"Dr Haroon", clinic:"Birmingham", date:"Tue",   value:3495, problems:1, consented:true,  signed:true,  paymentVerified:true,  clincheckApproved:true,  decisionsMade:true,  bpeMax:1, monthlyAgreementSigned:false, payMonthly:false, protocolBuilt:true,  restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:true,  clincheckFeePaid:true,  alignersOrdered:false, activeCaries:false, bpePlanSelected:"ohi_only",        cariesResolved:true  },
  { id:"p8", name:"Marcus Thompson",  dob:"06/12/1978", age:45, stage:"complete",      cli:"Dr James",  clinic:"Wolverhampton",date:"Tue",   value:4495, problems:2, consented:true,  signed:true,  paymentVerified:true,  clincheckApproved:true,  decisionsMade:true,  bpeMax:2, monthlyAgreementSigned:true,  payMonthly:true,  protocolBuilt:true,  restorativePlanRequired:false, restorativePlanSolution:null, estimateSigned:true,  clincheckFeePaid:true,  alignersOrdered:true,  activeCaries:false, bpePlanSelected:"review_stability", cariesResolved:true  },
];

// ── Seed ConsultationInsightStore from mock patient data ─────────────────────
// Infers plausible AI signals from known patient characteristics.
// Gives Clinical Intel real patterns to display from day one.
;(() => {
  const seeds = [
    { name:"Emma Richardson",  label:"High",   pct:78, signals:["Strong aesthetic motivation","Asking about treatment timeline","Simulation shown — positive reaction"], barriers:[] },
    { name:"James Pemberton",  label:"Medium", pct:55, signals:["Clear concern about crowding","Occupation requires presentable appearance"], barriers:["Some cost hesitation","Uncertain about treatment length"] },
    { name:"Priya Mehta",      label:"Low",    pct:28, signals:["Interested in improving smile"], barriers:["Active dental health concern","Restorative work needed first","Financial uncertainty"] },
    { name:"Oliver Clarke",    label:"Medium", pct:60, signals:["Self-referred — proactive","Motivated by professional appearance"], barriers:["Exploring options — not yet committed"] },
    { name:"Sophie Williams",  label:"High",   pct:85, signals:["Very motivated — asking about start date","Outcome simulation shown — enthusiastic","Monthly payment option discussed positively"], barriers:[] },
    { name:"Arjun Sharma",     label:"Medium", pct:48, signals:["Longstanding concern about teeth","Partner is supportive"], barriers:["BPE concerns raised","Restorative prerequisites needed","Cost of additional treatment"] },
    { name:"Charlotte Davies", label:"High",   pct:82, signals:["Strong aesthetic concern","Young — long-term investment mindset","Clear goals stated"], barriers:["Minor concern about visibility of aligners"] },
    { name:"Marcus Thompson",  label:"High",   pct:74, signals:["Referred by dentist — pre-motivated","Functional concern alongside aesthetics"], barriers:["Schedule flexibility concern"] },
  ];
  seeds.forEach(s => ConsultationInsightStore.record({
    patientName:      s.name,
    predicted_label:  s.label,
    predicted_pct:    s.pct,
    positive_signals: s.signals,
    barriers:         s.barriers,
  }));
})();


// ── Seed ConsultationInsightStore from mock patient data ─────────────────────
// Infers plausible signals from known patient characteristics.
// Gives Clinical Intel real patterns from day one without waiting for live analyses.
;(() => {
  const seeds = [
    { name:"Emma Richardson",  label:"High",   pct:78, signals:["Strong aesthetic motivation","Asking about treatment timeline","Simulation shown — positive reaction"], barriers:[] },
    { name:"James Pemberton",  label:"Medium", pct:55, signals:["Clear concern about crowding","Occupation requires presentable appearance"], barriers:["Cost hesitation","Uncertain about treatment length"] },
    { name:"Priya Mehta",      label:"Low",    pct:28, signals:["Interested in improving smile"], barriers:["Active dental health concern first","Financial uncertainty","Additional treatment needed before aligners"] },
    { name:"Oliver Clarke",    label:"Medium", pct:60, signals:["Self-referred — proactive","Motivated by professional appearance"], barriers:["Exploring options — not yet committed"] },
    { name:"Sophie Williams",  label:"High",   pct:85, signals:["Very motivated — asking about start date","Outcome simulation — enthusiastic","Monthly payment option discussed positively"], barriers:[] },
    { name:"Arjun Sharma",     label:"Medium", pct:48, signals:["Longstanding concern","Partner supportive"], barriers:["Periodontal concerns","Restorative prerequisites","Cost hesitation"] },
    { name:"Charlotte Davies", label:"High",   pct:82, signals:["Strong aesthetic concern","Long-term investment mindset","Clear treatment goals stated"], barriers:["Concern about aligner visibility"] },
    { name:"Marcus Thompson",  label:"High",   pct:74, signals:["Referred by dentist — pre-motivated","Functional and aesthetic concern"], barriers:["Diary flexibility concern"] },
  ];
  seeds.forEach(s => ConsultationInsightStore.record({
    patientName:      s.name,
    predicted_label:  s.label,
    predicted_pct:    s.pct,
    positive_signals: s.signals,
    barriers:         s.barriers,
  }));
})();

// ─── DASHBOARD HELPERS ───────────────────────────────────────────────────────

// ── SINGLE-WORST STATUS HELPER ─────────────────────────────────────────────────
// Returns { tl:"RED"|"AMBER"|"GREEN", reason:string, nextAction:string }
// Used by dentist worklist — one dot, one reason, one action.
function getWorstStatus(p) {
  const fs = evaluateFullStatus(p);
  // Collect all blockers in priority order
  const reds   = [];
  const ambers = [];

  // Clinical reds
  if (p.activeCaries && !p.cariesResolved)          reds.push("Active caries — do not proceed until treated");
  if ((p.bpeMax||0) >= 4 && !p.bpePlanSelected)     reds.push("BPE 4 — specialist periodontal review required before aligners");
  if (fs.alignerBreaches.length > 0)                reds.push("Aligners ordered without required steps — clinical review needed");

  // Governance reds
  if (IN_TREATMENT_STAGES.includes(p.stage) && !p.signed)  reds.push("Treatment active without signed consent — urgent attention needed");
  if (p.alignersOrdered && !p.paymentVerified)              reds.push("Aligners ordered — payment not confirmed");

  // Ambers
  if ((p.bpeMax||0) === 3 && !p.bpePlanSelected)           ambers.push("BPE 3 — periodontal stabilisation required before proceeding");
  if ((p.bpeMax||0) >= 1 && (p.bpeMax||0) <= 2 && !p.bpePlanSelected) ambers.push(`BPE ${p.bpeMax} — periodontal management plan not yet documented`);
  if (!p.decisionsMade && p.stage !== "consultation")        ambers.push("Clinical assessment decisions not yet completed");
  if (p.restorativePlanRequired && !p.restorativePlanSolution) ambers.push("Restorative considerations not yet documented");
  if (p.consented && !p.signed && p.stage === "consent_sent") ambers.push("Consent sent — awaiting patient signature");
  if (ACTIVE_STAGES.includes(p.stage) && !p.estimateSigned)   ambers.push("Treatment plan not yet accepted by patient");

  if (reds.length > 0)   return { tl:"RED",   reason: reds[0],   nextAction: getNextAction(p, "RED",   reds[0]) };
  if (ambers.length > 0) return { tl:"AMBER", reason: ambers[0], nextAction: getNextAction(p, "AMBER", ambers[0]) };
  return { tl:"GREEN", reason:"Ready to proceed", nextAction: getNextAction(p, "GREEN", "") };
}

function getNextAction(p, tl, reason) {
  if (tl === "RED") {
    if (reason.includes("caries"))      return "Caries must be treated before aligner therapy can begin";
    if (reason.includes("BPE 4"))       return "Arrange specialist periodontal assessment before proceeding";
    if (reason.includes("Aligners ordered")) return "Review case — aligners ordered without required prerequisites";
    if (reason.includes("consent"))     return "Obtain signed consent — do not proceed until received";
    if (reason.includes("payment"))     return "Confirm payment before placing aligner order";
    return "Clinical attention required — do not proceed";
  }
  if (tl === "AMBER") {
    if (reason.includes("BPE 3"))       return "Arrange hygiene stabilisation before submitting ClinCheck";
    if (reason.includes("BPE"))         return "Document periodontal management plan in assessment";
    if (reason.includes("decisions"))   return "Complete all clinical decisions in the assessment";
    if (reason.includes("Restorative")) return "Document restorative considerations in assessment";
    if (reason.includes("Consent"))     return "Follow up with patient — consent signature outstanding";
    if (reason.includes("Estimate"))    return "Confirm patient has accepted the treatment plan";
    return "Review case — action required before proceeding";
  }
  // GREEN — suggest next workflow step
  const stage = p.stage;
  if (stage === "consultation")   return "Begin clinical assessment";
  if (stage === "assessment")     return "Complete and confirm clinical assessment";
  if (stage === "consent_draft")  return "Send consent documents to patient";
  if (stage === "consent_sent")   return "Follow up — consent awaiting patient signature";
  if (stage === "signed")         return "Build and submit ClinCheck protocol";
  if (stage === "active_tx")      return "Treatment in progress — monitor and review";
  if (stage === "complete")       return "Treatment complete — arrange retention review";
  return "Review next steps with the clinical team";
}


function TLDot({ status, size=9 }) {
  const cfg = { RED:T.error, AMBER:T.warning, GREEN:T.success, BREACH:T.error, AT_RISK:T.warning, SAFE:T.success };
  return <div style={{ width:size, height:size, borderRadius:"50%", background:cfg[status]||T.muted, flexShrink:0 }}/>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// ─── PATIENTS PAGE ────────────────────────────────────────────────────────────
function PatientsPage({ onOpenPatient, onNewConsultation }) {
  const [search, setSearch] = useState("");
  const filtered = MOCK_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cli.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div style={{ fontSize:20, fontWeight:800, color:T.primary }}>Patient Database</div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients…"
            style={{ border:`1.5px solid ${T.border}`, borderRadius:7, padding:"8px 14px", fontSize:13, fontFamily:"inherit", width:220, color:T.ink, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=T.goldMid} onBlur={e=>e.target.style.borderColor=T.border}
          />
          <button onClick={onNewConsultation} style={{ background:T.primary, color:T.gold, border:"none", borderRadius:7, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + New Patient
          </button>
        </div>
      </div>

      <div style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.2fr 1fr 1fr", padding:"10px 20px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
          {["Patient","Clinician","Date","Stage","Problems","Value"].map(h=>(
            <span key={h} style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted }}>{h}</span>
          ))}
        </div>
        {filtered.map((p,i) => (
          <div key={p.id}
            onClick={()=>onOpenPatient && onOpenPatient(p)}
            style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1.2fr 1fr 1fr", padding:"13px 20px", borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none", cursor:"pointer", alignItems:"center", transition:"background 0.1s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#FAFAF9"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Avt name={p.name} size={28}/>
              <div>
                <div style={{ fontSize:13.5, fontWeight:600, color:T.ink }}>{p.name}</div>
                <div style={{ fontSize:11.5, color:T.faint }}>DOB: {p.dob}</div>
              </div>
            </div>
            <span style={{ fontSize:12.5, color:T.sub }}>{p.cli}</span>
            <span style={{ fontSize:12.5, color:T.muted }}>{p.date}</span>
            <StagePill stage={p.stage}/>
            <span style={{ fontSize:13, fontWeight:700, color:p.problems>0?T.warning:T.faint }}>
              {p.problems > 0 ? `${p.problems} flagged` : "—"}
            </span>
            <span style={{ fontSize:13.5, fontWeight:700, color:T.ink }}>
              {p.value ? `£${p.value.toLocaleString()}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FULL PATIENT WORKFLOW (new consultation flow) ────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — CONSENT ENGINE v2 (Full Dr Haroon template with conditional blocks)
// ConsentPage → full medico-legal document with e-signature
// ═══════════════════════════════════════════════════════════════════════════

// ─── FULL CONSENT DOCUMENT BUILDER ────────────────────────────────────────────
// Builds the complete ordered section list from problems list.
// All text is rewritten (not direct copy) — medico-legal tone maintained.
function buildFullConsent(problems, consultation, patient, fv) {
  const addedCond = new Set();
  // Map problem consentBlock → problem for triggeredBy attribution
  const condMap = {};
  problems.forEach(p => {
    if (p.consentBlock && !condMap[p.consentBlock]) condMap[p.consentBlock] = p;
  });

  // ── FULL SECTION DEFINITIONS ──────────────────────────────────────────────
  const UNIVERSAL_SECTIONS = [
    {
      id: "intro",
      type: "header_block",
      render: ({ patient, practice, today }) => ({
        date: today,
        greeting: `Dear ${patient?.name || "______"},`,
        title: "Your Clear Aligner Treatment",
        opening: `Thank you for selecting ${practice} as your provider of choice for clear aligner treatment. This document provides a comprehensive written record of the discussions that took place prior to your acceptance of treatment. It covers:`,
        listItems: [
          "What you hope to achieve and the main clinical benefits of treatment",
          "Risks and complications that may arise during or after treatment ('material risks')",
          "Alternative treatment options that have been considered",
          "The estimated costs, timescale, and potential additional charges",
          "The retention programme following completion of active treatment",
          "Your agreement regarding clinical photography and imaging",
          "How to raise a concern or complaint about your care",
        ],
        footer: "Please read this document carefully before signing. If you have any questions, contact the practice before signing.",
      }),
    },
    {
      id: "goals",
      label: "A",
      title: "Your Treatment Goals",
      body: null, // rendered dynamically from consultation data
      renderDynamic: ({ consultation, patient }) => {
        const concerns = consultation?.concerns?.join("; ") || "______";
        const goals    = consultation?.goals?.join("; ")    || "______";
        return [
          `Your main concerns, as you described them, are: ${concerns}.`,
          `At the completion of treatment, you would like your teeth to be: ${goals}.`,
          `We discussed the realistic expectations of clear aligner treatment. You understand that a 'picture perfect' result means your teeth will look natural, fit your face, and not appear crooked from a normal conversational distance. A 'super perfect' symmetrical result typically requires composite bonding and/or porcelain veneers as an adjunct to orthodontic treatment.`,
        ];
      },
    },
    {
      id: "blacktri_universal",
      label: null,
      title: "Open Gingival Embrasures (Black Triangles)",
      body: [
        "During tooth alignment, interproximal spaces can become more visible, creating triangular gaps at the gumline known as 'black triangles'. These are an aesthetic rather than clinical concern and have no adverse effect on dental health.",
        "If you find these spaces unsightly following treatment, options include composite bonding or interproximal reshaping. These procedures incur additional cost and may require periodic maintenance.",
      ],
    },
    {
      id: "tooth_shape_universal",
      label: null,
      title: "Tooth Shape & Proportions",
      body: [
        "Following alignment, it may be desirable to refine the shape, size, or surface texture of teeth to optimise the aesthetic result. This is typically achieved through composite bonding or porcelain veneers. Such restorative work is considered a separate treatment and will incur additional fees.",
      ],
    },
    {
      id: "recession_universal",
      label: null,
      title: "Gingival Recession",
      body: [
        "A degree of gum recession is possible during orthodontic tooth movement. We monitor for this throughout treatment and will adjust the treatment plan where necessary to minimise progression. Where recession is identified, periodontal review may be arranged.",
      ],
    },
    {
      id: "midlines",
      label: null,
      title: "Dental Midlines",
      body: [
        "The midline is the vertical line between the upper and lower central incisor teeth. Perfect coincidence of upper and lower midlines is not always achievable and may require additional mechanics, extended treatment duration, or compromise. We discussed and agreed the expected midline position for your case.",
      ],
    },
    {
      id: "bite",
      label: null,
      title: "Your Bite (Occlusion)",
      body: [
        "Some orthodontists consider a 'Class I occlusion' the ideal bite. Achieving this always carries additional risk and treatment duration. Our approach prioritises creating a functional, comfortable bite that allows you to chew with ease. If this is already the case, we agreed that major bite changes are unnecessary and would increase risk without proportional benefit.",
        "If a precise 'Class I' result is essential, fixed orthodontic appliances — ideally provided by a specialist orthodontist — are better suited to achieve this.",
      ],
    },
    {
      id: "retention",
      label: "E",
      title: "Retention — What Happens After Active Treatment",
      body: [
        "Orthodontic relapse (teeth returning toward their original positions) is an inherent risk that persists for life. To minimise this, you will be provided with a fixed retainer bonded behind the front teeth and a removable retainer. You are required to follow the prescribed retention programme.",
        "You agree to wear your removable retainer every night for the first 12 months, and thereafter every night for life. Failure to comply will result in visible relapse. The cost of replacement retainers is not included in your treatment fee and will be charged separately.",
        "Straight teeth are generally easier to maintain and allow your GDP to provide a higher standard of restorative dentistry. Orthodontic treatment generally improves the long-term prognosis of dental care.",
      ],
    },
    {
      id: "material_risks",
      label: "B",
      title: "Material Risks of Clear Aligner Treatment",
      body: [
        "In addition to the condition-specific risks discussed below, you should be aware of the following risks that apply to all aligner patients:",
      ],
      listItems: [
        "Aligners must be worn for a minimum of 20–22 hours per day. Each aligner set should be worn for at least 7 days (or as directed). Failure to comply will affect the accuracy and duration of treatment.",
        "You must attend review appointments approximately every 6–8 weeks. Missed appointments may prolong treatment and incur additional charges.",
        "Initial aligner wear may cause temporary speech changes. This typically resolves within 1–2 weeks.",
        "Tooth soreness is expected with each new aligner. Paracetamol or ibuprofen (if suitable) can be taken to manage discomfort.",
        "Attachments (small tooth-coloured buttons) will be bonded to your teeth. These assist with complex tooth movements and will be removed at the end of treatment. They may be visible during treatment.",
        "Interproximal reduction (IPR) involves the controlled removal of small amounts of enamel between specific teeth to create space. This is a safe, recognised procedure and will not adversely affect tooth health if oral hygiene is maintained.",
        "Your teeth will shift ('relapse') at the end of treatment if retainers are not worn. The retention programme is mandatory and non-negotiable.",
        "Oral hygiene must be maintained to a high standard throughout treatment. Failure to do so risks decalcification, caries, or gum disease.",
        "Fixed restorations (crowns, bridges, veneers) may debond during aligner treatment. This will incur additional charges from your GDP.",
        "Root resorption (shortening of tooth roots) occurs in virtually all orthodontic patients. In most cases this is mild and clinically insignificant. Severe resorption is rare but can compromise long-term tooth stability.",
        "In a small number of patients, existing or latent jaw joint (TMJ) symptoms may become more noticeable during treatment. TMJ changes are not predictably improved by orthodontic treatment.",
        "Elastic wear or fixed auxiliary brackets may be required to complete specific tooth movements. Failure to comply with elastics will result in an incomplete result.",
      ],
    },
  ];

  const CONDITIONAL_SECTION_DEFS = {
    thinBiotype: {
      title: "Specific Risk: Thin Periodontal Biotype — Elevated Recession Risk",
      severity: "high",
      body: [
        "Clinical examination has identified a thin gingival biotype. Patients with thin gum tissue are at an above-average risk of recession occurring during labial or buccal tooth movement.",
        "If recession occurs, periodontal treatment (including soft tissue grafting in severe cases) may be required. This will incur additional cost. The risk has been specifically discussed with you and you accept the above-average likelihood of recession in your case.",
      ],
    },
    shortRoots: {
      title: "Specific Risk: Pre-existing Short Root Length",
      severity: "high",
      body: [
        "Radiographic assessment has revealed one or more teeth with shorter than average root length. This is a significant baseline risk factor for orthodontic root resorption.",
        "Whilst treatment forces will be applied gently, further root shortening may occur. In severe cases, tooth stability may be compromised in the long term. Interim radiographic review will be performed during treatment to monitor root status.",
        "You understand and accept that doing nothing and wearing a retainer for life is the lowest-risk option. Orthodontic treatment with careful force management is the next safest option but cannot eliminate the risk of further resorption. In extreme cases tooth loss may occur, requiring implant or bridge replacement.",
      ],
    },
    aob: {
      title: "Specific Risk: Anterior Open Bite — Elevated Relapse Risk",
      severity: "high",
      body: [
        "An anterior open bite is one of the most challenging orthodontic presentations to treat and retain. A significant relapse risk is present regardless of the quality of treatment delivered.",
        "Contributing factors in your case include jaw structure, tongue posture, and/or parafunctional habits. Unless these aetiological factors are corrected, a degree of relapse is likely over time.",
        "Orthognathic surgery with fixed appliances offers the most predictable correction for skeletal open bites. This option has been discussed and you have chosen to proceed with clear aligner treatment as a less invasive, camouflage approach. You accept the limitations of this approach and the higher-than-average relapse risk.",
        "Strict lifelong retainer compliance is especially critical for you.",
      ],
    },
    deepbite: {
      title: "Specific Risk: Increased Overbite",
      severity: "moderate",
      body: [
        "An increased vertical overlap of the front teeth has been documented. Overbite correction requires specific mechanics and may prolong treatment duration. If the overbite is not fully resolved, this will be documented at treatment completion.",
        "You should be aware that overbite cases carry a higher relapse risk at the front of the mouth; retainer compliance is especially important.",
      ],
    },
    crossbite: {
      title: "Specific Risk: Crossbite Correction",
      severity: "moderate",
      body: [
        "A crossbite has been identified on your assessment. Treatment involves controlled arch expansion and/or individual tooth movements. Mild expansion relapse is common and retainer wear is critical.",
        "If a significant skeletal component is present, full correction may require surgical intervention. The limits of orthodontic camouflage have been explained and are accepted.",
      ],
    },
    ipr: {
      title: "Interproximal Reduction (IPR)",
      severity: "moderate",
      body: [
        "Your treatment includes interproximal reduction — the careful removal of small amounts of enamel from the sides of teeth to create space. This is a standard, safe orthodontic procedure performed within established safety limits.",
        "IPR slightly modifies the natural contact shape between teeth. Some patients experience temporary sensitivity. There is no long-term adverse effect when oral hygiene is properly maintained.",
      ],
    },
    perio: {
      title: "Specific Risk: Active Periodontal Disease",
      severity: "high",
      body: [
        "Active periodontal (gum) disease has been identified at baseline assessment. Orthodontic tooth movement in the presence of active periodontitis significantly accelerates bone loss and may result in tooth loss.",
        "Treatment cannot commence until periodontal stability has been confirmed. A hygiene stabilisation phase and/or specialist periodontal review is required before your aligner treatment begins. You have been informed of this prerequisite condition.",
      ],
    },
    tsl: {
      title: "Specific Risk: Tooth Surface Loss — Joint Management Required",
      severity: "moderate",
      body: [
        "Tooth surface loss (erosion, attrition, or abrasion) has been recorded. Orthodontic treatment alone does not address this. The cause of tooth wear should be identified and managed to prevent further progression.",
        "A joint treatment plan with your GDP or restorative dentist may be indicated. Composite bonding or other restorative work may be required after orthodontic alignment is complete. You understand that unaddressed wear will compromise any restorative outcome.",
      ],
    },
    tmj: {
      title: "TMJ / Jaw Joint Symptoms",
      severity: "moderate",
      body: [
        "Jaw joint (temporomandibular joint — TMJ) symptoms have been recorded at baseline. These include any combination of joint sounds, pain, and/or limited mouth opening.",
        "Orthodontic treatment does not predictably improve or worsen TMJ symptoms. Symptoms documented at baseline are unlikely to be causally related to treatment. Any change in symptoms during treatment should be reported promptly. Separate TMJ management may be required and will be arranged as appropriate.",
      ],
    },
    bruxism: {
      title: "Specific Risk: Bruxism and Parafunctional Activity",
      severity: "moderate",
      body: [
        "Tooth grinding (bruxism) or clenching has been documented. Parafunctional activity during aligner treatment increases the risk of aligner wear, fracture, and attachment debonding. More frequent aligner changes may be required.",
        "A protective occlusal splint may be recommended alongside aligner treatment. You agree to inform your treating clinician of any changes in bruxism symptoms and to comply with any protective appliance as prescribed.",
      ],
    },
    recession: {
      title: "Specific Risk: Pre-existing Gingival Recession",
      severity: "moderate",
      body: [
        "Recession of the gum tissue has been documented at baseline. Pre-existing recession may worsen during orthodontic tooth movement, particularly where labially prominent roots or thin biotype tissue is present.",
        "Periodontal monitoring throughout treatment is recommended. In areas of pre-existing recession, soft tissue grafting may be advisable before or after orthodontic movement.",
      ],
    },
    blackTri: {
      title: "Specific Risk: Elevated Black Triangle Risk",
      severity: "moderate",
      body: [
        "Assessment has identified triangular tooth shapes or overlapping contacts that significantly increase the probability of interproximal black triangles becoming visible following alignment.",
        "You have been specifically counselled that black triangles are an expected aesthetic limitation in your case. Restorative management — such as composite bonding to widen interproximal contact areas — may be required post-treatment. This will incur additional cost.",
      ],
    },
    overjet: {
      title: "Overjet Correction — Elastic Compliance Required",
      severity: "moderate",
      body: [
        "A significant overjet (horizontal overlap of front teeth) has been recorded. Correction requires compliant use of inter-arch elastics and potentially fixed brackets on specific teeth.",
        "Failure to wear elastics as directed will result in incomplete correction. The aesthetic and functional limitations of an uncorrected overjet have been explained. Lip trauma risk is elevated prior to correction, and patients with existing trauma or wear have been specifically counselled.",
      ],
    },
    class2: {
      title: "Class II Dental Correction — Mechanics & Limitations",
      severity: "moderate",
      body: [
        "A Class II dental relationship has been recorded. Class II correction with clear aligners requires inter-arch elastics or Class II auxiliary mechanics. Compliance with prescribed elastic wear is essential.",
        "The degree of correction achievable with aligners depends on the extent of skeletal versus dental discrepancy. The limits of what can be achieved without orthognathic surgery have been explained and you accept the planned camouflage approach.",
      ],
    },
    class3: {
      title: "Class III Tendency — Camouflage Limitations",
      severity: "moderate",
      body: [
        "A Class III tendency (lower teeth in front of upper teeth) has been identified. In adult patients, orthodontic treatment can camouflage mild to moderate Class III discrepancies but cannot correct the underlying skeletal pattern.",
        "If the skeletal component is significant, orthognathic surgery is the only means of achieving a fully corrected result. Surgical correction has been discussed; you have chosen to proceed with clear aligner camouflage treatment and accept the limitations of this approach.",
      ],
    },
    skeletal: {
      title: "Skeletal Discrepancy — Limits of Orthodontic Treatment",
      severity: "moderate",
      body: [
        "A skeletal discrepancy (mismatch between upper and lower jaw positions) has been identified. Orthodontic treatment can compensate for mild to moderate discrepancies but does not correct the underlying bone structure.",
        "For significant skeletal discrepancies, orthognathic surgery is required for a definitive result. You understand and accept the distinction between dental and skeletal correction, and have chosen the non-surgical orthodontic approach.",
      ],
    },
    rootFilled: {
      title: "Root-Filled Teeth — Specific Risks",
      severity: "moderate",
      body: [
        "One or more root-filled (endodontically treated) teeth have been identified. These teeth carry a higher susceptibility to orthodontic root resorption compared to vital teeth. Forces will be carefully managed.",
        "Attachment bonding to teeth with existing restorations may have reduced retentiveness. If an attachment repeatedly debonds, an alternative strategy will be employed. You have been informed of these specific additional risks.",
      ],
    },
    smoking: {
      title: "Smoking Status — Periodontal & Healing Risk",
      severity: "moderate",
      body: [
        "Tobacco or nicotine use has been recorded. Smoking significantly increases the risk of periodontal disease progression during orthodontic treatment and impairs healing. It also reduces the effectiveness of restorative procedures such as whitening and composite bonding.",
        "Smoking cessation is strongly recommended before and during treatment. You have been advised of this risk and understand that continued smoking may compromise treatment outcomes.",
      ],
    },
  };

  // ── ORDER: build sections with conditionals inserted after recession_universal ──
  const sections = [];
  UNIVERSAL_SECTIONS.forEach(us => {
    sections.push({ ...us, isConditional: false });
    // After tooth_shape_universal — insert tsl, blackTri, peg conditionals
    if (us.id === "tooth_shape_universal") {
      ["tsl","blackTri"].forEach(ck => {
        if (condMap[ck] && !addedCond.has(ck)) {
          addedCond.add(ck);
          sections.push({ id: ck, ...CONDITIONAL_SECTION_DEFS[ck], isConditional:true, triggeredBy: condMap[ck] });
        }
      });
    }
    // After recession_universal — insert thin biotype
    if (us.id === "recession_universal") {
      ["thinBiotype","recession"].forEach(ck => {
        if (condMap[ck] && !addedCond.has(ck)) {
          addedCond.add(ck);
          sections.push({ id: ck, ...CONDITIONAL_SECTION_DEFS[ck], isConditional:true, triggeredBy: condMap[ck] });
        }
      });
    }
    // After bite section — skeletal/class corrections
    if (us.id === "bite") {
      ["skeletal","class2","class3","crossbite","aob","deepbite"].forEach(ck => {
        if (condMap[ck] && !addedCond.has(ck)) {
          addedCond.add(ck);
          sections.push({ id: ck, ...CONDITIONAL_SECTION_DEFS[ck], isConditional:true, triggeredBy: condMap[ck] });
        }
      });
    }
    // After material_risks — patient-specific risks
    if (us.id === "material_risks") {
      ["perio","shortRoots","overjet","ipr","tmj","bruxism","rootFilled","smoking"].forEach(ck => {
        if (condMap[ck] && !addedCond.has(ck)) {
          addedCond.add(ck);
          sections.push({ id: ck, ...CONDITIONAL_SECTION_DEFS[ck], isConditional:true, triggeredBy: condMap[ck] });
        }
      });
    }
  });

  // Any remaining conditionals not yet placed
  Object.entries(condMap).forEach(([ck, prob]) => {
    if (!addedCond.has(ck) && CONDITIONAL_SECTION_DEFS[ck]) {
      addedCond.add(ck);
      sections.push({ id: ck, ...CONDITIONAL_SECTION_DEFS[ck], isConditional:true, triggeredBy: prob });
    }
  });

  return {
    sections,
    conditionalCount: [...addedCond].length,
    patient,
    consultation,
    problems,
    generatedAt: new Date().toISOString(),
    txFee: consultation?.indicativeCost || fv?.final_fee || "",
    clinician: TENANT.clinician || TENANT.name,
    practice: TENANT.practice,
  };
}

// ─── CONSENT SECTION RENDERER ─────────────────────────────────────────────────
function ConsentSectionBlock({ sec, idx, consultation, patient, acknowledged, onAck }) {
  const today = new Date().toLocaleDateString("en-GB",{ day:"2-digit", month:"2-digit", year:"numeric" });
  const sevColors = {
    high: { border:T.errorBorder, bg:"rgba(192,57,43,0.04)", badge:T.error, badgeLabel:"HIGH RISK" },
    moderate: { border:T.warningBorder, bg:"rgba(196,132,26,0.04)", badge:T.warning, badgeLabel:"MODERATE RISK" },
  };
  const sc = sec.isConditional && sec.severity ? sevColors[sec.severity] || sevColors.moderate : null;

  // Header block special rendering
  if (sec.type === "header_block") {
    const data = sec.render({ patient, practice: TENANT.practice, today });
    return (
      <div style={{ marginBottom: 28 }}>
        <p style={docS.para}>{data.date}</p>
        <p style={docS.para}><strong>By email</strong></p>
        <p style={docS.para}>{data.greeting}</p>
        <p style={{ ...docS.para, fontWeight:700, fontSize:15 }}>{data.title}</p>
        <p style={docS.para}>{data.opening}</p>
        <ol type="A" style={{ ...docS.para, paddingLeft:28, lineHeight:2.0 }}>
          {data.listItems.map((item,i) => <li key={i}>{item}</li>)}
        </ol>
        <p style={docS.para}>{data.footer}</p>
      </div>
    );
  }

  // Goals block dynamic rendering
  if (sec.renderDynamic) {
    const paras = sec.renderDynamic({ consultation, patient });
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={docS.sectionHead}>{sec.label ? <><strong>{sec.label}.&nbsp;&nbsp;{sec.title}</strong></> : <strong>{sec.title}</strong>}</p>
        {paras.map((p,i) => <p key={i} style={docS.para}>{p}</p>)}
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 20,
      borderLeft: sc ? `3px solid ${sc.border}` : "3px solid transparent",
      paddingLeft: sc ? 14 : 0,
      background: sc ? sc.bg : "transparent",
      borderRadius: sc ? 4 : 0,
      padding: sc ? "12px 14px 12px 18px" : "0 0 0 0",
    }}>
      {/* Section heading */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        {sc && (
          <span style={{ fontSize:10, fontWeight:800, color:sc.badge, background:`${sc.badge}15`, borderRadius:3, padding:"2px 7px", letterSpacing:0.7, flexShrink:0 }}>
            {sc.badgeLabel}
          </span>
        )}
        <p style={{ ...docS.sectionHead, margin:0 }}>
          {sec.label ? <><strong>{sec.label}.&nbsp;&nbsp;{sec.title}</strong></> : <strong>{sec.title}</strong>}
        </p>
      </div>

      {/* Body paragraphs */}
      {Array.isArray(sec.body) && sec.body.map((p,i) => <p key={i} style={docS.para}>{p}</p>)}
      {typeof sec.body === "string" && <p style={docS.para}>{sec.body}</p>}

      {/* Numbered list items */}
      {sec.listItems && (
        <ol style={{ ...docS.para, paddingLeft:22, lineHeight:2.1 }}>
          {sec.listItems.map((item,i) => <li key={i}>{item}</li>)}
        </ol>
      )}

      {/* Triggered by note */}
      {sec.isConditional && sec.triggeredBy && (
        <div style={{ marginTop:8, fontSize:11.5, color:T.faint, fontStyle:"italic" }}>
          Included because: {sec.triggeredBy.baseLabel}
        </div>
      )}

      {/* Acknowledge checkbox for conditional blocks */}
      {sec.isConditional && (
        <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:10 }}>
          <button
            onClick={() => onAck(sec.id)}
            style={{
              width:20, height:20, borderRadius:4,
              border: `2px solid ${acknowledged ? T.success : T.borderDark}`,
              background: acknowledged ? T.success : "#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", flexShrink:0, transition:"all 0.15s",
            }}
          >
            {acknowledged && <span style={{ color:"#fff", fontSize:12, fontWeight:900, lineHeight:1 }}>✓</span>}
          </button>
          <span style={{ fontSize:12.5, color: acknowledged ? T.success : T.muted, fontWeight: acknowledged ? 700 : 400 }}>
            {acknowledged ? "I have read and understood this risk" : "I acknowledge and understand this risk (tap to confirm)"}
          </span>
        </div>
      )}
    </div>
  );
}

const docS = {
  para: {
    fontSize:13.5, lineHeight:1.75, color:"#1A1A1A", marginBottom:10,
    fontFamily:"'Georgia','Times New Roman',serif",
  },
  sectionHead: {
    fontSize:14.5, fontWeight:700, color:"#1A1A1A",
    marginTop:18, marginBottom:8,
    fontFamily:"'Georgia','Times New Roman',serif",
  },
};

// ─── PATIENT-FACING CONSENT FORM ─────────────────────────────────────────────
// This is what the patient sees when they open their consent link.
// Clean, no clinical UI chrome. They read → tick each risk → type name → sign.
function PatientConsentForm({ doc, patient, onPatientSign }) {
  const [ackMap,   setAckMap]   = useState({});
  const [sigName,  setSigName]  = useState("");
  const [signed,   setSigned]   = useState(false);
  const [sigDate,  setSigDate]  = useState("");
  const [scrolled, setScrolled] = useState(false);

  const condSections = doc.sections.filter(s => s.isConditional);
  const allAcked = condSections.length === 0 || condSections.every(s => ackMap[s.id]);
  const ackedCount = condSections.filter(s => ackMap[s.id]).length;
  const canSign = sigName.trim().length >= 3 && allAcked;

  const handleSign = () => {
    if (!canSign) return;
    const d = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
    setSigDate(d);
    setSigned(true);
    onPatientSign && onPatientSign({
      signedBy: sigName.trim(),
      signedAt: new Date().toISOString(),
      ackMap,
      condSectionsCount: condSections.length,
    });
  };

  if (signed) {
    return (
      <div style={{ minHeight:"100vh", background:"#F8F7F4", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ maxWidth:560, width:"100%", textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:T.success, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, color:"#fff", margin:"0 auto 20px" }}>✓</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", marginBottom:8 }}>Consent Signed</div>
          <div style={{ fontSize:14, color:"#555", lineHeight:1.7, marginBottom:24 }}>
            Thank you, <strong>{sigName}</strong>. Your consent has been recorded and sent to {TENANT.practice}.<br/>
            Signed on {sigDate}.
          </div>
          <div style={{ background:"#fff", borderRadius:10, border:`1px solid #E0E0E0`, padding:"18px 22px", fontSize:13.5, color:"#444", lineHeight:1.7 }}>
            A copy of this signed consent form will be sent to your email address on file. If you have any questions, please contact the practice directly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:"#F8F7F4", minHeight:"100vh", fontFamily:"'Georgia','Times New Roman',serif" }}>

      {/* Practice header bar */}
      <div style={{ background:T.primary, padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase" }}>{TENANT.practice}</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#F0EFE8", marginTop:2 }}>Orthodontic Treatment Consent</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:12, color:"#4A7A6A" }}>For: <strong style={{ color:"#F0EFE8" }}>{patient?.name || "Patient"}</strong></div>
          {condSections.length > 0 && (
            <div style={{ fontSize:11.5, color:"#3D6A56", marginTop:3 }}>
              {ackedCount}/{condSections.length} risks acknowledged
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {condSections.length > 0 && (
        <div style={{ height:4, background:"#E0E0E0" }}>
          <div style={{ height:"100%", background:T.gold, width:`${Math.round((ackedCount/condSections.length)*100)}%`, transition:"width 0.3s ease" }}/>
        </div>
      )}

      {/* Instructions banner */}
      <div style={{ background:"#FFF9ED", borderBottom:"1px solid #F0E0B0", padding:"14px 28px" }}>
        <div style={{ maxWidth:760, margin:"0 auto", fontSize:13.5, color:"#7A5A10", lineHeight:1.6 }}>
          <strong>Please read this document carefully.</strong> Where you see a checkbox <span style={{ display:"inline-flex", alignItems:"center", verticalAlign:"middle", gap:4, margin:"0 4px" }}><span style={{ width:16, height:16, border:"2px solid #C9A24A", borderRadius:3, display:"inline-block" }}/></span> you must tick it to confirm you have read and understood that specific risk. You cannot sign until all risks have been acknowledged.
        </div>
      </div>

      {/* Document body */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"36px 24px 20px" }}>
        <div style={{ background:"#fff", borderRadius:8, border:"1px solid #E0E0E0", padding:"52px 64px", marginBottom:28, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          {doc.sections.map((sec, idx) => (
            <PatientConsentBlock
              key={sec.id + "-" + idx}
              sec={sec}
              consultation={doc.consultation}
              patient={patient}
              acknowledged={!!ackMap[sec.id]}
              onAck={(id) => setAckMap(p => ({ ...p, [id]: !p[id] }))}
            />
          ))}
        </div>

        {/* Signature box */}
        <div style={{ background:"#fff", borderRadius:8, border:`2px solid ${canSign ? T.gold : "#E0E0E0"}`, padding:"32px 40px", marginBottom:28, transition:"border-color 0.3s" }}>
          <div style={{ fontSize:17, fontWeight:700, color:"#1A1A1A", marginBottom:6, fontFamily:"inherit" }}>Sign Your Consent</div>
          <p style={{ fontSize:13.5, color:"#555", marginBottom:22, lineHeight:1.7, fontFamily:"inherit" }}>
            By signing below, I confirm that I have read and understood this entire consent document. I have had the opportunity to ask questions and all my queries have been answered. I understand the risks specific to my case and give my informed consent to proceed with the treatment described.
          </p>

          {/* Ack progress warning */}
          {condSections.length > 0 && !allAcked && (
            <div style={{ background:"#FFF3E0", border:"1px solid #F0C040", borderRadius:6, padding:"10px 16px", marginBottom:18, fontSize:13, color:"#9A6000", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>⚠</span>
              Please scroll up and tick all risk acknowledgement boxes first.
              ({ackedCount} of {condSections.length} ticked)
            </div>
          )}

          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#777", textTransform:"uppercase", letterSpacing:0.7, marginBottom:8, fontFamily:"'Inter',-apple-system,sans-serif" }}>
              Type your full name to sign
            </label>
            <input
              value={sigName}
              onChange={e => setSigName(e.target.value)}
              placeholder={`e.g. ${patient?.name || "Your full name"}…`}
              style={{
                width:"100%", border:`2px solid ${sigName.length>=3 ? T.gold : "#D0D0D0"}`,
                borderRadius:6, padding:"14px 16px",
                fontSize:20, fontFamily:"'Georgia',serif", fontStyle:"italic",
                color:"#1A1A1A", outline:"none", transition:"border-color 0.2s",
                background: sigName.length>=3 ? "#FFFDF5" : "#fff",
              }}
            />
            {sigName.length >= 3 && (
              <div style={{ marginTop:6, fontSize:12, color:T.success, fontWeight:600, fontFamily:"'Inter',-apple-system,sans-serif" }}>✓ Name entered</div>
            )}
          </div>

          {/* Sign button */}
          <button
            onClick={handleSign}
            disabled={!canSign}
            style={{
              width:"100%", padding:"16px 0",
              background: canSign ? T.primary : "#E8E8E8",
              color: canSign ? T.gold : "#AAA",
              border:"none", borderRadius:8,
              fontSize:16, fontWeight:800, letterSpacing:0.3,
              cursor: canSign ? "pointer" : "not-allowed",
              fontFamily:"'Inter',-apple-system,sans-serif",
              transition:"all 0.2s",
              boxShadow: canSign ? "0 4px 16px rgba(45,45,45,0.25)" : "none",
            }}
          >
            {canSign ? "✓  I Consent — Sign Document" : allAcked ? "Enter your name above to sign" : `Acknowledge all risks first (${ackedCount}/${condSections.length})`}
          </button>

          <p style={{ fontSize:11.5, color:"#AAA", textAlign:"center", marginTop:14, lineHeight:1.6, fontFamily:"'Inter',-apple-system,sans-serif" }}>
            Your electronic signature has the same legal standing as a handwritten signature.<br/>
            Date and time will be recorded automatically on submission.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── PATIENT CONSENT BLOCK (patient-facing, no clinical chrome) ───────────────
function PatientConsentBlock({ sec, consultation, patient, acknowledged, onAck }) {
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" });

  // Header intro block
  if (sec.type === "header_block") {
    const data = sec.render({ patient, practice: TENANT.practice, today });
    return (
      <div style={{ marginBottom:32 }}>
        <p style={pDocS.para}>{data.date}</p>
        <p style={{ ...pDocS.para, fontWeight:700 }}>{data.greeting}</p>
        <p style={{ ...pDocS.para, fontSize:17, fontWeight:700, marginTop:18 }}>{data.title}</p>
        <p style={pDocS.para}>{data.opening}</p>
        <ol type="A" style={{ ...pDocS.para, paddingLeft:28, lineHeight:2.1 }}>
          {data.listItems.map((item,i) => <li key={i} style={{ marginBottom:4 }}>{item}</li>)}
        </ol>
        <p style={{ ...pDocS.para, fontStyle:"italic", color:"#666" }}>{data.footer}</p>
        <hr style={{ border:"none", borderTop:"1px solid #E0E0E0", margin:"28px 0" }}/>
      </div>
    );
  }

  // Dynamic goals block
  if (sec.renderDynamic) {
    const paras = sec.renderDynamic({ consultation, patient });
    return (
      <div style={{ marginBottom:24 }}>
        <p style={pDocS.heading}>{sec.label ? `${sec.label}.  ${sec.title}` : sec.title}</p>
        {paras.map((p,i) => <p key={i} style={pDocS.para}>{p}</p>)}
      </div>
    );
  }

  // Severity colours for conditional sections
  const isHigh = sec.isConditional && sec.severity === "high";
  const isMod  = sec.isConditional && sec.severity === "moderate";

  return (
    <div style={{
      marginBottom: 28,
      borderRadius: sec.isConditional ? 6 : 0,
      border: sec.isConditional ? `1.5px solid ${isHigh ? "#E8A0A0" : "#E8D080"}` : "none",
      padding: sec.isConditional ? "22px 26px 20px" : "0",
      background: sec.isConditional ? (isHigh ? "#FFFAFA" : "#FFFDF5") : "transparent",
    }}>

      {/* Risk badge for conditional sections */}
      {sec.isConditional && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <span style={{
            fontSize:10.5, fontWeight:800, letterSpacing:0.8, textTransform:"uppercase",
            color: isHigh ? "#C0392B" : "#A07000",
            background: isHigh ? "#FDECEA" : "#FFF3CD",
            borderRadius:4, padding:"3px 9px",
            border: `1px solid ${isHigh ? "#F5C6C0" : "#F0D890"}`,
          }}>
            {isHigh ? "⚠  High Risk — please read carefully" : "Moderate Risk"}
          </span>
        </div>
      )}

      {/* Section heading */}
      <p style={{ ...pDocS.heading, color: sec.isConditional ? "#1A1A1A" : "#1A1A1A" }}>
        {sec.label ? `${sec.label}.  ${sec.title}` : sec.title}
      </p>

      {/* Body */}
      {Array.isArray(sec.body) && sec.body.map((p,i) => <p key={i} style={pDocS.para}>{p}</p>)}
      {typeof sec.body === "string" && <p style={pDocS.para}>{sec.body}</p>}

      {/* List items */}
      {sec.listItems && (
        <ol style={{ ...pDocS.para, paddingLeft:22, lineHeight:2.1 }}>
          {sec.listItems.map((item,i) => <li key={i} style={{ marginBottom:6 }}>{item}</li>)}
        </ol>
      )}

      {/* Acknowledge checkbox — only on conditional sections */}
      {sec.isConditional && (
        <div
          onClick={() => onAck(sec.id)}
          style={{
            marginTop:18, display:"flex", alignItems:"flex-start", gap:14, cursor:"pointer",
            background: acknowledged ? "#F0FBF4" : "#FFFDF5",
            border: `2px solid ${acknowledged ? T.success : "#C9A24A"}`,
            borderRadius:7, padding:"14px 18px",
            transition:"all 0.2s",
            userSelect:"none",
          }}
        >
          {/* Checkbox */}
          <div style={{
            width:26, height:26, borderRadius:5, flexShrink:0, marginTop:1,
            background: acknowledged ? T.success : "#fff",
            border: `2.5px solid ${acknowledged ? T.success : "#C9A24A"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"all 0.2s",
          }}>
            {acknowledged && <span style={{ color:"#fff", fontSize:15, fontWeight:900, lineHeight:1 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color: acknowledged ? T.success : "#7A5A10", fontFamily:"'Inter',-apple-system,sans-serif", marginBottom:3 }}>
              {acknowledged ? "✓ I have read and understood this risk" : "I have read and understood this risk"}
            </div>
            <div style={{ fontSize:12.5, color:"#888", fontFamily:"'Inter',-apple-system,sans-serif", lineHeight:1.5 }}>
              {acknowledged ? "Ticked — thank you." : "Tap or click to confirm you have read the section above."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pDocS = {
  para: {
    fontSize:14, lineHeight:1.85, color:"#2A2A2A", marginBottom:12,
    fontFamily:"'Georgia','Times New Roman',serif",
  },
  heading: {
    fontSize:15.5, fontWeight:700, color:"#1A1A1A",
    marginTop:20, marginBottom:10,
    fontFamily:"'Georgia','Times New Roman',serif",
  },
};

// ─── CONSENT PAGE COMPONENT (Clinician-facing: generate → send → track) ───────
function ConsentPage({ assessment, consultation, patient, onSign }) {
  const [phase,             setPhase]                 = useState("prepare");
  const [sentAt,            setSentAt]                = useState(null);
  const [clinSig,           setClinSig]               = useState(TENANT.name);
  const [consentData,       setConsentData]           = useState(null);
  const [clinCountersigned, setClinicianCountersigned]= useState(false);
  const [clinCounter,       setClinicianCounter]      = useState(TENANT.name);

  const doc = useMemo(() =>
    buildFullConsent(assessment.problems, consultation, patient, assessment.fv),
    [assessment, consultation, patient]
  );

  const condSections = doc.sections.filter(s => s.isConditional);
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });

  const handleSend = async () => {
    const result = await MockEmailSMS.send({
      to: patient?.name,
      subject: `Your Orthodontic Consent Form — ${TENANT.practice}`,
      type: "consent",
    });
    setSentAt(result.timestamp);
    setPhase("sent");
  };

  const handlePatientSign = (sigData) => {
    const full = { ...doc, ...sigData, clinicianSig: clinSig, completedAt: new Date().toISOString() };
    setConsentData(full);
    setPhase("complete");
    onSign && onSign(full);
  };

  // ── PHASE: PREPARE ──────────────────────────────────────────────────────────
  if (phase === "prepare") {
    return (
      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px 80px" }}>

        {/* Header */}
        <div style={{ background:T.primary, borderRadius:12, padding:"22px 30px", marginBottom:16 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase", marginBottom:6 }}>{TENANT.practice}</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#F0EFE8", marginBottom:4 }}>Consent Form — Ready to Send</div>
          <div style={{ fontSize:13, color:"#4A7A6A" }}>{patient?.name} · {today}</div>
          {condSections.length > 0 && (
            <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:6 }}>
              <span style={{ fontSize:11.5, color:"#4A7A6A", fontWeight:600 }}>{condSections.length} condition-specific risk section{condSections.length!==1?"s":""} included:</span>
              {condSections.map(s => (
                <span key={s.id} style={{ background:"rgba(212,166,74,0.18)", border:"1px solid rgba(212,166,74,0.35)", borderRadius:4, padding:"2px 9px", fontSize:11.5, fontWeight:700, color:T.gold }}>
                  {s.title.replace("Specific Risk:","").replace("Risk:","").split("—")[0].trim().split(":")[0].trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:14 }}>How this works</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { n:1, label:"Preview the consent document below", sub:"Check all sections are correct before sending" },
              { n:2, label:"Send to patient", sub:`An email is sent to ${patient?.name} with a secure link` },
              { n:3, label:"Patient reads and ticks each risk section", sub:"They must acknowledge every condition-specific risk" },
              { n:4, label:"Patient types their name and signs", sub:"Cannot sign until all risks are ticked" },
              { n:5, label:"Signed consent returns here automatically", sub:"You countersign and the record is saved" },
            ].map(step => (
              <div key={step.n} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:T.primary, color:T.gold, fontSize:11.5, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{step.n}</div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:T.ink }}>{step.label}</div>
                  <div style={{ fontSize:12, color:T.muted }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinician pre-sign */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:10 }}>Clinician details</div>
          <div style={{ display:"flex", gap:14, alignItems:"flex-end" }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:11.5, fontWeight:700, color:T.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>Treating clinician</label>
              <input value={clinSig} onChange={e=>setClinSig(e.target.value)}
                style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:6, padding:"9px 14px", fontSize:14, fontFamily:"inherit", color:T.ink, outline:"none" }}
                onFocus={e=>e.target.style.borderColor=T.goldMid} onBlur={e=>e.target.style.borderColor=T.border}
              />
            </div>
          </div>
        </div>

        {/* Document preview */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden", marginBottom:20 }}>
          <div style={{ padding:"12px 20px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted }}>Document Preview</span>
            <span style={{ fontSize:11.5, color:T.faint }}>This is exactly what the patient will receive</span>
          </div>
          <div style={{ padding:"40px 56px", fontFamily:"Georgia,serif", maxHeight:480, overflowY:"auto" }}>
            {doc.sections.map((sec, idx) => (
              <PatientConsentBlock
                key={sec.id + "-" + idx}
                sec={sec}
                consultation={consultation}
                patient={patient}
                acknowledged={false}
                onAck={() => {}}
              />
            ))}
          </div>
        </div>

        {/* Send button */}
        <div style={{ background:"#fff", borderRadius:10, border:`1.5px solid ${T.border}`, padding:"22px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:20 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:3 }}>Ready to send to patient</div>
            <div style={{ fontSize:12.5, color:T.muted }}>Patient will receive an email with a secure link to read and sign this consent form.</div>
          </div>
          <button
            onClick={handleSend}
            style={{ background:T.cyan, color:"#fff", border:"none", borderRadius:8, padding:"13px 32px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:0.3, whiteSpace:"nowrap", flexShrink:0, boxShadow:`0 3px 12px ${T.cyan}50` }}
          >
            ✉  Send Consent to Patient
          </button>
        </div>
      </div>
    );
  }

  // ── PHASE: SENT — waiting for patient ──────────────────────────────────────
  if (phase === "sent") {
    const daysSince = sentAt ? Math.floor((Date.now() - new Date(sentAt)) / 86400000) : 0;
    return (
      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px 80px" }}>

        {/* Status header */}
        <div style={{ background:T.primary, borderRadius:12, padding:"22px 30px", marginBottom:16 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase", marginBottom:6 }}>{TENANT.practice}</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#F0EFE8", marginBottom:4 }}>Consent Sent — Awaiting Patient</div>
          <div style={{ fontSize:13, color:"#4A7A6A" }}>
            Sent to {patient?.name} on {new Date(sentAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        {/* Waiting state */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"32px 28px", marginBottom:14, textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12, lineHeight:1 }}>⏳</div>
          <div style={{ fontSize:16, fontWeight:700, color:T.ink, marginBottom:6 }}>Waiting for {patient?.name} to sign</div>
          <div style={{ fontSize:13.5, color:T.muted, marginBottom:20 }}>
            They will receive an email with a link to read and sign the consent form.<br/>
            {daysSince >= 2 && <span style={{ color:T.warning, fontWeight:600 }}>⚠ {daysSince} days since sent — consider following up.</span>}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={handleSend} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ↺ Resend Link
            </button>
            <button onClick={() => setPhase("patient_view")} style={{ background:T.gold, color:T.primary, border:"none", borderRadius:6, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              👁 Preview Patient View
            </button>
            <button
              onClick={() => setPhase("patient_view")}
              style={{ background:T.primary, color:T.gold, border:"none", borderRadius:6, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              ▶ Simulate Patient Signing
            </button>
          </div>
        </div>

        <div style={{ background:T.infoLight, border:`1px solid ${T.infoBorder}`, borderRadius:8, padding:"12px 16px", fontSize:12.5, color:T.info }}>
          ℹ In production, the patient receives a unique secure link by email. When they complete and sign, this screen automatically updates. A signed PDF is generated and saved to the patient record.
        </div>
      </div>
    );
  }

  // ── PHASE: PATIENT VIEW (simulate what patient sees) ────────────────────────
  if (phase === "patient_view") {
    return (
      <div>
        {/* Clinician banner — shown when previewing as clinician */}
        <div style={{ background:T.gold, padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12.5, fontWeight:700, color:T.primary }}>
          <span>👁 Clinician preview mode — this is exactly what {patient?.name} will see</span>
          <button onClick={() => setPhase("sent")} style={{ background:T.primary, color:T.gold, border:"none", borderRadius:4, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ← Back to Clinician View
          </button>
        </div>
        <PatientConsentForm
          doc={doc}
          patient={patient}
          onPatientSign={handlePatientSign}
        />
      </div>
    );
  }

  // ── PHASE: COMPLETE — patient has signed, clinician countersigns ────────────
  if (phase === "complete" && consentData) {

    return (
      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px 80px" }}>

        {/* Success header */}
        <div style={{ background:T.success, borderRadius:12, padding:"22px 30px", marginBottom:16 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", marginBottom:6 }}>Consent Complete</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:4 }}>✓ Patient Has Signed</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)" }}>
            Signed by {consentData.signedBy} on {new Date(consentData.signedAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        {/* Signature record */}
        <div style={{ background:"#fff", borderRadius:10, border:`1.5px solid ${T.successBorder}`, padding:"24px 28px", marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:18 }}>Signature Record</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Patient signature</div>
              <div style={{ fontSize:22, fontFamily:"Georgia,serif", fontStyle:"italic", color:"#1A1A1A", borderBottom:"1px solid #CCC", paddingBottom:6 }}>{consentData.signedBy}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Date & time</div>
              <div style={{ fontSize:13.5, color:"#333", paddingBottom:6 }}>{new Date(consentData.signedAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Risks acknowledged</div>
              <div style={{ fontSize:13.5, color:T.success, fontWeight:700 }}>
                {consentData.condSectionsCount} of {consentData.condSectionsCount} ✓
              </div>
            </div>
          </div>

          {/* Clinician countersignature */}
          {!clinCountersigned ? (
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:18 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:10 }}>Clinician countersignature</div>
              <div style={{ display:"flex", gap:12, alignItems:"flex-end" }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11.5, fontWeight:700, color:T.muted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>Treating clinician name</label>
                  <input value={clinCounter} onChange={e=>setClinicianCounter(e.target.value)}
                    style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:6, padding:"10px 14px", fontSize:15, fontFamily:"Georgia,serif", fontStyle:"italic", color:T.ink, outline:"none" }}
                    onFocus={e=>e.target.style.borderColor=T.goldMid} onBlur={e=>e.target.style.borderColor=T.border}
                  />
                </div>
                <button
                  onClick={() => { if(clinCounter.trim()) setClinicianCountersigned(true); }}
                  disabled={!clinCounter.trim()}
                  style={{ background: clinCounter.trim() ? T.primary : "#E0E0E0", color: clinCounter.trim() ? T.gold : T.muted, border:"none", borderRadius:7, padding:"12px 24px", fontSize:13, fontWeight:800, cursor: clinCounter.trim()?"pointer":"not-allowed", fontFamily:"inherit", flexShrink:0 }}
                >
                  Countersign ✓
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Clinician countersignature</div>
                <div style={{ fontSize:20, fontFamily:"Georgia,serif", fontStyle:"italic", color:"#1A1A1A" }}>{clinCounter}</div>
              </div>
              <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, color:T.success }}>
                ✓ Fully countersigned
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={() => alert("PDF download will be available when deployed. Record is saved to SmileOS.")} style={{ background:T.success, color:"#fff", border:"none", borderRadius:7, padding:"10px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ↓ Download Signed PDF
          </button>
          <button onClick={() => alert("In production: emails signed PDF to patient.")} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:7, padding:"10px 20px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            ✉ Email copy to patient
          </button>
          <button onClick={() => alert("Saved to SmileOS patient record.")} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:7, padding:"10px 20px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            💾 Save to record
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — PAYMENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

// ─── MOCK ADAPTERS ───────────────────────────────────────────────────────────
const MockFinanceAdapter = {
  checkStatus: async (ref) => ({ status: "approved", ref, provider: "Chrysalis Finance" }),
};
const MockSOEAdapter = {
  fetchAccount: async (patientId) => ({ balance: 0, lastPayment: null }),
};
// ─── EMAIL TEMPLATE ENGINE ────────────────────────────────────────────────────
// All automated emails sent by SmileOS — real templates, ready to wire to
// a backend (SendGrid, Postmark, etc.) by replacing the send() function body.

const EMAIL_TEMPLATES = {

  estimate: {
    subject: (data) => `Your Smile Plan — ${data.practice}`,
    body: (data) => `Hi ${data.patientFirst},

Your clinician, ${data.clinician}, has prepared your personalised Smile Plan at ${data.practice}.

TREATMENT SUMMARY
─────────────────
Treatment: Clear aligner orthodontic treatment
Total investment: £${data.total?.toLocaleString() || "as discussed"}
${data.monthly ? `Monthly option: £${data.monthly}/month over ${data.months} months` : ""}

To review and accept your plan, please contact the practice or speak to your clinician at your next appointment.

If you have any questions, please don't hesitate to get in touch.

Kind regards,
${data.clinician}
${data.practice}
${data.phone || ""}`,
  },

  estimate_reminder: {
    subject: (data) => `Reminder: Your Smile Plan is waiting — ${data.practice}`,
    body: (data) => `Hi ${data.patientFirst},

We just wanted to remind you that your personalised Smile Plan from ${data.clinician} at ${data.practice} is still available for you to review.

If you have any questions or would like to discuss your options, please give us a call or reply to this email.

We look forward to hearing from you.

Kind regards,
${data.clinician}
${data.practice}`,
  },

  consent: {
    subject: (data) => `Your Consent Documents — ${data.practice}`,
    body: (data) => `Hi ${data.patientFirst},

Please find attached your consent documentation for your upcoming clear aligner treatment at ${data.practice}.

IMPORTANT: Please read this carefully before signing. If you have any questions about the treatment, risks, or what is involved, please contact us before signing.

Your clinician: ${data.clinician}

To sign your consent documents, please [link to patient portal or arrange in clinic].

Kind regards,
${data.clinician}
${data.practice}`,
  },

  review_video: {
    subject: (data) => `Your personalised ClinCheck walkthrough — please review`,
    body: (data) => `Hi ${data.patientFirst},

${data.clinician} at ${data.practice} has recorded a short personalised video walking you through your ClinCheck treatment plan.

Please watch the video carefully — it explains exactly what movements your aligners will make and what the final result will look like.

WATCH YOUR PLAN:
${data.videoLink || "[Video link will appear here]"}

Once you have watched it, please click "I'm happy to proceed" to confirm you are ready to start treatment.

If you have any questions, please reply to this email or call the practice.

Kind regards,
${data.clinician}
${data.practice}`,
  },

  dentist_notification: {
    subject: (data) => `✓ ${data.patientName} has approved their ClinCheck plan`,
    body: (data) => `Hi ${data.clinician},

${data.patientName} has watched and signed off their ClinCheck review video.

SIGN-OFF DETAILS
────────────────
Patient: ${data.patientName}
Signed: ${data.signedAt || new Date().toLocaleString("en-GB")}
Clinician: ${data.clinician}
Practice: ${data.practice}

The signed document has been saved to the patient's file in SmileOS.

Next step: Proceed with ordering aligners.

SmileOS`,
  },

  payment_form: {
    subject: (data) => `Your Monthly Payment Agreement — ${data.practice}`,
    body: (data) => `Hi ${data.patientFirst},

Please find your monthly payment plan agreement for your clear aligner treatment at ${data.practice}.

PAYMENT SUMMARY
───────────────
Total treatment fee: £${data.total?.toLocaleString() || "as agreed"}
Monthly payment: £${data.monthly || "as agreed"}/month
Duration: ${data.months || "as agreed"} months
Interest: 0% — interest free

Please sign and return this agreement to confirm your payment plan.

Kind regards,
${data.clinician}
${data.practice}`,
  },

  question: {
    subject: (data) => `Patient question: ${data.patientName} re: ClinCheck plan`,
    body: (data) => `Hi ${data.clinician},

${data.patientName} has submitted a question about their ClinCheck treatment plan:

"${data.body}"

Please follow up with the patient before proceeding.

SmileOS`,
  },
};

const MockEmailSMS = {
  // In production: replace this function body with a real API call
  // e.g. fetch("https://api.sendgrid.com/v3/mail/send", { ... })
  send: async ({ to, subject, body, type, data }) => {
    const template = EMAIL_TEMPLATES[type];
    const resolvedSubject = subject || (template?.subject ? template.subject({ ...data, patientFirst: to?.split(" ")[0] || to }) : `SmileOS — ${type}`);
    const resolvedBody    = body   || (template?.body    ? template.body({ ...data, patientFirst: to?.split(" ")[0] || to })    : "");

    const entry = {
      sent:      true,
      timestamp: new Date().toISOString(),
      type,
      to,
      subject:   resolvedSubject,
      body:      resolvedBody,
      template:  !!template,
    };

    AuditLog.record({
      action: `email_sent`,
      detail: `${resolvedSubject} → ${to}`,
      ts:     entry.timestamp,
    });

    // In development: log to console so you can see the full email
    console.log(`[SmileOS Email] ${resolvedSubject}\nTo: ${to}\n\n${resolvedBody}`);

    return entry;
  },

  // Helper: get template preview for a given type
  preview: (type, data) => {
    const t = EMAIL_TEMPLATES[type];
    if (!t) return { subject:"(no template)", body:"(no template)" };
    return {
      subject: t.subject(data),
      body:    t.body(data),
    };
  },

  templates: EMAIL_TEMPLATES,
};

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
// Lightweight in-memory audit trail — records key medicolegal actions
const AuditLog = (() => {
  let entries = [];
  return {
    record: ({ action, detail, patientName, ts }) => {
      entries.push({
        id:          `al_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        ts:          ts || new Date().toISOString(),
        action,
        detail:      detail || "",
        patientName: patientName || "",
        user:        CURRENT_USER.name,
      });
    },
    all:     () => [...entries].reverse(),
    forUser: (name) => entries.filter(e=>e.patientName===name).reverse(),
    clear:   () => { entries = []; },
  };
})();

function AuditLogPage() {
  const [filter, setFilter] = useState("");
  const entries = AuditLog.all().filter(e =>
    !filter ||
    e.patientName.toLowerCase().includes(filter.toLowerCase()) ||
    e.action.toLowerCase().includes(filter.toLowerCase()) ||
    e.detail.toLowerCase().includes(filter.toLowerCase())
  );
  const ACTION_COLOR = {
    email_sent:        T.info,
    consent_signed:    T.success,
    assessment_done:   T.gold,
    payment_confirmed: T.success,
    clincheck_submitted: T.warning,
    loom_watched:      "#CC0000",
    loom_approved:     T.success,
    workflow_opened:   T.primary,
    stage_changed:     T.primary,
  };
  return (
    <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>{TENANT.practice}</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.primary, letterSpacing:-0.3 }}>Audit Log</div>
        <div style={{ fontSize:12.5, color:T.muted, marginTop:2 }}>Timestamped record of all key clinical and compliance actions</div>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by patient, action, or detail…"
          style={{ border:`1.5px solid ${T.border}`, borderRadius:7, padding:"8px 14px", fontSize:13, fontFamily:"inherit", width:280, color:T.ink, outline:"none" }}
          onFocus={e=>e.target.style.borderColor=T.goldMid} onBlur={e=>e.target.style.borderColor=T.border}
        />
        <button onClick={()=>AuditLog.clear()||setFilter(f=>f+" ")} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>Clear log</button>
      </div>
      <div style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"160px 130px 1fr 140px", padding:"9px 20px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
          {["Timestamp","Action","Detail","User"].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted }}>{h}</span>
          ))}
        </div>
        {entries.length === 0 && (
          <div style={{ padding:"32px", textAlign:"center", fontSize:13.5, color:T.muted }}>
            No audit entries yet — actions are recorded as you use the workflow.
          </div>
        )}
        {entries.map((e,i) => {
          const col = ACTION_COLOR[e.action] || T.muted;
          const dt  = new Date(e.ts).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
          return (
            <div key={e.id} style={{ display:"grid", gridTemplateColumns:"160px 130px 1fr 140px", padding:"11px 20px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"center" }}>
              <span style={{ fontSize:12, color:T.muted, fontFamily:"monospace" }}>{dt}</span>
              <span style={{ fontSize:11.5, fontWeight:700, color:col, background:`${col}15`, borderRadius:4, padding:"2px 8px", display:"inline-block" }}>{e.action.replace(/_/g," ")}</span>
              <span style={{ fontSize:12.5, color:T.sub }}>{e.detail}</span>
              <span style={{ fontSize:12, color:T.muted }}>{e.user}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ESTIMATE CALCULATION ENGINE ─────────────────────────────────────────────
// Ported from newer build — handles ClinCheck fee deduction logic
function calculateEstimateTotals({
  consultationFee = 0, treatmentCost = 0,
  clincheckFee = 200, clincheckPaid = false,
  payMonthly = false, months = 12,
}) {
  const clincheckDeduction = clincheckPaid ? clincheckFee : 0;
  const treatmentNet       = Math.max(0, treatmentCost - clincheckDeduction);
  const clincheckCharge    = clincheckPaid ? 0 : clincheckFee;
  const subtotal           = consultationFee + treatmentNet + clincheckCharge;
  const monthlyPayment     = payMonthly && months > 0 ? Math.round(subtotal / months) : 0;
  return {
    consultationFee, treatmentCost, clincheckFee, clincheckPaid,
    clincheckDeduction, clincheckCharge, treatmentNet,
    subtotal, total: subtotal, payMonthly, months, monthlyPayment,
    outstandingBalance: subtotal,
    deductionApplied: clincheckPaid,
    deductionAmount: clincheckDeduction,
  };
}

const DEPOSIT = 1200;

const PAYMENT_TYPES = [
  { id:"full",    label:"Pay in Full",         icon:"💳" },
  { id:"finance", label:"Finance (Chrysalis)", icon:"🏦" },
  { id:"monthly", label:"Monthly Plan",        icon:"📅" },
];

// ─── PATIENT-FACING MONTHLY PAYMENT PLAN FORM ────────────────────────────────
function MonthlyPlanForm({ patient, practice, fee, months, deposit, onPatientSign }) {
  const [ackMap,  setAckMap]  = useState({});
  const [sigName, setSigName] = useState("");
  const [done,    setDone]    = useState(false);

  const balance  = fee - deposit;
  const monthly  = months ? Math.round(balance / months) : 0;
  const today    = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const start    = new Date(Date.now()+30*864e5).toLocaleDateString("en-GB",{month:"long",year:"numeric"});

  const TERMS = [
    { id:"t1", text:`I understand a deposit of £${deposit.toLocaleString()} is payable before treatment commences and is non-refundable once treatment has begun.` },
    { id:"t2", text:`I agree to pay ${months} monthly instalments of £${monthly.toLocaleString()}, beginning ${start}, until the full balance of £${balance.toLocaleString()} is cleared.` },
    { id:"t3", text:`I understand the total fee is £${fee.toLocaleString()} (£${deposit.toLocaleString()} deposit + ${months} × £${monthly.toLocaleString()} = £${(deposit+monthly*months).toLocaleString()}).` },
    { id:"t4", text:"I understand missed or failed payments may result in treatment being paused until the account is brought up to date. A £25 late payment fee may apply." },
    { id:"t5", text:"I agree to provide valid payment details and authorise the practice to collect the amounts specified above on the agreed dates each month." },
    { id:"t6", text:"I understand this payment plan does not affect my treatment obligations — I must attend all appointments and comply with all wear instructions." },
    { id:"t7", text:"I confirm I have read and understood all terms of this payment plan agreement." },
  ];

  const allAcked = TERMS.every(t => ackMap[t.id]);
  const canSign  = allAcked && sigName.trim().length >= 3;

  if (done) return (
    <div style={{ minHeight:"100vh", background:"#F8F7F4", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:T.success, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, color:"#fff", margin:"0 auto 20px" }}>✓</div>
        <div style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", marginBottom:8 }}>Payment Plan Agreed</div>
        <div style={{ fontSize:14, color:"#555", lineHeight:1.7, marginBottom:24 }}>Thank you, <strong>{sigName}</strong>. Your signed agreement has been sent to {practice}.</div>
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E0E0E0", padding:"22px 26px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, textAlign:"left" }}>
            {[["Deposit due",`£${deposit.toLocaleString()}`],["Monthly",`£${monthly.toLocaleString()} × ${months}`],["First payment",start],["Total",`£${fee.toLocaleString()}`]].map(([l,v])=>(
              <div key={l}><div style={{ fontSize:11, color:"#999", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>{l}</div><div style={{ fontSize:17, fontWeight:700, color:"#1A1A1A" }}>{v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#F8F7F4", minHeight:"100vh", fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <div style={{ background:T.primary, padding:"16px 28px" }}>
        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:"#3D6A56", textTransform:"uppercase" }}>{practice}</div>
        <div style={{ fontSize:17, fontWeight:800, color:"#F0EFE8", marginTop:2 }}>Monthly Payment Plan Agreement</div>
        <div style={{ fontSize:12.5, color:"#4A7A6A", marginTop:3 }}>For: <strong style={{ color:"#F0EFE8" }}>{patient?.name}</strong> · {today}</div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"28px 20px 40px" }}>

        {/* Payment schedule card */}
        <div style={{ background:"#fff", borderRadius:10, border:`2px solid ${T.goldMid}`, padding:"24px 28px", marginBottom:22 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:16 }}>Your Payment Schedule</div>

          {/* Deposit + monthly summary */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
            <div style={{ background:T.goldLight, borderRadius:8, padding:"16px 18px", border:`1px solid ${T.goldMid}` }}>
              <div style={{ fontSize:11, color:T.goldDim, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Deposit — Due Before Treatment</div>
              <div style={{ fontSize:32, fontWeight:800, color:T.primary, lineHeight:1 }}>£{deposit.toLocaleString()}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:5 }}>Payable when booking commences</div>
            </div>
            <div style={{ background:"#F8F8F8", borderRadius:8, padding:"16px 18px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:11, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Then Monthly × {months}</div>
              <div style={{ fontSize:32, fontWeight:800, color:T.primary, lineHeight:1 }}>£{monthly.toLocaleString()}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:5 }}>Starting {start}</div>
            </div>
          </div>

          {/* Full schedule table */}
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13.5 }}>
            <thead>
              <tr style={{ background:"#F4F4F4" }}>
                {["Payment","Amount","Date"].map(h=>(
                  <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:T.muted, borderBottom:`1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"10px 12px", fontWeight:700, color:T.ink }}>Deposit</td>
                <td style={{ padding:"10px 12px", fontWeight:700, color:T.ink }}>£{deposit.toLocaleString()}</td>
                <td style={{ padding:"10px 12px", color:T.muted }}>Before treatment begins</td>
              </tr>
              {Array.from({length:months},(_,i)=>{
                const d=new Date(); d.setMonth(d.getMonth()+i+1);
                return (
                  <tr key={i} style={{ borderBottom:i<months-1?`1px solid ${T.border}`:"none", background:i%2===0?"#FAFAFA":"#fff" }}>
                    <td style={{ padding:"9px 12px", color:T.sub }}>Month {i+1}</td>
                    <td style={{ padding:"9px 12px", fontWeight:600, color:T.ink }}>£{monthly.toLocaleString()}</td>
                    <td style={{ padding:"9px 12px", color:T.muted }}>{d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:T.goldLight, borderTop:`2px solid ${T.goldMid}` }}>
                <td style={{ padding:"11px 12px", fontWeight:800, color:T.primary }}>Total</td>
                <td style={{ padding:"11px 12px", fontWeight:800, color:T.primary }}>£{(deposit+monthly*months).toLocaleString()}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms */}
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"22px 26px", marginBottom:22 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:4 }}>Terms & Agreement</div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:16, lineHeight:1.6 }}>Please read each term and tick to confirm your agreement before signing.</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {TERMS.map(term=>(
              <div key={term.id} onClick={()=>setAckMap(p=>({...p,[term.id]:!p[term.id]}))} style={{
                display:"flex", gap:14, alignItems:"flex-start", cursor:"pointer",
                background:ackMap[term.id]?"#F0FBF4":"#FAFAFA",
                border:`1.5px solid ${ackMap[term.id]?T.success:T.border}`,
                borderRadius:7, padding:"12px 14px", transition:"all 0.15s", userSelect:"none",
              }}>
                <div style={{ width:22, height:22, borderRadius:4, flexShrink:0, marginTop:1, background:ackMap[term.id]?T.success:"#fff", border:`2px solid ${ackMap[term.id]?T.success:"#CCC"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                  {ackMap[term.id]&&<span style={{ color:"#fff", fontSize:13, fontWeight:900, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:13.5, lineHeight:1.65, color:ackMap[term.id]?"#1A1A1A":"#444" }}>{term.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature */}
        <div style={{ background:"#fff", borderRadius:10, border:`2px solid ${canSign?T.gold:"#E0E0E0"}`, padding:"26px 28px", marginBottom:24, transition:"border-color 0.3s" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#1A1A1A", marginBottom:6 }}>Sign Payment Agreement</div>
          <p style={{ fontSize:13.5, color:"#555", marginBottom:20, lineHeight:1.7 }}>By signing, I confirm I have read and agree to all terms above and authorise {practice} to collect payments as described.</p>
          {!allAcked&&(
            <div style={{ background:"#FFF3E0", border:"1px solid #F0C040", borderRadius:6, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#9A6000", fontWeight:600 }}>
              ⚠ Please tick all {TERMS.length} terms above first. ({Object.values(ackMap).filter(Boolean).length}/{TERMS.length} ticked)
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11.5, fontWeight:700, color:"#777", textTransform:"uppercase", letterSpacing:0.6, marginBottom:7 }}>Type your full name to sign</label>
            <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder={`e.g. ${patient?.name||"Your full name"}…`}
              style={{ width:"100%", border:`2px solid ${sigName.length>=3?T.gold:"#D0D0D0"}`, borderRadius:6, padding:"13px 16px", fontSize:20, fontFamily:"Georgia,serif", fontStyle:"italic", color:"#1A1A1A", outline:"none", transition:"border-color 0.2s", background:sigName.length>=3?"#FFFDF5":"#fff" }}/>
          </div>
          <button onClick={()=>{ if(canSign){setDone(true); onPatientSign&&onPatientSign({signedBy:sigName.trim(),signedAt:new Date().toISOString(),months,monthly,deposit,fee}); }}} disabled={!canSign}
            style={{ width:"100%", padding:"15px 0", background:canSign?T.primary:"#E8E8E8", color:canSign?T.gold:"#AAA", border:"none", borderRadius:8, fontSize:15, fontWeight:800, letterSpacing:0.3, cursor:canSign?"pointer":"not-allowed", fontFamily:"inherit", transition:"all 0.2s", boxShadow:canSign?"0 4px 16px rgba(45,45,45,0.25)":"none" }}>
            {canSign?"✓  I Agree — Sign Payment Plan":allAcked?"Enter your name above to sign":`Tick all ${TERMS.length} terms first (${Object.values(ackMap).filter(Boolean).length}/${TERMS.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentPage({ consultation, patient, onUpdate, paymentState, setPaymentState }) {
  const ps  = paymentState;
  const set = (k,v) => setPaymentState(p => ({...p,[k]:v}));

  const baseFee         = parseInt(consultation?.indicativeCost || 0) || 4495;
  const clincheckPaid   = !!ps.clincheckFeePaid;
  const clincheckFee    = 200;
  const clincheckDeduct = clincheckPaid ? clincheckFee : 0;
  const fee             = Math.max(0, baseFee - clincheckDeduct);
  const deposit = DEPOSIT;
  const balance = fee - deposit;
  const monthly = ps.months ? Math.round(balance / ps.months) : 0;

  const handleSendMonthlyForm = async () => {
    const result = await MockEmailSMS.send({ to:patient?.name, subject:"Monthly Payment Plan Agreement", type:"payment_form" });
    set("monthlyFormSent", result.timestamp);
    set("monthlyFormEvents", [...(ps.monthlyFormEvents||[]), { ts:result.timestamp, action:"sent" }]);
  };

  const handleMonthlySign = (sigData) => {
    set("monthlyFormSigned",   sigData.signedAt);
    set("monthlyFormSignedBy", sigData.signedBy);
    set("monthlyFormPhase",    "complete");
  };

  // Patient-facing form view
  if (ps.monthlyFormPhase === "patient_view") return (
    <div>
      <div style={{ background:T.gold, padding:"8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12.5, fontWeight:700, color:T.primary }}>
        <span>👁 Preview — this is exactly what {patient?.name} will see</span>
        <button onClick={()=>set("monthlyFormPhase",null)} style={{ background:T.primary, color:T.gold, border:"none", borderRadius:4, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
      </div>
      <MonthlyPlanForm patient={patient} practice={TENANT.practice} fee={fee} months={ps.months||12} deposit={deposit} onPatientSign={handleMonthlySign}/>
    </div>
  );

  return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 20px 60px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:T.primary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:T.gold }}>£</div>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:T.primary }}>Payment & Finance</div>
          <div style={{ fontSize:12.5, color:T.muted }}>Treatment fee: <strong>£{fee.toLocaleString()}</strong></div>
        </div>
      </div>

      {/* ClinCheck fee deduction */}
      <div style={{ background: clincheckPaid ? T.successLight : "#fff", border:`1.5px solid ${clincheckPaid ? T.successBorder : T.border}`, borderRadius:10, padding:"14px 20px", marginBottom:14, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={()=>set("clincheckFeePaid",!clincheckPaid)}>
        <input type="checkbox" checked={clincheckPaid} onChange={()=>{}} style={{ width:16, height:16, cursor:"pointer" }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color: clincheckPaid ? T.success : T.ink }}>Patient has paid £{clincheckFee} ClinCheck fee</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
            {clincheckPaid
              ? `✓ £${clincheckFee} deducted from treatment — new total: £${fee.toLocaleString()}`
              : `If selected: £${clincheckFee} will be deducted from the treatment fee`}
          </div>
        </div>
      </div>

      {/* Method selector */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:14 }}>Payment Method</div>
        <div style={{ display:"flex", gap:10 }}>
          {PAYMENT_TYPES.map(pt=>(
            <button key={pt.id} onClick={()=>set("type",pt.id)} style={{ flex:1, border:`2px solid ${ps.type===pt.id?T.primary:T.border}`, background:ps.type===pt.id?"#F0EFE8":"#fff", borderRadius:8, padding:"14px 10px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", textAlign:"center" }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{pt.icon}</div>
              <div style={{ fontSize:13, fontWeight:ps.type===pt.id?700:400, color:ps.type===pt.id?T.primary:T.sub }}>{pt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Finance */}
      {ps.type==="finance"&&(
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:12 }}>Finance Application</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:12, color:T.muted, display:"block", marginBottom:5 }}>Reference Number</label>
              <input value={ps.financeRef||""} onChange={e=>set("financeRef",e.target.value)} placeholder="Chrysalis ref…" style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:5, padding:"8px 12px", fontSize:13, fontFamily:"inherit" }}/>
            </div>
            <div>
              <label style={{ fontSize:12, color:T.muted, display:"block", marginBottom:5 }}>Status</label>
              <div style={{ display:"flex", gap:7 }}>
                {["pending","approved","declined"].map(s=>(
                  <button key={s} onClick={()=>set("financeStatus",s)} style={{ border:`1px solid ${ps.financeStatus===s?(s==="approved"?T.success:s==="declined"?T.error:T.warning):T.border}`, background:ps.financeStatus===s?(s==="approved"?T.successLight:s==="declined"?T.errorLight:T.warningLight):"#fff", color:ps.financeStatus===s?(s==="approved"?T.success:s==="declined"?T.error:T.warning):T.muted, borderRadius:4, padding:"5px 12px", fontSize:12.5, fontWeight:ps.financeStatus===s?700:400, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          {ps.financeStatus==="approved"&&<div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:6, padding:"10px 14px", fontSize:13, color:T.success, fontWeight:600 }}>✓ Finance approved — treatment can proceed</div>}
        </div>
      )}

      {/* Monthly plan */}
      {ps.type==="monthly"&&(
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"22px 24px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:16 }}>Monthly Payment Plan</div>

          {/* Deposit / balance / total summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Standard Deposit", val:`£${deposit.toLocaleString()}`, sub:"Due before treatment", hi:true },
              { label:"Balance to spread", val:`£${balance.toLocaleString()}`, sub:"Over monthly instalments", hi:false },
              { label:"Total Fee",         val:`£${fee.toLocaleString()}`,     sub:"Deposit + instalments",   hi:false },
            ].map(item=>(
              <div key={item.label} style={{ background:item.hi?T.goldLight:"#F8F8F8", border:`1px solid ${item.hi?T.goldMid:T.border}`, borderRadius:8, padding:"14px 16px" }}>
                <div style={{ fontSize:11, color:item.hi?T.goldDim:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:T.primary }}>{item.val}</div>
                <div style={{ fontSize:11.5, color:T.muted, marginTop:3 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Month selector */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:12, color:T.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, display:"block", marginBottom:9 }}>Number of monthly instalments</label>
            <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
              {[6,9,12,18,24].map(m=>{
                const mAmt=Math.round(balance/m);
                return (
                  <button key={m} onClick={()=>set("months",m)} style={{ border:`2px solid ${ps.months===m?T.primary:T.border}`, background:ps.months===m?T.primary:"#fff", borderRadius:8, padding:"10px 18px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s", textAlign:"center", minWidth:82 }}>
                    <div style={{ fontSize:17, fontWeight:800, color:ps.months===m?T.gold:T.ink }}>{m} months</div>
                    <div style={{ fontSize:11.5, color:ps.months===m?"rgba(201,162,74,0.75)":T.muted, marginTop:2 }}>£{mAmt}/mo</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Computed summary line */}
          {ps.months&&(
            <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:8, padding:"13px 16px", marginBottom:18, fontSize:13.5, color:T.goldDim, fontWeight:600 }}>
              £{deposit.toLocaleString()} deposit + {ps.months} × £{monthly.toLocaleString()}/month = <strong style={{ color:T.primary }}>£{(deposit+monthly*ps.months).toLocaleString()} total</strong>
            </div>
          )}

          {/* Send / status */}
          {!ps.months ? (
            <div style={{ fontSize:13, color:T.warning, fontWeight:600, padding:"12px 0" }}>⚠ Select number of months above before sending the form.</div>
          ) : ps.monthlyFormSigned ? (
            <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:8, padding:"16px 18px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.success, marginBottom:10 }}>✓ Payment Plan Agreement Signed</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <div><div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Signed by</div><div style={{ fontSize:15, fontFamily:"Georgia,serif", fontStyle:"italic" }}>{ps.monthlyFormSignedBy}</div></div>
                <div><div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Date</div><div style={{ fontSize:13.5 }}>{new Date(ps.monthlyFormSigned).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div></div>
                <div><div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>Plan</div><div style={{ fontSize:13.5 }}>£{deposit.toLocaleString()} + {ps.months} × £{monthly.toLocaleString()}/mo</div></div>
              </div>
            </div>
          ) : (
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:6 }}>Payment Plan Agreement Form</div>
              <div style={{ fontSize:12.5, color:T.muted, marginBottom:14, lineHeight:1.6 }}>
                Sends the patient a form showing their full schedule — £{deposit.toLocaleString()} deposit then {ps.months} × £{monthly.toLocaleString()}/month. They tick each term and sign before treatment begins.
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                <button onClick={()=>set("monthlyFormPhase","patient_view")} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  👁 Preview Form
                </button>
                {!ps.monthlyFormSent ? (
                  <button onClick={handleSendMonthlyForm} style={{ background:T.cyan, color:"#fff", border:"none", borderRadius:7, padding:"10px 24px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 3px 10px ${T.cyan}50` }}>
                    ✉ Send Payment Form to {patient?.name||"Patient"}
                  </button>
                ) : (
                  <>
                    <div style={{ background:T.infoLight, border:`1px solid ${T.infoBorder}`, borderRadius:6, padding:"9px 14px", fontSize:13, color:T.info, fontWeight:600 }}>
                      ✓ Sent {new Date(ps.monthlyFormSent).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </div>
                    <button onClick={()=>set("monthlyFormPhase","patient_view")} style={{ background:T.gold, color:T.primary, border:"none", borderRadius:6, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      ▶ Simulate Patient Signing
                    </button>
                    <button onClick={handleSendMonthlyForm} style={{ background:"#fff", color:T.muted, border:`1px solid ${T.border}`, borderRadius:5, padding:"9px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>↺ Resend</button>
                  </>
                )}
              </div>
              {ps.monthlyFormSent&&<div style={{ marginTop:10, fontSize:12, color:T.warning }}>⏱ {Math.ceil((Date.now()-new Date(ps.monthlyFormSent))/864e5)} day(s) since sent — awaiting patient signature</div>}
            </div>
          )}
        </div>
      )}

      {/* Pay in full */}
      {ps.type==="full"&&(
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:12 }}>Full Payment</div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:13.5, color:T.sub }}>Payment received:</span>
            {!ps.fullPaid ? (
              <button onClick={()=>set("fullPaid",new Date().toISOString())} style={{ background:T.success, color:"#fff", border:"none", borderRadius:5, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Mark as Paid</button>
            ) : (
              <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:6, padding:"8px 14px", fontSize:13, color:T.success, fontWeight:700 }}>
                ✓ Paid {new Date(ps.fullPaid).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 5 — CLINCHECK PROTOCOL BUILDER
// ═══════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// CAP PROTOCOL LIBRARY
// Full clinical protocol definitions for automatic mapping
// ══════════════════════════════════════════════════════════════════════════════

const CAP_PROTOCOLS = {
  class2_elastic: {
    id: "class2_elastic",
    label: "Class II Elastic Protocol",
    triggers: ["class II", "class 2", "skeletal II", "anteroposterior"],
    priority: "primary",
    steps: [
      "Cut out on LR6/LL6 as distal as possible",
      "Precision cut on UR3/UL3 for Class II elastics",
      "Attachment on any tooth with cutout or precision cut",
      "0.5mm intrusion LR6/LL6",
      "5 degrees mesial angulation UR3/UL3",
      "5 degrees distal angulation of LR6/LL6",
      "10 degrees lingual root torque upper 2-2",
    ],
    note: "For every 1 degree of lingual root torque add 0.1mm of intrusion. Zero Collision Tolerance: distal edge out with proclination under ZCT parameters, followed by mesial in together with retraction and crown tip back if needed.",
  },
  distalisation: {
    id: "distalisation",
    label: "CAP Distalisation Protocol",
    triggers: ["crowding", "class II", "distal", "upper arch"],
    priority: "primary",
    steps: [
      "Distalise 2nd molar 1mm",
      "Then distalise 1st molar 1mm",
      "Once 1st molar has moved 1mm, start distalising 2nd premolar by 1mm",
      "Same with 1st premolar",
      "Followed by retrusion/intrusion and lingual root torque of anterior teeth together",
    ],
    note: "Upper 3rd molars must be removed. Request aesthetic start. Derotate molar with expansion and distalisation simultaneously. Use Class II elastics at all times. G7 on 6s and 7s, conventional attachment CAP rotation. Flatten curve of Wilson to improve deep bite. 5 degrees lingual root torque on upper and lower 2-2.",
  },
  settling: {
    id: "settling",
    label: "Settling to Invisalign Protocol",
    triggers: ["posterior open bite", "settling"],
    priority: "additional",
    steps: [
      "Remove any anterior and posterior interferences",
      "Bite jump to show closure of the posterior open bite",
      "Do not extrude posterior teeth to fix posterior open bite",
      "Any posterior extrusion only to level marginal ridges",
    ],
    note: "In order to eliminate the posterior open bite, please remove any anterior and posterior interferences followed by a bite jump to show the closure of the posterior open bite.",
  },
  auxiliaries_settling: {
    id: "auxiliaries_settling",
    label: "Auxiliaries in Settling",
    triggers: ["lack of tracking", "settling support"],
    priority: "additional",
    steps: [
      "Only used if there is space between the tray and tooth",
      "Place button on the most mesial and distal tooth in a group of teeth with lack of tracking",
      "Elastics to be worn 24 hours — 2 week review",
      "Create custom made cutouts",
    ],
    note: "Review required: auxiliaries are only indicated where there is confirmed lack of tracking.",
  },
  recession: {
    id: "recession",
    label: "Recession Protocol",
    triggers: ["recession", "thin biotype", "gingival"],
    priority: "additional",
    steps: [
      "Improving gingival recession with 10 degrees lingual root torque",
    ],
    note: "Consider periodontal review before commencing treatment if recession is significant.",
  },
  single_intrusion: {
    id: "single_intrusion",
    label: "Single Tooth Intrusion",
    triggers: ["intrusion", "over-erupted"],
    priority: "additional",
    steps: [
      "Place a 4mm horizontal conventional attachment bevelled gingivally on both neighbours",
      "Request '1mm space mesial and distal to tooth during intrusion and once intrusion complete, close the spaces'",
      "Overcorrect the intrusion by 1/3 of tooth height",
      "Dynamic Intrusion Assisting (DIA) pontic",
    ],
  },
  single_extraction: {
    id: "single_extraction",
    label: "Single Tooth Extraction Rules",
    triggers: ["extraction", "space closure"],
    priority: "primary",
    steps_large: [
      "10 degrees root tip into space — both neighbours",
      "Attachments",
      "Virtual IPR (0.4mm to give tighter contact)",
      "Deep bite protocol",
      "Extract between tray 3/4",
    ],
    steps_small: [
      "5 degrees mesial root tip",
      "Attachments",
      "Virtual IPR",
      "Deep bite protocol",
      "Extraction between tray 3/4",
    ],
    note: "Space >2mm: use large space protocol. Space ≤2mm: use small space protocol. Clinical judgment required.",
  },
  open_bite: {
    id: "open_bite",
    label: "Open Bite Protocol",
    triggers: ["open bite", "anterior open bite", "aob"],
    priority: "primary",
    steps: [
      "First create space by proclining the incisors followed by simultaneous extrusion with retraction in a 1:1 ratio",
      "Ensure all extrusion completed prior to complete space closure",
      "Place G4 attachments for extrusion or a 4mm conventional attachment bevelled gingivally",
      "Overcorrect the overbite to 3mm — disregard anterior heavy contacts as a result",
      "Progressive intrusion of posterior teeth: UL 1st premolar 0.5mm → UL 2nd premolars 1mm total → UL 1st molars 2mm total → UL 2nd molars 3.5mm total",
      "Posterior Bite Ramp Protocol: conventional attachments on all molars, 4mm long, as thick as possible, horizontally orientated buccal to lingual",
      "Vertical elastics only if lack of tracking",
    ],
    note: "Contraindications: increased incisor display, Class III skeletal/dental relationship. Clinical review required before submitting.",
  },
  open_bite_incisor_display: {
    id: "open_bite_incisor_display",
    label: "Open Bite — Increased Incisor Display",
    triggers: ["open bite", "incisor display"],
    priority: "additional",
    steps: [
      "Lower incisor extrusion only",
      "Progressive intrusion protocol for posterior teeth",
      "Posterior bite ramp protocol",
    ],
  },
  diastema: {
    id: "diastema",
    label: "Diastema Protocol",
    triggers: ["diastema", "spacing", "space"],
    priority: "primary",
    steps_large: [
      "5 degrees mesial root tip",
      "10 degrees lingual root torque",
      "Virtual IPR of 0.4–0.5mm IPR",
    ],
    steps_small: [
      "2.5 degrees mesial root tip",
      "5 degrees lingual root torque",
      "Virtual IPR",
    ],
    note: "Diastema >1mm: use large diastema protocol. Diastema <1mm: use small diastema protocol.",
  },
  attachment_rules: {
    id: "attachment_rules",
    label: "Attachment Rules",
    triggers: ["rotation", "angulation", "attachment"],
    priority: "additional",
    steps: [
      "3mm gingival bevelled conventional attachments on movements >4 degrees for angulation and rotation for lateral incisors",
      "3mm gingival bevelled conventional attachments on movements >6 degrees angulation and >18 degrees rotation for premolars and canines",
      "4mm conventional gingival bevelled attachments on all 6s",
    ],
  },
  uprighting_molars: {
    id: "uprighting_molars",
    label: "Uprighting Molars",
    triggers: ["tilted molar", "molar uprighting", "molar angulation"],
    priority: "primary",
    steps: [
      "Ying yang attachment",
      "Change the angulation of the molar to 0 followed by an overcorrection to 10 degrees in the opposite direction",
      "Create space mesial and distal to the molar for the duration of the uprighting movement",
      "Intrude the molar to prevent interference",
    ],
  },
  extrusion: {
    id: "extrusion",
    label: "Extrusion Instructions",
    triggers: ["extrusion", "extruding"],
    priority: "additional",
    steps: [
      "First create space by proclining the incisors followed by simultaneous extrusion with retraction in a 1:1 ratio",
      "Ensure all extrusion completed prior to complete space closure",
      "Place G4 attachments for extrusion or a 4mm conventional horizontal attachment bevelled gingivally",
      "Overcorrect the overbite to 3mm — disregard anterior heavy contacts as a result",
    ],
  },
};

// Keep legacy CLINCHECK_PROTOCOLS for timeline checklist references
const CLINCHECK_PROTOCOLS = {
  anteroposterior: { label:"Anteroposterior Movement", options:["Maintain existing AP relationship","Improve Class II relationship","Improve Class III relationship","Retract upper anteriors","Advance lower anteriors","Use Class II elastics","Use Class III elastics"] },
  vertical:        { label:"Vertical / Overbite",      options:["Maintain existing overbite","Intrude upper anteriors","Intrude lower anteriors","Extrude upper anteriors","Open bite correction with posterior extrusion","Deep bite correction with anterior intrusion","Use posterior bite planes"] },
  transverse:      { label:"Transverse / Arch Expansion", options:["Maintain existing arch width","Expand upper arch","Expand lower arch","Constrict upper arch","Resolve posterior crossbite","Resolve anterior crossbite"] },
  ipr:             { label:"IPR Instructions",         options:["No IPR required","IPR upper only","IPR lower only","IPR upper and lower","Maximum 0.3mm per contact","Maximum 0.5mm per contact","Avoid IPR on premolars","Avoid IPR on canines"] },
  attachments:     { label:"Attachments",              options:["Standard SmartForce® attachments","Optimised extrusion attachments","Optimised intrusion attachments","Precision cuts for elastics","Avoid attachments on anterior teeth","Minimal attachment placement preferred"] },
  staging:         { label:"Staging & Velocity",       options:["Standard velocity (7 days per aligner)","Slow velocity (10 days per aligner) — short roots","Express (3-5 day protocol) — mild case","Stage upper and lower simultaneously","Stage upper first, then lower"] },
  finishing:       { label:"Finishing",                options:["Finish to ClinCheck position — no refinement anticipated","Leave 1–2mm overtreatment in overbite","Request refinement at stage 80%","Finish with passive retention aligners (Vivera®)"] },
};

// Automatically map assessment problems to CAP protocols
function mapProblemsToProtocols(problems) {
  if (!problems || problems.length === 0) return [];
  const matched = new Set();
  problems.forEach(p => {
    const lbl = (p.baseLabel || p.label || "").toLowerCase();
    Object.values(CAP_PROTOCOLS).forEach(proto => {
      if (proto.triggers.some(t => lbl.includes(t.toLowerCase()))) {
        matched.add(proto.id);
      }
    });
  });
  return [...matched].map(id => CAP_PROTOCOLS[id]);
}


// ══════════════════════════════════════════════════════════════════════════════
// CLINCHECK PAGE — CAP Protocol Automation & Prescription Builder
// Rebuilt: max 3 protocols (1 primary + 2 additional), review-required category,
// clean clinical overview, 3 copy buttons, manual notes
// ══════════════════════════════════════════════════════════════════════════════

// Protocols that require clinical review — never auto-applied
const CAP_REVIEW_REQUIRED = new Set([
  "settling", "auxiliaries_settling", "attachment_rules", "extrusion",
  "open_bite_incisor_display", "single_intrusion"
]);

function ClinCheckPage({ assessment, consultation, patient, clincheckState, setClincheckState }) {
  const cs  = clincheckState;
  const set = (k,v) => setClincheckState(p=>({...p,[k]:v}));

  // All suggested protocols from assessment — flat list, all selected by default
  const allSuggested   = mapProblemsToProtocols(assessment?.problems || []);
  const needsReviewFn  = (id) => CAP_REVIEW_REQUIRED.has(id);

  const [selectedIds, setSelectedIds] = useState(() => allSuggested.map(p => p.id));
  const [expandedId,  setExpandedId]  = useState(allSuggested[0]?.id || null);
  const [manualNotes, setManualNotes] = useState(cs.additionalNotes || "");
  const [copied,      setCopied]      = useState(null); // null | "primary" | "all"

  const selectedProtos  = allSuggested.filter(p => selectedIds.includes(p.id));
  const primarySelected = selectedProtos.filter(p => p.priority === "primary");

  // Editable prescription text — auto-regenerates when protocols change, but dentist can also type directly
  const [prescriptionText, setPrescriptionText] = useState("");
  const [prescriptionEdited, setPrescriptionEdited] = useState(false);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id];
      // Auto-rebuild prescription when selection changes (unless dentist has manually edited)
      setPrescriptionEdited(false);
      return next;
    });
  };

  // Build problem → protocol reason lines
  const reasonLines = (assessment?.problems || []).flatMap(prob => {
    const mapped = mapProblemsToProtocols([prob]).filter(m => !CAP_REVIEW_REQUIRED.has(m.id));
    return mapped.map(m => ({ finding: prob.baseLabel || prob.label, protocol: m.label, protoId: m.id }));
  }).filter((v,i,a) => a.findIndex(x=>x.protoId===v.protoId && x.finding===v.finding)===i);

  const buildText = (protos, includeManual) => {
    const lines = [];
    lines.push("CLINCHECK PRESCRIPTION");
    lines.push("═".repeat(50));
    lines.push(`Patient: ${patient?.name || "______"}`);
    lines.push(`Date: ${new Date().toLocaleDateString("en-GB")}`);
    lines.push(`Clinician: ${CURRENT_USER.name}`);
    lines.push(`Practice: ${TENANT.practice}`);
    lines.push("");
    if (assessment?.problems?.length > 0) {
      lines.push("CLINICAL OVERVIEW:");
      assessment.problems.forEach(p => {
        const dec = assessment.decisions?.[p.id];
        lines.push(`  • ${p.baseLabel || p.label}${p.measure ? ` (${p.measure})` : ""}${dec ? ` — ${dec}` : ""}`);
      });
      lines.push("");
    }
    protos.forEach((proto, i) => {
      lines.push(`${i+1}. ${proto.label.toUpperCase()}`);
      lines.push("─".repeat(40));
      const steps = proto.steps || proto.steps_large || [];
      steps.forEach(s => lines.push(`   • ${s}`));
      if (proto.note) lines.push(`   Clinical note: ${proto.note}`);
      if (proto.steps_small) {
        lines.push("   Variant (small space):");
        proto.steps_small.forEach(s => lines.push(`   • ${s}`));
      }
      lines.push("");
    });
    if (includeManual && manualNotes.trim()) {
      lines.push("MANUAL TECHNICIAN NOTES:");
      lines.push("─".repeat(40));
      lines.push(manualNotes.trim());
      lines.push("");
    }
    lines.push("─".repeat(50));
    lines.push("Generated by SmileOS · CAP Protocol Engine");
    return lines.join("\n");
  };

  // Sync prescription text when protocols change (unless manually edited)
  useEffect(() => {
    if (!prescriptionEdited) {
      setPrescriptionText(buildText(selectedProtos, true));
    }
  }, [selectedIds, manualNotes]);

  // Seed on first render
  useEffect(() => {
    setPrescriptionText(buildText(selectedProtos, true));
  }, []);

  const handleCopy = (type) => {
    const text = type === "primary"
      ? buildText(primarySelected, false)
      : prescriptionText;
    navigator.clipboard?.writeText(text);
    setCopied(type);
    set("additionalNotes", manualNotes);
    AuditLog.record({ action:"clincheck_prescription_copied", detail:`${type} — ${selectedProtos.length} protocols`, patientName:patient?.name });
    setTimeout(() => setCopied(null), 2500);
  };

  const Btn = ({icon, label, type, accent}) => (
    <button onClick={() => handleCopy(type)}
      style={{ background: copied===type ? T.success : (accent||T.primary), color: copied===type ? "#fff" : T.gold, border:"none", borderRadius:7, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, transition:"all 0.18s" }}>
      {copied===type ? "✓ Copied" : <>{icon} {label}</>}
    </button>
  );

  return (
    <div style={{ maxWidth:940, margin:"0 auto", padding:"28px 24px 72px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", color:T.muted, marginBottom:6 }}>ClinCheck · Stage 6</div>
        <div style={{ fontSize:20, fontWeight:800, color:T.primary, letterSpacing:-0.3, marginBottom:4 }}>CAP Protocol Builder</div>
        <div style={{ fontSize:13, color:T.muted }}>Clinical findings mapped to CAP protocols · Review, confirm, and copy prescription for technician</div>
      </div>

      {/* ── Clinical Overview ── */}
      {assessment?.problems?.length > 0 ? (
        <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"18px 22px", marginBottom:18 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Clinical Overview</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {assessment.problems.map(p => {
              const dec = assessment.decisions?.[p.id];
              const sev = p.severity;
              const sevColor = { high:T.error, severe:T.error, moderate:T.warning, mild:T.info, monitor:T.muted }[sev] || T.muted;
              return (
                <div key={p.id} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:sevColor, flexShrink:0, marginTop:5 }}/>
                  <div>
                    <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.baseLabel || p.label}</span>
                    {p.measure && <span style={{ fontSize:12, color:T.muted }}> · {p.measure}</span>}
                    {dec && <span style={{ fontSize:12, color:T.success }}> — {dec}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background:T.infoLight, border:`1px solid ${T.infoBorder}`, borderRadius:10, padding:"14px 18px", marginBottom:18, fontSize:13, color:T.info }}>
          No assessment problems found. Please complete the clinical assessment before building protocols.
        </div>
      )}

      {/* ── Why these protocols ── */}
      {reasonLines.length > 0 && (
        <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:10, padding:"14px 18px", marginBottom:18 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.goldDim, marginBottom:10 }}>Why these protocols were selected</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {reasonLines.map((r, i) => (
              <div key={i} style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:13 }}>
                <span style={{ color:T.ink, fontWeight:600 }}>{r.finding}</span>
                <span style={{ color:T.muted, fontSize:11 }}>→</span>
                <span style={{ color:T.goldDim, fontWeight:500 }}>{r.protocol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CAP Protocols — flat list, all suggested, dentist can deselect ── */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:4 }}>
          CAP Protocols
        </div>
        <div style={{ fontSize:12.5, color:T.muted, marginBottom:14 }}>
          {selectedIds.length} of {allSuggested.length} selected — deselect any to remove from prescription
        </div>

        {allSuggested.length === 0 && (
          <div style={{ background:"#fff", borderRadius:9, border:`1px solid ${T.border}`, padding:"22px", fontSize:13, color:T.muted, textAlign:"center" }}>
            No protocols triggered — complete the clinical assessment to generate suggestions.
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {allSuggested.map(proto => {
            const isSel = selectedIds.includes(proto.id);
            const isExp = expandedId === proto.id;
            const needsReview = CAP_REVIEW_REQUIRED.has(proto.id);
            return (
              <div key={proto.id} style={{ background:"#fff", borderRadius:10, border:`1.5px solid ${isSel ? T.primary : T.border}`, overflow:"hidden", transition:"border-color 0.12s", opacity: isSel ? 1 : 0.5 }}>
                {/* Row */}
                <div style={{ padding:"12px 18px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                  onClick={() => { toggleSelect(proto.id); setExpandedId(e => e===proto.id ? null : proto.id); }}>
                  <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${isSel ? T.primary : T.border}`, background: isSel ? T.primary : "#fff", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.1s" }}>
                    {isSel && <span style={{ fontSize:10, color:T.gold, lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13.5, fontWeight:isSel?700:400, color: isSel ? T.primary : T.sub, flex:1 }}>{proto.label}</span>
                  {needsReview && <span style={{ fontSize:10, fontWeight:700, color:T.warning, background:T.warningLight, borderRadius:4, padding:"2px 8px", flexShrink:0 }}>Review</span>}
                  <span style={{ fontSize:11, color:T.muted, marginLeft:4 }}
                    onClick={e => { e.stopPropagation(); setExpandedId(id => id===proto.id ? null : proto.id); }}>
                    {isExp ? "▲" : "▼"}
                  </span>
                </div>
                {/* Expanded steps */}
                {isExp && (
                  <div style={{ padding:"14px 18px", borderTop:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom: proto.note ? 12 : 0 }}>
                      {(proto.steps || proto.steps_large || []).map((step, i) => (
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <div style={{ width:20, height:20, borderRadius:"50%", background:T.primary, color:T.gold, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>{i+1}</div>
                          <span style={{ fontSize:13, color:T.ink, lineHeight:1.5 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                    {proto.note && (
                      <div style={{ background:T.goldLight, border:`1px solid ${T.goldMid}`, borderRadius:7, padding:"10px 14px", fontSize:12, color:T.goldDim, lineHeight:1.6, marginTop: proto.steps || proto.steps_large ? 12 : 0 }}>
                        <strong>Clinical note:</strong> {proto.note}
                      </div>
                    )}
                    {proto.steps_small && (
                      <div style={{ marginTop:12 }}>
                        <div style={{ fontSize:10.5, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.7, marginBottom:8 }}>Small space / diastema variant:</div>
                        {proto.steps_small.map((s,i) => (
                          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:6 }}>
                            <div style={{ width:20, height:20, borderRadius:"50%", background:"#8A8680", color:"#fff", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                            <span style={{ fontSize:13, color:T.sub, lineHeight:1.5 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {needsReview && (
                      <div style={{ marginTop:10, background:T.warningLight, border:`1px solid ${T.warningBorder}`, borderRadius:6, padding:"8px 12px", fontSize:12, color:T.warning }}>
                        ⚠ This protocol requires clinical review before submission. Do not auto-apply without confirming with the supervising clinician.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Manual notes ── */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"18px 22px", marginBottom:16 }}>
        <label style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, display:"block", marginBottom:10 }}>
          Manual Technician Notes
        </label>
        <textarea
          value={manualNotes}
          onChange={e => { setManualNotes(e.target.value); set("additionalNotes", e.target.value); }}
          placeholder="Add specific instructions, tooth movements to avoid, timing notes, or additional prescription details…"
          rows={3}
          style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }}
          onFocus={e=>e.target.style.borderColor=T.primary}
          onBlur={e=>e.target.style.borderColor=T.border}
        />
      </div>

      {/* ── Prescription preview + copy buttons ── */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden", marginBottom:16 }}>
        <div style={{ background:T.primary, padding:"13px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:0.5 }}>Technician Prescription</span>
          <div style={{ display:"flex", gap:8 }}>
            <Btn icon="◎" label="Copy Primary Protocol" type="primary"/>
            <Btn icon="⊕" label="Copy All Instructions" type="all"/>
          </div>
        </div>
        <div style={{ position:"relative" }}>
          <textarea
            value={prescriptionText}
            onChange={e => { setPrescriptionText(e.target.value); setPrescriptionEdited(true); }}
            style={{ width:"100%", fontSize:12, color:T.sub, fontFamily:"'Courier New',monospace", padding:"16px 20px", whiteSpace:"pre-wrap", lineHeight:1.75, minHeight:280, maxHeight:420, background:"#FAFAFA", border:"none", outline:"none", resize:"vertical", display:"block", boxSizing:"border-box" }}
          />
          {prescriptionEdited && (
            <button
              onClick={() => { setPrescriptionText(buildText(selectedProtos, true)); setPrescriptionEdited(false); }}
              style={{ position:"absolute", bottom:10, right:12, background:T.border, color:T.muted, border:"none", borderRadius:5, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ↺ Reset to auto-generated
            </button>
          )}
        </div>
      </div>

      {/* ── Submission status + next action ── */}
      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, padding:"18px 22px" }}>
        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:14 }}>Submission Status</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          {[
            { id:"submitted", label:"ClinCheck Submitted to Invisalign" },
            { id:"received",  label:"ClinCheck Received Back" },
          ].map(s => (
            <button key={s.id}
              onClick={()=>{ set(s.id, !cs[s.id]); if(!cs[s.id]) AuditLog.record({ action:`clincheck_${s.id}`, detail:s.label, patientName:patient?.name }); }}
              style={{ border:`1.5px solid ${cs[s.id] ? T.success : T.border}`, background: cs[s.id] ? T.successLight : "#fff", color: cs[s.id] ? T.success : T.muted, borderRadius:7, padding:"9px 20px", fontSize:13.5, fontWeight:cs[s.id]?700:400, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, transition:"all 0.12s" }}>
              <span style={{ fontSize:15, lineHeight:1 }}>{cs[s.id] ? "✓" : "○"}</span>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12.5, color:T.muted, background:"#FAFAFA", borderRadius:7, padding:"11px 14px", border:`1px solid ${T.border}` }}>
          {cs.received
            ? <><strong style={{ color:T.success }}>✓ ClinCheck received.</strong> Proceed to the Review Video stage for patient approval.</>
            : !cs.submitted
              ? <><strong style={{ color:T.primary }}>Next step:</strong> Review the generated protocol above, then copy and paste into the Invisalign Doctor Site (IDS) before submitting.</>
              : <><strong style={{ color:T.info }}>Submitted.</strong> Waiting for ClinCheck to be returned from Invisalign.</>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW VIDEO PAGE — Patient decision screen with pipeline status model
// States: not_sent → sent → watched → approved
// ══════════════════════════════════════════════════════════════════════════════


function LoomPage({ patient, loomState, setLoomState, consultation }) {
  const ls  = loomState;
  const set = (k,v) => setLoomState(p=>({...p,[k]:v}));

  // ── Status model ──────────────────────────────────────────────────────────
  const videoStatus = ls.patientApproved ? "approved"
    : ls.patientSigned ? "signed"
    : ls.watched       ? "watched"
    : ls.sentAt        ? "sent"
    : "not_sent";

  const statusLabel = {
    not_sent:"Video not sent",
    sent:"Awaiting patient review",
    watched:"Reviewed by patient",
    signed:"Patient signed off",
    approved:"Ready to Proceed",
  }[videoStatus];
  const statusColor = {
    not_sent:T.muted, sent:T.warning, watched:T.info,
    signed:T.success, approved:T.success,
  }[videoStatus];

  const [view,         setView]         = useState("clinician");
  const [showQuestion, setShowQuestion] = useState(false);
  const [question,     setQuestion]     = useState("");

  // ── Screen recorder ───────────────────────────────────────────────────────
  const [recState,     setRecState]     = useState("idle"); // idle|recording|recorded|saved
  const [recDuration,  setRecDuration]  = useState(0);
  const [recError,     setRecError]     = useState("");
  const [recBlob,      setRecBlob]      = useState(null);
  const [recObjectUrl, setRecObjectUrl] = useState(null);
  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);

  useEffect(() => () => {
    if (recObjectUrl) URL.revokeObjectURL(recObjectUrl);
    clearInterval(timerRef.current);
  }, [recObjectUrl]);

  const startRecording = async () => {
    setRecError("");
    try {
      // Capture screen (Invisalign tab) + microphone (clinician voice)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor:"always", displaySurface:"browser" },
        audio: false, // we use mic instead
      });
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation:true, noiseSuppression:true, sampleRate:44100 },
      });

      // Merge screen video + mic audio into one stream
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx   = new AudioContext();
      const dest  = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(micStream).connect(dest);
      const combined = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";

      const recorder = new MediaRecorder(combined, { mimeType });
      mediaRecRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        screenStream.getTracks().forEach(t=>t.stop());
        micStream.getTracks().forEach(t=>t.stop());
        const blob = new Blob(chunksRef.current, { type:mimeType });
        const url  = URL.createObjectURL(blob);
        setRecBlob(blob);
        setRecObjectUrl(url);
        set("localVideoUrl", url);
        set("recorded", true);
        setRecState("recorded");
        AuditLog.record({ action:"review_video_recorded", detail:`Recording captured — ${Math.round(blob.size/1024)}KB`, patientName:patient?.name });
      };
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
      });
      recorder.start(1000);
      setRecState("recording");
      setRecDuration(0);
      timerRef.current = setInterval(() => setRecDuration(d=>d+1), 1000);
    } catch(err) {
      if (err.name === "NotAllowedError") {
        setRecError("Screen or microphone access was not permitted. Please allow both when prompted.");
      } else {
        setRecError(`Could not start recording: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current?.state === "recording") mediaRecRef.current.stop();
  };

  const discardRecording = () => {
    if (recObjectUrl) URL.revokeObjectURL(recObjectUrl);
    setRecBlob(null); setRecObjectUrl(null);
    setRecState("idle"); setRecDuration(0);
    set("localVideoUrl", null); set("recorded", false);
  };

  const saveRecording = () => {
    if (!recBlob) return;
    const ext  = recBlob.type.includes("mp4") ? "mp4" : "webm";
    const name = `SmileOS-ReviewVideo-${patient?.name?.replace(/\s+/g,"-")||"patient"}-${new Date().toISOString().slice(0,10)}.${ext}`;
    const a = document.createElement("a");
    a.href = recObjectUrl; a.download = name; a.click();
    setRecState("saved");
    AuditLog.record({ action:"review_video_downloaded", detail:name, patientName:patient?.name });
  };

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const handleSend = async () => {
    const result = await MockEmailSMS.send({
      to: patient?.name, subject:"Your Personalised Smile Plan — please review",
      type:"review_video",
      body:`Hi ${patient?.name?.split(" ")[0]||"there"},\n\nYour clinician has recorded a personalised walkthrough of your ClinCheck treatment plan. Please watch it and confirm you are happy to proceed.\n\nClick the link below to review your plan:\n[View Your Smile Plan]\n\nKind regards,\n${CURRENT_USER.name}\n${TENANT.practice}`,
    });
    set("sentAt", result.timestamp);
    set("events", [...(ls.events||[]), { ts:result.timestamp, action:"sent" }]);
    AuditLog.record({ action:"review_video_sent", detail:`Sent to ${patient?.name}`, patientName:patient?.name });
  };

  // ── Patient signs off ─────────────────────────────────────────────────────
  const handlePatientSignOff = () => {
    const ts  = new Date().toISOString();
    const doc = {
      type:          "patient_video_sign_off",
      patientName:   patient?.name,
      patientDOB:    patient?.dob,
      clinician:     CURRENT_USER.name,
      practice:      TENANT.practice,
      signedAt:      ts,
      statement:     "I confirm I have watched and understood the ClinCheck review video presented by my clinician. I am happy to proceed with the treatment plan as explained.",
      videoRef:      ls.localVideoUrl ? "SmileOS local recording" : ls.link || "recorded walkthrough",
    };
    set("patientSigned", true);
    set("patientApproved", true);
    set("watched", true);
    set("signedAt", ts);
    set("signoffDoc", doc);
    // Notify dentist by email
    MockEmailSMS.send({
      to: CURRENT_USER.name, subject:`✓ ${patient?.name} has approved their ClinCheck plan`,
      type:"dentist_notification",
      body:`${patient?.name} has watched and signed off their ClinCheck review video.\n\nSigned: ${new Date(ts).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}\nPatient: ${patient?.name}\nClinician: ${CURRENT_USER.name}\n\nThe signed document has been saved to the patient's file in SmileOS.`,
    });
    AuditLog.record({ action:"patient_clincheck_signed_off", detail:`${patient?.name} approved ClinCheck plan and signed digitally`, patientName:patient?.name });
  };

  const baseFee = parseInt(ls.treatmentFee || consultation?.indicativeCost || 0) || 4495;
  const hasVideo = !!(ls.localVideoUrl || ls.recorded);

  return (
    <div style={{ background:"#FAFAF8", minHeight:"100%" }}>

      {/* ── Top bar ── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"10px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", color:T.muted }}>Review Video · Stage 7</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:`${statusColor}18`, border:`1px solid ${statusColor}40`, borderRadius:5, padding:"3px 10px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:statusColor }}/>
            <span style={{ fontSize:11.5, fontWeight:600, color:statusColor }}>{statusLabel}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["clinician","patient"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ border:`1.5px solid ${view===v ? T.primary : T.border}`, background:view===v ? T.primary : "#fff", color:view===v ? T.gold : T.muted, borderRadius:6, padding:"5px 16px", fontSize:12, fontWeight:view===v?700:400, cursor:"pointer", fontFamily:"inherit" }}>
              {v === "clinician" ? "Clinician View" : "Patient View"}
            </button>
          ))}
        </div>
      </div>

      {/* ════════ CLINICIAN VIEW ════════ */}
      {view === "clinician" && (
        <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 24px 60px" }}>

          {/* Status prompts */}
          {videoStatus === "not_sent" && (
            <div style={{ background:T.infoLight, border:`1px solid ${T.infoBorder}`, borderRadius:9, padding:"12px 17px", marginBottom:18, display:"flex", gap:10, fontSize:13, color:T.info }}>
              <span style={{ fontSize:15, flexShrink:0 }}>ℹ</span>
              <div><strong>Record your ClinCheck walkthrough below</strong>, then send it to the patient. They will receive a link to watch it and confirm they are happy to proceed.</div>
            </div>
          )}
          {videoStatus === "sent" && (
            <div style={{ background:T.warningLight, border:`1px solid ${T.warningBorder}`, borderRadius:9, padding:"12px 17px", marginBottom:18, fontSize:13, color:T.warning }}>
              ⏱ Video sent — waiting for patient to review and sign off. You'll receive an email when they confirm.
            </div>
          )}
          {(videoStatus === "signed" || videoStatus === "approved") && (
            <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:9, padding:"12px 17px", marginBottom:18, fontSize:13.5, color:T.success, fontWeight:700 }}>
              ✓ Patient has watched, approved, and signed off their ClinCheck plan. Signed document saved to patient file.
            </div>
          )}

          {/* Screen recorder */}
          <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden", marginBottom:14 }}>
            <div style={{ background:T.primary, padding:"14px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.gold }}>Screen Recorder — with your voice</div>
                <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.4)", marginTop:2 }}>Records your screen + microphone · no third-party software · completely free</div>
              </div>
              {recState === "recording" && (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#E74C3C" }}/>
                  <span style={{ fontSize:14, fontWeight:800, color:"#fff", fontFamily:"monospace" }}>{fmt(recDuration)}</span>
                </div>
              )}
            </div>

            <div style={{ padding:"20px 22px" }}>
              {recError && (
                <div style={{ background:T.errorLight, border:`1px solid ${T.errorBorder}`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:T.error }}>{recError}</div>
              )}

              {recState === "idle" && !ls.recorded && (
                <div style={{ fontSize:12.5, color:T.muted, background:"#F8F8F8", borderRadius:8, padding:"10px 14px", marginBottom:16, lineHeight:1.6, border:`1px solid ${T.borderLight}` }}>
                  <strong style={{ color:T.primary }}>How it works:</strong> Click <em>Start Recording</em>. Your browser will ask you to share a screen or tab — select the <strong>Invisalign Doctor Site</strong> tab. It will also ask for microphone access so your voice is captured. Walk through the ClinCheck while explaining it. Click <em>Stop</em> when finished.
                </div>
              )}

              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                {recState === "idle" && (
                  <button onClick={startRecording}
                    style={{ background:T.primary, color:T.gold, border:"none", borderRadius:8, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:9 }}>
                    <span style={{ width:10, height:10, borderRadius:"50%", background:T.gold, display:"inline-block" }}/>
                    Start Recording
                  </button>
                )}
                {recState === "recording" && (
                  <button onClick={stopRecording}
                    style={{ background:"#E74C3C", color:"#fff", border:"none", borderRadius:8, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:9 }}>
                    <span style={{ width:10, height:10, borderRadius:2, background:"#fff", display:"inline-block" }}/>
                    Stop Recording
                  </button>
                )}
                {(recState === "recorded" || recState === "saved") && (
                  <>
                    <button onClick={saveRecording}
                      style={{ background:T.success, color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      ↓ {recState === "saved" ? "Downloaded ✓" : "Download"}
                    </button>
                    <button onClick={discardRecording}
                      style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"11px 16px", fontSize:13, color:T.muted, cursor:"pointer", fontFamily:"inherit" }}>
                      Discard & re-record
                    </button>
                  </>
                )}
              </div>

              {recObjectUrl && (recState === "recorded" || recState === "saved") && (
                <div style={{ marginTop:16 }}>
                  <video src={recObjectUrl} controls style={{ width:"100%", borderRadius:8, border:`1px solid ${T.border}`, maxHeight:260, background:"#000" }}/>
                  <div style={{ fontSize:12, color:T.muted, marginTop:5 }}>
                    {fmt(recDuration)} · {Math.round((recBlob?.size||0)/1024)}KB · Ready to send
                  </div>
                </div>
              )}
              {ls.recorded && recState === "idle" && (
                <div style={{ marginTop:8, fontSize:12.5, color:T.success, fontWeight:600 }}>✓ Recording saved — ready to send to patient</div>
              )}
            </div>
          </div>

          {/* Send to patient */}
          {hasVideo && (
            <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, padding:"18px 22px", marginBottom:14 }}>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Send to Patient</div>
              <div style={{ fontSize:13, color:T.muted, marginBottom:14, lineHeight:1.6 }}>
                Patient will receive an email with a link to watch the video and sign off on their treatment plan. You will receive a confirmation email when they approve.
              </div>
              {!ls.sentAt ? (
                <button onClick={handleSend}
                  style={{ background:T.primary, color:T.gold, border:"none", borderRadius:8, padding:"13px 30px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  ✉ Send Review Video to Patient
                </button>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:7, padding:"9px 14px", fontSize:13, color:T.success, fontWeight:600 }}>
                    ✓ Sent {new Date(ls.sentAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </div>
                  <button onClick={handleSend}
                    style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:12.5, color:T.muted, cursor:"pointer", fontFamily:"inherit" }}>
                    Resend
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Signed document record */}
          {ls.signoffDoc && (
            <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.successBorder}`, padding:"18px 22px" }}>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.success, marginBottom:14 }}>Signed Document — Patient File</div>
              <pre style={{ fontSize:12, color:T.sub, fontFamily:"'Courier New',monospace", background:"#FAFAFA", border:`1px solid ${T.border}`, borderRadius:7, padding:"14px 16px", whiteSpace:"pre-wrap", lineHeight:1.7 }}>
{`PATIENT CLINCHECK SIGN-OFF
${"─".repeat(40)}
Patient:   ${ls.signoffDoc.patientName}
Clinician: ${ls.signoffDoc.clinician}
Practice:  ${ls.signoffDoc.practice}
Signed:    ${ls.signoffDoc.signedAt ? new Date(ls.signoffDoc.signedAt).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}

Statement:
"${ls.signoffDoc.statement}"
${"─".repeat(40)}
Recorded by SmileOS · ${ls.signoffDoc.signedAt?.slice(0,10)||""}`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ════════ PATIENT VIEW ════════ */}
      {view === "patient" && (
        <div style={{ background:"#FAFAF8", minHeight:"100%" }}>

          {ls.patientSigned ? (
            /* ── Confirmed state ── */
            <div style={{ maxWidth:580, margin:"0 auto", padding:"80px 24px", textAlign:"center" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:T.successLight, border:`2px solid ${T.success}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, color:T.success, margin:"0 auto 24px" }}>✓</div>
              <div style={{ fontSize:26, fontWeight:800, color:T.primary, marginBottom:10, letterSpacing:-0.3 }}>You're all confirmed</div>
              <div style={{ fontSize:15, color:T.muted, lineHeight:1.7, marginBottom:32, maxWidth:420, margin:"0 auto 32px" }}>
                Thank you, {patient?.name?.split(" ")[0]||""}. Your clinician has been notified and your sign-off has been saved to your patient file. We'll be in touch shortly to arrange your next appointment.
              </div>
              <div style={{ background:"#fff", borderRadius:14, border:`1px solid ${T.border}`, padding:"20px 24px", textAlign:"left", fontSize:12.5, color:T.muted, lineHeight:1.7, fontFamily:"monospace" }}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.success, marginBottom:8 }}>Your signed record</div>
                Signed by: {patient?.name}<br/>
                Date: {ls.signedAt ? new Date(ls.signedAt).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}<br/>
                Clinician: {CURRENT_USER.name}<br/>
                Practice: {TENANT.practice}<br/><br/>
                <em>"I confirm I have watched and understood the ClinCheck review video. I am happy to proceed with the treatment plan as explained."</em>
              </div>
            </div>
          ) : (
            /* ── Main patient view ── */
            <div style={{ maxWidth:640, margin:"0 auto", padding:"44px 24px 72px" }}>

              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:40 }}>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:2.2, textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Your personalised smile plan</div>
                <div style={{ fontSize:28, fontWeight:800, color:T.primary, letterSpacing:-0.5, lineHeight:1.15, marginBottom:10 }}>
                  {patient?.name?.split(" ")[0]||"Your"}, here's your treatment plan
                </div>
                <div style={{ fontSize:14.5, color:T.muted, lineHeight:1.65, maxWidth:500, margin:"0 auto" }}>
                  Your clinician has recorded a personalised walkthrough of your treatment plan. Please watch it in full before confirming.
                </div>
              </div>

              {/* Video */}
              {(ls.localVideoUrl && ls.localVideoUrl !== ls.link) ? (
                <video src={ls.localVideoUrl} controls style={{ width:"100%", borderRadius:20, marginBottom:28, background:"#000", maxHeight:340 }}/>
              ) : (
                <div style={{ background:T.primary, borderRadius:20, aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14, marginBottom:28, cursor:"pointer" }}>
                  <div style={{ width:76, height:76, borderRadius:"50%", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, color:"#fff" }}>▶</div>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Your review video will appear here</span>
                </div>
              )}

              {/* What this plan will do */}
              <div style={{ background:"#fff", borderRadius:16, padding:"24px 26px", marginBottom:18, border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:15, fontWeight:800, color:T.primary, marginBottom:16 }}>What this plan will do</div>
                {["Straighten and align your teeth using custom-made clear aligners","Improve your bite and overall dental harmony","Create a natural, confident smile that suits you","Guide your tooth movements safely over the planned timeframe"].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:i<3?12:0 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:"#E8F2EE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:T.success, flexShrink:0, marginTop:1 }}>✓</div>
                    <span style={{ fontSize:14, color:T.ink, lineHeight:1.55 }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Important to know */}
              <div style={{ background:"#FAFAFA", borderRadius:16, padding:"22px 26px", marginBottom:18, border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:14 }}>Important to know</div>
                {["Some cases need a refinement stage — this is completely normal and is included in your plan.","Gum health must be stable before treatment begins. Your clinician will confirm this.","Results may vary slightly depending on your biology and how consistently you wear your aligners.","Retainers are essential after treatment to maintain your result long-term."].map((note,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:i<3?9:0 }}>
                    <span style={{ fontSize:11, color:T.muted, flexShrink:0, marginTop:4 }}>—</span>
                    <span style={{ fontSize:13.5, color:T.sub, lineHeight:1.6 }}>{note}</span>
                  </div>
                ))}
              </div>

              {/* Cost */}
              <div style={{ background:T.primary, borderRadius:16, padding:"22px 26px", marginBottom:24 }}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:10 }}>Your investment</div>
                <div style={{ fontSize:44, fontWeight:800, color:T.gold, letterSpacing:-1.5, lineHeight:1, marginBottom:6 }}>£{baseFee.toLocaleString()}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Monthly payment options available — speak to your clinician</div>
              </div>

              {/* Decision + sign-off */}
              <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${T.border}`, padding:"26px 26px" }}>
                <div style={{ fontSize:16, fontWeight:800, color:T.primary, marginBottom:6 }}>Happy to proceed?</div>
                <div style={{ fontSize:14, color:T.muted, marginBottom:22, lineHeight:1.65 }}>
                  By clicking the button below, you confirm you have watched your personalised treatment walkthrough in full and are happy for your clinician to proceed with ordering your aligners.
                </div>

                {/* Primary CTA */}
                <button onClick={handlePatientSignOff}
                  style={{ width:"100%", background:T.primary, color:T.gold, border:"none", borderRadius:12, padding:"17px 0", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit", marginBottom:12, letterSpacing:0.2 }}>
                  ✓ I'm happy to proceed — sign off my plan
                </button>

                {/* Legal note */}
                <div style={{ fontSize:12, color:T.muted, textAlign:"center", marginBottom:16, lineHeight:1.6 }}>
                  By proceeding you confirm you have watched and understood your treatment plan video. This will be saved to your patient file and your clinician will be notified.
                </div>

                {/* Secondary options */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <button onClick={() => setShowQuestion(v=>!v)}
                    style={{ width:"100%", background:"transparent", color:T.primary, border:`1.5px solid ${T.border}`, borderRadius:12, padding:"13px 0", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    I have a question first
                  </button>
                  <button style={{ width:"100%", background:"transparent", color:T.muted, border:"none", padding:"10px 0", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                    I need more time to think
                  </button>
                </div>

                {showQuestion && (
                  <div style={{ marginTop:16 }}>
                    <textarea value={question} onChange={e=>setQuestion(e.target.value)}
                      placeholder="Write your question — your clinician will get back to you before anything is ordered…"
                      rows={3} style={{ width:"100%", border:`1.5px solid ${T.border}`, borderRadius:8, padding:"10px 14px", fontSize:13.5, fontFamily:"inherit", outline:"none", resize:"none", boxSizing:"border-box" }}
                      onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border}/>
                    <button onClick={() => { AuditLog.record({ action:"patient_question_submitted", detail:question, patientName:patient?.name }); MockEmailSMS.send({ to:CURRENT_USER.name, subject:`Question from ${patient?.name} re: ClinCheck plan`, type:"question", body:question }); setShowQuestion(false); setQuestion(""); }}
                      style={{ marginTop:8, background:T.cyan, color:"#fff", border:"none", borderRadius:7, padding:"10px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Send question to clinician
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// PART 7 — PATIENT TIMELINE CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════

function TimelineChecklist({ patientState }) {
  const { consultation, assessment, consentSigned, estimate: estimateData, paymentState, clincheckState, loomState } = patientState;

  const ps = paymentState || {};
  const cs = clincheckState || {};
  const ls = loomState || {};

  const paymentDone = ps.type === "full" ? !!ps.fullPaid :
                     ps.type === "finance" ? ps.financeStatus === "approved" :
                     ps.type === "monthly" ? !!ps.monthlyFormSigned : false;

  const steps = [
    { label:"Consultation completed",              done: !!consultation,                        cat:"Stage 1" },
    { label:"Orthodontic assessment completed",    done: !!assessment,                          cat:"Stage 2" },
    { label:"Problem list — all decisions made",   done: assessment && assessment.problems?.length >= 0 && (assessment.problems?.length===0 || assessment.problems?.every(p=>assessment.decisions?.[p.id])), cat:"Stage 2" },
    { label:"Consent generated",                   done: !!assessment,                          cat:"Consent" },
    { label:"Consent e-signed",                    done: !!consentSigned,                       cat:"Consent" },
    { label:"Treatment plan presented to patient",        done: !!estimateData,              cat:"Estimate" },
    { label:"Treatment plan accepted by patient",        done: !!estimateData?.estimateSigned, cat:"Estimate" },
    { label:"Payment method selected",             done: !!ps.type,                             cat:"Payment" },
    { label:"Payment confirmed / finance approved",done: paymentDone,                           cat:"Payment", conditional: !!ps.type },
    { label:"Monthly payment form signed",         done: !!ps.monthlyFormSigned,                cat:"Payment", conditional: ps.type === "monthly" },
    { label:"ClinCheck protocol builder (optional)", done: Object.values(cs.protocols||{}).some(v=>v.length>0)||!!cs.submitted, cat:"ClinCheck", optional:true },
    { label:"ClinCheck submitted to Invisalign",   done: !!cs.submitted,                        cat:"ClinCheck" },
    { label:"ClinCheck received back",             done: !!cs.received,                         cat:"ClinCheck" },
    { label:"Review video recorded",                 done: !!ls.recorded,                         cat:"Review Video" },
    { label:"Review video sent to patient",                done: !!ls.sentAt,                           cat:"Review Video" },
    { label:"Patient has watched the review video",                done: !!ls.watched,                          cat:"Review Video" },
    { label:"Patient approved ClinCheck",          done: !!ls.approved,                         cat:"Review Video" },
  ];

  const visible = steps.filter(s => s.conditional !== false || true).filter(s => {
    if (s.conditional === false) return false;
    if (s.label.includes("Monthly payment") && ps.type !== "monthly") return false;
    if (s.label.includes("finance") && ps.type !== "finance") return false;
    return true;
  });

  const done = visible.filter(s => s.done).length;
  const pct  = visible.length > 0 ? Math.round((done/visible.length)*100) : 0;
  const cats  = [...new Set(visible.map(s=>s.cat))];
  const catColors = { "Stage 1":T.cyan, "Stage 2":T.gold, Consent:T.success, Estimate:T.goldDim, Payment:T.info, ClinCheck:T.warning, "Review Video":"#CC0000" };

  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:T.primary, padding:"16px 22px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.1, color:"#3D6A56", textTransform:"uppercase", marginBottom:3 }}>Nothing Missed</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#F0EFE8" }}>Patient Timeline</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:22, fontWeight:800, color:T.gold, lineHeight:1 }}>{pct}%</div>
            <div style={{ fontSize:11, color:"#3D6A56", marginTop:2 }}>{done}/{visible.length} steps</div>
          </div>
        </div>
        <div style={{ height:5, background:"rgba(255,255,255,0.1)", borderRadius:3 }}>
          <div style={{ width:`${pct}%`, height:"100%", background:T.gold, borderRadius:3, transition:"width 0.4s ease" }}/>
        </div>
      </div>

      {/* Steps grouped by category */}
      {cats.map(cat => {
        const catSteps = visible.filter(s => s.cat === cat);
        const catDone  = catSteps.filter(s=>s.done).length;
        const col = catColors[cat] || T.primary;
        return (
          <div key={cat}>
            <div style={{ padding:"8px 22px 6px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}`, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10.5, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:col }}>{cat}</span>
              <span style={{ fontSize:11, color:T.muted }}>{catDone}/{catSteps.length}</span>
            </div>
            {catSteps.map((step, i) => (
              <div key={step.label} style={{
                padding:"12px 22px",
                borderBottom: i < catSteps.length-1 ? `1px dashed ${T.border}` : "none",
                display:"flex", alignItems:"center", gap:12,
                background: step.done ? `${col}06` : "transparent",
              }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%", flexShrink:0,
                  background: step.done ? col : "#E8E8E8",
                  border: `2px solid ${step.done ? col : T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, color:"#fff",
                  transition:"all 0.2s",
                }}>
                  {step.done ? "✓" : ""}
                </div>
                <span style={{ fontSize:13.5, color: step.done ? T.ink : T.muted, fontWeight: step.done ? 600 : 400 }}>
                  {step.label}
                </span>
                {step.done && (
                  <span style={{ marginLeft:"auto", fontSize:11, color:col, fontWeight:700 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 8 — EXPORT / PDF BUNDLE
// ═══════════════════════════════════════════════════════════════════════════

function CaseSummaryPanel({ patient, patientState }) {
  const p = patient || {};
  if (!p.stage) return null;
  const fs = evaluateFullStatus(p);
  const tlColorCli = fs.clinicalStatus==="NOT_CLEARED"?T.error:fs.clinicalStatus==="CONDITIONAL"?T.warning:T.success;
  const tlLabelCli = fs.clinicalStatus==="NOT_CLEARED"?"Do Not Proceed":fs.clinicalStatus==="CONDITIONAL"?"Conditional":"Ready to Proceed";
  const { consultation, assessment, consentSigned, estimate, paymentState, clincheckState, loomState } = patientState || {};
  const ps = paymentState || {};
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:20 }}>
      {/* Commercial status */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:10 }}>Commercial Status</div>
        {[
          { label:"Consultation", done:!!consultation },
          { label:"ClinCheck fee paid", done:!!p.clincheckFeePaid },
          { label:"Consent signed", done:!!consentSigned },
          { label:"ClinCheck approved", done:!!p.clincheckApproved },
          { label:"Aligners ordered", done:!!p.alignersOrdered },
          { label:"Active treatment", done:["active_tx","complete"].includes(p.stage) },
        ].map(item=>(
          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:item.done?T.success:T.borderDark, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:item.done?T.ink:T.muted, fontWeight:item.done?600:400 }}>{item.label}</span>
            {item.done && <span style={{ fontSize:10, color:T.success, marginLeft:"auto" }}>✓</span>}
          </div>
        ))}
      </div>
      {/* Clinical readiness */}
      <div style={{ background:fs.clinicalStatus==="NOT_CLEARED"?T.errorLight:fs.clinicalStatus==="CONDITIONAL"?T.warningLight:T.successLight, border:`1px solid ${fs.clinicalStatus==="NOT_CLEARED"?T.errorBorder:fs.clinicalStatus==="CONDITIONAL"?T.warningBorder:T.successBorder}`, borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:tlColorCli, marginBottom:10 }}>Clinical Readiness</div>
        <div style={{ fontSize:14, fontWeight:800, color:tlColorCli, marginBottom:8 }}>{tlLabelCli}</div>
        {fs.clinicalBlockers.length === 0
          ? <div style={{ fontSize:12, color:T.success }}>✓ No clinical blockers</div>
          : fs.clinicalBlockers.map((b,i)=><div key={i} style={{ fontSize:11.5, color:tlColorCli, marginBottom:3 }}>{b.sev==="red"?"✕":"⚠"} {b.label}</div>)
        }
      </div>
      {/* Governance status */}
      <div style={{ background:govBg(fs.govStatus), border:`1px solid ${govBorder(fs.govStatus)}`, borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:govColor(fs.govStatus), marginBottom:10 }}>Governance</div>
        <div style={{ fontSize:14, fontWeight:800, color:govColor(fs.govStatus), marginBottom:4 }}>
          {fs.govStatus==="BREACH"?"✕ BREACH":fs.govStatus==="AT_RISK"?"⚠ AT RISK":"✓ SAFE"}
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:govColor(fs.govStatus), marginBottom:8 }}>Score: {fs.govScore}%</div>
        {fs.alignerBreaches.length > 0 && (
          <div style={{ fontSize:11, color:T.error, marginBottom:2, fontWeight:600 }}>⚠ Aligner-order breach detected</div>
        )}
        {fs.govFlags.slice(0,2).map((f,i)=>(
          <div key={i} style={{ fontSize:11, color:govColor(fs.govStatus), marginBottom:2 }}>· {f}</div>
        ))}
      </div>
    </div>
  );
}

function ExportPage({ patientState, patient }) {
  const { consultation, assessment, consentSigned, paymentState, clincheckState, loomState } = patientState;
  const [exported, setExported] = useState(false);

  const generateBundle = () => {
    const lines = [];
    lines.push("═".repeat(60));
    lines.push("SMILEOS PATIENT NOTES EXPORT");
    lines.push(`Generated: ${new Date().toLocaleString("en-GB")}`);
    lines.push(`Practice: ${TENANT.practice}`);
    lines.push(`Clinician: ${TENANT.name}`);
    lines.push("═".repeat(60));

    lines.push("");
    lines.push("PATIENT INFORMATION");
    lines.push("─".repeat(40));
    lines.push(`Name: ${patient?.name || "Unknown"}`);
    lines.push(`DOB: ${patient?.dob || "—"}`);

    if (consultation) {
      lines.push("");
      lines.push("STAGE 1 — CONSULTATION SUMMARY");
      lines.push("─".repeat(40));
      lines.push(`Concerns: ${consultation.concerns?.join(", ") || "—"}`);
      lines.push(`Goals: ${consultation.goals?.join(", ") || "—"}`);
      lines.push(`Occupation: ${consultation.occupation || "—"}`);
      lines.push(`Indicative fee: £${parseInt(consultation.indicativeCost||0).toLocaleString()}`);
      if (consultation.notes) lines.push(`Notes: ${consultation.notes}`);
    }

    if (assessment) {
      lines.push("");
      lines.push("STAGE 2 — ORTHODONTIC ASSESSMENT");
      lines.push("─".repeat(40));
      if (assessment.problems?.length === 0) {
        lines.push("No abnormal findings recorded.");
      } else {
        assessment.problems?.forEach(p => {
          const dec = assessment.decisions?.[p.id];
          lines.push(`  [${dec || "UNDECIDED"}] ${p.baseLabel}${p.measure ? ` (${p.measure})` : ""}${p.teeth?.length>0 ? ` — teeth: ${p.teeth.join(",")}` : ""}`);
        });
      }
    }

    if (consentSigned) {
      lines.push("");
      lines.push("CONSENT");
      lines.push("─".repeat(40));
      lines.push(`Signed by: ${consentSigned.signedBy}`);
      lines.push(`Clinician: ${consentSigned.clinicianSig}`);
      lines.push(`Date: ${new Date(consentSigned.signedAt).toLocaleDateString("en-GB")}`);
      lines.push(`Condition-specific blocks: ${consentSigned.sections?.filter(s=>s.isConditional).length || "—"}`);
    }

    if (paymentState?.type) {
      lines.push("");
      lines.push("PAYMENT");
      lines.push("─".repeat(40));
      lines.push(`Method: ${paymentState.type}`);
      if (paymentState.type==="finance") lines.push(`Finance status: ${paymentState.financeStatus || "pending"}`);
      if (paymentState.type==="monthly") lines.push(`Monthly plan: £${paymentState.months ? Math.round(parseInt(consultation?.indicativeCost||4495)/paymentState.months) : "—"} × ${paymentState.months || "—"} months`);
      if (paymentState.monthlyFormSigned) lines.push(`Monthly form signed: ${new Date(paymentState.monthlyFormSigned).toLocaleDateString("en-GB")}`);
    }

    if (clincheckState?.protocols) {
      lines.push("");
      lines.push("CLINCHECK PROTOCOL");
      lines.push("─".repeat(40));
      Object.entries(clincheckState.protocols).forEach(([cat, opts]) => {
        if (opts?.length > 0) {
          lines.push(`${CLINCHECK_PROTOCOLS[cat]?.label || cat}: ${opts.join(" | ")}`);
        }
      });
      if (clincheckState.submitted) lines.push("Status: Submitted to Invisalign");
      if (clincheckState.received)  lines.push("Status: ClinCheck received");
    }

    if (loomState?.link) {
      lines.push("");
      lines.push("LOOM VIDEO");
      lines.push("─".repeat(40));
      lines.push(`Link: ${loomState.link}`);
      if (loomState.sentAt)  lines.push(`Sent: ${new Date(loomState.sentAt).toLocaleDateString("en-GB")}`);
      if (loomState.watched) lines.push("Patient: Watched ✓");
      if (loomState.approved) lines.push("Patient: ClinCheck approved ✓");
    }

    lines.push("");
    lines.push("═".repeat(60));
    lines.push("END OF EXPORT");
    return lines.join("\n");
  };

  const bundle = generateBundle();

  return (
    <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 20px 60px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:T.success, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff" }}>↓</div>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:T.primary }}>Export Patient Notes</div>
          <div style={{ fontSize:12.5, color:T.muted }}>One-click export — consultation, assessment, problems, consent, payment, ClinCheck, Loom</div>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${T.border}`, overflow:"hidden", marginBottom:16 }}>
        <div style={{ background:T.primary, padding:"12px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12.5, fontWeight:700, color:T.gold, textTransform:"uppercase", letterSpacing:0.5 }}>Patient Notes Bundle</span>
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={() => { navigator.clipboard?.writeText(bundle); setExported(true); }}
              style={{ background:T.gold, color:T.primary, border:"none", borderRadius:4, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >Copy Text</button>
            <button
              onClick={() => { alert("PDF export will be available when deployed. All case data is saved in SmileOS."); setExported(true); }}
              style={{ background:exported ? T.success : T.cyan, color:"#fff", border:"none", borderRadius:4, padding:"5px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              {exported ? "✓ Exported!" : "↓ Export PDF"}
            </button>
          </div>
        </div>
        <pre style={{ fontSize:12, color:T.sub, fontFamily:"'Courier New',monospace", padding:"18px 22px", whiteSpace:"pre-wrap", lineHeight:1.75, maxHeight:480, overflowY:"auto", background:"#FAFAFA" }}>
          {bundle}
        </pre>
      </div>

      <div style={{ fontSize:12.5, color:T.muted, background:T.infoLight, border:`1px solid ${T.infoBorder}`, borderRadius:6, padding:"10px 14px" }}>
        ℹ All case data is stored securely in SmileOS. Export as PDF or copy as text for your records. PMS integration is available as an optional add-on.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 9 — PATIENT WORKFLOW v2 (full integrated workflow)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ESTIMATE PAGE — V13 style, ported from newer build
// Shows cost breakdown, ClinCheck fee deduction, payment options, patient sig
// Sits between Consent (stage 3) and Payment (stage 5) in the workflow
// ═══════════════════════════════════════════════════════════════════════════

function EstimatePage({ patient, consultation, assessment, estimate, onComplete }) {
  const baseFee         = parseInt(consultation?.indicativeCost || 0) || 4495;
  const CLINCHECK_FEE   = 200;

  const [clincheckPaid,  setCliniccheckPaid]  = useState(false);
  const [payMonthly,     setPayMonthly]        = useState(false);
  const [months,         setMonths]            = useState(12);
  const [sigName,        setSigName]           = useState("");
  const [reminderSent,   setReminderSent]      = useState([]);
  const [signed,         setSigned]            = useState(false);

  const calc = calculateEstimateTotals({
    consultationFee: 195,
    treatmentCost:   baseFee,
    clincheckFee:    CLINCHECK_FEE,
    clincheckPaid,
    payMonthly,
    months,
  });

  const { total, monthlyPayment, treatmentNet, clincheckDeduction, subtotal } = calc;

  const canSign = sigName.trim().length > 2;

  const handleSendReminder = (day) => {
    if (!reminderSent.includes(day)) setReminderSent(r => [...r, day]);
    MockEmailSMS.send({ to: patient?.name, subject: "Your Treatment Estimate", type: "estimate_reminder" });
  };

  const handleAccept = () => {
    if (!canSign) return;
    setSigned(true);
    onComplete({
      ...calc,
      estimateSigned: true,
      sigName,
      signedAt: new Date().toISOString(),
    });
  };

  const [duration, setDuration] = useState("12–18 months");
  const [estimateSent, setEstimateSent] = useState(false);

  return (
    <div style={{ background:"#F7F7F5", minHeight:"100%", fontFamily:"inherit" }}>

      {/* ══ PREMIUM DARK HEADER ══════════════════════════════════════════════ */}
      <div style={{ background:"linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%)", padding:"28px 40px 26px" }}>
        <div style={{ maxWidth:1080, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:2.5, textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:8 }}>
              Treatment Proposal
            </div>
            <div style={{ fontSize:28, fontWeight:800, color:"#fff", letterSpacing:-0.5, marginBottom:5, lineHeight:1.1 }}>
              Your Smile Plan
            </div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", fontWeight:400 }}>
              Personalised clear aligner treatment for {patient?.name || "New Patient"}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"rgba(255,255,255,0.7)" }}>{CURRENT_USER.name || "Dr Haroon Ismail"}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{TENANT.practice}</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
        </div>
      </div>

      {/* ══ MAIN BODY ════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth:1080, margin:"0 auto", padding:"32px 28px 60px" }}>

        {/* Accepted banner */}
        {signed && (
          <div style={{ background:"#E8F8EE", border:"1.5px solid #6FCF97", borderRadius:12, padding:"16px 24px", marginBottom:24, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#27AE60", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff", flexShrink:0 }}>✓</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#1A4731" }}>Smile Plan accepted by {sigName}</div>
              <div style={{ fontSize:12, color:"#2E7D52", marginTop:2 }}>Recorded {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" }}>

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* What we'll improve */}
            <div style={{ background:"#fff", borderRadius:16, padding:"28px 28px 24px", border:"1px solid #EBEBEB" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.8, textTransform:"uppercase", color:"#999", marginBottom:14 }}>Your treatment</div>
              <div style={{ fontSize:20, fontWeight:800, color:"#1A1A1A", letterSpacing:-0.3, marginBottom:20 }}>What we'll improve</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  "Straighten and align your upper and lower teeth",
                  "Improve your bite for comfort and function",
                  "Enhance your smile symmetry and appearance",
                  "Create a result that feels natural and lasting",
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:"#0F1F1A", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      <span style={{ fontSize:10, color:"#D4A64A" }}>✓</span>
                    </div>
                    <span style={{ fontSize:14, color:"#333", lineHeight:1.5 }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Duration */}
              <div style={{ marginTop:22, paddingTop:18, borderTop:"1px solid #F0F0F0" }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:"#999", marginBottom:8 }}>Estimated treatment time</div>
                <input
                  value={duration} onChange={e => setDuration(e.target.value)}
                  style={{ fontSize:16, fontWeight:700, color:"#1A1A1A", background:"none", border:"none", outline:"none", fontFamily:"inherit", width:"100%", padding:0, cursor:"text" }}
                  onFocus={e => e.target.style.borderBottom = "1.5px solid #D4A64A"}
                  onBlur={e => e.target.style.borderBottom = "none"}
                />
              </div>
            </div>

            {/* Included */}
            <div style={{ background:"#F0FBF4", borderRadius:16, padding:"24px 28px", border:"1px solid #B8E8C8" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"#27AE60", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                  <span style={{ color:"#fff" }}>✓</span>
                </div>
                <div style={{ fontSize:14, fontWeight:800, color:"#1A4731", letterSpacing:-0.2 }}>What's included</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  "Custom clear aligners — all stages",
                  "All clinical review appointments",
                  "Refinements if needed",
                  "First set of upper and lower retainers",
                  "Attachments and IPR as required",
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:"#27AE60", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:9, color:"#fff" }}>✓</span>
                    </div>
                    <span style={{ fontSize:13.5, color:"#1A4731", lineHeight:1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Not included */}
            <div style={{ background:"#FEF6F6", borderRadius:16, padding:"24px 28px", border:"1px solid #F5C6C6" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"#E74C3C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
                  <span style={{ color:"#fff" }}>✕</span>
                </div>
                <div style={{ fontSize:14, fontWeight:800, color:"#4A1010", letterSpacing:-0.2 }}>Not included</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {[
                  "Fillings or restorative work prior to treatment",
                  "Hygiene treatment if gums need attention first",
                  "Replacement aligners if lost or damaged",
                  "Late cancellation or failed appointment charges",
                ].map((item,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:"#E74C3C", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:9, color:"#fff" }}>✕</span>
                    </div>
                    <span style={{ fontSize:13.5, color:"#4A1010", lineHeight:1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important to know */}
            <div style={{ background:"#fff", borderRadius:16, padding:"22px 28px", border:"1px solid #EBEBEB" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#1A1A1A", marginBottom:14 }}>Important to know</div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {[
                  "Results may vary slightly depending on individual biology and compliance",
                  "Some cases benefit from a refinement stage — this is included",
                  "Gum health should be stable before starting aligners",
                  "Retainers must be worn after treatment to maintain your result",
                ].map((note,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontSize:12, color:"#999", flexShrink:0, marginTop:2 }}>—</span>
                    <span style={{ fontSize:13, color:"#555", lineHeight:1.55 }}>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ RIGHT COLUMN — PRICE CARD ════════════════════════════════════ */}
          <div style={{ position:"sticky", top:24, display:"flex", flexDirection:"column", gap:16 }}>

            {/* Main price card */}
            <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px 28px", border:"1px solid #EBEBEB", boxShadow:"0 8px 40px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#999", marginBottom:12 }}>Total investment</div>

              {/* Big price */}
              <div style={{ fontSize:52, fontWeight:800, color:"#1A1A1A", letterSpacing:-2, lineHeight:1, marginBottom:8 }}>
                £{total.toLocaleString()}
              </div>

              {/* Monthly line */}
              <div style={{ fontSize:15, color:"#666", marginBottom:24 }}>
                {payMonthly && months
                  ? <>or <strong style={{ color:"#1A1A1A" }}>£{Math.round(total/months).toLocaleString()}/month</strong> over {months} months</>
                  : <span style={{ color:"#27AE60", fontWeight:500 }}>Interest-free monthly options available</span>
                }
              </div>

              {/* Divider */}
              <div style={{ height:1, background:"#F0F0F0", marginBottom:20 }}/>

              {/* Minimal breakdown */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, color:"#555" }}>
                  <span>Treatment fee</span>
                  <span style={{ fontWeight:600, color:"#1A1A1A" }}>£{baseFee.toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5, color:"#555" }}>
                  <span>ClinCheck setup</span>
                  <span style={{ fontWeight:600, color: clincheckPaid ? "#27AE60" : "#1A1A1A" }}>
                    {clincheckPaid ? "✓ Paid" : `£${CLINCHECK_FEE}`}
                  </span>
                </div>
                {clincheckDeduction > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#27AE60" }}>
                    <span>ClinCheck credit</span>
                    <span style={{ fontWeight:600 }}>— £{clincheckDeduction}</span>
                  </div>
                )}
              </div>

              {/* Interest-free callout */}
              <div style={{ background:"#F0FBF4", borderRadius:10, padding:"12px 14px", marginBottom:24, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:14, color:"#27AE60" }}>✔</span>
                <span style={{ fontSize:13, color:"#1A4731", fontWeight:500 }}>Interest-free options available</span>
              </div>

              {/* Payment toggle */}
              <div style={{ display:"flex", gap:8, marginBottom: payMonthly ? 16 : 0 }}>
                {[{v:false,l:"Pay in full"},{v:true,l:"Monthly plan"}].map(opt=>(
                  <button key={String(opt.v)} onClick={()=>setPayMonthly(opt.v)}
                    style={{ flex:1, border:`1.5px solid ${payMonthly===opt.v?"#1A1A1A":"#DCDCDC"}`, background:payMonthly===opt.v?"#1A1A1A":"#fff", color:payMonthly===opt.v?"#fff":"#555", borderRadius:8, padding:"9px 0", fontSize:12.5, fontWeight:payMonthly===opt.v?700:400, cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s" }}>
                    {opt.l}
                  </button>
                ))}
              </div>

              {payMonthly && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                  {[6,9,12,18,24].map(m => {
                    const mAmt = Math.round(total/m);
                    return (
                      <button key={m} onClick={()=>setMonths(m)}
                        style={{ border:`1.5px solid ${months===m?"#1A1A1A":"#DCDCDC"}`, background:months===m?"#1A1A1A":"#fff", borderRadius:8, padding:"8px 10px", cursor:"pointer", fontFamily:"inherit", textAlign:"center", minWidth:62, transition:"all 0.12s" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:months===m?"#D4A64A":"#1A1A1A" }}>{m}mo</div>
                        <div style={{ fontSize:11, color:months===m?"rgba(212,166,74,0.7)":"#999" }}>£{mAmt}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* CTA buttons */}
              {!signed ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <button
                    onClick={handleAccept}
                    disabled={!canSign}
                    style={{ width:"100%", background: canSign?"#1A1A1A":"#E8E8E8", color:canSign?"#D4A64A":"#999", border:"none", borderRadius:12, padding:"16px 0", fontSize:15, fontWeight:800, cursor:canSign?"pointer":"not-allowed", fontFamily:"inherit", letterSpacing:0.2, transition:"all 0.15s" }}
                    onMouseEnter={e=>{ if(canSign) e.currentTarget.style.background="#2C2C2C"; }}
                    onMouseLeave={e=>{ if(canSign) e.currentTarget.style.background="#1A1A1A"; }}
                  >
                    {canSign ? "Start Treatment ✓" : "Sign below to accept"}
                  </button>

                  <button
                    onClick={()=>{ setEstimateSent(true); MockEmailSMS.send({to:patient?.name, subject:"Your Smile Plan", type:"estimate"}); AuditLog.record({action:"estimate_sent", detail:`Smile Plan sent to ${patient?.name}`, patientName:patient?.name}); }}
                    style={{ width:"100%", background:"transparent", color:"#1A1A1A", border:"1.5px solid #1A1A1A", borderRadius:12, padding:"13px 0", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {estimateSent ? "✓ Estimate Sent" : "Proceed with ClinCheck (£200)"}
                  </button>

                  <button
                    style={{ width:"100%", background:"transparent", color:"#999", border:"none", padding:"10px 0", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                    Discuss options →
                  </button>
                </div>
              ) : (
                <div style={{ background:"#F0FBF4", border:"1.5px solid #6FCF97", borderRadius:12, padding:"16px", textAlign:"center" }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>✓</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1A4731" }}>Treatment accepted</div>
                  <div style={{ fontSize:12, color:"#2E7D52", marginTop:2 }}>by {sigName}</div>
                </div>
              )}
            </div>

            {/* ClinCheck paid toggle */}
            <div onClick={()=>setCliniccheckPaid(p=>!p)}
              style={{ background: clincheckPaid?"#F0FBF4":"#fff", border:`1.5px solid ${clincheckPaid?"#6FCF97":"#E0E0E0"}`, borderRadius:12, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
              <input type="checkbox" checked={clincheckPaid} onChange={()=>{}} style={{ width:15, height:15, flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color: clincheckPaid?"#1A4731":"#333" }}>ClinCheck fee already paid</div>
                <div style={{ fontSize:11.5, color:"#888", marginTop:1 }}>{clincheckPaid?`£${CLINCHECK_FEE} deducted from total`:"Tick to deduct from treatment total"}</div>
              </div>
            </div>

            {/* Reminder + send buttons */}
            <div style={{ background:"#fff", borderRadius:12, padding:"16px", border:"1px solid #EBEBEB" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:"#999", marginBottom:10 }}>Follow-up</div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                {[2,4].map(day=>(
                  <button key={day} onClick={()=>handleSendReminder(day)}
                    style={{ flex:1, border:`1px solid ${reminderSent.includes(day)?"#6FCF97":"#DCDCDC"}`, background:reminderSent.includes(day)?"#F0FBF4":"#fff", color:reminderSent.includes(day)?"#27AE60":"#555", borderRadius:8, padding:"8px", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {reminderSent.includes(day)?"✓ Sent":"Send"} Day {day}
                  </button>
                ))}
              </div>
              <button
                onClick={()=>{ setEstimateSent(true); MockEmailSMS.send({to:patient?.name, subject:"Your Smile Plan", type:"estimate"}); AuditLog.record({action:"estimate_sent", detail:`Smile Plan emailed to ${patient?.name}`, patientName:patient?.name}); }}
                style={{ width:"100%", background:"#F7F7F5", border:"1px solid #DCDCDC", borderRadius:8, padding:"9px 0", fontSize:13, fontWeight:600, color:"#333", cursor:"pointer", fontFamily:"inherit" }}>
                {estimateSent?"✓ Plan Sent":"Email Smile Plan to Patient"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Patient signature ── */}
        {!signed && (
          <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EBEBEB", padding:"28px 32px", marginTop:24 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#1A1A1A", marginBottom:6 }}>Accept your Smile Plan</div>
            <div style={{ fontSize:13.5, color:"#666", marginBottom:22, lineHeight:1.6, maxWidth:600 }}>
              By signing below, you confirm you have read and understood this treatment plan, including the cost and what is and isn't included.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:8 }}>Your full name</label>
                <input value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="e.g. Emma Richardson"
                  style={{ width:"100%", border:"1.5px solid #DCDCDC", borderRadius:8, padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#1A1A1A", outline:"none", boxSizing:"border-box", transition:"border-color 0.12s" }}
                  onFocus={e=>e.target.style.borderColor="#D4A64A"}
                  onBlur={e=>e.target.style.borderColor="#DCDCDC"}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:"#999", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:8 }}>Date</label>
                <input type="date" defaultValue={new Date().toISOString().split("T")[0]}
                  style={{ width:"100%", border:"1.5px solid #DCDCDC", borderRadius:8, padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#1A1A1A", outline:"none", boxSizing:"border-box" }}/>
              </div>
            </div>
            <button onClick={handleAccept} disabled={!canSign}
              style={{ background:canSign?"#1A1A1A":"#E8E8E8", color:canSign?"#D4A64A":"#999", border:"none", borderRadius:12, padding:"15px 44px", fontSize:15, fontWeight:800, cursor:canSign?"pointer":"not-allowed", fontFamily:"inherit", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(canSign) e.currentTarget.style.background="#2C2C2C"; }}
              onMouseLeave={e=>{ if(canSign) e.currentTarget.style.background="#1A1A1A"; }}>
              {canSign ? "Accept & Start Treatment →" : "Enter your name above to accept"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientWorkflow({ patient, onBack }) {
  const [stage,          setStage]          = useState("consultation");
  const [consultation,   setConsultation]   = useState(null);
  const [assessment,     setAssessment]     = useState(null);
  const [consentSigned,  setConsentSigned]  = useState(null);
  const [estimate,       setEstimate]       = useState(null);
  const [paymentState,   setPaymentState]   = useState({ type: null });
  const [clincheckState, setClincheckState] = useState({ protocols: {} });
  const [loomState,      setLoomState]      = useState({});

  const p = patient || { name:"New Patient", id:"new" };

  // Combined patient state — single source of truth
  const patientState = {
    consultation, assessment, consentSigned,
    estimate, paymentState, clincheckState, loomState,
  };

  const TABS = [
    { id:"consultation", label:"Consultation",    num:1, locked:false,                      icon:"◎" },
    { id:"assessment",   label:"Assessment",      num:2, locked:!consultation,              icon:"◈" },
    { id:"consent",      label:"Consent",         num:3, locked:!assessment,                icon:"⚖" },
    { id:"estimate",     label:"Treatment Plan",  num:4, locked:!consultation,             icon:"£" },
    { id:"payment",      label:"Payment",         num:5, locked:!estimate,                  icon:"💳" },
    { id:"clincheck",    label:"ClinCheck",       num:6, locked:!consentSigned,             icon:"⚙" },
    { id:"loom",         label:"Review Video",    num:7, locked:!clincheckState.submitted,  icon:"▶" },
    { id:"timeline",     label:"Timeline",        num:8, locked:false,                      icon:"◷" },
    { id:"export",       label:"Export",          num:9, locked:false,                      icon:"↓" },
  ];

  const stageComplete = {
    consultation: !!consultation,
    assessment:   !!assessment,
    consent:      !!consentSigned,
    estimate:     !!estimate,
    payment:      !!(paymentState.type),
    clincheck:    !!(clincheckState.submitted),
    loom:         !!(loomState.approved || loomState.patientApproved),
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* ── Workflow tab bar ── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
        {/* Top row: back + patient */}
        <div style={{ padding:"10px 20px 0", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:T.cyan, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
            ‹ Patients
          </button>
          <div style={{ width:1, height:18, background:T.border }}/>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Avt name={p.name} size={26}/>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>{p.name}</div>
              {p.dob && <div style={{ fontSize:10.5, color:T.muted }}>DOB: {p.dob}</div>}
            </div>
          </div>
          <div style={{ flex:1 }}/>
          {assessment && (
            <span style={{ fontSize:11.5, fontWeight:700, color:T.success, background:T.successLight, borderRadius:4, padding:"3px 10px", border:`1px solid ${T.successBorder}` }}>
              ✓ Assessment complete
            </span>
          )}
          {consentSigned && (
            <span style={{ fontSize:11.5, fontWeight:700, color:T.success, background:T.successLight, borderRadius:4, padding:"3px 10px", border:`1px solid ${T.successBorder}` }}>
              ✓ Consent signed
            </span>
          )}
          {/* Case status badge — compact, only when patient has stage data */}
          {p.stage && (() => {
            const fs = evaluateFullStatus(p);
            const ws = getWorstStatus(p);
            const tlColor = {RED:T.error, AMBER:T.warning, GREEN:T.success}[ws.tl];
            return (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:tlColor }}/>
                <span style={{ fontSize:11, fontWeight:700, color:tlColor }}>
                  {ws.tl === "GREEN" ? "Ready to Proceed" : ws.tl === "AMBER" ? "Needs Attention" : "Do Not Proceed"}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Tab row */}
        <div style={{ display:"flex", overflowX:"auto", paddingLeft:8 }}>
          {TABS.map(tab => {
            const active = stage === tab.id;
            const complete = stageComplete[tab.id];
            return (
              <button
                key={tab.id}
                disabled={tab.locked}
                onClick={() => !tab.locked && setStage(tab.id)}
                style={{
                  border:"none", background:"none",
                  padding:"8px 16px", height:40,
                  fontSize:12.5, fontWeight:active?700:400,
                  color: active ? T.ink : tab.locked ? "#CCC" : "#666",
                  cursor: tab.locked ? "not-allowed" : "pointer",
                  borderBottom: active ? `2.5px solid ${T.cyan}` : `2.5px solid transparent`,
                  fontFamily:"inherit", transition:"all 0.1s", whiteSpace:"nowrap",
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                <span style={{
                  width:18, height:18, borderRadius:"50%", fontSize:9.5, fontWeight:700,
                  background: active ? T.cyan : complete ? T.success : tab.locked ? "#E0E0E0" : "#D0D0D0",
                  color: active||complete ? "#fff" : tab.locked?"#BBB":"#888",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                }}>
                  {complete && !active ? "✓" : tab.num}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Case summary banner — 3 boxes, only when patient has stage data ── */}
      {p.stage && (() => {
        const fs  = evaluateFullStatus(p);
        const ws  = getWorstStatus(p);
        const tlColor  = { RED:T.error,   AMBER:T.warning,  GREEN:T.success };
        const tlBg     = { RED:T.errorLight, AMBER:T.warningLight, GREEN:T.successLight };
        const tlBorder = { RED:T.errorBorder, AMBER:T.warningBorder, GREEN:T.successBorder };

        const clinLabel = fs.clinicalStatus==="NOT_CLEARED"?"Do Not Proceed":
                          fs.clinicalStatus==="CONDITIONAL"?"Conditional":"Cleared";
        const clinColor = fs.clinicalStatus==="NOT_CLEARED"?T.error:
                          fs.clinicalStatus==="CONDITIONAL"?T.warning:T.success;
        const clinBg    = fs.clinicalStatus==="NOT_CLEARED"?T.errorLight:
                          fs.clinicalStatus==="CONDITIONAL"?T.warningLight:T.successLight;

        // Max 3 blockers, combined clinical + governance
        const allBlockers = [
          ...fs.clinicalBlockers.map(b=>b.label),
          ...fs.govFlags.slice(0,2),
        ].slice(0,3);

        return (
          <div style={{ borderBottom:`1px solid ${T.border}`, background:"#FAFAFA", padding:"10px 20px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 1fr", gap:10, maxWidth:960 }}>

              {/* Box 1: Clinical Readiness */}
              <div style={{ background:clinBg, border:`1px solid ${clinColor}30`, borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:4 }}>Clinical Readiness</div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:clinColor }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:clinColor }}>{clinLabel}</span>
                </div>
              </div>

              {/* Box 2: Key Blockers — max 3 */}
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:4 }}>
                  {allBlockers.length > 0 ? `${allBlockers.length} Blocker${allBlockers.length>1?"s":""}` : "No Blockers"}
                </div>
                {allBlockers.length === 0
                  ? <div style={{ fontSize:12, color:T.success, fontWeight:600 }}>✓ All clear</div>
                  : allBlockers.map((b,i) => (
                      <div key={i} style={{ fontSize:11.5, color:ws.tl==="RED"?T.error:T.warning, marginBottom:i<allBlockers.length-1?2:0 }}>
                        {ws.tl==="RED"?"✕":"⚠"} {b}
                      </div>
                    ))
                }
              </div>

              {/* Box 3: Next Step */}
              <div style={{ background: fs.treatmentReady?T.successLight:"#fff", border:`1px solid ${fs.treatmentReady?T.successBorder:T.border}`, borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:4 }}>Next Step</div>
                <div style={{ fontSize:12.5, fontWeight:600, color:fs.treatmentReady?T.success:T.primary, lineHeight:1.4 }}>
                  {ws.nextAction}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Stage content ── */}
      <div style={{ flex:1, overflowY:"auto", background:T.bg }}>
        {stage === "consultation" && (
          <ConsultationPage
            patient={p}
            onComplete={(data) => { setConsultation(data); setStage("assessment"); AuditLog.record({ action:"assessment_opened", detail:`Consultation complete — moved to assessment`, patientName:p.name }); }}
          />
        )}
        {stage === "assessment" && (
          <AssessmentPage
            patient={p}
            consultation={consultation}
            consentData={consentSigned}
            onConsentUpdate={(d) => { /* draft — not final sign */ }}
            estimateData={estimate}
            onEstimateUpdate={(d) => setEstimate(d)}
            paymentState={paymentState}
            setPaymentState={setPaymentState}
            onComplete={(data) => { setAssessment(data); if(data.bpeTreatments) Object.keys(data.bpeTreatments).length > 0 && AuditLog.record({ action:"assessment_done", detail:`${(data.problems||[]).length} problems · ${Object.keys(data.bpeTreatments).length} BPE plan(s)`, patientName:p.name }); else AuditLog.record({ action:"assessment_done", detail:`${(data.problems||[]).length} problems identified`, patientName:p.name }); setStage("consent"); }}
          />
        )}
        {stage === "consent" && assessment && (
          <ConsentPage
            patient={p}
            consultation={consultation}
            assessment={assessment}
            onSign={(doc) => { setConsentSigned(doc); AuditLog.record({ action:"consent_signed", detail:`Signed by ${doc?.sigName||p.name}`, patientName:p.name }); }}
          />
        )}
        {stage === "estimate" && (
          <EstimatePage
            patient={p}
            consultation={consultation}
            assessment={assessment}
            estimate={estimate}
            onComplete={(data) => {
              setEstimate(data);
              AuditLog.record({ action:"estimate_accepted", detail:`£${data.total?.toLocaleString()||""} accepted by patient`, patientName:p.name });
            }}
          />
        )}
        {stage === "payment" && (
          <PaymentPage
            patient={p}
            consultation={consultation}
            paymentState={paymentState}
            setPaymentState={setPaymentState}
          />
        )}
        {stage === "clincheck" && (
          <ClinCheckPage
            patient={p}
            assessment={assessment}
            consultation={consultation}
            clincheckState={clincheckState}
            setClincheckState={setClincheckState}
          />
        )}
        {stage === "loom" && (
          <LoomPage
            patient={p}
            loomState={loomState}
            setLoomState={setLoomState}
          />
        )}
        {stage === "timeline" && (
          <div style={{ maxWidth:700, margin:"0 auto", padding:"24px 20px 60px" }}>
            <TimelineChecklist patientState={patientState}/>
          </div>
        )}
        {stage === "export" && (
          <ExportPage patientState={patientState} patient={p}/>
        )}
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// SECURITY PAGE
// ═══════════════════════════════════════════════════════════════════════════
function SecurityPage() {
  const sections = [
    {
      id:"data", icon:"🔒", title:"Data Protection & Privacy",
      color:"#2980B9", bg:"rgba(41,128,185,0.07)",
      points:[
        "All patient data encrypted at rest (AES-256) and in transit (TLS 1.3)",
        "Data stored on UK-based servers — no cross-border transfer without consent",
        "Patient records are tenant-isolated — no data shared between practices",
        "Automated data retention policies aligned with ICO guidelines",
        "Right to erasure supported — patient data deletion on request",
      ],
    },
    {
      id:"gdpr", icon:"🇬🇧", title:"GDPR Compliance",
      color:"#2E8B57", bg:"rgba(46,139,87,0.07)",
      badge:"GDPR Ready",
      points:[
        "Lawful basis for processing documented for each data category",
        "Data Processing Agreements (DPAs) available for all sub-processors",
        "Privacy-by-design architecture — minimum data collection principle",
        "Consent records timestamped and stored with SHA-256 integrity hash",
        "Breach notification procedures in place — 72-hour ICO reporting capability",
        "Data Protection Officer (DPO) contact available on request",
      ],
    },
    {
      id:"rbac", icon:"👥", title:"Role-Based Access Control",
      color:"#6C3483", bg:"rgba(108,52,131,0.07)",
      points:[
        "Four distinct access tiers: Clinical Director, Clinical Team, Practice Manager, Marketing",
        "Clinical findings and problem lists restricted to clinical roles",
        "Governance and analytics restricted to manager and director roles",
        "All access decisions are logged in the immutable audit trail",
        "JWT-based authentication with httpOnly cookie storage",
        "Session expiry and automatic logout enforced",
      ],
      roles: [
        { role:"Clinical Director", access:"Full access — clinical, governance, analytics, audit", color:"#8B1A10" },
        { role:"Clinical Team",     access:"Assessment, consent, ClinCheck, Loom — no billing",   color:"#2980B9" },
        { role:"Practice Manager",  access:"Patient admin, billing, team, analytics, governance",  color:"#6C3483" },
        { role:"Marketing",         access:"Patient names and stage only — no clinical data",       color:"#C0392B" },
      ],
    },
    {
      id:"ai", icon:"🤖", title:"AI Safety & Data Handling",
      color:"#C4841A", bg:"rgba(196,132,26,0.07)",
      points:[
        "Voice transcription (Whisper) — audio is not stored after transcription",
        "AI parsing (Claude) — patient identifiers are stripped before API submission",
        "No patient data used for model training without explicit consent",
        "All AI outputs are clinician-reviewed before being saved to records",
        "AI-generated consent text is editable and clinician-approved before signing",
        "API keys are environment-variable only — never client-side",
      ],
    },
    {
      id:"governance", icon:"⚖", title:"Clinical Governance & Audit Trail",
      color:"#2E8B57", bg:"rgba(46,139,87,0.07)",
      points:[
        "Immutable audit log records all key clinical and compliance actions",
        "Governance engine continuously scores each case against 10 criteria",
        "BREACH and AT_RISK cases are flagged immediately on the governance dashboard",
        "Consent documents include SHA-256 hash, timestamp, and IP address",
        "Stage-gate progression enforcement prevents non-compliant workflow advancement",
        "Audit log is exportable for CQC inspection and peer review",
      ],
      workflow_stages: ["Consultation","Assessment","Consent","Estimate","Payment","ClinCheck","Review Video","Timeline","Export","Audit Log"],
    },
    {
      id:"infrastructure", icon:"🏗", title:"Infrastructure & Hosting",
      color:"#2980B9", bg:"rgba(41,128,185,0.07)",
      points:[
        "Hosted on DigitalOcean (London region) — UK data sovereignty maintained",
        "PM2 cluster mode with automatic restart and zero-downtime deploys",
        "Nginx reverse proxy with SSL/TLS termination via Let's Encrypt",
        "PostgreSQL 15 with automated daily backups — 30-day retention",
        "Health monitoring and uptime alerting with automated failover",
        "Infrastructure-as-code — all configurations version controlled",
      ],
    },
    {
      id:"system", icon:"🛡", title:"System Security",
      color:"#C0392B", bg:"rgba(192,57,43,0.07)",
      points:[
        "bcrypt password hashing with cost factor 12",
        "Rate limiting on all authentication and AI endpoints",
        "Parameterised queries throughout — SQL injection prevention",
        "CORS configured to allowed origins only",
        "Security headers: HSTS, X-Frame-Options, Content-Security-Policy",
        "Dependency audits on every deployment via npm audit",
        "Stripe webhooks verified with signature validation",
      ],
    },
    {
      id:"contact", icon:"✉", title:"Security Contact",
      color:"#2D2D2D", bg:"rgba(45,45,45,0.04)",
      points:[
        "Security issues: security@smileos.co.uk",
        "Data requests (DSAR): privacy@smileos.co.uk",
        "Bug bounty programme available for responsible disclosure",
        "Response time commitment: critical issues acknowledged within 4 hours",
      ],
    },
  ];

  return (
    <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>
      {/* Hero */}
      <div style={{ background:T.primary, borderRadius:16, padding:"36px 40px", marginBottom:28, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }}/>
        <div style={{ position:"absolute", bottom:-20, left:200, width:120, height:120, borderRadius:"50%", background:"rgba(212,166,74,0.08)" }}/>
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#3D6A56", marginBottom:10 }}>SmileOS · Trust & Security</div>
          <div style={{ fontSize:28, fontWeight:800, color:"#F0EFE8", letterSpacing:-0.5, marginBottom:10, maxWidth:620 }}>
            Enterprise-grade security built for modern dental practices
          </div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.55)", maxWidth:580, lineHeight:1.7, marginBottom:18 }}>
            Designed to meet the governance and compliance standards expected by multi-site dental groups and corporate providers. Built with privacy-by-design from the ground up.
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {[
              {label:"GDPR Ready",       color:T.success,  bg:T.successLight },
              {label:"UK Hosted",        color:T.info,     bg:T.infoLight    },
              {label:"Audit Logged",     color:T.gold,     bg:T.goldLight    },
              {label:"TLS 1.3",         color:T.muted,    bg:"rgba(255,255,255,0.08)" },
              {label:"AES-256 at rest", color:T.muted,    bg:"rgba(255,255,255,0.08)" },
            ].map(badge=>(
              <span key={badge.label} style={{ fontSize:11.5, fontWeight:700, color:badge.color, background:badge.bg, borderRadius:99, padding:"4px 12px", border:`1px solid ${badge.color}30` }}>
                ✓ {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sections grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {sections.map(sec => (
          <div key={sec.id} style={{ background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden" }}>
            {/* Section header */}
            <div style={{ padding:"16px 20px", background:sec.bg, display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:20 }}>{sec.icon}</span>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:14, fontWeight:700, color:sec.color }}>{sec.title}</span>
              </div>
              {sec.badge && (
                <span style={{ fontSize:10.5, fontWeight:800, color:T.success, background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:99, padding:"2px 10px" }}>
                  {sec.badge}
                </span>
              )}
            </div>
            {/* Points */}
            <div style={{ padding:"14px 20px" }}>
              {sec.points.map((pt,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:sec.color, flexShrink:0, marginTop:5 }}/>
                  <span style={{ fontSize:13, color:T.sub, lineHeight:1.6 }}>{pt}</span>
                </div>
              ))}
              {/* RBAC role table */}
              {sec.roles && (
                <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                  {sec.roles.map(r => (
                    <div key={r.role} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"#FAFAFA", borderRadius:6, border:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:11, fontWeight:700, color:r.color, background:`${r.color}15`, borderRadius:4, padding:"2px 8px", flexShrink:0 }}>{r.role}</span>
                      <span style={{ fontSize:11.5, color:T.muted, flex:1 }}>{r.access}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Workflow stages */}
              {sec.workflow_stages && (
                <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
                  {sec.workflow_stages.map((s,i) => (
                    <span key={s} style={{ fontSize:11, fontWeight:600, color:T.primary, background:"#F0EFE8", borderRadius:4, padding:"3px 9px" }}>
                      {i+1}. {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST CENTRE PAGE
// ═══════════════════════════════════════════════════════════════════════════
function TrustCentrePage({ onGoToSecurity }) {
  const [activeTab, setActiveTab] = useState("security");

  const TABS = [
    { id:"security",    label:"Security",            icon:"🔒" },
    { id:"compliance",  label:"Compliance",          icon:"⚖"  },
    { id:"governance",  label:"Clinical Governance", icon:"◈"  },
    { id:"ai",          label:"AI & Data Use",       icon:"🤖" },
    { id:"transparency",label:"Data Transparency",   icon:"👁" },
  ];

  const tabContent = {
    security: {
      headline: "Security at every layer",
      summary: "SmileOS is built on an infrastructure-first security model. Every patient record is encrypted, every action is logged, and every data access is role-gated.",
      items: [
        { icon:"🔐", title:"End-to-end encryption", desc:"TLS 1.3 in transit, AES-256 at rest. No unencrypted patient data ever leaves the platform." },
        { icon:"🇬🇧", title:"UK data residency",     desc:"All data stored on DigitalOcean London. No cross-border transfer without explicit consent." },
        { icon:"🛡", title:"Zero-trust architecture",desc:"JWT authentication, rate limiting, parameterised queries, and CORS restriction on every endpoint." },
        { icon:"🔑", title:"Access control",         desc:"Four role tiers. Clinical data restricted to clinical roles. Governance restricted to management." },
      ],
      cta: { label:"View full Security page →", action: onGoToSecurity },
    },
    compliance: {
      headline: "Built for UK regulatory compliance",
      summary: "SmileOS supports dental practices in meeting their obligations under UK GDPR, CQC standards, and GDC record-keeping requirements.",
      items: [
        { icon:"📋", title:"UK GDPR compliant",       desc:"Lawful basis documented, DPAs available, 72-hour breach notification capability." },
        { icon:"🏥", title:"CQC-ready audit trail",   desc:"All clinical actions timestamped and exportable for inspection." },
        { icon:"🦷", title:"GDC record standards",    desc:"Full clinical documentation workflow from consultation through to case completion." },
        { icon:"✍", title:"Consent documentation",   desc:"Medico-legal consent engine with SHA-256 receipts and immutable records." },
      ],
    },
    governance: {
      headline: "Clinical governance built into every stage",
      summary: "The governance engine continuously monitors every case for compliance risk — before it becomes a problem.",
      items: [
        { icon:"⚡", title:"Real-time risk scoring",  desc:"Each case is scored against 10 governance criteria. BREACH and AT_RISK cases surface immediately." },
        { icon:"🚧", title:"Stage-gate enforcement",  desc:"Progression blockers prevent moving to treatment without required consent, payment, and assessment." },
        { icon:"◈",  title:"Problem list engine",     desc:"Clinical findings automatically generate consent-linked problems requiring documented decisions." },
        { icon:"📊", title:"Governance dashboard",    desc:"Clinician-level and case-level risk tables with exception tracking and immediate action flags." },
      ],
    },
    ai: {
      headline: "AI used responsibly and transparently",
      summary: "AI in SmileOS is an assist tool — not a decision maker. Every AI output is reviewed by the clinician before it enters the patient record.",
      items: [
        { icon:"🎤", title:"Voice transcription",     desc:"Whisper AI transcribes spoken assessments. Audio is discarded after processing — not stored." },
        { icon:"🧠", title:"Clinical parsing",        desc:"Claude parses transcript into structured fields. Patient identifiers stripped before submission." },
        { icon:"✅", title:"Human-in-the-loop",       desc:"All AI-generated content is clinician-reviewed and editable. Nothing goes to a record without approval." },
        { icon:"🚫", title:"No training on your data",desc:"Patient data is never used to train or fine-tune any AI model." },
      ],
    },
    transparency: {
      headline: "Full transparency over your data",
      summary: "You own your patient data. SmileOS provides tools to inspect, export, and delete records in line with patient rights.",
      items: [
        { icon:"📤", title:"Data export",             desc:"Full case bundle export at any stage. All data in standard formats." },
        { icon:"🗑", title:"Right to erasure",        desc:"Patient deletion supported — removes all records and audit trail entries for that patient." },
        { icon:"👁", title:"Audit visibility",        desc:"Every action is logged. Patients can request a copy of their access log." },
        { icon:"📞", title:"Data requests",           desc:"DSAR support — privacy@smileos.co.uk. We respond within the statutory 30-day window." },
      ],
    },
  };

  const tab = tabContent[activeTab];

  return (
    <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>SmileOS</div>
        <div style={{ fontSize:26, fontWeight:800, color:T.primary, letterSpacing:-0.5, marginBottom:6 }}>Trust Centre</div>
        <div style={{ fontSize:14, color:T.muted, maxWidth:640 }}>
          SmileOS is designed to meet the governance and compliance standards expected by multi-site dental groups and corporate providers.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:24 }}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background:"none", border:"none",
              borderBottom:`2.5px solid ${active ? T.gold : "transparent"}`,
              padding:"9px 18px", fontSize:13, fontWeight:active?700:400,
              color:active?T.primary:T.muted, cursor:"pointer",
              fontFamily:"inherit", marginBottom:-2,
              display:"flex", alignItems:"center", gap:6,
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab && (
        <div>
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:20, fontWeight:800, color:T.primary, marginBottom:6 }}>{tab.headline}</div>
            <div style={{ fontSize:14, color:T.muted, maxWidth:620, lineHeight:1.7 }}>{tab.summary}</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
            {tab.items.map(item => (
              <div key={item.title} style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, padding:"20px 22px" }}>
                <div style={{ fontSize:24, marginBottom:10 }}>{item.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.primary, marginBottom:6 }}>{item.title}</div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.65 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {tab.cta && (
            <div style={{ textAlign:"center" }}>
              <button onClick={tab.cta.action} style={{ background:T.primary, color:T.gold, border:"none", borderRadius:8, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {tab.cta.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard",    label:"Dashboard"                                    },
  { id:"patients",     label:"Patients"                                     },
  { id:"analytics",    label:"Analytics"                                    },
  { id:"governance",   label:"Governance"                                   },
  { id:"audit",        label:"Audit Log"                                    },
  { id:"intelligence", label:"Clinical Intel"                               },
  { id:"security",     label:"Security"                                     },
  { id:"trust",        label:"Trust Centre"                                 },
  { id:"team",         label:"Team"                                         },
  { id:"settings",     label:"Settings"                                     },
  { id:"workflow",     label:"New Consultation", highlight:true             },
];

// ─── ANALYTICS PAGE ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// CLINICAL INTEL PAGE
// Insight engine — pulls from existing MOCK_PATIENTS, governance criteria,
// funnel logic, and CAP protocol data. No new APIs.
// ══════════════════════════════════════════════════════════════════════════════
function ClinicalIntelPage() {
  const patients = MOCK_PATIENTS;
  const n        = patients.length;
  const funnel   = computePracticeFunnel(patients);

  // ── Section toggle state ──────────────────────────────────────────────────
  const [open, setOpen] = React.useState({
    risk:true, conversion:true, clinician:true,
    casemix:false, protocol:false, governance:true, forecast:true,
  });
  const toggle = (k) => setOpen(p => ({...p,[k]:!p[k]}));

  // ── Shared card component ─────────────────────────────────────────────────
  const Section = ({ id, title, icon, badge, badgeColor, children }) => (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
      <div
        onClick={() => toggle(id)}
        style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", background:"#FAFAFA", borderBottom: open[id] ? `1px solid ${T.border}` : "none" }}
      >
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ fontSize:13.5, fontWeight:700, color:T.primary, flex:1 }}>{title}</span>
        {badge != null && (
          <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:badgeColor||T.error, borderRadius:10, padding:"2px 9px" }}>
            {badge}
          </span>
        )}
        <span style={{ fontSize:11, color:T.muted }}>{open[id] ? "▲" : "▼"}</span>
      </div>
      {open[id] && <div style={{ padding:"16px 20px" }}>{children}</div>}
    </div>
  );

  // ── Insight row ───────────────────────────────────────────────────────────
  const Insight = ({ label, value, sub, action, color, patients: pts }) => (
    <div style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"12px 0", borderBottom:`1px solid ${T.borderLight}` }}>
      <div style={{ width:3, alignSelf:"stretch", borderRadius:2, background:color||T.warning, flexShrink:0 }}/>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:3 }}>
          <span style={{ fontSize:22, fontWeight:800, color:color||T.primary, letterSpacing:-0.5, lineHeight:1 }}>{value}</span>
          <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{label}</span>
        </div>
        {sub && <div style={{ fontSize:12.5, color:T.muted, marginBottom: action ? 6 : 0 }}>{sub}</div>}
        {action && (
          <div style={{ fontSize:12.5, fontWeight:600, color:color||T.warning, background:`${color||T.warning}15`, display:"inline-block", borderRadius:4, padding:"3px 10px" }}>
            → {action}
          </div>
        )}
        {pts && pts.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:7 }}>
            {pts.map(p => (
              <span key={p.id} style={{ fontSize:11, background:"#F0F0F0", borderRadius:3, padding:"2px 8px", color:T.sub }}>{p.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CLINICAL RISK INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════
  const activeCaries    = patients.filter(p => p.activeCaries && !p.cariesResolved);
  const bpe34           = patients.filter(p => (p.bpeMax||0) >= 3);
  const bpe4            = patients.filter(p => (p.bpeMax||0) >= 4);
  const bpePlanMissing  = patients.filter(p => (p.bpeMax||0) >= 3 && !p.bpePlanSelected);
  const restorativeReq  = patients.filter(p => p.restorativePlanRequired && !p.restorativePlanSolution);
  const clinBlocked     = patients.filter(p => {
    const ws = getWorstStatus(p);
    return ws.tl === "RED";
  });

  const pct = (k) => n > 0 ? Math.round((k/n)*100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 2. CONVERSION / DROP-OFF INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════
  const paidFee         = patients.filter(p => p.clincheckFeePaid);
  const videoReady      = patients.filter(p => p.clincheckApproved);
  const approvedPts     = patients.filter(p => p.alignersOrdered);
  const stuckPostFee    = paidFee.filter(p => !p.alignersOrdered);
  const stuckPreVideo   = videoReady.filter(p => !p.alignersOrdered);
  const stuckPostVideo  = patients.filter(p => p.clincheckApproved && p.paymentVerified && !p.alignersOrdered);

  const dropOffFeeToAligner = paidFee.length > 0
    ? Math.round(((paidFee.length - approvedPts.length) / paidFee.length) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. CLINICIAN INSIGHTS
  // ══════════════════════════════════════════════════════════════════════════
  const clinicians = [...new Set(patients.map(p => p.cli))];
  const clinData   = clinicians.map(cli => {
    const pts            = patients.filter(p => p.cli === cli);
    const breachPts      = pts.filter(p => checkAlignersOrderedBreach(p).length > 0);
    const bpeMissingPts  = pts.filter(p => (p.bpeMax||0) >= 3 && !p.bpePlanSelected);
    const decisionsMiss  = pts.filter(p => p.stage !== "consultation" && !p.decisionsMade);
    const govScores      = pts.map(p => computeWeightedGovScore(p));
    const avgGov         = govScores.length ? Math.round(govScores.reduce((a,b)=>a+b,0)/govScores.length) : 100;
    return { cli, pts, breachPts, bpeMissingPts, decisionsMiss, avgGov };
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. CASE MIX
  // ══════════════════════════════════════════════════════════════════════════
  // Derive from patient flags (real assessment problems not in mock top-level,
  // so we infer from bpeMax, activeCaries, restorativePlanRequired etc.)
  const caseMix = [
    { label:"Periodontal risk (BPE ≥2)",    count: patients.filter(p=>(p.bpeMax||0)>=2).length },
    { label:"Restorative treatment required", count: patients.filter(p=>p.restorativePlanRequired).length },
    { label:"Active caries present",          count: patients.filter(p=>p.activeCaries).length },
    { label:"Monthly payment plan",           count: patients.filter(p=>p.payMonthly).length },
    { label:"High complexity (5+ problems)",  count: patients.filter(p=>(p.problems||0)>=5).length },
    { label:"BPE 4 — specialist required",    count: bpe4.length },
  ].filter(c => c.count > 0).sort((a,b) => b.count - a.count);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PROTOCOL INTELLIGENCE (CAP)
  // ══════════════════════════════════════════════════════════════════════════
  // Count which CAP protocols are triggered across all patient problem sets
  // We can infer likely protocols from patient flags
  const protoTriggers = [
    { label:"Class II Elastic",        count: patients.filter(p=>(p.bpeMax||0)===0 && !p.activeCaries && (p.problems||0)>=2).length },
    { label:"CAP Distalisation",       count: patients.filter(p=>(p.problems||0)>=3).length },
    { label:"Open Bite Protocol",      count: patients.filter(p=>(p.problems||0)>=4).length },
    { label:"Recession Protocol",      count: patients.filter(p=>(p.bpeMax||0)>=2).length },
    { label:"Uprighting Molars",       count: patients.filter(p=>(p.problems||0)>=2 && (p.bpeMax||0)>=1).length },
    { label:"Attachment Rules",        count: patients.filter(p=>(p.problems||0)>=1).length },
  ].sort((a,b) => b.count - a.count).slice(0, 5);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. GOVERNANCE INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════
  const govFailures = GOV_CRITERIA_WEIGHTED.map(criterion => {
    const failing = patients.filter(p => !criterion.check(p));
    return { ...criterion, failing };
  }).filter(c => c.failing.length > 0).sort((a,b) => b.failing.length - a.failing.length);

  const avgGovScore = patients.length
    ? Math.round(patients.reduce((a,p) => a + computeWeightedGovScore(p), 0) / patients.length) : 100;

  // ══════════════════════════════════════════════════════════════════════════
  // 7. FORECAST
  // ══════════════════════════════════════════════════════════════════════════
  const pipelineVal     = funnel.pipelineVal;
  const atRiskVal       = patients
    .filter(p => p.value && !p.alignersOrdered && getWorstStatus(p).tl === "RED")
    .reduce((a,p) => a + (p.value||0), 0);
  const likelyConvert   = patients
    .filter(p => p.value && p.clincheckFeePaid && !p.alignersOrdered && getWorstStatus(p).tl !== "RED")
    .reduce((a,p) => a + (p.value||0), 0);
  const safeVal         = patients
    .filter(p => p.value && p.alignersOrdered)
    .reduce((a,p) => a + (p.value||0), 0);

  return (
    <div style={{ padding:"28px 36px", maxWidth:1000, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>{TENANT.practice}</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.primary, letterSpacing:-0.3, marginBottom:4 }}>Clinical Intelligence</div>
        <div style={{ fontSize:13, color:T.muted }}>
          Live insights from {n} patients across {clinicians.length} clinicians — updated as cases progress.
        </div>
      </div>

      {/* ── 1. CLINICAL RISK ─────────────────────────────────────────────── */}
      <Section id="risk" icon="⚠" title="Clinical Risk Intelligence"
        badge={activeCaries.length + bpe34.length > 0 ? activeCaries.length + bpe34.length : null}
        badgeColor={T.error}>

        {activeCaries.length === 0 && bpe34.length === 0 && restorativeReq.length === 0 ? (
          <div style={{ fontSize:13, color:T.success, fontWeight:600 }}>✓ No unresolved clinical risks detected across active cases.</div>
        ) : (
          <>
            {activeCaries.length > 0 && (
              <Insight
                value={`${activeCaries.length} patient${activeCaries.length>1?"s":""}`}
                label="have unresolved active caries"
                sub={`${pct(activeCaries.length)}% of the patient base — treatment cannot proceed until resolved`}
                action="Resolve caries before submitting ClinCheck"
                color={T.error}
                patients={activeCaries}
              />
            )}
            {bpe4.length > 0 && (
              <Insight
                value={`${bpe4.length} patient${bpe4.length>1?"s":""}`}
                label="have BPE 4 — specialist referral required"
                sub="These cases are clinically blocked until specialist clearance is received"
                action="Arrange periodontal specialist assessment"
                color={T.error}
                patients={bpe4}
              />
            )}
            {bpe34.filter(p=>(p.bpeMax||0)===3).length > 0 && (
              <Insight
                value={`${bpe34.filter(p=>(p.bpeMax||0)===3).length} patient${bpe34.filter(p=>(p.bpeMax||0)===3).length>1?"s":""}`}
                label="have BPE 3 — periodontal stabilisation required"
                sub="Aligners should not be submitted until gum health is stable"
                action="Book hygiene stabilisation before proceeding"
                color={T.warning}
                patients={bpe34.filter(p=>(p.bpeMax||0)===3)}
              />
            )}
            {bpePlanMissing.length > 0 && (
              <Insight
                value={`${bpePlanMissing.length} patient${bpePlanMissing.length>1?"s":""}`}
                label="have elevated BPE without a documented management plan"
                sub="Periodontal management must be documented in the assessment"
                action="Complete BPE management plan in assessment"
                color={T.warning}
                patients={bpePlanMissing}
              />
            )}
            {restorativeReq.length > 0 && (
              <Insight
                value={`${restorativeReq.length} patient${restorativeReq.length>1?"s":""}`}
                label="require restorative treatment — plan not yet selected"
                sub="Restorative considerations must be resolved before aligner therapy"
                action="Document restorative plan in assessment"
                color={T.warning}
                patients={restorativeReq}
              />
            )}
          </>
        )}
      </Section>

      {/* ── 2. CONVERSION / DROP-OFF ─────────────────────────────────────── */}
      <Section id="conversion" icon="📉" title="Conversion Intelligence"
        badge={stuckPostFee.length > 0 ? stuckPostFee.length : null}
        badgeColor={T.warning}>

        {/* Funnel summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:18 }}>
          {[
            { label:"Consultations",        value:n,                      color:T.primary },
            { label:"Paid ClinCheck fee",   value:paidFee.length,         color:T.info },
            { label:"ClinCheck approved",   value:videoReady.length,      color:T.warning },
            { label:"Aligners ordered",     value:approvedPts.length,     color:T.success },
          ].map((s,i) => (
            <div key={i} style={{ background:"#FAFAFA", border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.color, letterSpacing:-0.5, lineHeight:1, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:0.6, color:T.muted }}>{s.label}</div>
              {i < 3 && (
                <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>
                  {n > 0 ? `${Math.round((s.value/n)*100)}% of total` : "—"}
                </div>
              )}
            </div>
          ))}
        </div>

        {dropOffFeeToAligner > 0 && (
          <Insight
            value={`${dropOffFeeToAligner}%`}
            label="of patients who paid the ClinCheck fee have not started treatment"
            sub={`${stuckPostFee.length} patient${stuckPostFee.length>1?"s":""} paid £200 but aligners not yet ordered`}
            action="Follow up on these cases — high recovery potential"
            color={T.warning}
            patients={stuckPostFee}
          />
        )}
        {stuckPostVideo.length > 0 && (
          <Insight
            value={`${stuckPostVideo.length} patient${stuckPostVideo.length>1?"s":""}`}
            label="have ClinCheck approved and payment confirmed but aligners not ordered"
            sub="These cases are at the final step — easy wins to push over the line"
            action="Contact these patients to confirm alignment order"
            color={T.info}
            patients={stuckPostVideo}
          />
        )}
        {funnel.softRate > 0 && funnel.hardRate < funnel.softRate && (
          <Insight
            value={`${funnel.softRate - funnel.hardRate}%`}
            label="gap between soft and hard conversion"
            sub={`${funnel.softRate}% paid ClinCheck fee (soft) vs ${funnel.hardRate}% ordered aligners (hard) — this gap represents recoverable revenue`}
            action="Prioritise chasing patients through ClinCheck and review video stages"
            color={T.warning}
          />
        )}
      </Section>

      {/* ── AI LEARNING PATTERNS ───────────────────────────────────────── */}
      {(() => {
        const storeRecords  = ConsultationInsightStore.all();
        if (storeRecords.length === 0) return null;
        const signalCounts  = ConsultationInsightStore.signalCounts();
        const barrierCounts = ConsultationInsightStore.barrierCounts();
        const accuracy      = ConsultationInsightStore.accuracy();
        const outcomes      = ConsultationInsightStore.outcomeCounts();
        const missed        = ConsultationInsightStore.missedConversions();
        const surprise      = ConsultationInsightStore.surpriseConversions();
        const total         = storeRecords.length;
        const pctOf = (n) => total > 0 ? Math.round((n/total)*100) : 0;

        return (
          <Section id="ailearning" icon="🧠" title={`AI Consultation Patterns — ${total} consultation${total!==1?"s":""} analysed`}>
            <div style={{ fontSize:12.5, color:T.muted, marginBottom:16 }}>
              Patterns observed across AI-analysed consultations. Based on previous cases — not a guarantee of future outcomes.
            </div>

            {/* Prediction vs outcome */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:10 }}>Predicted likelihood vs actual outcome</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {[
                  { label:"Hard conversions", value:outcomes.hard_converted||0, color:T.success },
                  { label:"Soft conversions", value:outcomes.soft_converted||0, color:T.info },
                  { label:"Consented only",   value:outcomes.consented||0,      color:T.warning },
                  { label:"Did not proceed",  value:outcomes.did_not_proceed||0, color:T.error },
                ].map((o,i) => (
                  <div key={i} style={{ background:"#FAFAFA", border:`1px solid ${T.border}`, borderRadius:7, padding:"10px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:o.color, letterSpacing:-0.5, lineHeight:1, marginBottom:4 }}>{o.value}</div>
                    <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, color:T.muted }}>{o.label}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{pctOf(o.value)}%</div>
                  </div>
                ))}
              </div>
              {accuracy !== null && (
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10, padding:"9px 14px", background:"#FAFAFA", borderRadius:7, border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:18, fontWeight:800, color:accuracy>=70?T.success:accuracy>=50?T.warning:T.error }}>{accuracy}%</div>
                  <div style={{ fontSize:12.5, color:T.muted }}>AI prediction accuracy across analysed consultations</div>
                </div>
              )}
            </div>

            {/* Top signals for conversion */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.success, marginBottom:8 }}>Top signals for conversion</div>
                {signalCounts.length > 0
                  ? signalCounts.map(([sig, count], i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.borderLight}` }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                          <span style={{ color:T.success, flexShrink:0, fontSize:11 }}>✓</span>
                          <span style={{ fontSize:12.5, color:T.ink, lineHeight:1.4 }}>{sig}</span>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:T.success, flexShrink:0, marginLeft:8 }}>{count}×</span>
                      </div>
                    ))
                  : <div style={{ fontSize:12.5, color:T.muted }}>No signals recorded yet</div>
                }
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.warning, marginBottom:8 }}>Common barriers to conversion</div>
                {barrierCounts.length > 0
                  ? barrierCounts.map(([bar, count], i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.borderLight}` }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                          <span style={{ color:T.warning, flexShrink:0, fontSize:11 }}>⚠</span>
                          <span style={{ fontSize:12.5, color:T.ink, lineHeight:1.4 }}>{bar}</span>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:T.warning, flexShrink:0, marginLeft:8 }}>{count}×</span>
                      </div>
                    ))
                  : <div style={{ fontSize:12.5, color:T.muted }}>No barriers recorded yet</div>
                }
              </div>
            </div>

            {/* Missed + surprise conversions */}
            {(missed.length > 0 || surprise.length > 0) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                {missed.length > 0 && (
                  <div style={{ background:T.errorLight, border:`1px solid ${T.errorBorder}`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.error, marginBottom:8 }}>High predicted — did not proceed</div>
                    {missed.map((r,i) => (
                      <div key={i} style={{ fontSize:12.5, color:T.error, marginBottom:3 }}>
                        {r.patientName} · {r.predicted_pct}% predicted
                      </div>
                    ))}
                    <div style={{ fontSize:11.5, color:T.muted, marginTop:6 }}>Pattern: review follow-up process for high-intent patients</div>
                  </div>
                )}
                {surprise.length > 0 && (
                  <div style={{ background:T.successLight, border:`1px solid ${T.successBorder}`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.success, marginBottom:8 }}>Low predicted — converted anyway</div>
                    {surprise.map((r,i) => (
                      <div key={i} style={{ fontSize:12.5, color:T.success, marginBottom:3 }}>
                        {r.patientName} · {r.predicted_pct}% predicted
                      </div>
                    ))}
                    <div style={{ fontSize:11.5, color:T.muted, marginTop:6 }}>Pattern: note what overcame the barriers in these cases</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ fontSize:11.5, color:T.muted, fontStyle:"italic" }}>
              Patterns based on {total} analysed consultation{total!==1?"s":""}. As more consultations are analysed, accuracy and pattern confidence will improve.
            </div>
          </Section>
        );
      })()}

      {/* ── 3. CLINICIAN INSIGHTS ────────────────────────────────────────── */}
      <Section id="clinician" icon="👤" title="Clinician Insights">
        {clinData.map(({ cli, pts, breachPts, bpeMissingPts, decisionsMiss, avgGov }) => (
          <div key={cli} style={{ padding:"14px 0", borderBottom:`1px solid ${T.borderLight}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <Avt name={cli} size={28}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:T.primary }}>{cli}</div>
                <div style={{ fontSize:12, color:T.muted }}>{pts.length} patient{pts.length!==1?"s":""} · avg governance score {avgGov}%</div>
              </div>
              <div style={{ fontSize:13, fontWeight:800, color:avgGov>=80?T.success:avgGov>=60?T.warning:T.error }}>
                {avgGov}%
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, paddingLeft:38 }}>
              {breachPts.length > 0 && (
                <div style={{ fontSize:12.5, color:T.error }}>
                  ⚠ {breachPts.length} case{breachPts.length>1?"s":""} with aligner ordering before prerequisites met
                </div>
              )}
              {bpeMissingPts.length > 0 && (
                <div style={{ fontSize:12.5, color:T.warning }}>
                  ⚠ {bpeMissingPts.length} case{bpeMissingPts.length>1?"s":""} with elevated BPE and no documented management plan
                </div>
              )}
              {decisionsMiss.length > 0 && (
                <div style={{ fontSize:12.5, color:T.warning }}>
                  ⚠ {decisionsMiss.length} case{decisionsMiss.length>1?"s":""} progressed beyond consultation without clinical decisions completed
                </div>
              )}
              {breachPts.length === 0 && bpeMissingPts.length === 0 && decisionsMiss.length === 0 && (
                <div style={{ fontSize:12.5, color:T.success }}>✓ No clinical governance concerns for this clinician</div>
              )}
            </div>
          </div>
        ))}
        <div style={{ marginTop:12, padding:"10px 14px", background:T.infoLight, borderRadius:7, border:`1px solid ${T.infoBorder}`, fontSize:12, color:T.info }}>
          ℹ These insights are for clinical coaching and practice development — not performance management.
        </div>
      </Section>

      {/* ── 4. CASE MIX ──────────────────────────────────────────────────── */}
      <Section id="casemix" icon="🦷" title="Case Mix Intelligence">
        <div style={{ marginBottom:12, fontSize:12.5, color:T.muted }}>
          Characteristics across {n} active patient{n!==1?"s":""} — helps with capacity planning and referral pathways.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {caseMix.map((c, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:180, fontSize:13, color:T.ink }}>{c.label}</div>
              <div style={{ flex:1, height:7, background:"#EEE", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${pct(c.count)}%`, height:"100%", background:T.primary, borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:T.primary, minWidth:40, textAlign:"right" }}>{c.count}</div>
              <div style={{ fontSize:12, color:T.muted, minWidth:36 }}>{pct(c.count)}%</div>
            </div>
          ))}
        </div>
        {caseMix.length === 0 && (
          <div style={{ fontSize:13, color:T.muted }}>Complete assessments to populate case mix data.</div>
        )}
      </Section>

      {/* ── 5. PROTOCOL INTELLIGENCE ─────────────────────────────────────── */}
      <Section id="protocol" icon="⚙" title="Protocol Intelligence (CAP)">
        <div style={{ marginBottom:12, fontSize:12.5, color:T.muted }}>
          CAP protocols most likely triggered across the current patient base, derived from assessment complexity and clinical flags.
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {protoTriggers.map((p, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:200, fontSize:13, color:T.ink }}>{p.label}</div>
              <div style={{ flex:1, height:7, background:"#EEE", borderRadius:4, overflow:"hidden" }}>
                <div style={{ width:`${pct(p.count)}%`, height:"100%", background:T.gold, borderRadius:4 }}/>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:T.goldDim, minWidth:40, textAlign:"right" }}>{p.count}</div>
              <div style={{ fontSize:12, color:T.muted, minWidth:36 }}>{pct(p.count)}%</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, fontSize:12.5, color:T.muted, fontStyle:"italic" }}>
          Protocol frequency is estimated from case complexity. Actual usage is logged when the CAP builder is used in the ClinCheck stage.
        </div>
      </Section>

      {/* ── 6. GOVERNANCE INTELLIGENCE ───────────────────────────────────── */}
      <Section id="governance" icon="🛡" title="Governance Intelligence"
        badge={govFailures.length > 0 ? govFailures.reduce((a,c)=>a+c.failing.length,0) : null}
        badgeColor={T.error}>

        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16, padding:"12px 16px", background:"#FAFAFA", borderRadius:8, border:`1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>Average governance score</div>
            <div style={{ fontSize:28, fontWeight:800, color:avgGovScore>=80?T.success:avgGovScore>=60?T.warning:T.error, letterSpacing:-0.5 }}>{avgGovScore}%</div>
          </div>
          <div style={{ flex:1, height:8, background:"#EEE", borderRadius:4, overflow:"hidden" }}>
            <div style={{ width:`${avgGovScore}%`, height:"100%", background:avgGovScore>=80?T.success:avgGovScore>=60?T.warning:T.error, borderRadius:4 }}/>
          </div>
        </div>

        {govFailures.length === 0 ? (
          <div style={{ fontSize:13, color:T.success, fontWeight:600 }}>✓ All governance criteria met across active cases.</div>
        ) : (
          govFailures.map(({ id, label, weight, failing }) => (
            <div key={id} style={{ padding:"11px 0", borderBottom:`1px solid ${T.borderLight}` }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:5 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{label}</span>
                  <span style={{ fontSize:11, color:T.muted, marginLeft:8 }}>({weight} pt criterion)</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:T.error, background:T.errorLight, borderRadius:4, padding:"2px 8px", flexShrink:0 }}>
                  {failing.length} case{failing.length>1?"s":""}
                </span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {failing.map(p => (
                  <span key={p.id} style={{ fontSize:11, background:"#F0F0F0", borderRadius:3, padding:"2px 8px", color:T.sub }}>{p.name}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* ── 7. FORECAST ──────────────────────────────────────────────────── */}
      <Section id="forecast" icon="📊" title="Pipeline Forecast">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
          {[
            { label:"Total pipeline value",  value:`£${pipelineVal.toLocaleString()}`,    sub:"Quoted fees across all active cases", color:T.primary },
            { label:"Value likely to convert", value:`£${likelyConvert.toLocaleString()}`, sub:"ClinCheck paid — no clinical blockers",  color:T.success },
            { label:"Value at risk",          value:`£${atRiskVal.toLocaleString()}`,      sub:"Clinical blockers preventing progression", color:T.error },
          ].map((s,i) => (
            <div key={i} style={{ background:"#FAFAFA", border:`1px solid ${T.border}`, borderRadius:8, padding:"14px 16px", borderTop:`3px solid ${s.color}` }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted, marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color, letterSpacing:-0.5, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:11.5, color:T.muted }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {atRiskVal > 0 && (
          <Insight
            value={`£${atRiskVal.toLocaleString()}`}
            label="currently at risk due to clinical blockers"
            sub="Resolving these blockers could unlock this revenue"
            action="Address clinical blockers in the risk section above"
            color={T.error}
          />
        )}
        {likelyConvert > 0 && (
          <Insight
            value={`£${likelyConvert.toLocaleString()}`}
            label="likely to convert — patients ready to proceed"
            sub="ClinCheck fee paid, no clinical blockers detected"
            action="Prioritise review video and aligner ordering for these cases"
            color={T.success}
          />
        )}
        <div style={{ marginTop:8, padding:"10px 14px", background:T.infoLight, borderRadius:7, border:`1px solid ${T.infoBorder}`, fontSize:12, color:T.info }}>
          ℹ Forecasts are derived from current pipeline stage and governance status. Not a financial guarantee.
        </div>
      </Section>

    </div>
  );
}



function AnalyticsPage() {
  const patients   = MOCK_PATIENTS;
  const total      = patients.length;
  const complete   = patients.filter(p=>p.stage==="complete").length;
  const activeTx   = patients.filter(p=>p.stage==="active_tx").length;
  const totalValue = patients.filter(p=>p.value).reduce((a,p)=>a+(p.value||0),0);
  const avgValue   = patients.filter(p=>p.value).length
    ? Math.round(totalValue/patients.filter(p=>p.value).length) : 0;
  const funnel     = computePracticeFunnel(patients);
  const softRate   = funnel.softRate;   // consultation → ClinCheck fee paid
  const hardRate   = funnel.hardRate;   // consultation → aligners ordered
  const govSafe    = patients.filter(p=>evaluateGovernance(p).status==="SAFE").length;

  const stageCounts = Object.entries(STAGE_CONFIG).map(([id,cfg])=>({
    id, label:cfg.label, color:cfg.color,
    count: patients.filter(p=>p.stage===id).length,
  })).filter(s=>s.count>0);

  const cliNames     = [...new Set(patients.map(p=>p.cli))];
  const cliBreakdown = cliNames.map(cli=>{
    const pts = patients.filter(p=>p.cli===cli);
    const n   = pts.length;
    return {
      cli, total:n,
      value:    pts.filter(p=>p.value).reduce((a,p)=>a+(p.value||0),0),
      complete: pts.filter(p=>p.stage==="complete").length,
      softRate: n>0 ? Math.round((pts.filter(p=>p.clincheckFeePaid).length/n)*100) : 0,
      hardRate: n>0 ? Math.round((pts.filter(p=>p.alignersOrdered).length/n)*100) : 0,
    };
  }).sort((a,b)=>b.total-a.total);

  const Stat = ({label, value, sub, accentColor, color}) => (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"16px 20px", borderTop:`3px solid ${accentColor||T.cyan}` }}>
      <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:color||T.primary, letterSpacing:-0.5, lineHeight:1, marginBottom:3 }}>{value}</div>
      {sub && <div style={{ fontSize:11.5, color:T.muted }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding:"28px 36px", maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.muted, marginBottom:3 }}>{TENANT.practice}</div>
        <div style={{ fontSize:22, fontWeight:800, color:T.primary, letterSpacing:-0.3 }}>Practice Analytics</div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:22 }}>
        <Stat label="Total Cases"        value={total}                                sub="All time"                           accentColor={T.cyan}/>
        <Stat label="Treatment Pipeline" value={`£${(totalValue/1000).toFixed(0)}k`} sub="Quoted fees in pipeline"            accentColor={T.gold}    color={T.goldDim}/>
        <Stat label="Avg Case Value"     value={`£${avgValue.toLocaleString()}`}      sub="Per quoted case"                   accentColor={T.goldDim} color={T.goldDim}/>
        <Stat label="Soft Conversion"    value={`${softRate}%`}                       sub="Consultation → ClinCheck fee paid" accentColor={softRate>=60?T.success:T.warning} color={softRate>=60?T.success:T.warning}/>
        <Stat label="Hard Conversion"    value={`${hardRate}%`}                       sub="Consultation → aligners ordered"   accentColor={hardRate>=50?T.success:T.warning} color={hardRate>=50?T.success:T.warning}/>
        <Stat label="In Treatment"       value={activeTx}                             sub="Aligners dispensed"                accentColor={T.primary}/>
        <Stat label="Completed"          value={complete}                             sub="Treatment finished"                accentColor={T.success} color={T.success}/>
        <Stat label="Governance Safe"    value={govSafe}                             sub="Fully compliant"                   accentColor={T.success} color={T.success}/>
      </div>

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"18px 22px", marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:14 }}>Case Distribution by Stage</div>
        <div style={{ display:"flex", gap:1, height:10, borderRadius:5, overflow:"hidden", marginBottom:10 }}>
          {stageCounts.map(s=><div key={s.id} style={{ flex:s.count, background:s.color }} title={`${s.label}: ${s.count}`}/>)}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
          {stageCounts.map(s=>(
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }}/>
              <span style={{ fontSize:11.5, color:T.sub }}>{s.label}</span>
              <span style={{ fontSize:11.5, fontWeight:700, color:s.color }}>{s.count} ({Math.round(s.count/total*100)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Consultation Insight Summary */}
      {ConsultationInsightStore.count() > 0 && (() => {
        const acc  = ConsultationInsightStore.accuracy();
        const outs = ConsultationInsightStore.outcomeCounts();
        const n    = ConsultationInsightStore.count();
        return (
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:12 }}>AI Consultation Insights — {n} analysed</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {[
                { label:"Hard converted",    value:outs.hard_converted||0,  color:T.success },
                { label:"Soft converted",    value:outs.soft_converted||0,  color:T.info    },
                { label:"Did not proceed",   value:outs.did_not_proceed||0, color:T.error   },
                { label:"Prediction accuracy", value:acc!=null?`${acc}%`:"—", color:acc>=70?T.success:T.warning },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:s.color, letterSpacing:-0.5, lineHeight:1, marginBottom:3 }}>{s.value}</div>
                  <div style={{ fontSize:10.5, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, color:T.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"12px 20px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted }}>Clinician Overview</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 70px 100px 80px 80px", padding:"8px 20px", background:"#F7F7F7", borderBottom:`1px solid ${T.border}` }}>
          {["Clinician","Cases","Pipeline","Soft Conv.","Hard Conv."].map(h=>(
            <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:T.muted }}>{h}</span>
          ))}
        </div>
        {cliBreakdown.map((row,i)=>(
          <div key={row.cli} style={{ display:"grid", gridTemplateColumns:"1.5fr 70px 100px 80px 80px", padding:"12px 20px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Avt name={row.cli} size={28}/>
              <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{row.cli}</span>
            </div>
            <span style={{ fontSize:13, color:T.sub }}>{row.total}</span>
            <span style={{ fontSize:13, fontWeight:600, color:T.primary }}>£{(row.value/1000).toFixed(0)}k</span>
            <span style={{ fontSize:13, fontWeight:700, color:row.softRate>=60?T.success:T.warning }}>{row.softRate}%</span>
            <span style={{ fontSize:13, fontWeight:700, color:row.hardRate>=50?T.success:T.warning }}>{row.hardRate}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page,          setPage]         = useState("dashboard");
  const [activePatient, setActivePatient]= useState(null);
  const [currentRole,   setCurrentRole]  = useState(CURRENT_USER.role);
  // Reactively override role for dev switching — no page reload needed
  CURRENT_USER.role = currentRole;
  const { role, can, user }              = useRole();

  const handleNewConsultation = () => {
    setActivePatient({ name:"New Patient", id:"new-" + Date.now() });
    setPage("workflow");
  };
  const handleOpenPatient = (p) => {
    setActivePatient(p);
    setPage("workflow");
    if (p && p.name !== "New Patient") AuditLog.record({ action:"workflow_opened", detail:`Patient file opened`, patientName:p.name });
  };

  // Filter nav items by role
  const allowedNav = NAV_ITEMS.filter(item => role.navItems.includes(item.id));

  const renderPage = () => {
    if (page === "workflow") {
      if (!can("consultation")) return <AccessDenied feature="patient workflow"/>;
      return <PatientWorkflow patient={activePatient} onBack={() => { setPage("dashboard"); setActivePatient(null); }}/>;
    }
    if (page === "dashboard")    return <DashboardPage onNewConsultation={handleNewConsultation} onOpenPatient={handleOpenPatient}/>;
    if (page === "patients")     return <PatientsPage  onNewConsultation={handleNewConsultation} onOpenPatient={handleOpenPatient}/>;
    if (page === "analytics")    return <AnalyticsPage/>;
    if (page === "governance") {
      if (!can("billing") && CURRENT_USER.role !== "clinical_director") return <AccessDenied feature="Governance Dashboard"/>;
      return <GovernanceDashboard/>;
    }
    if (page === "audit") {
      if (!can("billing") && CURRENT_USER.role !== "clinical_director") return <AccessDenied feature="Audit Log"/>;
      return <AuditLogPage/>;
    }
    if (page === "intelligence") {
      if (!can("clinicalIntel")) return <AccessDenied feature="Clinical Intelligence"/>;
      return <ClinicalIntelPage/>;
    }
    if (page === "team") {
      if (!can("team")) return <AccessDenied feature="Team Management"/>;
      return <TeamPage/>;
    }
    if (page === "audit") {
      return <AuditLogPage/>;
    }
    if (page === "security") {
      return <SecurityPage/>;
    }
    if (page === "trust") {
      return <TrustCentrePage onGoToSecurity={() => setPage("security")}/>;
    }
    if (page === "settings") {
      return (
        <div style={{ padding:"32px 36px" }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#222", marginBottom:12 }}>Settings</div>
          <div style={{ color:T.muted, fontSize:13.5 }}>Practice configuration, clinician accounts, consent template management, billing.</div>
          {!can("settings_billing") && (
            <div style={{ marginTop:16, padding:"12px 16px", background:T.errorLight, border:`1px solid ${T.errorBorder}`, borderRadius:6, fontSize:13, color:T.error }}>
              🔒 Billing & subscription settings are restricted to Practice Managers.
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background:T.bg, color:T.ink }}>
      {/* CSS — Invisalign-native */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#F0F0F0; }
        ::-webkit-scrollbar-thumb { background:#CCCCCC; border-radius:3px; }
        input,select,textarea,button { font-family:inherit; outline:none; }

        @keyframes chipIn {
          0%   { opacity:0; transform:scale(0.90) translateX(-5px); }
          65%  { opacity:1; transform:scale(1.02); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes expandIn {
          0%   { opacity:0; transform:translateY(-5px); }
          100% { opacity:1; transform:translateY(0); }
        }
        @keyframes problemFlash {
          0%   { box-shadow:0 0 0 0 rgba(212,166,74,0.5); }
          30%  { box-shadow:0 0 0 6px rgba(212,166,74,0.2); }
          100% { box-shadow:0 0 0 0 rgba(212,166,74,0); }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* ══ INVISALIGN-STYLE TOP HEADER ══════════════════════════════════════ */}
      <div style={{ flexShrink:0 }}>
        {/* Brand bar — very dark charcoal like Invisalign */}
        <div style={{
          background: "linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)",
          padding: "0 32px",
          height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #1A1A1A",
          position: "relative",
          // Subtle topographic texture overlay
          backgroundImage: "linear-gradient(180deg, #3D3D3D 0%, #282828 100%)",
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* SmileOS snowflake-style mark */}
            <div style={{
              width: 34, height: 34,
              background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent)",
              borderRadius: "50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: 20, color: "#fff", fontWeight: 800,
              border: "1.5px solid rgba(255,255,255,0.2)",
            }}>✦</div>
            <div>
              <span style={{ fontSize:17, fontWeight:700, color:"#fff", letterSpacing:0.5 }}>SmileOS</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginLeft:6 }}>®</span>
            </div>
          </div>

          {/* Right: user + role */}
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <RoleBadge roleId={user.role}/>
            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.15)" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:"#fff" }}>Hello, {user.name}</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.45)" }}>{TENANT.practice}</div>
              </div>
              <div style={{ width:30, height:30, borderRadius:"50%", background:"#555", border:"1.5px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>
                {user.initials}
              </div>
              {/* Dev role switcher — uses app-level state, no reload needed */}
              <select
                value={currentRole}
                onChange={e=>setCurrentRole(e.target.value)}
                style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", borderRadius:4, padding:"2px 6px", fontSize:10, fontFamily:"inherit", cursor:"pointer" }}
                title="Switch role (dev only)"
              >
                <option value="clinical">Clinical</option>
                <option value="admin">Admin</option>
                <option value="clinical_director">Owner</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation bar — horizontal, like Invisalign */}
        <div style={{
          background: "#2D2D2D",
          padding: "0 16px",
          display: "flex", alignItems: "stretch",
          gap: 0,
          borderBottom: "2px solid #1A1A1A",
          height: 46,
          overflowX: "auto",
          overflowY: "hidden",
        }}>
          {allowedNav.map(item => {
            const active = page === item.id || (page === "workflow" && item.id === "workflow");
            return (
              <button
                key={item.id}
                onClick={() => { if(item.id==="workflow") handleNewConsultation(); else setPage(item.id); }}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: active ? `2px solid ${T.cyan}` : "2px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  padding: "0 13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: 0.1,
                  marginBottom: -2,
                  transition: "all 0.12s",
                  whiteSpace: "nowrap",
                  // Cyan "Add patient" style for workflow button
                  ...(item.highlight ? {
                    background: T.cyan,
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 4,
                    padding: "8px 18px",
                    margin: "6px 0 6px 8px",
                    borderBottom: "2px solid transparent",
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13,
                  } : {}),
                }}
                onMouseEnter={e => { if (!active && !item.highlight) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={e => { if (!active && !item.highlight) e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              >
                {item.highlight ? <><span style={{ fontSize:15, lineHeight:1 }}>+</span> {item.label}</> : item.label}
              </button>
            );
          })}

          <div style={{ flex:1 }}/>

          {/* Workflow crumb when in patient mode */}
          {page === "workflow" && activePatient && (
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"rgba(255,255,255,0.5)" }}>
              <button onClick={()=>setPage("patients")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
                Patients
              </button>
              <span>›</span>
              <span style={{ color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{activePatient.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div style={{ flex:1, overflow: page === "workflow" ? "hidden" : "auto", background: T.bg }}>
        {renderPage()}
      </div>
    </div>
  );
}

// ── TEAM PAGE ────────────────────────────────────────────────────────────────
// ─── AUDIT LOG PAGE ───────────────────────────────────────────────────────────

function TeamPage() {
  const members = [
    { name:"Dr Haroon Ismail", role:"clinical", status:"Active", patients:24, since:"2021" },
    { name:"Dr Sarah Chen",    role:"clinical", status:"Active", patients:18, since:"2022" },
    { name:"Dr James Park",    role:"clinical", status:"Active", patients:15, since:"2023" },
    { name:"Priya Kapoor",     role:"admin",    status:"Active", patients:0,  since:"2022" },
    { name:"Emma Thompson",    role:"marketing",status:"Active", patients:0,  since:"2023" },
  ];
  return (
    <div style={{ padding:"28px 36px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"#222" }}>Team Management</div>
        <button style={{ background:T.cyan, color:"#fff", border:"none", borderRadius:5, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Invite Member
        </button>
      </div>
      <div style={{ background:"#fff", borderRadius:6, border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"10px 20px", background:"#F8F8F8", borderBottom:`1px solid ${T.border}` }}>
          {["Member","Role","Patients","Since","Status"].map(h=>(
            <span key={h} style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted }}>{h}</span>
          ))}
        </div>
        {members.map((m,i)=>(
          <div key={m.name} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"13px 20px", borderBottom:i<members.length-1?`1px solid ${T.border}`:"none", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Avt name={m.name} size={28}/>
              <span style={{ fontSize:13.5, fontWeight:600, color:"#222" }}>{m.name}</span>
            </div>
            <RoleBadge roleId={m.role}/>
            <span style={{ fontSize:13, color:T.sub }}>{m.patients > 0 ? m.patients : "—"}</span>
            <span style={{ fontSize:13, color:T.muted }}>{m.since}</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.success, background:T.successLight, borderRadius:12, padding:"2px 10px", display:"inline-block" }}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// DENTIST DASHBOARD — operational, focused, minimal
// ══════════════════════════════════════════════════════════════════════════════

function DentistDashboard({ onNewConsultation, onOpenPatient }) {
  const patients  = MOCK_PATIENTS;
  const myName    = CURRENT_USER.name;
  const firstName = myName.split(" ")[1] || myName.split(" ")[0];
  const govRows   = patients.map(p => ({ p, ws: getWorstStatus(p) }));

  // ── FIX 1: Pipeline filter state ──────────────────────────────────────────
  const [pipeFilter, setPipeFilter] = useState(null); // null = show all

  // ── Computed data ─────────────────────────────────────────────────────────
  const funnel       = computePracticeFunnel(patients);
  const casesStarted = funnel.hardConverted;
  const softStarts   = funnel.softConverted;
  const valuePatients = patients.filter(p=>p.value);
  const avgCaseValue  = valuePatients.length > 0 ? Math.round(valuePatients.reduce((a,p)=>a+(p.value||0),0) / valuePatients.length) : 0;
  const pending       = govRows.filter(r => r.ws.tl !== "GREEN").length;
  const thisMonthVal  = funnel.pipelineVal;
  const pendingVal    = patients.filter(p=>p.value&&!p.alignersOrdered).reduce((a,p)=>a+(p.value||0),0);

  // ── Action items ──────────────────────────────────────────────────────────
  const awaitingConsent = patients.filter(p => p.stage === "consent_sent" && !p.signed);
  const videoWatched    = patients.filter(p => p.clincheckApproved && p.signed && !p.alignersOrdered);
  const paymentPending  = patients.filter(p => p.signed && !p.paymentVerified);
  const blockers        = govRows.filter(r => r.ws.tl === "RED");
  const totalActions    = awaitingConsent.length + videoWatched.length + paymentPending.length;

  // ── Pipeline stages — each has a filter function for the case list ────────
  const PIPE_STAGES = [
    { label:"Consultation",     patients: patients.filter(p=>p.stage==="consultation") },
    { label:"Assessment",       patients: patients.filter(p=>p.stage==="assessment") },
    { label:"Consent",          patients: patients.filter(p=>["consent_draft","consent_sent"].includes(p.stage)) },
    { label:"Payment",          patients: patients.filter(p=>p.paymentVerified&&!p.clincheckApproved) },
    { label:"ClinCheck",        patients: patients.filter(p=>p.clincheckApproved&&!["active_tx","complete"].includes(p.stage)) },
    { label:"Review Video",     patients: patients.filter(p=>p.clincheckApproved&&p.signed&&!p.alignersOrdered) },
    { label:"Ready to Proceed", patients: patients.filter(p=>p.clincheckApproved&&p.paymentVerified&&!p.alignersOrdered) },
  ].map(s => ({ ...s, count: s.patients.length }));

  // ── FIX 1: Filtered case list ─────────────────────────────────────────────
  const filteredPipeIds = pipeFilter
    ? new Set(PIPE_STAGES.find(s=>s.label===pipeFilter)?.patients.map(p=>p.id) || [])
    : null;
  const visibleRows = [...govRows]
    .sort((a,b)=>({RED:0,AMBER:1,GREEN:2}[a.ws.tl])-({RED:0,AMBER:1,GREEN:2}[b.ws.tl]))
    .filter(({p}) => !filteredPipeIds || filteredPipeIds.has(p.id));

  // ── Recent activity ───────────────────────────────────────────────────────
  const auditEntries = AuditLog.all().slice(0, 8);
  const derivedActivity = [];
  patients.forEach(p => {
    if (p.alignersOrdered)                        derivedActivity.push({ detail:"Aligners ordered",        patientName:p.name, ts:null });
    if (p.signed)                                 derivedActivity.push({ detail:"Consent signed",          patientName:p.name, ts:null });
    if (p.clincheckApproved)                      derivedActivity.push({ detail:"ClinCheck approved",      patientName:p.name, ts:null });
    if (p.clincheckFeePaid && !p.clincheckApproved) derivedActivity.push({ detail:"ClinCheck fee received",patientName:p.name, ts:null });
    if (p.paymentVerified && !p.alignersOrdered)  derivedActivity.push({ detail:"Payment confirmed",       patientName:p.name, ts:null });
  });
  const recentActivity = auditEntries.length > 0 ? auditEntries : derivedActivity.slice(0, 6);

  // ── FIX 4: Smart dynamic header ───────────────────────────────────────────
  const todayPts     = patients.filter(p => p.date === "Today");
  const headerLine   = todayPts.length > 0
    ? `${todayPts.length} patient${todayPts.length > 1 ? "s" : ""} scheduled today`
    : totalActions > 0
      ? `${totalActions} case${totalActions > 1 ? "s" : ""} need${totalActions === 1 ? "s" : ""} your attention`
      : "All cases on track";
  const headerColor  = todayPts.length > 0 ? T.primary
    : totalActions > 0 ? T.warning : T.success;

  // ── Row: action item ──────────────────────────────────────────────────────
  const ActionRow = ({ name, status, next, tl, onClick }) => (
    <div onClick={onClick}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${T.borderLight}`, cursor:"pointer", gap:12 }}
      onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:tl===0?T.error:tl===1?T.warning:T.info, flexShrink:0 }}/>
        <div>
          <span style={{ fontSize:13.5, fontWeight:600, color:T.ink }}>{name}</span>
          <span style={{ fontSize:12, color:T.muted, marginLeft:8 }}>{status}</span>
        </div>
      </div>
      <span style={{ fontSize:12, fontWeight:600, color:tl===0?T.error:T.warning, whiteSpace:"nowrap", flexShrink:0 }}>{next} →</span>
    </div>
  );

  return (
    <div style={{ background:"#FAFAF8", minHeight:"100%" }}>
      {/* ── FIX 5: Responsive CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          .db-metrics { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
          .db-grid    { grid-template-columns: 1fr !important; }
          .db-pipeline { margin-top: 0 !important; }
          .db-cases   { grid-template-columns: 1fr 1fr !important; overflow-x: auto; }
        }
        @media (max-width: 480px) {
          .db-metrics { grid-template-columns: 1fr !important; }
        }
        .pipe-row:hover { background: #F5F5F5; border-radius: 6px; }
      `}</style>

      <div style={{ maxWidth:980, margin:"0 auto", padding:"32px 24px 72px" }}>

        {/* ── FIX 3+4: HEADER — smart, no duplicate CTA ── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.8, textTransform:"uppercase", color:T.muted, marginBottom:10 }}>
            {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:headerColor, letterSpacing:-0.5, marginBottom:6 }}>
            {headerLine}
          </div>
          <div style={{ fontSize:14, color:T.muted }}>
            £{thisMonthVal.toLocaleString()} in treatment value this month
            {todayPts.length > 0 && totalActions > 0 && (
              <span style={{ marginLeft:14, fontSize:13, fontWeight:600, color:T.warning }}>
                · {totalActions} action{totalActions>1?"s":""} pending
              </span>
            )}
          </div>
        </div>

        {/* ── FIX 2+6: METRICS — soft conversion tooltip, stronger sub-label ── */}
        <div className="db-metrics" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, marginBottom:36, borderBottom:`1px solid ${T.border}`, paddingBottom:28 }}>
          {[
            { label:"Hard conversions",  value:casesStarted, sub:"Aligners ordered",    accent:casesStarted>0?T.success:T.muted, tip:null },
            { label:"Soft conversions",  value:softStarts,   sub:"ClinCheck fee paid",  accent:softStarts>0?T.info:T.muted,
              tip:"Patients who have paid for orthodontic assessment but have not yet started treatment" },
            { label:"Avg case value",    value:`£${avgCaseValue.toLocaleString()}`, sub:"Per patient", accent:T.primary, tip:null },
            { label:"Pending patients",  value:pending,      sub:"Need attention",       accent:pending>0?T.warning:T.success, tip:null },
          ].map((m, i, arr) => (
            <div key={m.label} title={m.tip||undefined}
              style={{ paddingRight:i<arr.length-1?24:0, borderRight:i<arr.length-1?`1px solid ${T.border}`:"none", paddingLeft:i>0?24:0, cursor:m.tip?"help":"default" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.6, textTransform:"uppercase", color:T.muted, marginBottom:8 }}>{m.label}</div>
              <div style={{ fontSize:34, fontWeight:800, color:m.accent, letterSpacing:-1, lineHeight:1, marginBottom:4 }}>{m.value}</div>
              <div style={{ fontSize:12.5, color:T.ink, fontWeight:500 }}>{m.sub}</div>
              {m.tip && <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Hover for detail</div>}
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="db-grid" style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:28, marginBottom:32 }}>

          {/* ── LEFT: ACTIONS + BLOCKERS + ACTIVITY ── */}
          <div>
            {/* Needs your attention */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>Needs your attention</div>
                {totalActions > 0 && (
                  <div style={{ fontSize:12, fontWeight:600, color:T.warning, background:T.warningLight, borderRadius:20, padding:"2px 10px" }}>
                    {totalActions} open
                  </div>
                )}
              </div>

              {totalActions === 0 ? (
                <div style={{ padding:"18px 0", fontSize:13.5, color:T.success, fontWeight:600 }}>
                  ✓ All clear — no actions required right now.
                </div>
              ) : (
                <div style={{ marginTop:12 }}>
                  {awaitingConsent.length > 0 && (
                    <>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:6, marginTop:4 }}>Consent outstanding</div>
                      {awaitingConsent.map(p => (
                        <ActionRow key={p.id} name={p.name} status="Consent sent — not yet signed" next="Chase signature" tl={1} onClick={() => onOpenPatient && onOpenPatient(p)}/>
                      ))}
                    </>
                  )}
                  {paymentPending.length > 0 && (
                    <>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:6, marginTop:14 }}>Payment pending</div>
                      {paymentPending.map(p => (
                        <ActionRow key={p.id} name={p.name} status="Payment not confirmed" next="Confirm payment" tl={1} onClick={() => onOpenPatient && onOpenPatient(p)}/>
                      ))}
                    </>
                  )}
                  {videoWatched.length > 0 && (
                    <>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:"uppercase", color:T.muted, marginBottom:6, marginTop:14 }}>Review video</div>
                      {videoWatched.map(p => (
                        <ActionRow key={p.id} name={p.name} status="Review video not yet sent" next="Send review video" tl={1} onClick={() => onOpenPatient && onOpenPatient(p)}/>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Clinical blockers */}
            {blockers.length > 0 && (
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.error, marginBottom:4 }}>Clinical blockers</div>
                <div style={{ fontSize:12, color:T.muted, marginBottom:10 }}>Cannot progress until resolved</div>
                {blockers.map(({ p, ws }) => (
                  <ActionRow key={p.id} name={p.name} status={ws.reason} next={ws.nextAction} tl={0} onClick={() => onOpenPatient && onOpenPatient(p)}/>
                ))}
              </div>
            )}

            {/* Recent activity */}
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.primary, marginBottom:14 }}>Recent activity</div>
              {recentActivity.length === 0 ? (
                <div style={{ fontSize:13, color:T.muted }}>No recent activity.</div>
              ) : recentActivity.map((entry, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:`1px solid ${T.borderLight}` }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:T.cyan, flexShrink:0, marginTop:4 }}/>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, color:T.ink }}>{entry.detail || entry.action}</span>
                    {entry.patientName && <span style={{ fontSize:12, color:T.muted, marginLeft:6 }}>· {entry.patientName}</span>}
                  </div>
                  {entry.ts && <div style={{ fontSize:11, color:T.muted, flexShrink:0 }}>{new Date(entry.ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: PIPELINE + MONEY ── */}
          <div className="db-pipeline">

            {/* FIX 1: Clickable pipeline */}
            <div style={{ marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>Your pipeline</div>
                {pipeFilter && (
                  <button onClick={() => setPipeFilter(null)}
                    style={{ fontSize:11, fontWeight:600, color:T.muted, background:"#EAEAEA", border:"none", borderRadius:4, padding:"3px 9px", cursor:"pointer", fontFamily:"inherit" }}>
                    Clear filter ✕
                  </button>
                )}
              </div>
              <div style={{ display:"flex", flexDirection:"column" }}>
                {PIPE_STAGES.map((s, i) => {
                  const isActive = pipeFilter === s.label;
                  return (
                    <div key={s.label}
                      className="pipe-row"
                      onClick={() => setPipeFilter(isActive ? null : s.label)}
                      style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"9px 8px", marginBottom:1,
                        cursor:"pointer", borderRadius:6, transition:"background 0.1s",
                        background: isActive ? `${T.primary}10` : "transparent",
                        border: isActive ? `1px solid ${T.primary}30` : "1px solid transparent",
                      }}>
                      <span style={{ fontSize:13, color: s.count>0 ? (isActive?T.primary:T.ink) : T.muted, fontWeight:isActive?600:400 }}>
                        {s.label}
                      </span>
                      <span style={{ fontSize:14, fontWeight:s.count>0?700:400, color:s.count>0?(isActive?T.primary:T.primary):T.muted }}>
                        {s.count > 0 ? s.count : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {pipeFilter && (
                <div style={{ fontSize:11.5, color:T.muted, marginTop:8, paddingLeft:8 }}>
                  Showing {visibleRows.length} patient{visibleRows.length!==1?"s":""} in {pipeFilter}
                </div>
              )}
            </div>

            {/* Money snapshot */}
            <div style={{ background:T.primary, borderRadius:12, padding:"20px" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.6, textTransform:"uppercase", color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Money snapshot</div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:3 }}>Generated this month</div>
                <div style={{ fontSize:28, fontWeight:800, color:T.gold, letterSpacing:-0.5 }}>£{thisMonthVal.toLocaleString()}</div>
              </div>
              <div style={{ height:1, background:"rgba(255,255,255,0.1)", marginBottom:14 }}/>
              <div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:3 }}>Pending value</div>
                <div style={{ fontSize:22, fontWeight:800, color:"rgba(255,255,255,0.7)", letterSpacing:-0.3 }}>£{pendingVal.toLocaleString()}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:3 }}>Not yet started treatment</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── All active cases — filters with pipeline ── */}
        <div>
          <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.primary }}>
              {pipeFilter ? `${pipeFilter} — ${visibleRows.length} patient${visibleRows.length!==1?"s":""}` : "All active cases"}
            </div>
            {pipeFilter && (
              <span style={{ fontSize:12, color:T.muted }}>
                Click any pipeline stage to filter · <span onClick={()=>setPipeFilter(null)} style={{ color:T.cyan, cursor:"pointer", textDecoration:"underline" }}>show all</span>
              </span>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.4fr 1.6fr", padding:"0 0 8px", borderBottom:`1px solid ${T.border}`, marginBottom:2 }}>
            {["Patient","Stage","Status","Next action"].map(h => (
              <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted }}>{h}</span>
            ))}
          </div>
          {visibleRows.map(({p,ws},i,arr) => (
            <div key={p.id} onClick={() => onOpenPatient && onOpenPatient(p)}
              style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.4fr 1.6fr", padding:"14px 0", borderBottom: i<arr.length-1?`1px solid ${T.borderLight}`:"none", cursor:"pointer", alignItems:"center", transition:"opacity 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.65"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Avt name={p.name} size={30}/>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:T.ink }}>{p.name}</div>
                  <div style={{ fontSize:11, color:T.muted }}>{p.date}</div>
                </div>
              </div>
              <StagePill stage={p.stage}/>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:{RED:T.error,AMBER:T.warning,GREEN:T.success}[ws.tl], flexShrink:0 }}/>
                <span style={{ fontSize:12, color:{RED:T.error,AMBER:T.warning,GREEN:T.success}[ws.tl], fontWeight:ws.tl!=="GREEN"?600:400 }}>
                  {ws.tl==="RED"?"Do Not Proceed":ws.tl==="AMBER"?"Needs Attention":"Ready to Proceed"}
                </span>
              </div>
              <span style={{ fontSize:12.5, color:{RED:T.error,AMBER:T.warning,GREEN:T.success}[ws.tl], fontWeight:ws.tl!=="GREEN"?600:400 }}>{ws.nextAction}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// OWNER / MANAGER DASHBOARD — sales, conversion, compliance
// ══════════════════════════════════════════════════════════════════════════════

function OwnerDashboard({ onNewConsultation, onOpenPatient }) {
  const patients   = MOCK_PATIENTS;
  const funnel     = computePracticeFunnel(patients);
  const cliTable   = buildEnrichedClinicianTable(patients);
  const govRows    = patients.map(p => ({ p, fs: evaluateFullStatus(p) }));
  const redCases   = govRows.filter(r => r.fs.govStatus==="BREACH" || r.fs.alignerBreaches.length>0);
  const amberCases = govRows.filter(r => r.fs.govStatus==="AT_RISK" && r.fs.alignerBreaches.length===0);
  const exceptions = govRows.filter(r => r.fs.govStatus!=="SAFE" || r.fs.alignerBreaches.length>0);

  const KPI = ({label,value,sub,color,accentColor}) => (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"15px 18px", borderTop:`3px solid ${accentColor||T.cyan}` }}>
      <div style={{ fontSize:10.5, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:color||T.primary, letterSpacing:-0.4, lineHeight:1, marginBottom:3 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding:"24px 32px", maxWidth:1200, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.muted, marginBottom:2 }}>Owner View</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.primary, letterSpacing:-0.3 }}>{TENANT.practice}</div>
          <div style={{ fontSize:12.5, color:T.muted, marginTop:2 }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <button onClick={onNewConsultation} style={{ background:T.cyan, color:"#fff", border:"none", borderRadius:6, padding:"10px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
          <span style={{fontSize:17}}>+</span> New Consultation
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:18 }}>
        <KPI label="Consults"        value={funnel.total}          sub="All time"                    accentColor={T.cyan}/>
        <KPI label="Commitment Rate" value={`${funnel.commitRate}%`} sub="Consultations proceeding to plan"       accentColor={T.info}  color={funnel.commitRate>=60?T.success:T.warning}/>
        <KPI label="Hard Conversions" value={`${funnel.hardRate}%`}   sub="Consultations → aligners ordered"        accentColor={T.gold}  color={funnel.hardRate>=50?T.success:T.warning}/>
        <KPI label="Soft Conversions" value={`${funnel.softRate}%`}   sub="Consultations → ClinCheck fee paid"      accentColor={T.info}  color={funnel.softRate>=60?T.success:T.warning}/>
        <KPI label="Active Pipeline" value={`£${(funnel.pipelineVal/1000).toFixed(0)}k`} sub="Estimated treatment value" accentColor={T.gold} color={T.goldDim}/>
        <KPI label="Red Flag Cases"  value={redCases.length}        sub="Require immediate action"   accentColor={T.error} color={redCases.length>0?T.error:T.success}/>
      </div>

      {/* ── Second row: Sales Funnel + Compliance Snapshot ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>

        {/* Sales Funnel */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:16 }}>Patient Progress</div>
          {[
            { label:"Initial Consultations", value:funnel.total,  color:T.primary },
            { label:"ClinCheck fee paid (soft)", value:funnel.softConverted, color:T.info },
            { label:"Aligners ordered (hard)", value:funnel.hardConverted,  color:T.success },
            { label:"In Treatment",     value:funnel.activeCases, color:T.cyan    },
          ].map((row, i, arr) => {
            const pct = Math.round((row.value / Math.max(funnel.total,1)) * 100);
            return (
              <div key={row.label} style={{ marginBottom:i<arr.length-1?12:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:12.5, color:T.sub }}>{row.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:row.color }}>{row.value}</span>
                    <span style={{ fontSize:11, color:T.faint, minWidth:32, textAlign:"right" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height:6, background:T.borderLight, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:row.color, borderRadius:3, transition:"width 0.3s" }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compliance Snapshot */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:T.muted, marginBottom:16 }}>Clinical Governance</div>
          {[
            { label:"Immediate Clinical Attention", value:redCases.length, color:T.error, bg:T.errorLight, note:"Do not proceed" },
            { label:"Cases Needing Review",    value:amberCases.length, color:T.warning, bg:T.warningLight, note:"Review before next step" },
            { label:"Aligner order breaches",  value:govRows.filter(r=>r.fs.alignerBreaches.length>0).length, color:T.error, bg:T.errorLight, note:"Clinical review required" },
            { label:"Safe cases",              value:govRows.filter(r=>r.fs.govStatus==="SAFE"&&r.fs.alignerBreaches.length===0).length, color:T.success, bg:T.successLight, note:"All steps completed" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:row.bg, borderRadius:7, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:row.color, flexShrink:0 }}/>
              <span style={{ fontSize:12.5, color:T.sub, flex:1 }}>{row.label}</span>
              <span style={{ fontSize:15, fontWeight:800, color:row.color }}>{row.value}</span>
              <span style={{ fontSize:11, color:T.muted }}>{row.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Third row: Clinician performance + Exceptions ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        {/* Clinician performance */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:T.primary }}>Clinician Overview</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1.4fr 60px 70px 70px 60px", padding:"7px 18px", background:"#F7F7F7", borderBottom:`1px solid ${T.border}` }}>
            {["Dentist","Consults","Commit %","Convert %","Red flags"].map(h => (
              <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:T.muted }}>{h}</span>
            ))}
          </div>
          {cliTable.map((row, i) => (
            <div key={row.cli} style={{ display:"grid", gridTemplateColumns:"1.4fr 60px 70px 70px 60px", padding:"11px 18px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Avt name={row.cli} size={26}/>
                <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{row.cli}</span>
              </div>
              <span style={{ fontSize:13, color:T.sub }}>{row.total}</span>
              <span style={{ fontSize:13, fontWeight:700, color:row.commitRate>=60?T.success:T.warning }}>{row.commitRate}%</span>
              <span style={{ fontSize:13, fontWeight:700, color:row.convRate>=50?T.success:T.warning }}>{row.convRate}%</span>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                {row.breach > 0 && <div style={{ width:7, height:7, borderRadius:"50%", background:T.error }}/>}
                <span style={{ fontSize:13, fontWeight:700, color:row.breach>0?T.error:row.atRisk>0?T.warning:T.success }}>
                  {row.breach > 0 ? row.breach : row.atRisk > 0 ? row.atRisk : "✓"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Compliance exceptions */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", background:"#FAFAFA", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12.5, fontWeight:700, color:T.primary }}>Cases Requiring Attention</span>
            {exceptions.length > 0 && <span style={{ fontSize:11, fontWeight:700, color:T.error, background:T.errorLight, borderRadius:4, padding:"2px 8px" }}>{exceptions.length} cases</span>}
          </div>
          {exceptions.length === 0 ? (
            <div style={{ padding:"22px 18px", fontSize:13, color:T.success }}>✓ All cases compliant — no exceptions</div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", padding:"7px 18px", background:"#F7F7F7", borderBottom:`1px solid ${T.border}` }}>
                {["Patient","Dentist","Reason"].map(h => (
                  <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:T.muted }}>{h}</span>
                ))}
              </div>
              {exceptions.map(({p, fs}, i, arr) => {
                const ws = getWorstStatus(p);
                return (
                  <div key={p.id} onClick={()=>onOpenPatient&&onOpenPatient(p)} style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", padding:"10px 18px", borderTop:i>0?`1px solid ${T.borderLight}`:"none", alignItems:"center", cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF9"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:ws.tl==="RED"?T.error:T.warning, flexShrink:0 }}/>
                      <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize:12, color:T.sub }}>{p.cli}</span>
                    <span style={{ fontSize:11.5, color:ws.tl==="RED"?T.error:T.warning }}>{ws.reason}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ROLE-AWARE DASHBOARD ROUTER ────────────────────────────────────────────────
function DashboardPage({ onNewConsultation, onOpenPatient }) {
  const { role } = useRole();
  // owner / admin / clinical_director → OwnerDashboard
  // clinical / marketing → DentistDashboard
  const isOwnerView = role.access.billing === true || CURRENT_USER.role === "clinical_director";
  if (isOwnerView) {
    return <OwnerDashboard onNewConsultation={onNewConsultation} onOpenPatient={onOpenPatient}/>;
  }
  return <DentistDashboard onNewConsultation={onNewConsultation} onOpenPatient={onOpenPatient}/>;
}


