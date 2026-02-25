import React, { useState } from 'react';
import { X, Copy, Check, FileJson, ChevronRight } from 'lucide-react';

function JsonViewerModal({ isOpen, onClose, title, requestData, responseData, isDark }) {
  const [activeTab, setActiveTab] = useState('request');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const theme = {
    bgOverlay: 'rgba(0, 0, 0, 0.6)',
    bgModal: isDark ? '#112240' : '#FFFFFF',
    bgCode: isDark ? '#000000' : '#F8FBFF',
    textPrimary: isDark ? '#CDD9E5' : '#0D2137',
    textSecondary: isDark ? '#8EA4BD' : '#4A6380',
    textMuted: isDark ? '#5A7A9A' : '#7E95AB',
    borderCard: isDark ? '#1E3A5F' : '#D8E3F0',
    brand: '#117ACA',
    // JSON syntax colors
    jsonKey: isDark ? '#7DD3FC' : '#0369A1',
    jsonString: isDark ? '#86EFAC' : '#15803D',
    jsonNumber: isDark ? '#FDE68A' : '#B45309',
    jsonBoolean: isDark ? '#C4B5FD' : '#7C3AED',
    jsonNull: isDark ? '#FDA4AF' : '#DC2626',
  };

  const formatJson = (data) => {
    if (!data) return 'No data available';
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
  };

  const syntaxHighlight = (json) => {
    if (!json || json === 'No data available') {
      return <span style={{ color: theme.textMuted, fontStyle: 'italic' }}>{json}</span>;
    }

    // Parse and highlight JSON
    const highlighted = json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let color = theme.jsonNumber;
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            color = theme.jsonKey;
            // Remove quotes and colon for keys, style separately
            const key = match.slice(1, -2);
            return `<span style="color:${color}">"${key}"</span>:`;
          } else {
            color = theme.jsonString;
          }
        } else if (/true|false/.test(match)) {
          color = theme.jsonBoolean;
        } else if (/null/.test(match)) {
          color = theme.jsonNull;
        }
        return `<span style="color:${color}">${match}</span>`;
      }
    );

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const copyToClipboard = () => {
    const data = activeTab === 'request' ? requestData : responseData;
    const text = formatJson(data);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const currentData = activeTab === 'request' ? requestData : responseData;

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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: theme.bgModal,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: `1px solid ${theme.borderCard}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.borderCard}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(17, 122, 202, 0.2)' : 'rgba(17, 122, 202, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileJson size={20} color={theme.brand} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: theme.textPrimary,
                }}
              >
                {title || 'JSON Viewer'}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: theme.textMuted,
                }}
              >
                API Request & Response Data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: theme.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 24px',
            borderBottom: `1px solid ${theme.borderCard}`,
          }}
        >
          <button
            onClick={() => setActiveTab('request')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'request' ? theme.brand : 'transparent',
              color: activeTab === 'request' ? '#fff' : theme.textSecondary,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight size={14} style={{ transform: 'rotate(0deg)' }} />
            Request
          </button>
          <button
            onClick={() => setActiveTab('response')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'response' ? theme.brand : 'transparent',
              color: activeTab === 'response' ? '#fff' : theme.textSecondary,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
            Response
          </button>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            style={{
              marginLeft: 'auto',
              padding: '10px 16px',
              borderRadius: '8px',
              border: `1px solid ${theme.borderCard}`,
              backgroundColor: copied ? (isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7') : 'transparent',
              color: copied ? '#22C55E' : theme.textSecondary,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* JSON Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: theme.bgCode,
              border: `1px solid ${theme.borderCard}`,
              fontSize: '13px',
              fontFamily: '"Fira Code", "Monaco", "Consolas", monospace',
              lineHeight: 1.6,
              overflow: 'auto',
              maxHeight: '400px',
              color: theme.textPrimary,
            }}
          >
            {syntaxHighlight(formatJson(currentData))}
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: `1px solid ${theme.borderCard}`,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: theme.brand,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#0D6AB8';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.brand;
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default JsonViewerModal;
