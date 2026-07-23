import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'continuity', label: 'Continuity' },
  { id: 'legacy_rules', label: 'Legacy Rules' },
  { id: 'emergency_access', label: 'Emergency Access' },
  { id: 'releases', label: 'Releases' },
  { id: 'trusted_people', label: 'Trusted People' },
  { id: 'system', label: 'System' },
];

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await api.get('/notifications', { params: { category, search } });
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [category]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.post(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/notifications/read-all');
      if (res.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      alert('Failed to mark all as read: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      alert('Failed to delete notification.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 mb-2">
            🔔 Real-Time Alerting
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Notification Center</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Actionable notification history for security alerts, continuity cycles, and release authorizations.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} loading={actionLoading}>
            ✓ Mark All Read
          </Button>
          <Link to="/settings/notifications">
            <Button variant="secondary" size="sm">
              ⚙️ Preferences
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <Card padding="p-4" className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); loadNotifications(); }} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notification titles and messages..."
            className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button variant="secondary" size="sm" type="submit">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                category === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      {loading ? (
        <SkeletonLoader count={4} height="h-20" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications found"
          description="You are all caught up! No notifications exist in this view."
        />
      ) : (
        <Card padding="p-6" className="space-y-4">
          <div className="divide-y divide-slate-100 space-y-4">
            {notifications.map((item) => {
              const dateObj = item.createdAt?._seconds ? new Date(item.createdAt._seconds * 1000) : new Date(item.createdAt || Date.now());
              return (
                <div
                  key={item.id}
                  className={`pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors p-3 rounded-2xl ${
                    !item.read ? 'bg-indigo-50/40 border border-indigo-100/60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                      !item.read ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.category === 'security' ? '🛡️' : item.category === 'continuity' ? '⏰' : '🔔'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{item.title}</span>
                        {item.priority && <StatusBadge status={item.priority} />}
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                        )}
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">{item.message}</p>
                      <span className="text-[10px] text-slate-400 font-semibold block pt-1">
                        {dateObj.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {item.actionUrl && (
                      <Link to={item.actionUrl}>
                        <Button variant="primary" size="xs">
                          Action →
                        </Button>
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 font-bold text-[11px] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
