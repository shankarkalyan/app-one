import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import {
  LuX,
  LuActivity,
  LuGitBranch,
  LuCircleCheck,
  LuServer,
  LuWorkflow,
  LuCircleAlert,
  LuDatabase,
  LuFileText,
  LuUsers,
  LuSettings,
} from 'react-icons/lu';

/* ══════════════════════════════════════════════════════════════════════════════
   DESIGN SYSTEM - Chase Blue Theme
   ══════════════════════════════════════════════════════════════════════════════ */

const THEMES = {
  light: {
    bgBody: '#F3F6FB',
    bgCard: '#FFFFFF',
    bgCardHover: '#F8FBFF',
    bgHeader: 'linear-gradient(135deg, #003B73 0%, #00508F 40%, #117ACA 100%)',
    textPrimary: '#0D2137',
    textSecondary: '#4A6380',
    textMuted: '#7E95AB',
    borderCard: '#D8E3F0',
    shadowCard: '0 2px 12px rgba(0, 59, 115, 0.07)',
    brand: '#117ACA',
  },
  dark: {
    bgBody: '#0B1929',
    bgCard: '#112240',
    bgCardHover: '#162B50',
    bgHeader: 'linear-gradient(135deg, #0B1929 0%, #112240 40%, #1A365D 100%)',
    textPrimary: '#CDD9E5',
    textSecondary: '#8EA4BD',
    textMuted: '#5A7A9A',
    borderCard: '#1E3A5F',
    shadowCard: '0 2px 12px rgba(0, 0, 0, 0.3)',
    brand: '#117ACA',
  },
};

/* Node Type Colors (gradient pairs) */
const NODE_COLORS = {
  light: {
    frontend: { start: '#3B82F6', end: '#1D4ED8' },
    backend: { start: '#A855F7', end: '#7C3AED' },
    agent: { start: '#F59E0B', end: '#D97706' },
    service: { start: '#14B8A6', end: '#0D9488' },
    database: { start: '#EF4444', end: '#DC2626' },
    storage: { start: '#6366F1', end: '#4F46E5' },
  },
  dark: {
    frontend: { start: '#60A5FA', end: '#3B82F6' },
    backend: { start: '#C084FC', end: '#A855F7' },
    agent: { start: '#FBBF24', end: '#F59E0B' },
    service: { start: '#2DD4BF', end: '#14B8A6' },
    database: { start: '#F87171', end: '#EF4444' },
    storage: { start: '#818CF8', end: '#6366F1' },
  },
};

/* Edge Type Colors */
const EDGE_COLORS = {
  light: { http: '#117ACA', internal: '#7E95AB', database: '#EF4444', storage: '#6366F1' },
  dark: { http: '#7EB8E5', internal: '#5A7A9A', database: '#F87171', storage: '#818CF8' },
};

/* Status Colors */
const STATUS_COLORS = {
  active: { bg: '#DBF0E3', text: '#14713A', dot: '#14713A' },
  planned: { bg: '#FFF4D6', text: '#8B6914', dot: '#8B6914' },
  completed: { bg: '#DBF0E3', text: '#14713A', dot: '#14713A' },
  failed: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
};

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE DEFINITIONS - Process Groupings
   ══════════════════════════════════════════════════════════════════════════════ */

// Phase definitions in 3-COLUMN GRID layout (enlarged to fit nodes)
// Row 1: Intake → Application → Disclosure
// Row 2: Loan Review → Underwriting → Decision
// Row 3: Closing → Post-Closing
// Heights increased by 20%
const PHASES = [
  // Row 1 (width: 600px, height: 504px - increased 20% from 420)
  { id: 'intake', label: 'Intake', color: '#3B82F6', nodes: ['START', 'SUP1', 'IA', 'ELIG', 'END1'], xMin: 20, xMax: 620, yMin: 20, yMax: 524, row: 1, col: 1, sequence: 1 },
  { id: 'application', label: 'Application', color: '#8B5CF6', nodes: ['AA', 'COMP', 'END2'], xMin: 650, xMax: 1250, yMin: 20, yMax: 524, row: 1, col: 2, sequence: 2 },
  { id: 'disclosure', label: 'Disclosure', color: '#14B8A6', nodes: ['DA', 'SQ1'], xMin: 1280, xMax: 1880, yMin: 20, yMax: 524, row: 1, col: 3, sequence: 3 },
  // Row 2 (width: 600px, height: 576px - increased 20% from 480)
  { id: 'loan_review', label: 'Loan Review', color: '#F59E0B', nodes: ['LRA', 'DOCML', 'SQ2'], xMin: 20, xMax: 620, yMin: 554, yMax: 1130, row: 2, col: 1, sequence: 4 },
  { id: 'underwriting', label: 'Underwriting', color: '#EC4899', nodes: ['UWA', 'UWR', 'HIL1', 'DEC'], xMin: 650, xMax: 1250, yMin: 554, yMax: 1130, row: 2, col: 2, sequence: 5 },
  { id: 'decision', label: 'Decision', color: '#EF4444', nodes: ['DENY', 'SQ7', 'END5', 'CMA', 'SQ3', 'CALL', 'REVA'], xMin: 1280, xMax: 1880, yMin: 554, yMax: 1130, row: 2, col: 3, sequence: 6 },
  // Row 3 (width: 600px, height: 360px - increased 20% from 300)
  { id: 'closing', label: 'Closing', color: '#10B981', nodes: ['CPA', 'SQ4'], xMin: 20, xMax: 620, yMin: 1160, yMax: 1520, row: 3, col: 1, sequence: 7 },
  { id: 'post_closing', label: 'Post-Closing', color: '#6366F1', nodes: ['RVCP', 'SQ5', 'MAINT', 'SQ6', 'END4'], xMin: 650, xMax: 1250, yMin: 1160, yMax: 1520, row: 3, col: 2, sequence: 8 },
];

/* ══════════════════════════════════════════════════════════════════════════════
   WORKFLOW CONFIGURATION - Agentic Loan Assumption
   ══════════════════════════════════════════════════════════════════════════════ */

const WORKFLOW_CONFIG = {
  title: 'Agentic Loan Assumption Workflow',
  phases: PHASES,
  nodes: [
    // Row 1, Col 1: Intake (xMin: 20, xMax: 620, yMin: 20, yMax: 524) - heights increased 20%
    { id: 'START', label: 'Start', type: 'frontend', icon: 'Activity', description: 'Workflow Entry Point', phase: 'intake', x: 220, y: 100,
      details: { status: 'active', technology: 'LangGraph Entry', responsibilities: ['Initialize workflow state', 'Trigger intake process'] }},
    { id: 'SUP1', label: 'Router', type: 'agent', icon: 'Workflow', description: 'Supervisor Router', phase: 'intake', x: 220, y: 200,
      details: { status: 'active', technology: 'LangGraph Supervisor', responsibilities: ['Route to appropriate agent', 'Manage workflow transitions'] }},
    { id: 'IA', label: 'IntakeAgent', type: 'backend', icon: 'Server', description: 'Process loan intake', phase: 'intake', x: 220, y: 300,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Validate borrower info', 'Check initial eligibility', 'Extract loan details'] }},
    { id: 'ELIG', label: 'Eligibility Check', type: 'agent', icon: 'CheckCircle', description: 'Decision Point', phase: 'intake', x: 220, y: 400,
      details: { status: 'active', technology: 'Conditional Edge', responsibilities: ['Evaluate eligibility criteria', 'Route based on result'] }},
    { id: 'END1', label: 'Ineligible', type: 'database', icon: 'AlertCircle', description: 'Application Rejected', phase: 'intake', x: 480, y: 400,
      details: { status: 'active', technology: 'End State', responsibilities: ['Notify applicant', 'Archive application'] }},

    // Row 1, Col 2: Application (xMin: 650, xMax: 1250, yMin: 20, yMax: 524)
    { id: 'AA', label: 'ApplicationAgent', type: 'backend', icon: 'Server', description: 'Process application', phase: 'application', x: 850, y: 180,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Gather documents', 'Validate completeness', 'Process fees'] }},
    { id: 'COMP', label: 'Complete Check', type: 'agent', icon: 'CheckCircle', description: 'Decision Point', phase: 'application', x: 850, y: 320,
      details: { status: 'active', technology: 'Conditional Edge', responsibilities: ['Check document completeness', 'Validate data integrity'] }},
    { id: 'END2', label: 'Incomplete', type: 'database', icon: 'AlertCircle', description: 'Missing Documents', phase: 'application', x: 1100, y: 320,
      details: { status: 'active', technology: 'End State', responsibilities: ['Request missing docs', 'Hold application'] }},

    // Row 1, Col 3: Disclosure (xMin: 1280, xMax: 1880, yMin: 20, yMax: 524)
    { id: 'DA', label: 'DisclosureAgent', type: 'backend', icon: 'FileText', description: 'Generate disclosures', phase: 'disclosure', x: 1470, y: 250,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Generate TILA disclosures', 'Create loan estimate', 'Send to borrower'] }},
    { id: 'SQ1', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'disclosure', x: 1700, y: 250,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Validate disclosure accuracy', 'Check compliance'] }},

    // Row 2, Col 1: Loan Review (xMin: 20, xMax: 620, yMin: 554, yMax: 1130)
    { id: 'LRA', label: 'LoanReviewAgent', type: 'backend', icon: 'Server', description: 'Review loan details', phase: 'loan_review', x: 320, y: 680,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Review credit report', 'Verify income', 'Check DTI ratios'] }},
    { id: 'DOCML', label: 'DocLetterAgent', type: 'backend', icon: 'FileText', description: 'Document requests', phase: 'loan_review', x: 200, y: 850,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Generate doc requests', 'Track document status'] }},
    { id: 'SQ2', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'loan_review', x: 440, y: 850,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Validate doc letters', 'Check formatting'] }},

    // Row 2, Col 2: Underwriting (xMin: 650, xMax: 1250, yMin: 554, yMax: 1130)
    { id: 'UWA', label: 'UnderwritingAgent', type: 'backend', icon: 'Server', description: 'Underwrite loan', phase: 'underwriting', x: 950, y: 660,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Risk assessment', 'Pricing analysis', 'Condition generation'] }},
    { id: 'UWR', label: 'UW ReviewAgent', type: 'backend', icon: 'Server', description: 'Review underwriting', phase: 'underwriting', x: 950, y: 770,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Second review', 'Validate conditions', 'Check exceptions'] }},
    { id: 'HIL1', label: 'Human Decision', type: 'frontend', icon: 'Users', description: 'Human-in-the-loop', phase: 'underwriting', x: 950, y: 880,
      details: { status: 'active', technology: 'Human Task Node', responsibilities: ['Final approval decision', 'Override capability', 'Escalation handling'] }},
    { id: 'DEC', label: 'Approval Check', type: 'agent', icon: 'CheckCircle', description: 'Decision Point', phase: 'underwriting', x: 950, y: 990,
      details: { status: 'active', technology: 'Conditional Edge', responsibilities: ['Route based on approval', 'Handle conditions'] }},

    // Row 2, Col 3: Decision (xMin: 1280, xMax: 1880, yMin: 554, yMax: 1130)
    { id: 'CMA', label: 'CommitmentAgent', type: 'backend', icon: 'Server', description: 'Generate commitment', phase: 'decision', x: 1450, y: 660,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Generate commitment letter', 'Set conditions', 'Calculate fees'] }},
    { id: 'SQ3', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'decision', x: 1450, y: 770,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Validate commitment', 'Check terms'] }},
    { id: 'CALL', label: 'CallAgent', type: 'backend', icon: 'Server', description: 'Borrower outreach', phase: 'decision', x: 1450, y: 880,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Schedule call', 'Explain terms', 'Answer questions'] }},
    { id: 'DENY', label: 'DenialAgent', type: 'database', icon: 'AlertCircle', description: 'Process denial', phase: 'decision', x: 1700, y: 660,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Generate adverse action', 'Comply with ECOA', 'Archive case'] }},
    { id: 'SQ7', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'decision', x: 1700, y: 770,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Validate denial letter', 'Check compliance'] }},
    { id: 'END5', label: 'Denied', type: 'database', icon: 'AlertCircle', description: 'Loan Denied', phase: 'decision', x: 1700, y: 880,
      details: { status: 'active', technology: 'End State', responsibilities: ['Final notification', 'Close case'] }},
    { id: 'REVA', label: 'ReviewAgent', type: 'backend', icon: 'Server', description: 'Final review', phase: 'decision', x: 1580, y: 990,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Final validation', 'Prepare for closing'] }},

    // Row 3, Col 1: Closing (xMin: 20, xMax: 620, yMin: 1160, yMax: 1520)
    { id: 'CPA', label: 'ClosingAgent', type: 'backend', icon: 'Server', description: 'Process closing', phase: 'closing', x: 220, y: 1340,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Generate closing docs', 'Coordinate signing', 'Fund loan'] }},
    { id: 'SQ4', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'closing', x: 480, y: 1340,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Validate closing docs', 'Final compliance check'] }},

    // Row 3, Col 2: Post-Closing (xMin: 650, xMax: 1250, yMin: 1160, yMax: 1520)
    { id: 'RVCP', label: 'ReviewClosingAgent', type: 'backend', icon: 'Server', description: 'Post-close review', phase: 'post_closing', x: 830, y: 1270,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Verify funding', 'Check recording', 'Update systems'] }},
    { id: 'SQ5', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'post_closing', x: 1070, y: 1270,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Post-close audit', 'Compliance review'] }},
    { id: 'MAINT', label: 'MaintenanceAgent', type: 'backend', icon: 'Settings', description: 'Loan maintenance', phase: 'post_closing', x: 830, y: 1380,
      details: { status: 'active', technology: 'LangGraph Agent Node', responsibilities: ['Set up servicing', 'Transfer to servicer', 'Archive documents'] }},
    { id: 'SQ6', label: 'SQ Review', type: 'service', icon: 'CheckCircle', description: 'Quality checkpoint', phase: 'post_closing', x: 1070, y: 1380,
      details: { status: 'active', technology: 'Quality Gate', responsibilities: ['Final QC check', 'Close workflow'] }},
    { id: 'END4', label: 'Loan Closed', type: 'storage', icon: 'CheckCircle', description: 'Success', phase: 'post_closing', x: 950, y: 1460,
      details: { status: 'active', technology: 'End State', responsibilities: ['Workflow complete', 'Archive case'] }},
  ],

  edges: [
    { source: 'START', target: 'SUP1', label: 'Initialize', type: 'http' },
    { source: 'SUP1', target: 'IA', label: 'Route', type: 'internal' },
    { source: 'IA', target: 'ELIG', label: 'Check', type: 'internal' },
    { source: 'ELIG', target: 'END1', label: 'Ineligible', type: 'database', style: 'dashed' },
    { source: 'ELIG', target: 'AA', label: 'Eligible', type: 'http' },
    { source: 'AA', target: 'COMP', label: 'Validate', type: 'internal' },
    { source: 'COMP', target: 'END2', label: 'Incomplete', type: 'database', style: 'dashed' },
    { source: 'COMP', target: 'DA', label: 'Complete', type: 'http' },
    { source: 'DA', target: 'SQ1', label: 'Review', type: 'internal' },
    { source: 'SQ1', target: 'DA', label: 'Retry', type: 'internal', style: 'dashed' },
    { source: 'SQ1', target: 'LRA', label: 'Pass', type: 'http' },
    { source: 'LRA', target: 'DOCML', label: 'Docs Needed', type: 'internal', style: 'dashed' },
    { source: 'DOCML', target: 'SQ2', label: 'Review', type: 'internal' },
    { source: 'SQ2', target: 'LRA', label: 'Return', type: 'internal', style: 'dashed' },
    { source: 'LRA', target: 'UWA', label: 'Submit', type: 'http' },
    { source: 'UWA', target: 'UWR', label: 'Review', type: 'internal' },
    { source: 'UWR', target: 'HIL1', label: 'Ready', type: 'http' },
    { source: 'HIL1', target: 'DEC', label: 'Decision', type: 'internal' },
    { source: 'DEC', target: 'DENY', label: 'Denied', type: 'database' },
    { source: 'DENY', target: 'SQ7', label: 'Review', type: 'internal' },
    { source: 'SQ7', target: 'END5', label: 'Finalize', type: 'database' },
    { source: 'DEC', target: 'CMA', label: 'Approved', type: 'http' },
    { source: 'CMA', target: 'SQ3', label: 'Review', type: 'internal' },
    { source: 'SQ3', target: 'CALL', label: 'Notify', type: 'internal' },
    { source: 'CALL', target: 'REVA', label: 'Complete', type: 'internal' },
    { source: 'REVA', target: 'CPA', label: 'Proceed', type: 'http' },
    { source: 'CPA', target: 'SQ4', label: 'Review', type: 'internal' },
    { source: 'SQ4', target: 'RVCP', label: 'Pass', type: 'http' },
    { source: 'RVCP', target: 'SQ5', label: 'Review', type: 'internal' },
    { source: 'SQ5', target: 'MAINT', label: 'Pass', type: 'http' },
    { source: 'MAINT', target: 'SQ6', label: 'Review', type: 'internal' },
    { source: 'SQ6', target: 'END4', label: 'Complete', type: 'storage' },
  ],
};

/* ══════════════════════════════════════════════════════════════════════════════
   ICON MAPPING
   ══════════════════════════════════════════════════════════════════════════════ */

const ICON_MAP = {
  Activity: 'A',
  Workflow: 'W',
  Server: 'S',
  CheckCircle: '✓',
  AlertCircle: '!',
  FileText: 'F',
  Users: 'U',
  Database: 'D',
  Settings: '⚙',
};

/* ══════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function DetailPanel({ node, isDark, onClose }) {
  if (!node) return null;

  const theme = isDark ? THEMES.dark : THEMES.light;
  const nodeColors = isDark ? NODE_COLORS.dark : NODE_COLORS.light;
  const colors = nodeColors[node.type] || nodeColors.backend;
  const statusColors = STATUS_COLORS[node.details?.status] || STATUS_COLORS.active;

  return (
    <div
      className="detail-panel"
      style={{
        width: '360px',
        backgroundColor: theme.bgCard,
        borderRadius: '14px',
        border: `1px solid ${theme.borderCard}`,
        boxShadow: theme.shadowCard,
        overflow: 'hidden',
        animation: 'slideIn 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: `1px solid ${theme.borderCard}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            {ICON_MAP[node.icon] || 'N'}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: theme.textPrimary }}>
              {node.label}
            </h3>
            <p style={{ margin: '4px 0 8px', fontSize: '13px', color: theme.textSecondary }}>
              {node.description}
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: statusColors.bg,
                color: statusColors.text,
                textTransform: 'uppercase',
              }}
            >
              {node.details?.status || 'active'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: theme.textMuted,
            }}
          >
            <LuX size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
        {node.details?.technology && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>
              Technology
            </h4>
            <code
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: theme.bgCardHover,
                color: theme.brand,
                fontFamily: 'Courier New, monospace',
                fontSize: '13px',
              }}
            >
              {node.details.technology}
            </code>
          </div>
        )}

        {node.details?.responsibilities && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' }}>
              Responsibilities
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {node.details.responsibilities.map((resp, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 0',
                    borderBottom: i < node.details.responsibilities.length - 1 ? `1px solid ${theme.borderCard}` : 'none',
                    color: theme.textPrimary,
                    fontSize: '13px',
                  }}
                >
                  <LuActivity size={14} style={{ color: colors.start, flexShrink: 0 }} />
                  {resp}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: theme.bgCardHover }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <LuGitBranch size={14} style={{ color: theme.textMuted }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted }}>Node ID</span>
          </div>
          <code style={{ fontSize: '12px', color: theme.brand }}>{node.id}</code>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ACCORDION SECTION COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function AccordionSection({ title, isOpen, onToggle, children, isDark, isFirst }) {
  const theme = isDark ? THEMES.dark : THEMES.light;

  return (
    <div style={{ borderTop: isFirst ? 'none' : `1px solid ${theme.borderCard}`, marginTop: isFirst ? 0 : '10px', paddingTop: isFirst ? 0 : '10px' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0',
          margin: '0 0 10px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
        }}
      >
        <h4 style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h4>
        <span style={{
          fontSize: '10px',
          color: theme.textMuted,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </button>
      <div style={{
        maxHeight: isOpen ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   LEGEND COMPONENT (ACCORDION)
   ══════════════════════════════════════════════════════════════════════════════ */

function Legend({ isDark }) {
  const theme = isDark ? THEMES.dark : THEMES.light;
  const nodeColors = isDark ? NODE_COLORS.dark : NODE_COLORS.light;

  const [openSections, setOpenSections] = useState({
    phases: true,
    nodeTypes: false,
    nodeIcons: false,
    status: false,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const nodeTypes = [
    { type: 'frontend', label: 'Human / Entry' },
    { type: 'backend', label: 'Agent Node' },
    { type: 'agent', label: 'Router / Decision' },
    { type: 'service', label: 'Quality Gate' },
    { type: 'database', label: 'End (Fail)' },
    { type: 'storage', label: 'End (Success)' },
  ];

  const iconLetters = [
    { letter: 'A', meaning: 'Activity / Start' },
    { letter: 'W', meaning: 'Workflow / Router' },
    { letter: 'S', meaning: 'Server / Agent' },
    { letter: '✓', meaning: 'Check / Decision' },
    { letter: 'F', meaning: 'File / Document' },
    { letter: 'U', meaning: 'Users / Human' },
    { letter: '!', meaning: 'Alert / End State' },
    { letter: '⚙', meaning: 'Settings / Config' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: theme.bgCard,
        borderRadius: '10px',
        border: `1px solid ${theme.borderCard}`,
        boxShadow: theme.shadowCard,
        padding: '16px',
        zIndex: 100,
        minWidth: '190px',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
      }}
    >
      {/* Process Phases */}
      <AccordionSection
        title="Process Phases"
        isOpen={openSections.phases}
        onToggle={() => toggleSection('phases')}
        isDark={isDark}
        isFirst={true}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {PHASES.map((phase) => (
            <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: phase.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {phase.sequence}
              </div>
              <span style={{ fontSize: '11px', color: theme.textSecondary }}>{phase.label}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Node Types */}
      <AccordionSection
        title="Node Types"
        isOpen={openSections.nodeTypes}
        onToggle={() => toggleSection('nodeTypes')}
        isDark={isDark}
        isFirst={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nodeTypes.map(({ type, label }) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: `linear-gradient(135deg, ${nodeColors[type].start} 0%, ${nodeColors[type].end} 100%)`,
                }}
              />
              <span style={{ fontSize: '11px', color: theme.textSecondary }}>{label}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Node Icons */}
      <AccordionSection
        title="Node Icons"
        isOpen={openSections.nodeIcons}
        onToggle={() => toggleSection('nodeIcons')}
        isDark={isDark}
        isFirst={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {iconLetters.map(({ letter, meaning }) => (
            <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: theme.textPrimary,
                }}
              >
                {letter}
              </div>
              <span style={{ fontSize: '11px', color: theme.textSecondary }}>{meaning}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Status */}
      <AccordionSection
        title="Status"
        isOpen={openSections.status}
        onToggle={() => toggleSection('status')}
        isDark={isDark}
        isFirst={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS.active.dot }} />
            <span style={{ fontSize: '11px', color: theme.textSecondary }}>Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS.planned.dot }} />
            <span style={{ fontSize: '11px', color: theme.textSecondary }}>Planned</span>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN D3 WORKFLOW GRAPH COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function D3WorkflowGraph({
  executionPath = [],
  currentNode = null,
  onNodeClick = () => {},
  animateTransactions = true,
  isDark = true,
}) {
  const svgRef = useRef();
  const containerRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1950, height: 1600 });

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width || 1000, height: height || 800 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current) return;

    const theme = isDark ? THEMES.dark : THEMES.light;
    const nodeColors = isDark ? NODE_COLORS.dark : NODE_COLORS.light;
    const edgeColors = isDark ? EDGE_COLORS.dark : EDGE_COLORS.light;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width - (selectedNode ? 380 : 0);
    const height = dimensions.height;

    svg.attr('width', width).attr('height', height);

    /* ── Defs ─────────────────────────────── */
    const defs = svg.append('defs');

    // Node gradients
    Object.entries(nodeColors).forEach(([type, colors]) => {
      const grad = defs.append('linearGradient')
        .attr('id', `gradient-${type}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', colors.start);
      grad.append('stop').attr('offset', '100%').attr('stop-color', colors.end);
    });

    // Arrow markers
    Object.entries(edgeColors).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Drop shadow filter
    const shadow = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '140%');
    shadow.append('feDropShadow')
      .attr('dx', 0).attr('dy', 2)
      .attr('stdDeviation', 4)
      .attr('flood-color', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,59,115,0.15)');

    // Glow filter
    const glow = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'blur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Edge glow
    const edgeGlow = defs.append('filter')
      .attr('id', 'edge-glow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%');
    edgeGlow.append('feGaussianBlur').attr('stdDeviation', '3');

    /* ── Main Container ─────────────────────────────── */
    const mainG = svg.append('g').attr('class', 'zoom-container');

    // Background
    mainG.append('rect')
      .attr('width', width * 3)
      .attr('height', height * 3)
      .attr('x', -width)
      .attr('y', -height)
      .attr('fill', theme.bgBody);

    /* ── Prepare Data ─────────────────────────────── */
    // Fix node positions (fx, fy) so simulation doesn't move them outside phase boundaries
    const nodes = WORKFLOW_CONFIG.nodes.map(n => ({ ...n, fx: n.x, fy: n.y }));
    const edges = WORKFLOW_CONFIG.edges.map(e => ({
      ...e,
      source: nodes.find(n => n.id === e.source),
      target: nodes.find(n => n.id === e.target),
    })).filter(e => e.source && e.target);

    /* ── Phase Bands with Dotted Boundaries ─────────────────────────────── */
    const phaseG = mainG.append('g').attr('class', 'phases');
    const PADDING = 10; // Small padding since boundaries are fixed
    const LABEL_WIDTH = 40;

    // Use FIXED phase boundaries from PHASES definition (no dynamic calculation)
    // This prevents phase boundaries from overlapping
    PHASES.forEach(phase => {
      const minX = phase.xMin;
      const maxX = phase.xMax;
      const minY = phase.yMin;
      const maxY = phase.yMax;

      const bandG = phaseG.append('g').attr('class', `phase-${phase.id}`);

      // Dotted boundary rectangle (using fixed boundaries)
      bandG.append('rect')
        .attr('x', minX)
        .attr('y', minY)
        .attr('width', maxX - minX)
        .attr('height', maxY - minY)
        .attr('rx', 12)
        .attr('fill', 'none')
        .attr('stroke', phase.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '8,6')
        .attr('opacity', isDark ? 0.4 : 0.5);

      // Semi-transparent fill
      bandG.append('rect')
        .attr('x', minX)
        .attr('y', minY)
        .attr('width', maxX - minX)
        .attr('height', maxY - minY)
        .attr('rx', 12)
        .attr('fill', phase.color)
        .attr('opacity', isDark ? 0.05 : 0.03);

      // Sequence number badge (top-left corner)
      const badgeSize = 28;
      bandG.append('circle')
        .attr('cx', minX + 20)
        .attr('cy', minY + 20)
        .attr('r', badgeSize / 2)
        .attr('fill', phase.color)
        .attr('opacity', isDark ? 0.9 : 0.85);

      bandG.append('text')
        .attr('x', minX + 20)
        .attr('y', minY + 21)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .text(phase.sequence);

      // Top label (horizontal, inside the phase box, offset for badge)
      bandG.append('text')
        .attr('x', minX + 45 + (maxX - minX - 45) / 2)
        .attr('y', minY + 20)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 700)
        .attr('letter-spacing', '0.5px')
        .attr('fill', phase.color)
        .attr('opacity', isDark ? 0.9 : 0.8)
        .text(phase.label.toUpperCase());
    });

    /* ── Custom Phase Containment Force ─────────────────────────────── */
    // This force constrains nodes to stay within their phase's X/Y boundaries
    // Node dimensions: 160px wide (80px from center), 52px tall (26px from center)
    function forcePhaseContainment() {
      let nodes;
      const strength = 0.9;

      function force(alpha) {
        for (const node of nodes) {
          const phase = PHASES.find(p => p.nodes.includes(node.id));
          if (phase) {
            // Padding accounts for node size (160x52) plus margin
            const paddingX = 90;  // 80px (half node width) + 10px margin
            const paddingYTop = 60;  // 26px (half node height) + 34px for label/margin
            const paddingYBottom = 40;  // 26px (half node height) + 14px margin

            const minX = phase.xMin + paddingX;
            const maxX = phase.xMax - paddingX;
            const minY = phase.yMin + paddingYTop;
            const maxY = phase.yMax - paddingYBottom;

            // Constrain X position within phase boundaries
            if (node.x < minX) {
              node.vx += (minX - node.x) * strength * alpha;
            } else if (node.x > maxX) {
              node.vx += (maxX - node.x) * strength * alpha;
            }

            // Constrain Y position
            if (node.y < minY) {
              node.vy += (minY - node.y) * strength * alpha;
            } else if (node.y > maxY) {
              node.vy += (maxY - node.y) * strength * alpha;
            }
          }
        }
      }

      force.initialize = function(_nodes) {
        nodes = _nodes;
      };

      return force;
    }

    /* ── Force Simulation ─────────────────────────────── */
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(180).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(100).strength(1))
      .force('x', d3.forceX(d => d.x).strength(0.6))
      .force('y', d3.forceY(d => d.y).strength(0.7))
      .force('phaseContainment', forcePhaseContainment())
      .alphaDecay(0.03)
      .velocityDecay(0.6);

    /* ── Draw Edges ─────────────────────────────── */
    const edgeG = mainG.append('g').attr('class', 'edges');

    const edgeGroups = edgeG.selectAll('g')
      .data(edges)
      .enter()
      .append('g');

    // Base path
    const edgePaths = edgeGroups.append('path')
      .attr('class', 'edge-base')
      .attr('fill', 'none')
      .attr('stroke', d => edgeColors[d.type] || edgeColors.internal)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', d => d.style === 'dashed' ? '6,4' : 'none')
      .attr('marker-end', d => `url(#arrow-${d.type || 'internal'})`);

    // Flow overlay (marching ants)
    const flowPaths = edgeGroups.append('path')
      .attr('class', 'edge-flow')
      .attr('fill', 'none')
      .attr('stroke', d => edgeColors[d.type] || edgeColors.internal)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .attr('stroke-dasharray', '6,6')
      .style('animation', 'archMarchingAnts 0.8s linear infinite');

    // Traveling dots
    const dotPaths = edgeGroups.append('path')
      .attr('class', 'dot-path')
      .attr('fill', 'none')
      .attr('stroke', 'none');

    const travelDots = edgeGroups.append('circle')
      .attr('class', 'travel-dot')
      .attr('r', 4)
      .attr('fill', d => edgeColors[d.type] || edgeColors.internal)
      .attr('filter', 'url(#edge-glow)')
      .attr('opacity', 0);

    // Edge labels
    const edgeLabels = edgeGroups.append('g').attr('class', 'edge-label');

    edgeLabels.append('rect')
      .attr('rx', 10)
      .attr('fill', theme.bgCard)
      .attr('stroke', theme.borderCard)
      .attr('stroke-width', 1);

    edgeLabels.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 500)
      .attr('fill', theme.textSecondary)
      .text(d => d.label || '');

    /* ── Draw Nodes ─────────────────────────────── */
    const nodeG = mainG.append('g').attr('class', 'nodes');

    const nodeGroups = nodeG.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          // Find the phase this node belongs to
          const phase = PHASES.find(p => p.nodes.includes(d.id));
          if (phase) {
            // Clamp the drag position within phase boundaries
            const paddingX = 90;  // 80px (half node width) + 10px margin
            const paddingYTop = 60;  // 26px (half node height) + 34px for label/margin
            const paddingYBottom = 40;  // 26px (half node height) + 14px margin
            const clampedX = Math.max(phase.xMin + paddingX, Math.min(phase.xMax - paddingX, event.x));
            const clampedY = Math.max(phase.yMin + paddingYTop, Math.min(phase.yMax - paddingYBottom, event.y));
            d.fx = clampedX;
            d.fy = clampedY;
          } else {
            d.fx = event.x;
            d.fy = event.y;
          }
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Background rect
    nodeGroups.append('rect')
      .attr('class', 'node-bg')
      .attr('width', 160)
      .attr('height', 52)
      .attr('x', -80)
      .attr('y', -26)
      .attr('rx', 10)
      .attr('fill', d => `url(#gradient-${d.type})`)
      .attr('filter', 'url(#drop-shadow)')
      .attr('opacity', d => d.details?.status === 'planned' ? 0.5 : 1);

    // Border rect
    nodeGroups.append('rect')
      .attr('class', 'node-border')
      .attr('width', 160)
      .attr('height', 52)
      .attr('x', -80)
      .attr('y', -26)
      .attr('rx', 10)
      .attr('fill', 'none')
      .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', d => d.details?.status === 'planned' ? '5,5' : 'none');

    // Status indicator
    nodeGroups.append('circle')
      .attr('cx', 72)
      .attr('cy', -18)
      .attr('r', 5)
      .attr('fill', d => STATUS_COLORS[d.details?.status]?.dot || STATUS_COLORS.active.dot)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Icon circle
    nodeGroups.append('circle')
      .attr('cx', -56)
      .attr('cy', 0)
      .attr('r', 16)
      .attr('fill', 'rgba(255,255,255,0.2)');

    // Icon letter
    nodeGroups.append('text')
      .attr('x', -56)
      .attr('y', 1)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', 700)
      .text(d => ICON_MAP[d.icon] || 'N');

    // Label
    nodeGroups.append('text')
      .attr('x', 10)
      .attr('y', -4)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 700)
      .text(d => d.label);

    // Description
    nodeGroups.append('text')
      .attr('x', 10)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', '10px')
      .text(d => d.description?.substring(0, 22) || '');

    // Hover effects
    nodeGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('.node-bg').attr('filter', 'url(#node-glow)');
        d3.select(this).select('.node-border').attr('stroke-width', 2.5);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('.node-bg').attr('filter', 'url(#drop-shadow)');
        d3.select(this).select('.node-border').attr('stroke-width', 1.5);
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        setSelectedNode(d);
        onNodeClick(d);
      });

    // Highlight executed nodes
    nodeGroups.filter(d => executionPath.includes(d.id))
      .select('.node-border')
      .attr('stroke', '#14713A')
      .attr('stroke-width', 3);

    // Current node pulse
    if (currentNode) {
      const currGroup = nodeGroups.filter(d => d.id === currentNode);
      currGroup.select('.node-border')
        .attr('stroke', '#F59E0B')
        .attr('stroke-width', 3);
    }

    /* ── Path Computation ─────────────────────────────── */
    function computePath(d) {
      const sx = d.source.x, sy = d.source.y;
      const tx = d.target.x, ty = d.target.y;
      const dx = tx - sx, dy = ty - sy;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      let startX, startY, endX, endY;

      if (absDy > absDx * 0.4) {
        // Vertical dominant
        if (dy > 0) {
          startY = sy + 26; endY = ty - 26;
        } else {
          startY = sy - 26; endY = ty + 26;
        }
        startX = sx; endX = tx;
      } else {
        // Horizontal dominant
        if (dx > 0) {
          startX = sx + 80; endX = tx - 80;
        } else {
          startX = sx - 80; endX = tx + 80;
        }
        startY = sy; endY = ty;
      }

      const cx1 = startX + (endX - startX) * 0.4;
      const cy1 = startY + (endY - startY) * 0.1;
      const cx2 = startX + (endX - startX) * 0.6;
      const cy2 = startY + (endY - startY) * 0.9;

      return `M${startX},${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;
    }

    /* ── Simulation Tick ─────────────────────────────── */
    simulation.on('tick', () => {
      // Phase boundaries are FIXED - no dynamic updates needed
      // This prevents phase boundaries from overlapping

      // Update edges
      edgePaths.attr('d', computePath);
      flowPaths.attr('d', computePath);
      dotPaths.attr('d', computePath);

      // Update edge labels
      edgeLabels.each(function(d) {
        const path = d3.select(this.parentNode).select('.dot-path').node();
        if (path && path.getTotalLength) {
          const len = path.getTotalLength();
          const point = path.getPointAtLength(len / 2);

          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const angle = Math.atan2(dy, dx);
          const offsetX = Math.sin(angle) * 14;
          const offsetY = -Math.cos(angle) * 14;

          const text = d3.select(this).select('text');
          const textLen = (d.label?.length || 0) * 6 + 16;

          d3.select(this).select('rect')
            .attr('x', point.x + offsetX - textLen / 2)
            .attr('y', point.y + offsetY - 10)
            .attr('width', textLen)
            .attr('height', 20);

          text.attr('x', point.x + offsetX).attr('y', point.y + offsetY);
        }
      });

      // Update nodes
      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    /* ── Animate Traveling Dots ─────────────────────────────── */
    if (animateTransactions) {
      travelDots.each(function(d, i) {
        const dot = d3.select(this);
        const path = d3.select(this.parentNode).select('.dot-path').node();

        function animateDot() {
          if (!path || !path.getTotalLength) return;
          const len = path.getTotalLength();

          dot
            .attr('opacity', 0)
            .transition()
            .delay(i * 400)
            .duration(300)
            .attr('opacity', 1)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t) => {
                const point = path.getPointAtLength(t * len);
                return `translate(${point.x},${point.y})`;
              };
            })
            .transition()
            .duration(300)
            .attr('opacity', 0)
            .on('end', animateDot);
        }

        setTimeout(animateDot, i * 400);
      });
    }

    /* ── Fit to View ─────────────────────────────── */
    const fitToView = () => {
      const bounds = mainG.node().getBBox();
      const padding = 80;
      const scale = Math.min(
        2.05,
        (width - padding * 2) / bounds.width * 2.56,
        (height - padding * 2) / bounds.height * 2.56
      );
      const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
      const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    simulation.on('end', fitToView);
    setTimeout(fitToView, 1500);

    /* ── Zoom ─────────────────────────────── */
    const zoom = d3.zoom()
      .scaleExtent([0.3, 8])
      .on('zoom', (event) => {
        mainG.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Click background to deselect
    svg.on('click', () => {
      setSelectedNode(null);
    });

  }, [executionPath, currentNode, onNodeClick, animateTransactions, isDark, dimensions, selectedNode]);

  const theme = isDark ? THEMES.dark : THEMES.light;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        gap: '24px',
        backgroundColor: theme.bgBody,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes archMarchingAnts {
          to { stroke-dashoffset: -12; }
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <Legend isDark={isDark} />

      <div style={{ flex: 1, position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          isDark={isDark}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export default D3WorkflowGraph;
