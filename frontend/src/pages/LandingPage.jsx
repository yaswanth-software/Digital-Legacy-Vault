import { Link } from 'react-router-dom';

const steps = [
  { num: '01', title: 'Organize', desc: 'Upload and categorize your digital assets — documents, photos, credentials, and messages.' },
  { num: '02', title: 'Protect', desc: 'Everything is encrypted and secured with enterprise-grade security standards.' },
  { num: '03', title: 'Assign', desc: 'Designate trusted people who should receive specific assets.' },
  { num: '04', title: 'Define Rules', desc: 'Set conditions for when and how your assets should be released.' },
  { num: '05', title: 'Verify', desc: 'Our verification system ensures releases only happen under the right conditions.' },
  { num: '06', title: 'Release', desc: 'Assets are securely delivered to the right people at the right time.' },
];

const features = [
  {
    title: 'Digital Vault',
    desc: 'Securely store documents, photos, videos, credentials, and personal messages in one organized space.',
    icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    status: 'Coming Soon',
  },
  {
    title: 'Trusted People',
    desc: 'Assign specific individuals as recipients for your digital assets with granular permissions.',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    status: 'Coming Soon',
  },
  {
    title: 'Legacy Map',
    desc: 'Visualize who receives what — a clear map connecting your assets to your trusted people.',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    status: 'Coming Soon',
  },
  {
    title: 'Conditional Release',
    desc: 'Define rules that govern when assets are released — time-based, event-based, or verification-based.',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
    status: 'Coming Soon',
  },
  {
    title: 'Check-in System',
    desc: 'Regular wellness check-ins ensure your legacy plan only activates when appropriate.',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    status: 'Coming Soon',
  },
  {
    title: 'Secure Authentication',
    desc: 'Industry-standard authentication protects your account with email verification and secure sessions.',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    status: 'Active',
  },
];

const securityPoints = [
  'Firebase Authentication with email verification',
  'Server-side token verification on every API request',
  'No passwords stored in our database — ever',
  'Encrypted connections using HTTPS',
  'Role-based access control',
  'Regular security audits and updates',
];

const whyPoints = [
  { title: 'Your Data, Your Control', desc: 'You decide exactly who gets access to what, under what conditions.' },
  { title: 'No Surprises', desc: 'Clear verification processes ensure nothing happens without proper authorization.' },
  { title: 'Built for Real Life', desc: 'Designed around real scenarios — not just technology for technology\'s sake.' },
  { title: 'Incrementally Adoptable', desc: 'Start small. Add assets and rules over time. No pressure to do everything at once.' },
];

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Secure Digital Legacy Management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Your Digital Life.
              <br />
              <span className="text-indigo-600">Your Rules.</span>
              <br />
              Your Legacy.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-500 leading-relaxed max-w-2xl">
              Secure what matters. Decide who receives it. Define when it is released.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
              >
                Create Your Legacy Plan
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE PROBLEM ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Your digital life is <span className="text-red-500">scattered</span> and <span className="text-red-500">unprotected</span>
            </h2>
            <p className="mt-6 text-lg text-slate-500 leading-relaxed">
              Passwords, photos, financial documents, personal messages, insurance policies, crypto wallets — your most important digital assets are spread across dozens of services with no plan for what happens to them. LegacyOS changes that.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Scattered Assets', desc: 'Important files live in email, cloud drives, password managers, and physical devices — with no central organization.', bgClass: 'bg-red-50', dotClass: 'bg-red-400' },
              { title: 'No Transition Plan', desc: 'If something happens to you, your loved ones have no way to access or even locate your critical digital assets.', bgClass: 'bg-amber-50', dotClass: 'bg-amber-400' },
              { title: 'Privacy Concerns', desc: 'You need control over who sees what, when they see it, and under what circumstances.', bgClass: 'bg-orange-50', dotClass: 'bg-orange-400' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`w-10 h-10 rounded-lg ${item.bgClass} flex items-center justify-center mb-4`}>
                  <div className={`w-3 h-3 rounded-full ${item.dotClass}`}></div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{item.title}</h3>
                <p className="mt-2 text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How LegacyOS Works</h2>
            <p className="mt-4 text-lg text-slate-500">A simple, secure workflow to protect your digital legacy</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative p-6 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                <span className="text-4xl font-bold text-indigo-100 group-hover:text-indigo-200 transition-colors">{step.num}</span>
                <h3 className="mt-2 text-lg font-semibold text-slate-800">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CORE FEATURES ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Core Features</h2>
            <p className="mt-4 text-lg text-slate-500">Everything you need to manage your digital legacy</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                    </svg>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                    feature.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {feature.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECURITY PHILOSOPHY ===== */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Security is not a feature.<br /><span className="text-indigo-400">It's the foundation.</span></h2>
              <p className="mt-6 text-slate-400 leading-relaxed">
                LegacyOS is built security-first. Your data is protected at every layer — from authentication to storage to delivery. We never see your passwords, and your assets are protected with industry-standard encryption.
              </p>
            </div>
            <div className="space-y-4">
              {securityPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-slate-300 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY LEGACYOS ===== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Why LegacyOS</h2>
            <p className="mt-4 text-lg text-slate-500">Built with intention, not just technology</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {whyPoints.map((point) => (
              <div key={point.title} className="flex gap-4 p-6 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{point.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{point.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to secure your digital legacy?</h2>
          <p className="mt-4 text-lg text-indigo-200 max-w-2xl mx-auto">
            Start organizing, protecting, and planning the future of your digital life — on your terms.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center px-8 py-4 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-all shadow-lg"
          >
            Get Started — It's Free
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-base font-bold text-white">Legacy<span className="text-indigo-400">OS</span></span>
            </div>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} LegacyOS. Your Digital Life. Your Rules. Your Legacy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
