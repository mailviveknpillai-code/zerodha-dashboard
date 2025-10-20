import React, { useState, useEffect } from 'react';

const AlphaDemo = () => {
  const [symbol, setSymbol] = useState('IBM');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDemo = async () => {
    setLoading(true);
    setError(null);
    setSnapshot(null);
    try {
      const res = await fetch(`/api/alpha-demo?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        setError(`Server error (${res.status}): ${await res.text()}`);
      } else {
        setSnapshot(await res.json());
      }
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemo();
  }, []); // Run once on mount

  const formattedSnapshot = () => {
    if (!snapshot) return '';
    try {
      return JSON.stringify(snapshot, null, 2);
    } catch (e) {
      return String(snapshot);
    }
  };

  return (
    <div className="alpha-demo">
      <h2>Alpha Vantage Demo</h2>
      <div>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol (e.g., IBM, NIFTY)"
        />
        <button onClick={fetchDemo}>Fetch</button>
      </div>

      {loading && <div>Loading…</div>}

      {error && <div className="error">{error}</div>}

      {snapshot && <pre>{formattedSnapshot()}</pre>}
    </div>
  );
};

export default AlphaDemo;
