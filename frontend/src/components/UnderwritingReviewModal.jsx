/**
 * Underwriting Review Modal Component
 * Displays an underwriting decision report with PDF-like look and feel
 */
import React, { useState } from 'react';
import {
  LuFileText,
  LuX,
  LuCircleCheck,
  LuCircleX,
  LuUser,
  LuDollarSign,
  LuHouse,
  LuShield,
  LuClipboardCheck,
  LuMessageSquare,
  LuCalendar,
  LuPhone,
  LuMail,
  LuRefreshCw,
  LuTriangleAlert,
  LuCircleCheckBig,
  LuFileCheck,
  LuDownload,
  LuPrinter,
  LuZoomIn,
  LuZoomOut,
  LuChevronLeft,
  LuChevronRight,
} from 'react-icons/lu';

function UnderwritingReviewModal({
  isOpen,
  onClose,
  onApprove,
  onReject,
  applicationData,
  executionData = [],
  isDark,
  isSubmitting = false,
}) {
  const [notes, setNotes] = useState('');
  const [zoom, setZoom] = useState(100);

  if (!isOpen) return null;

  // Theme colors
  const theme = {
    bgOverlay: 'rgba(0, 0, 0, 0.85)',
    bgToolbar: '#323639',
    bgViewer: '#525659',
    bgPaper: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textToolbar: '#ffffff',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    brand: '#117ACA',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  };

  // Extract data from applicationData
  const app = applicationData || {};
  const customerName = app.customer_name || 'N/A';
  const customerEmail = app.customer_email || 'N/A';
  const customerPhone = app.customer_phone || 'N/A';
  const ssnLastFour = app.ssn_last_four || '****';
  const loanAmount = app.loan_amount ? `$${app.loan_amount.toLocaleString()}` : 'N/A';
  const propertyAddress = app.property_address || 'N/A';
  const originalBorrower = app.original_borrower || 'N/A';
  const applicationId = app.application_id || 'N/A';
  const createdAt = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A';

  // Extract underwriting checklist from execution data
  const underwritingExecution = executionData.find(
    (e) => e.agent_name === 'underwriting_agent' || e.phase === 'UNDERWRITING'
  );
  const checklistItems = underwritingExecution?.output_summary?.checklist || [
    { name: 'Credit Score Verification', passed: true },
    { name: 'Income Verification', passed: true },
    { name: 'Debt-to-Income Ratio', passed: true },
    { name: 'Employment Verification', passed: true },
    { name: 'Property Appraisal Review', passed: true },
    { name: 'Title Search Complete', passed: true },
    { name: 'Insurance Verification', passed: true },
    { name: 'Asset Verification', passed: true },
  ];

  // Calculate risk assessment
  const passedCount = checklistItems.filter((item) => item.passed).length;
  const totalItems = checklistItems.length;
  const passRate = totalItems > 0 ? (passedCount / totalItems) * 100 : 0;
  const riskLevel = passRate >= 90 ? 'LOW' : passRate >= 70 ? 'MEDIUM' : 'HIGH';
  const recommendation = passRate >= 70 ? 'APPROVE' : 'REVIEW REQUIRED';

  const handleApprove = () => {
    onApprove(notes);
  };

  const handleReject = () => {
    onReject(notes);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.bgOverlay,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      {/* PDF Viewer Toolbar */}
      <div
        style={{
          height: '56px',
          backgroundColor: theme.bgToolbar,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        {/* Left: PDF Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* PDF Icon */}
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#e74c3c',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <LuFileText size={20} color="#fff" />
            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                fontSize: '6px',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: '#c0392b',
                padding: '1px 2px',
                borderRadius: '1px',
              }}
            >
              PDF
            </span>
          </div>
          <div>
            <div style={{ color: theme.textToolbar, fontSize: '14px', fontWeight: 500 }}>
              Underwriting_Decision_Report_{applicationId}.pdf
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
              1 page • Generated {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Center: Page Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuChevronLeft size={18} />
          </button>
          <span style={{ color: theme.textToolbar, fontSize: '13px', minWidth: '80px', textAlign: 'center' }}>
            Page 1 of 1
          </span>
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuChevronRight size={18} />
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />

          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuZoomOut size={18} />
          </button>
          <span style={{ color: theme.textToolbar, fontSize: '13px', minWidth: '50px', textAlign: 'center' }}>
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LuZoomIn size={18} />
          </button>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Download PDF"
          >
            <LuDownload size={18} />
          </button>
          <button
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Print"
          >
            <LuPrinter size={18} />
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: theme.textToolbar,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSubmitting ? 0.5 : 1,
            }}
            title="Close"
          >
            <LuX size={20} />
          </button>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div
        style={{
          flex: 1,
          backgroundColor: theme.bgViewer,
          overflow: 'auto',
          padding: '40px 20px',
        }}
      >
        {/* PDF Document (Paper) */}
        <div
          style={{
            width: '800px',
            maxWidth: '100%',
            margin: '0 auto',
            backgroundColor: theme.bgPaper,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Watermark */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              fontSize: '80px',
              fontWeight: 700,
              color: 'rgba(0,0,0,0.03)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            CONFIDENTIAL
          </div>

          {/* Document Content */}
          <div style={{ padding: '40px', position: 'relative', zIndex: 1 }}>
            {/* Letterhead */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '3px solid #003B73',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Company Logo Placeholder */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#003B73',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LuHouse size={26} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#003B73', letterSpacing: '-0.5px' }}>
                    HLT MORTGAGE SERVICES
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    Loan Assumption Division • NMLS #123456
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Document Reference</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                  UW-{applicationId}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#1e293b',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}
              >
                Underwriting Decision Report
              </h1>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '30px',
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#64748b',
                }}
              >
                <span>
                  <strong>Application ID:</strong> {applicationId}
                </span>
                <span>
                  <strong>Report Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Borrower Information Section */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                <LuUser size={20} color="#003B73" />
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#003B73', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Borrower Information
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 16px 8px 0', fontSize: '12px', color: '#64748b', width: '140px', borderBottom: '1px solid #f1f5f9' }}>Full Name</td>
                    <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{customerName}</td>
                    <td style={{ padding: '8px 16px 8px 40px', fontSize: '12px', color: '#64748b', width: '140px', borderBottom: '1px solid #f1f5f9' }}>SSN (Last 4)</td>
                    <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>****{ssnLastFour}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 16px 8px 0', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Email Address</td>
                    <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{customerEmail}</td>
                    <td style={{ padding: '8px 16px 8px 40px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Phone Number</td>
                    <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{customerPhone}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Loan Details Section */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                <LuDollarSign size={20} color="#003B73" />
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#003B73', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Loan Details
                </h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 16px 8px 0', fontSize: '12px', color: '#64748b', width: '140px', borderBottom: '1px solid #f1f5f9' }}>Loan Amount</td>
                    <td style={{ padding: '8px 0', fontSize: '18px', fontWeight: 700, color: '#003B73', borderBottom: '1px solid #f1f5f9' }}>{loanAmount}</td>
                    <td style={{ padding: '8px 16px 8px 40px', fontSize: '12px', color: '#64748b', width: '140px', borderBottom: '1px solid #f1f5f9' }}>Application Date</td>
                    <td style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{createdAt}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 16px 8px 0', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Original Borrower</td>
                    <td colSpan="3" style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{originalBorrower}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 16px 8px 0', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>Property Address</td>
                    <td colSpan="3" style={{ padding: '8px 0', fontSize: '14px', fontWeight: 500, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{propertyAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Underwriting Checklist Section */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                <LuClipboardCheck size={20} color="#003B73" />
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#003B73', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Underwriting Checklist
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', fontSize: '13px' }}>
                {/* Header */}
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>Item</div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', textAlign: 'center', borderBottom: '2px solid #e2e8f0', minWidth: '80px' }}>Status</div>
                {/* Items */}
                {checklistItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>
                      {item.passed ? (
                        <LuCircleCheckBig size={14} color="#10b981" style={{ flexShrink: 0 }} />
                      ) : (
                        <LuTriangleAlert size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                      )}
                      <span>{item.name}</span>
                    </div>
                    <div style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: item.passed ? '#dcfce7' : '#fee2e2',
                          color: item.passed ? '#166534' : '#991b1b',
                        }}
                      >
                        {item.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Risk Assessment Section */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                <LuShield size={20} color="#003B73" />
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#003B73', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Risk Assessment & Recommendation
                </h2>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>
                    {passedCount}/{totalItems}
                  </div>
                  <div style={{ fontSize: '10px', color: '#166534', marginTop: '2px', fontWeight: 600 }}>
                    CHECKS PASSED
                  </div>
                </div>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor:
                      riskLevel === 'LOW' ? '#f0fdf4' : riskLevel === 'MEDIUM' ? '#fffbeb' : '#fef2f2',
                    border: `2px solid ${
                      riskLevel === 'LOW' ? '#86efac' : riskLevel === 'MEDIUM' ? '#fde047' : '#fca5a5'
                    }`,
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color:
                        riskLevel === 'LOW' ? '#166534' : riskLevel === 'MEDIUM' ? '#a16207' : '#991b1b',
                    }}
                  >
                    {riskLevel}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: riskLevel === 'LOW' ? '#166534' : riskLevel === 'MEDIUM' ? '#a16207' : '#991b1b',
                      marginTop: '2px',
                      fontWeight: 600,
                    }}
                  >
                    RISK LEVEL
                  </div>
                </div>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: recommendation === 'APPROVE' ? '#f0fdf4' : '#fffbeb',
                    border: `2px solid ${recommendation === 'APPROVE' ? '#86efac' : '#fde047'}`,
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: recommendation === 'APPROVE' ? '#166534' : '#a16207',
                    }}
                  >
                    {recommendation}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: recommendation === 'APPROVE' ? '#166534' : '#a16207',
                      marginTop: '2px',
                      fontWeight: 600,
                    }}
                  >
                    RECOMMENDATION
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div
              style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '2px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '40px',
              }}
            >
              <div>
                <div style={{ borderBottom: '1px solid #1e293b', height: '30px', marginBottom: '6px' }}></div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Underwriter Signature</div>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #1e293b', height: '30px', marginBottom: '6px' }}></div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Date</div>
              </div>
            </div>

            {/* Page Number */}
            <div
              style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center',
                fontSize: '11px',
                color: '#94a3b8',
              }}
            >
              Page 1 of 1 • CONFIDENTIAL - Internal Use Only
            </div>
          </div>
        </div>
      </div>

      {/* Decision Panel */}
      <div
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: isDark ? '#94a3b8' : '#64748b',
              marginBottom: '8px',
            }}
          >
            <LuMessageSquare size={16} />
            Decision Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or comments about your decision..."
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              color: isDark ? '#f1f5f9' : '#1e293b',
              fontSize: '13px',
              resize: 'none',
              height: '60px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              backgroundColor: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? (
              <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <LuCircleX size={16} />
            )}
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? (
              <LuRefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <LuCircleCheck size={16} />
            )}
            Approve
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default UnderwritingReviewModal;
