import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LuLogIn,
  LuUser,
  LuLock,
  LuCircleAlert,
  LuBriefcase,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      // Redirect admins to Admin Dashboard, specialists to Workbench
      const isAdmin = result.user?.role === 'admin';
      const defaultPath = isAdmin ? '/admin' : '/workbench';
      const requestedPath = location.state?.from?.pathname;

      // Use requested path if it's appropriate for the user role
      // Admins shouldn't go to /workbench, specialists shouldn't go to /admin
      let redirectPath = defaultPath;
      if (requestedPath) {
        if (isAdmin && requestedPath !== '/workbench') {
          redirectPath = requestedPath;
        } else if (!isAdmin && requestedPath !== '/admin') {
          redirectPath = requestedPath;
        }
      }

      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0B1929 0%, #112240 50%, #1a365d 100%)'
        : 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%)',
      padding: '20px',
    },
    card: {
      background: isDark ? '#112240' : '#ffffff',
      borderRadius: '16px',
      padding: '40px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: isDark
        ? '0 20px 60px rgba(0, 0, 0, 0.4)'
        : '0 20px 60px rgba(0, 0, 0, 0.1)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
    },
    logoSection: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    logoIcon: {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      boxShadow: '0 8px 24px rgba(0, 59, 115, 0.3)',
    },
    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: isDark ? '#e2e8f0' : '#1e293b',
      margin: '0 0 8px 0',
    },
    subtitle: {
      fontSize: '14px',
      color: isDark ? '#94a3b8' : '#64748b',
      margin: 0,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    inputGroup: {
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    input: {
      width: '100%',
      padding: '14px 14px 14px 44px',
      fontSize: '15px',
      borderRadius: '10px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box',
    },
    inputFocused: {
      borderColor: '#117ACA',
      boxShadow: '0 0 0 3px rgba(17, 122, 202, 0.15)',
    },
    button: {
      padding: '14px 24px',
      fontSize: '15px',
      fontWeight: '600',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #003B73 0%, #117ACA 100%)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: '0 4px 12px rgba(0, 59, 115, 0.3)',
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed',
    },
    error: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 14px',
      borderRadius: '10px',
      background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      fontSize: '14px',
    },
    footer: {
      marginTop: '24px',
      textAlign: 'center',
      fontSize: '13px',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    link: {
      color: '#117ACA',
      textDecoration: 'none',
      fontWeight: '500',
      cursor: 'pointer',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <LuBriefcase size={32} color="#ffffff" />
          </div>
          <h1 style={styles.title}>Specialist Login</h1>
          <p style={styles.subtitle}>Sign in to access your workbench</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div style={styles.error}>
              <LuCircleAlert size={18} />
              {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <LuUser size={18} style={styles.inputIcon} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <LuLock size={18} style={styles.inputIcon} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Signing in...
              </>
            ) : (
              <>
                <LuLogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p>
            Need an account?{' '}
            <span style={styles.link} onClick={() => navigate('/applications')}>
              Contact Admin
            </span>
          </p>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          input::placeholder {
            color: ${isDark ? '#64748b' : '#94a3b8'};
          }
          input:focus {
            border-color: #117ACA !important;
            box-shadow: 0 0 0 3px rgba(17, 122, 202, 0.15) !important;
          }
        `}
      </style>
    </div>
  );
};

export default Login;
