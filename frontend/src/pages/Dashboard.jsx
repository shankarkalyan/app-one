import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LuLayers,
  LuFileText,
  LuRefreshCw,
  LuSun,
  LuMoon,
  LuGitBranch,
  LuPlus,
  LuHouse,
} from 'react-icons/lu';
import { healthCheck } from '../services/api';
import D3WorkflowGraph from '../components/D3WorkflowGraph';
import MermaidFlowchart from '../components/MermaidFlowchart';
import { useTheme } from '../context/ThemeContext';

function Dashboard() {
  const { isDark, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get initial tab from URL query parameter, default to 'agentic'
  const viewParam = searchParams.get('view');
  const [activeTab, setActiveTab] = useState(viewParam === 'flowchart' ? 'flowchart' : 'agentic');

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ view: tab === 'agentic' ? 'agentic' : 'flowchart' });
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      const healthData = await healthCheck();
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: isDark ? '#0B1929' : '#F3F6FB'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid transparent',
              borderTopColor: '#117ACA',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <p style={{ color: isDark ? '#8EA4BD' : '#4A6380' }}>Loading Workflow...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: isDark ? '#0B1929' : '#F3F6FB'
    }}>
      {/* Header Bar - 64px, Chase Blue Gradient */}
      <header
        style={{
          height: '64px',
          background: isDark
            ? 'linear-gradient(135deg, #0B1929 0%, #112240 40%, #1A365D 100%)'
            : 'linear-gradient(135deg, #003B73 0%, #00508F 40%, #117ACA 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        {/* Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LuLayers size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#fff',
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif'
            }}>
              {activeTab === 'agentic' ? 'Loan Assumption Agentic Workflow' : 'Loan Assumption Workflow'}
            </h1>
          </div>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {activeTab === 'agentic' ? 'LangGraph' : 'Mermaid'}
          </span>
          {health && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(20, 113, 58, 0.2)',
                color: '#4ade80',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                animation: 'pulse 2s infinite'
              }} />
              Online
            </span>
          )}
        </div>

        {/* Right Side - Tab Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '3px'
            }}
          >
            {/* Applications */}
            <Link
              to="/applications"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <LuFileText size={14} />
              Applications
            </Link>
            {/* Agentic Workflow */}
            <button
              onClick={() => handleTabChange('agentic')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'agentic' ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <LuLayers size={14} />
              Agentic Workflow
            </button>
            {/* Flowchart Workflow */}
            <button
              onClick={() => handleTabChange('flowchart')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'flowchart' ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <LuGitBranch size={14} />
              Workflow
            </button>
            {/* Simulate New Application */}
            <Link
              to="/new"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <LuPlus size={14} />
              Simulate
            </Link>
          </div>

          {/* Home */}
          <Link
            to="/applications"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
            title="Loan Assumption Applications"
          >
            <LuHouse size={18} />
          </Link>

          {/* Refresh */}
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Refresh"
          >
            <LuRefreshCw size={18} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <LuSun size={18} /> : <LuMoon size={18} />}
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main style={{
        flex: 1,
        padding: '24px',
        overflow: 'hidden',
        display: 'flex',
        gap: '24px'
      }}>
        {/* Canvas Container */}
        <div
          style={{
            flex: 1,
            borderRadius: '14px',
            overflow: activeTab === 'flowchart' ? 'auto' : 'hidden',
            backgroundColor: isDark ? '#112240' : '#FFFFFF',
            border: `1px solid ${isDark ? '#1E3A5F' : '#D8E3F0'}`,
            boxShadow: isDark ? '0 2px 12px rgba(0, 0, 0, 0.3)' : '0 2px 12px rgba(0, 59, 115, 0.07)'
          }}
        >
          {activeTab === 'agentic' ? (
            <D3WorkflowGraph
              executionPath={[]}
              currentNode={null}
              onNodeClick={handleNodeClick}
              animateTransactions={true}
              isDark={isDark}
            />
          ) : (
            <MermaidFlowchart isDark={isDark} />
          )}
        </div>
      </main>

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
