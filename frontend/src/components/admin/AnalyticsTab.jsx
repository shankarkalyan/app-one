/**
 * Analytics Tab Component for Admin Dashboard
 * Displays D3 charts for network graph, workload, and flow diagrams
 */
import React from 'react';
import {
  LuGitBranch,
  LuChartBar,
  LuChartPie,
  LuActivity,
  LuMaximize2,
} from 'react-icons/lu';
import { COLORS } from './adminStyles';

const AnalyticsTab = ({
  networkGraphRef,
  barChartRef,
  donutChartRef,
  sankeyRef,
  setExpandedChart,
  isDark,
  styles,
}) => {
  const colors = COLORS;

  return (
    <>
      {/* Network Graph - Full Width */}
      <div style={{ ...styles.analyticsCard, ...styles.analyticsCardFull, marginBottom: '24px' }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>
            <LuGitBranch size={18} color={colors.primary} />
            Specialist Network Graph
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              color: isDark ? '#64748b' : '#94a3b8',
            }}>
              Drag nodes to explore connections
            </span>
            <button
              style={styles.expandBtn}
              onClick={() => setExpandedChart('network')}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
            >
              <LuMaximize2 size={14} />
              Expand
            </button>
          </div>
        </div>
        <div style={styles.cardBody}>
          <div ref={networkGraphRef} style={{ ...styles.chartContainer, height: '450px' }} />
        </div>
      </div>

      {/* Charts Grid */}
      <div style={styles.analyticsGrid}>
        {/* Bar Chart */}
        <div style={styles.analyticsCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <LuChartBar size={18} color={colors.warning} />
              Workload by Phase
            </div>
          </div>
          <div style={styles.cardBody}>
            <div ref={barChartRef} style={styles.chartContainer} />
          </div>
        </div>

        {/* Donut Chart */}
        <div style={styles.analyticsCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <LuChartPie size={18} color={colors.success} />
              Task Status Distribution
            </div>
          </div>
          <div style={styles.cardBody}>
            <div ref={donutChartRef} style={styles.chartContainer} />
          </div>
        </div>
      </div>

      {/* Sankey Flow - Full Width */}
      <div style={{ ...styles.analyticsCard, ...styles.analyticsCardFull }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>
            <LuActivity size={18} color={colors.cyan} />
            Workflow Flow Diagram
          </div>
        </div>
        <div style={styles.cardBody}>
          <div ref={sankeyRef} style={{ ...styles.chartContainer, height: '350px' }} />
        </div>
      </div>
    </>
  );
};

export default AnalyticsTab;
