import { useState } from 'react';
import api from '../lib/api';

interface LoginProps {
  onAuthenticated: () => void;
}

export default function Login({ onAuthenticated }: LoginProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = key.trim();
    if (!trimmedKey) return;

    setLoading(true);
    setError('');

    try {
      // Store temporarily to let the interceptor pick it up for the validation call
      localStorage.setItem('apiKey', trimmedKey);
      
      // Validate the key by hitting a protected endpoint
      await api.get('/engine/status');

      onAuthenticated();
    } catch (err: any) {
      localStorage.removeItem('apiKey'); // Remove if invalid
      if (err.response?.status === 401) {
        setError('Invalid API key. Check your .env file for the API_KEY value.');
      } else {
        setError('Connection failed. Make sure the backend server is running on port 3002.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>✈</span>
          <h1 style={styles.brandName}>PostPilot AI</h1>
          <p style={styles.brandSub}>Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="apiKey">
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your API_KEY from .env"
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            style={{
              ...styles.button,
              opacity: loading || !key.trim() ? 0.6 : 1,
              cursor: loading || !key.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying…' : 'Enter Dashboard →'}
          </button>
        </form>

        <p style={styles.hint}>
          Your key is stored only in <code>localStorage</code> and never sent anywhere except your
          local backend.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  brand: {
    textAlign: 'center',
    marginBottom: '36px',
  },
  brandIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '8px',
  },
  brandName: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandSub: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '13px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    margin: 0,
  },
  button: {
    marginTop: '8px',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  },
  hint: {
    marginTop: '24px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    textAlign: 'center',
    lineHeight: 1.6,
  },
};
