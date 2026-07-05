'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to add item');
      
      setUrl('');
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this item?')) return;
    
    try {
      const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>QcomMeKitneKa</h1>
        <p className={styles.subtitle}>Track grocery prices across Blinkit, Zepto, and Swiggy Instamart.</p>
      </header>

      <section className={styles.card}>
        <form onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <input
              type="url"
              placeholder="Paste product URL (Blinkit, Zepto, or Swiggy Instamart)"
              className={styles.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Adding...' : 'Track Item'}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </section>

      <section className={styles.card}>
        {initialLoading ? (
          <div className={styles.loadingState}>Loading items...</div>
        ) : items.length === 0 ? (
          <div className={styles.loadingState}>No items being tracked yet.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Platform</th>
                  <th>Current Price</th>
                  <th>Added At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.productName}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.name}
                        </a>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        First seen: {formatPrice(item.first_seen_price)}
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge} data-platform={item.platform}>
                        {item.platform === 'swiggy' ? 'Swiggy Instamart' : 
                         item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}
                      </span>
                    </td>
                    <td className={styles.price}>
                      {formatPrice(item.current_price)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
