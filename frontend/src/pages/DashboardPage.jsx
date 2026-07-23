import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardOverview } from '../services/analyticsService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import SkeletonLoader from '../components/ui/SkeletonLoader';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getDashboardOverview();
        if (res.success) setAnalytics(res.data.analytics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <SkeletonLoader count={3} height="h-32" />
      </div>
    );
  }

  const {
    readinessScore = 0,
    readinessTier = 'Getting Started',
    healthStatus = 'healthy',
    healthReason = '',
    vaultHealth = {},
    trustedPeopleSummary = {},
    legacyRulesSummary = {},
    emergencySummary = {},
    releasesSummary = {},
    securitySummary = {},
    nextSteps = [],
    setupChecklist = [],
  } = analytics || {};

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="space-y-1">
          <span className="inline-flex text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
            🛡️ Protected Digital Legacy
          </span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}
          </h1>
          <p className="text-xs text-slate-300 font-medium">
            Here is the real-time status and readiness of your digital legacy vault.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Link to="/vault/assets/new">
            <Button variant="primary" size="sm">
              + Add Asset
            </Button>
          </Link>
          <Link to="/trusted-people/new">
            <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              + Add Person
            </Button>
          </Link>
        </div>
      </div>

      {/* Legacy Readiness & Health Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Legacy Readiness Score */}
        <Card padding="p-6" className="space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legacy Readiness</span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {readinessTier}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-slate-900">{readinessScore}%</span>
            <span className="text-xs text-slate-400 font-medium">LegacyOS Score</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${readinessScore}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">
            Calculated score based on asset protection, rules, and continuity.
          </p>
        </Card>

        {/* Legacy Health Status */}
        <Card padding="p-6" className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legacy Health</span>
            <StatusBadge status={healthStatus} />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 capitalize">
              {healthStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {healthReason}
          </p>
        </Card>

        {/* Vault Protection Health */}
        <Card padding="p-6" className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vault Health</span>
            <span className="text-xs font-bold text-emerald-600">{vaultHealth.protectionPercentage || 0}% Protected</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{vaultHealth.protectedAssets || 0}</span>
            <span className="text-xs text-slate-400">/ {vaultHealth.activeAssets || 0} Assets Protected</span>
          </div>

          <Link to="/vault" className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-700">
            Review Vault Assets →
          </Link>
        </Card>
      </div>

      {/* Actionable Recommended Next Steps */}
      {nextSteps.length > 0 && (
        <Card padding="p-6" className="space-y-4 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recommended Next Steps</h3>
              <p className="text-xs text-slate-500 font-medium">Prioritized actions to improve your digital legacy preparation.</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              {nextSteps.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextSteps.map((step) => (
              <div key={step.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {step.priority} Priority
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{step.description}</p>
                </div>

                <Link to={step.actionUrl}>
                  <Button variant="primary" size="xs" className="w-full">
                    {step.actionText} →
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System Status Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/trusted-people">
          <Card padding="p-5" className="hover:border-indigo-300 transition-colors space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trusted Contacts</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{trustedPeopleSummary.active || 0}</span>
              <span className="text-xs text-slate-400">Active</span>
            </div>
            {trustedPeopleSummary.pending > 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {trustedPeopleSummary.pending} Pending Invite
              </span>
            )}
          </Card>
        </Link>

        <Link to="/legacy-rules">
          <Card padding="p-5" className="hover:border-indigo-300 transition-colors space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legacy Rules</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{legacyRulesSummary.active || 0}</span>
              <span className="text-xs text-slate-400">Active Rules</span>
            </div>
          </Card>
        </Link>

        <Link to="/releases">
          <Card padding="p-5" className="hover:border-indigo-300 transition-colors space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Releases</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">{releasesSummary.active || 0}</span>
              <span className="text-xs text-slate-400">Tokens Issued</span>
            </div>
          </Card>
        </Link>

        <Link to="/security">
          <Card padding="p-5" className="hover:border-indigo-300 transition-colors space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Alerts</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${securitySummary.unacknowledgedAlerts > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {securitySummary.unacknowledgedAlerts || 0}
              </span>
              <span className="text-xs text-slate-400">Unacknowledged</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Setup Checklist Progress */}
      <Card padding="p-6" className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
          LegacyOS Setup Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {setupChecklist.map((item, idx) => (
            <Link key={idx} to={item.path}>
              <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                item.completed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <span className="font-bold">{item.label}</span>
                <span>{item.completed ? '✓' : '○'}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
