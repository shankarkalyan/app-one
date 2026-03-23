import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  LuX,
  LuPhone,
  LuFileText,
  LuCircleHelp,
  LuMail,
  LuSend,
  LuFileCheck,
  LuUpload,
  LuClipboardCheck,
  LuPackage,
  LuCircleCheck,
  LuUsers,
  LuClipboard,
  LuUserCheck,
  LuFileSearch,
  LuCircleAlert,
  LuAward,
  LuPhoneCall,
  LuMessageSquare,
  LuFolderOpen,
  LuBuilding,
  LuEye,
  LuSettings,
  LuCircleX,
  LuLogOut,
  LuBox,
  LuActivity,
  LuGitBranch,
} from 'react-icons/lu';

/* ══════════════════════════════════════════════════════════════════════════════
   DESIGN SYSTEM - Chase Blue Theme
   ══════════════════════════════════════════════════════════════════════════════ */

const THEMES = {
  light: {
    bgBody: '#F3F6FB',
    bgCard: '#FFFFFF',
    bgCardHover: '#F8FBFF',
    textPrimary: '#0D2137',
    textSecondary: '#4A6380',
    textMuted: '#7E95AB',
    borderCard: '#D8E3F0',
    shadowCard: '0 2px 12px rgba(0, 59, 115, 0.07)',
    nodeBg: '#FFFFFF',
    edgeColor: '#7E95AB',
  },
  dark: {
    bgBody: '#0B1929',
    bgCard: '#112240',
    bgCardHover: '#162B50',
    textPrimary: '#CDD9E5',
    textSecondary: '#8EA4BD',
    textMuted: '#5A7A9A',
    borderCard: '#1E3A5F',
    shadowCard: '0 2px 12px rgba(0, 0, 0, 0.3)',
    nodeBg: '#112240',
    edgeColor: '#5A7A9A',
  },
};

/* ══════════════════════════════════════════════════════════════════════════════
   NODE TYPE COLOR SYSTEM (6 tiers with gradients)
   ══════════════════════════════════════════════════════════════════════════════ */

const NODE_TYPE_COLORS = {
  frontend: {
    light: { start: '#2874a6', end: '#1a5276' },
    dark: { start: '#5dade2', end: '#2874a6' },
    label: 'Process Step',
  },
  backend: {
    light: { start: '#1a5276', end: '#154360' },
    dark: { start: '#2874a6', end: '#1a5276' },
    label: 'Decision',
  },
  agent: {
    light: { start: '#27ae60', end: '#1e8449' },
    dark: { start: '#58d68d', end: '#27ae60' },
    label: 'SQ Review',
  },
  service: {
    light: { start: '#1b5e20', end: '#145218' },
    dark: { start: '#4caf50', end: '#1b5e20' },
    label: 'Success/Loan Closed',
  },
  database: {
    light: { start: '#c0392b', end: '#96281b' },
    dark: { start: '#e74c3c', end: '#c0392b' },
    label: 'Denial/End',
  },
  storage: {
    light: { start: '#7f8c8d', end: '#626567' },
    dark: { start: '#aab7b8', end: '#7f8c8d' },
    label: 'Withdrawn',
  },
};

/* ══════════════════════════════════════════════════════════════════════════════
   EDGE COLOR SYSTEM (4 types)
   ══════════════════════════════════════════════════════════════════════════════ */

const EDGE_COLORS = {
  http: { light: '#117ACA', dark: '#7EB8E5' },
  internal: { light: '#7E95AB', dark: '#5A7A9A' },
  database: { light: '#EF4444', dark: '#F87171' },
  storage: { light: '#6366F1', dark: '#818CF8' },
};

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE DEFINITIONS
   ══════════════════════════════════════════════════════════════════════════════ */

const PHASES = [
  { id: 'phase1', label: 'Initial Contact', color: '#2874a6' },
  { id: 'phase2', label: 'Eligibility Check', color: '#1a5276' },
  { id: 'phase3', label: 'Application', color: '#2874a6' },
  { id: 'phase4', label: 'Completeness', color: '#1a5276' },
  { id: 'phase5', label: 'Disclosure', color: '#2874a6' },
  { id: 'phase6', label: 'Document Review', color: '#1a5276' },
  { id: 'phase7', label: 'Underwriting', color: '#2874a6' },
  { id: 'phase8', label: 'Commitment', color: '#27ae60' },
  { id: 'phase9', label: 'Closing', color: '#2874a6' },
  { id: 'phase10', label: 'Completion', color: '#1b5e20' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   NODE DEFINITIONS - Based on loan-workflow-build.html
   ══════════════════════════════════════════════════════════════════════════════ */

const WORKFLOW_NODES = [
  // Phase 1: Initial Contact
  { id: 'A', label: 'Call Received', type: 'frontend', phase: 1, icon: LuPhone, x: 500, y: 50, description: 'Call received from Customer or Authorized 3rd Party', status: 'active' },
  { id: 'B', label: 'Case Optimizer', type: 'frontend', phase: 1, icon: LuClipboardCheck, x: 500, y: 130, description: 'Agent asks questions in Case Optimizer', status: 'active' },

  // Phase 2: Eligibility
  { id: 'C', label: 'Assumption Allowed?', type: 'backend', phase: 2, icon: LuCircleHelp, x: 500, y: 210, description: 'Decide if assumption is allowed', status: 'active' },
  { id: 'D', label: 'Ineligible Letter', type: 'database', phase: 2, icon: LuMail, x: 250, y: 290, description: 'Send Ineligible Letter', status: 'active' },
  { id: 'END1', label: 'End', type: 'database', phase: 2, icon: LuCircleX, x: 250, y: 370, description: 'Process ended - Ineligible', status: 'active' },

  // Phase 3: Application
  { id: 'F', label: 'Send Application', type: 'frontend', phase: 3, icon: LuSend, x: 750, y: 290, description: 'Send Application', status: 'active' },
  { id: 'G', label: 'DocuSign', type: 'frontend', phase: 3, icon: LuFileCheck, x: 750, y: 370, description: 'DocuSign', status: 'active' },
  { id: 'H', label: 'App Returned', type: 'frontend', phase: 3, icon: LuUpload, x: 750, y: 450, description: 'Application Returned', status: 'active' },
  { id: 'I', label: 'Review Package', type: 'frontend', phase: 3, icon: LuEye, x: 750, y: 530, description: 'Review Uploaded Package', status: 'active' },

  // Phase 4: Completeness Check
  { id: 'J', label: 'Complete?', type: 'backend', phase: 4, icon: LuCircleHelp, x: 750, y: 610, description: 'Is Complete or less than 25 days', status: 'active' },
  { id: 'K', label: 'Incomplete Letter', type: 'database', phase: 4, icon: LuMail, x: 500, y: 690, description: 'Send Incomplete Closure Letter', status: 'active' },
  { id: 'END2', label: 'End', type: 'database', phase: 4, icon: LuCircleX, x: 500, y: 770, description: 'Process ended - Incomplete', status: 'active' },

  // Phase 5: Disclosure
  { id: 'SD', label: 'Disclosure Pkg', type: 'frontend', phase: 5, icon: LuPackage, x: 1000, y: 690, description: 'Create and Send Disclosure Package', status: 'active' },
  { id: 'SQ1', label: 'SQ Review', type: 'agent', phase: 5, icon: LuCircleCheck, x: 1000, y: 770, description: 'SQ Review - Disclosure', status: 'active' },

  // Phase 6: Document Review
  { id: 'ALR', label: 'Assign for Review', type: 'frontend', phase: 6, icon: LuUsers, x: 1000, y: 870, description: 'Application gets Assigned for Loan Review', status: 'active' },
  { id: 'DOCCHECK', label: 'Docs Needed?', type: 'backend', phase: 6, icon: LuCircleHelp, x: 1000, y: 950, description: 'Documents needed?', status: 'active' },

  // Document Request Path (Left branch from DOCCHECK)
  { id: 'CML', label: 'Missing Docs Letter', type: 'frontend', phase: 6, icon: LuFileText, x: 700, y: 1050, description: 'Create Letter for Missing Documents', status: 'active' },
  { id: 'SQ2', label: 'SQ Review', type: 'agent', phase: 6, icon: LuCircleCheck, x: 700, y: 1130, description: 'SQ Review - Missing Docs', status: 'active' },
  { id: 'SLC', label: 'Send Letter', type: 'frontend', phase: 6, icon: LuSend, x: 700, y: 1210, description: 'Send Letter to Customer', status: 'active' },
  { id: 'DR', label: 'Docs Returned?', type: 'backend', phase: 6, icon: LuUpload, x: 700, y: 1290, description: 'Documents Returned', status: 'active' },
  { id: 'CW', label: 'Withdrawn', type: 'database', phase: 6, icon: LuLogOut, x: 500, y: 1370, description: 'Customer Withdrawn', status: 'active' },
  { id: 'END3', label: 'End', type: 'database', phase: 6, icon: LuCircleX, x: 500, y: 1450, description: 'Process ended - Withdrawn', status: 'active' },

  // Phase 7: Underwriting (Right branch from DOCCHECK)
  { id: 'UWC', label: 'UW Checklist', type: 'frontend', phase: 7, icon: LuClipboard, x: 1300, y: 1050, description: 'Underwriting Checklist', status: 'active' },
  { id: 'AU', label: 'Assign UW', type: 'frontend', phase: 7, icon: LuUserCheck, x: 1300, y: 1130, description: 'Assigned to Underwriter', status: 'active' },
  { id: 'URC', label: 'UW Review', type: 'frontend', phase: 7, icon: LuFileSearch, x: 1300, y: 1210, description: 'Underwriter Review for Completeness', status: 'active' },
  { id: 'READY', label: 'Ready?', type: 'backend', phase: 7, icon: LuCircleHelp, x: 1300, y: 1290, description: 'Ready for decision?', status: 'active' },
  { id: 'DEC', label: 'Decision', type: 'backend', phase: 7, icon: LuCircleAlert, x: 1300, y: 1390, description: 'Make Yes or No Decision', status: 'active' },

  // Phase 8: Commitment (Left branch from DEC - Yes)
  { id: 'MCL', label: 'Commitment Letter', type: 'service', phase: 8, icon: LuAward, x: 1000, y: 1490, description: 'Make Commitment Letter', status: 'active' },
  { id: 'SQ3', label: 'SQ Review', type: 'agent', phase: 8, icon: LuCircleCheck, x: 1000, y: 1570, description: 'SQ Review - Commitment', status: 'active' },
  { id: 'SL', label: 'Send Letter', type: 'service', phase: 8, icon: LuSend, x: 1000, y: 1650, description: 'Send Commitment Letter', status: 'active' },

  // Phase 9: Closing
  { id: 'ACA', label: 'Assign Agent', type: 'frontend', phase: 9, icon: LuPhoneCall, x: 1000, y: 1730, description: 'Assigned to Call Agent', status: 'active' },
  { id: 'RWA', label: 'Review w/ Customer', type: 'frontend', phase: 9, icon: LuMessageSquare, x: 1000, y: 1810, description: 'Review With Customer', status: 'active' },
  { id: 'CCP', label: 'Closing Packet', type: 'frontend', phase: 9, icon: LuFolderOpen, x: 1000, y: 1890, description: 'Create and Complete Closing Packet', status: 'active' },
  { id: 'SQ4', label: 'SQ Review', type: 'agent', phase: 9, icon: LuCircleCheck, x: 1000, y: 1970, description: 'SQ Review - Closing Packet', status: 'active' },
  { id: 'SCP', label: 'Send to Title', type: 'frontend', phase: 9, icon: LuBuilding, x: 1000, y: 2050, description: 'Send Closing Packet to Title Agency', status: 'active' },
  { id: 'RCP', label: 'Review Closing', type: 'frontend', phase: 9, icon: LuEye, x: 1000, y: 2130, description: 'Review Closing Packet', status: 'active' },
  { id: 'SQ5', label: 'SQ Review', type: 'agent', phase: 9, icon: LuCircleCheck, x: 1000, y: 2210, description: 'SQ Review - Final Review', status: 'active' },

  // Phase 10: Completion
  { id: 'CSM', label: 'System Maint', type: 'service', phase: 10, icon: LuSettings, x: 1000, y: 2290, description: 'Complete System Maintenance - MSP', status: 'active' },
  { id: 'SQ6', label: 'SQ Review', type: 'agent', phase: 10, icon: LuCircleCheck, x: 1000, y: 2370, description: 'SQ Review - System Maintenance', status: 'active' },
  { id: 'END4', label: 'Loan Closed', type: 'service', phase: 10, icon: LuAward, x: 1000, y: 2470, description: 'End - Loan Closed Successfully!', status: 'active' },

  // Denial Path (Right branch from DEC - No)
  { id: 'MDL', label: 'Denial Letter', type: 'database', phase: 7, icon: LuCircleX, x: 1550, y: 1490, description: 'Make Denial Letter', status: 'active' },
  { id: 'SQ7', label: 'SQ Review', type: 'agent', phase: 7, icon: LuCircleCheck, x: 1550, y: 1570, description: 'SQ Review - Denial', status: 'active' },
  { id: 'SLD', label: 'Send Denial', type: 'database', phase: 7, icon: LuMail, x: 1550, y: 1650, description: 'Send Denial Letter', status: 'active' },
  { id: 'END5', label: 'Denied', type: 'database', phase: 7, icon: LuCircleX, x: 1550, y: 1730, description: 'End - Application Denied', status: 'active' },
];

const WORKFLOW_EDGES = [
  // Phase 1: Initial Contact
  { source: 'A', target: 'B', type: 'http', label: '' },
  { source: 'B', target: 'C', type: 'http', label: '' },

  // Phase 2: Eligibility Decision
  { source: 'C', target: 'D', type: 'database', label: 'No' },
  { source: 'D', target: 'END1', type: 'database', label: '' },
  { source: 'C', target: 'F', type: 'http', label: 'Yes' },

  // Phase 3: Application
  { source: 'F', target: 'G', type: 'http', label: '' },
  { source: 'G', target: 'H', type: 'http', label: '' },
  { source: 'H', target: 'I', type: 'http', label: '' },
  { source: 'I', target: 'J', type: 'http', label: '' },

  // Phase 4: Completeness Check
  { source: 'J', target: 'K', type: 'database', label: 'No' },
  { source: 'K', target: 'END2', type: 'database', label: '' },
  { source: 'J', target: 'SD', type: 'http', label: 'Yes' },

  // Phase 5: Disclosure with SQ1 Fail callback
  { source: 'SD', target: 'SQ1', type: 'internal', label: '' },
  { source: 'SQ1', target: 'SD', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ1', target: 'ALR', type: 'http', label: 'Pass' },

  // Phase 6: Document Review
  { source: 'ALR', target: 'DOCCHECK', type: 'http', label: '' },

  // Document Request Path (Yes - documents needed)
  { source: 'DOCCHECK', target: 'CML', type: 'internal', label: 'Yes' },
  { source: 'CML', target: 'SQ2', type: 'internal', label: '' },
  { source: 'SQ2', target: 'CML', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ2', target: 'SLC', type: 'http', label: 'Pass' },
  { source: 'SLC', target: 'DR', type: 'http', label: '' },
  { source: 'DR', target: 'ALR', type: 'http', label: 'Received', style: 'dashed' },
  { source: 'DR', target: 'CW', type: 'database', label: 'Not Received' },
  { source: 'CW', target: 'END3', type: 'database', label: '' },

  // Phase 7: Underwriting Path (No - documents not needed)
  { source: 'DOCCHECK', target: 'UWC', type: 'http', label: 'No' },
  { source: 'UWC', target: 'AU', type: 'http', label: '' },
  { source: 'AU', target: 'URC', type: 'http', label: '' },
  { source: 'URC', target: 'READY', type: 'http', label: '' },
  { source: 'READY', target: 'ALR', type: 'internal', label: 'Not Ready', style: 'dashed' },
  { source: 'READY', target: 'DEC', type: 'http', label: 'Ready' },

  // Phase 8: Commitment Path (Yes decision)
  { source: 'DEC', target: 'MCL', type: 'http', label: 'Yes' },
  { source: 'MCL', target: 'SQ3', type: 'internal', label: '' },
  { source: 'SQ3', target: 'MCL', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ3', target: 'SL', type: 'http', label: 'Pass' },

  // Phase 9: Closing
  { source: 'SL', target: 'ACA', type: 'http', label: '' },
  { source: 'ACA', target: 'RWA', type: 'http', label: '' },
  { source: 'RWA', target: 'CCP', type: 'http', label: '' },
  { source: 'CCP', target: 'SQ4', type: 'internal', label: '' },
  { source: 'SQ4', target: 'CCP', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ4', target: 'SCP', type: 'http', label: 'Pass' },
  { source: 'SCP', target: 'RCP', type: 'http', label: '' },
  { source: 'RCP', target: 'SQ5', type: 'internal', label: '' },
  { source: 'SQ5', target: 'RCP', type: 'database', label: 'Fail', style: 'dashed' },

  // Phase 10: Completion
  { source: 'SQ5', target: 'CSM', type: 'http', label: 'Pass' },
  { source: 'CSM', target: 'SQ6', type: 'internal', label: '' },
  { source: 'SQ6', target: 'CSM', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ6', target: 'END4', type: 'http', label: 'Pass' },

  // Denial Path (No decision)
  { source: 'DEC', target: 'MDL', type: 'database', label: 'No' },
  { source: 'MDL', target: 'SQ7', type: 'internal', label: '' },
  { source: 'SQ7', target: 'MDL', type: 'database', label: 'Fail', style: 'dashed' },
  { source: 'SQ7', target: 'SLD', type: 'database', label: 'Pass' },
  { source: 'SLD', target: 'END5', type: 'database', label: '' },
];

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE SIDEBAR COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function PhaseSidebar({ isDark }) {
  const theme = isDark ? THEMES.dark : THEMES.light;

  const legendItems = [
    { color: '#2874a6', label: 'Process Step' },
    { color: '#1a5276', label: 'Decision' },
    { color: '#27ae60', label: 'SQ Review' },
    { color: '#c0392b', label: 'Denial/End' },
    { color: '#1b5e20', label: 'Loan Closed' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: theme.bgCard,
        borderRadius: '12px',
        border: `1px solid ${theme.borderCard}`,
        boxShadow: theme.shadowCard,
        padding: '16px',
        zIndex: 100,
        width: '200px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
      }}
    >
      {/* Legend */}
      <h3 style={{
        margin: '0 0 10px 0',
        fontSize: '11px',
        fontWeight: 700,
        color: theme.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Legend
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        {legendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              color: theme.textSecondary,
            }}>
              {item.label}
            </span>
          </div>
        ))}
        {/* Fail Path Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '3px',
              backgroundColor: isDark ? '#ef5350' : '#c0392b',
              borderRadius: '2px',
              flexShrink: 0,
              borderTop: `1px dashed ${isDark ? '#ef5350' : '#c0392b'}`,
            }}
          />
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            color: theme.textSecondary,
          }}>
            Fail Path (SQ Review)
          </span>
        </div>
      </div>

      {/* Phases */}
      <h3 style={{
        margin: '0 0 10px 0',
        fontSize: '11px',
        fontWeight: 700,
        color: theme.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Process Phases
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {PHASES.map((phase, index) => (
          <div
            key={phase.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                backgroundColor: phase.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              color: theme.textPrimary,
            }}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   DETAIL PANEL COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function DetailPanel({ node, onClose, isDark }) {
  const theme = isDark ? THEMES.dark : THEMES.light;
  if (!node) return null;

  const Icon = node.icon;
  const phase = PHASES[node.phase - 1];
  const nodeColors = NODE_TYPE_COLORS[node.type];
  const gradientStart = isDark ? nodeColors.dark.start : nodeColors.light.start;

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        backgroundColor: theme.bgCard,
        borderRadius: '14px',
        border: `1px solid ${theme.borderCard}`,
        boxShadow: theme.shadowCard,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.25s ease-out',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: `1px solid ${theme.borderCard}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${gradientStart}, ${isDark ? nodeColors.dark.end : nodeColors.light.end})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={26} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: '0 0 6px',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: theme.textPrimary,
          }}>
            {node.label}
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '10px',
                backgroundColor: node.status === 'active' ? '#DBF0E3' : '#FFF4D6',
                color: node.status === 'active' ? '#14713A' : '#8B6914',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {node.status === 'active' ? 'Active' : 'Planned'}
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: '10px',
                backgroundColor: phase.color + '20',
                color: phase.color,
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              Phase {node.phase}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: theme.bgCardHover,
            color: theme.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LuX size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            margin: '0 0 8px',
            fontSize: '10px',
            fontWeight: 600,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Description
          </h4>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: theme.textSecondary,
            lineHeight: 1.5,
          }}>
            {node.description}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            margin: '0 0 8px',
            fontSize: '10px',
            fontWeight: 600,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Phase
          </h4>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            backgroundColor: theme.bgCardHover,
            borderRadius: '8px',
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: phase.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
            }}>
              {node.phase}
            </div>
            <span style={{ fontSize: '13px', color: theme.textPrimary, fontWeight: 500 }}>
              {phase.label}
            </span>
          </div>
        </div>

        <div>
          <h4 style={{
            margin: '0 0 8px',
            fontSize: '10px',
            fontWeight: 600,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Node Type
          </h4>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: theme.textPrimary,
            fontFamily: '"Courier New", monospace',
            padding: '8px 12px',
            backgroundColor: theme.bgCardHover,
            borderRadius: '6px',
          }}>
            {node.type}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN D3 FLOWCHART COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

function MermaidFlowchart({ isDark = true }) {
  const theme = isDark ? THEMES.dark : THEMES.light;
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [selectedNode]);

  // D3 Graph rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width - (selectedNode ? 350 : 0);
    const height = Math.max(dimensions.height, 2500);

    svg.attr('width', width).attr('height', height);

    // Create defs for gradients and filters
    const defs = svg.append('defs');

    // Create gradients for each node type
    Object.entries(NODE_TYPE_COLORS).forEach(([type, colors]) => {
      const colorSet = isDark ? colors.dark : colors.light;
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${type}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');
      gradient.append('stop').attr('offset', '0%').attr('stop-color', colorSet.start);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', colorSet.end);
    });

    // Drop shadow filter
    const dropShadow = defs.append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-20%').attr('y', '-20%')
      .attr('width', '140%').attr('height', '140%');
    dropShadow.append('feDropShadow')
      .attr('dx', '0').attr('dy', '3')
      .attr('stdDeviation', '5')
      .attr('flood-color', isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,59,115,0.2)');

    // Glow filter
    const glow = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers for each edge type
    Object.entries(EDGE_COLORS).forEach(([type, colors]) => {
      const color = isDark ? colors.dark : colors.light;
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Red arrow marker for fail paths
    const failArrowColor = isDark ? '#ef5350' : '#c0392b';
    defs.append('marker')
      .attr('id', 'arrow-fail')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', failArrowColor);

    // Create main group with zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare nodes and edges
    const nodes = WORKFLOW_NODES.map(d => ({ ...d }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edges = WORKFLOW_EDGES.map(e => ({
      ...e,
      source: nodeMap.get(e.source),
      target: nodeMap.get(e.target),
    })).filter(e => e.source && e.target);

    // Compute path for edges - handles forward, backward, and side paths
    const computePath = (source, target, edge) => {
      const dy = target.y - source.y;
      const dx = target.x - source.x;

      // Check if this is a fail/feedback path (going backwards or same level)
      const isFailPath = edge.style === 'dashed' || dy < 0;

      if (isFailPath && dy <= 0) {
        // Fail callback - create a loop path that goes to the side
        const loopOffset = 100; // How far to the side the loop goes
        const sourceX = source.x + 80; // Exit from right side of node
        const sourceY = source.y;
        const targetX = target.x + 80; // Enter right side of target
        const targetY = target.y;

        // Create a smooth loop to the right
        const midY = (sourceY + targetY) / 2;
        const controlX = Math.max(sourceX, targetX) + loopOffset;

        return `M${sourceX},${sourceY} C${controlX},${sourceY} ${controlX},${targetY} ${targetX},${targetY}`;
      } else if (Math.abs(dx) > 200 && Math.abs(dy) < 100) {
        // Horizontal path - curve smoothly
        const sourceX = dx > 0 ? source.x + 80 : source.x - 80;
        const sourceY = source.y;
        const targetX = dx > 0 ? target.x - 80 : target.x + 80;
        const targetY = target.y;

        const midX = (sourceX + targetX) / 2;
        const cpOffset = Math.abs(dx) * 0.3;

        return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
      } else {
        // Standard vertical path
        const sourceX = source.x;
        const sourceY = source.y + 26;
        const targetX = target.x;
        const targetY = target.y - 26;

        // Control point offset
        const cpOffset = Math.abs(dy) * 0.3;

        return `M${sourceX},${sourceY} C${sourceX},${sourceY + cpOffset} ${targetX},${targetY - cpOffset} ${targetX},${targetY}`;
      }
    };

    // Draw edges
    const edgeGroup = g.append('g').attr('class', 'edges');

    edges.forEach((edge, i) => {
      const edgeG = edgeGroup.append('g').attr('class', 'edge');
      const path = computePath(edge.source, edge.target, edge);
      const edgeColor = isDark ? EDGE_COLORS[edge.type].dark : EDGE_COLORS[edge.type].light;
      const isFailPath = edge.style === 'dashed' && edge.label === 'Fail';

      // Fail path color (red for visibility)
      const failColor = isDark ? '#ef5350' : '#c0392b';
      const strokeColor = isFailPath ? failColor : edgeColor;

      // Base path
      edgeG.append('path')
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', isFailPath ? 2.5 : 2)
        .attr('stroke-opacity', isFailPath ? 0.8 : 0.4)
        .attr('stroke-dasharray', edge.style === 'dashed' ? '8,4' : 'none')
        .attr('marker-end', isFailPath ? 'url(#arrow-fail)' : `url(#arrow-${edge.type})`);

      // Flow animation path (skip for fail paths - they have their own style)
      if (!isFailPath) {
        edgeG.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', strokeColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '6,6')
          .attr('stroke-opacity', 0.7)
          .attr('class', 'edge-flow')
          .style('animation', `marchingAnts 0.8s linear infinite`)
          .style('animation-delay', `${i * 0.1}s`);
      }

      // Traveling dot
      const dot = edgeG.append('circle')
        .attr('r', 4)
        .attr('fill', edgeColor)
        .attr('filter', 'url(#glow)')
        .attr('opacity', 0);

      // Animate dot along path
      const pathEl = edgeG.select('path').node();
      if (pathEl) {
        const pathLength = pathEl.getTotalLength();
        const animateDot = () => {
          dot.attr('opacity', 0)
            .transition()
            .delay(i * 200)
            .duration(300)
            .attr('opacity', 1)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t) => {
                const point = pathEl.getPointAtLength(t * pathLength);
                return `translate(${point.x}, ${point.y})`;
              };
            })
            .transition()
            .duration(300)
            .attr('opacity', 0)
            .on('end', animateDot);
        };
        animateDot();
      }

      // Edge label
      if (edge.label) {
        const midPoint = pathEl ? pathEl.getPointAtLength(pathEl.getTotalLength() / 2) : { x: 0, y: 0 };
        edgeG.append('rect')
          .attr('x', midPoint.x - 20)
          .attr('y', midPoint.y - 10)
          .attr('width', 40)
          .attr('height', 20)
          .attr('rx', 10)
          .attr('fill', theme.nodeBg)
          .attr('stroke', theme.borderCard)
          .attr('stroke-width', 1);

        edgeG.append('text')
          .attr('x', midPoint.x)
          .attr('y', midPoint.y + 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', 500)
          .attr('fill', theme.textSecondary)
          .text(edge.label);
      }
    });

    // Draw nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    nodes.forEach((node) => {
      const nodeG = nodeGroup.append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .style('cursor', 'pointer');

      // Node background rect
      nodeG.append('rect')
        .attr('x', -80)
        .attr('y', -26)
        .attr('width', 160)
        .attr('height', 52)
        .attr('rx', 10)
        .attr('fill', `url(#gradient-${node.type})`)
        .attr('filter', 'url(#drop-shadow)')
        .attr('opacity', node.status === 'planned' ? 0.5 : 1);

      // Border
      nodeG.append('rect')
        .attr('x', -80)
        .attr('y', -26)
        .attr('width', 160)
        .attr('height', 52)
        .attr('rx', 10)
        .attr('fill', 'none')
        .attr('stroke', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', node.status === 'planned' ? '5,5' : 'none')
        .attr('class', 'node-border');

      // Status indicator
      nodeG.append('circle')
        .attr('cx', 70)
        .attr('cy', -16)
        .attr('r', 5)
        .attr('fill', node.status === 'active' ? '#14713A' : '#8B6914')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      // Icon circle
      nodeG.append('circle')
        .attr('cx', -55)
        .attr('cy', 0)
        .attr('r', 16)
        .attr('fill', 'rgba(255,255,255,0.2)');

      // Icon letter
      const Icon = node.icon;
      const iconLetter = node.label.charAt(0).toUpperCase();
      nodeG.append('text')
        .attr('x', -55)
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .text(iconLetter);

      // Label
      nodeG.append('text')
        .attr('x', 10)
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 700)
        .attr('fill', '#fff')
        .text(node.label);

      // Description
      const desc = node.description.length > 22 ? node.description.slice(0, 20) + '...' : node.description;
      nodeG.append('text')
        .attr('x', 10)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'rgba(255,255,255,0.8)')
        .text(desc);

      // Hover effects
      nodeG.on('mouseenter', function() {
        d3.select(this).select('rect').attr('filter', 'url(#glow)');
        d3.select(this).select('.node-border').attr('stroke-width', 2.5);
      });

      nodeG.on('mouseleave', function() {
        d3.select(this).select('rect').attr('filter', 'url(#drop-shadow)');
        d3.select(this).select('.node-border').attr('stroke-width', 1.5);
      });

      // Click handler
      nodeG.on('click', () => {
        setSelectedNode(node);
      });
    });

    // Fit to view after render
    setTimeout(() => {
      const bounds = g.node().getBBox();
      const padding = 80;
      const fullWidth = bounds.width + padding * 2;
      const fullHeight = bounds.height + padding * 2;
      const scale = Math.min(width / fullWidth, height / fullHeight, 0.8);
      const translateX = (width - bounds.width * scale) / 2 - bounds.x * scale;
      const translateY = padding;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
    }, 100);

  }, [isDark, dimensions, selectedNode]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: theme.bgBody,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PhaseSidebar isDark={isDark} />

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'grab',
          }}
        />
      </div>

      {selectedNode && (
        <div style={{ padding: '24px 24px 24px 0' }}>
          <DetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            isDark={isDark}
          />
        </div>
      )}

      <style>{`
        @keyframes marchingAnts {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
    </div>
  );
}

export default MermaidFlowchart;
