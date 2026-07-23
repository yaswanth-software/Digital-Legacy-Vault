import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import DashboardPage from './pages/DashboardPage';
import VaultDashboard from './pages/VaultDashboard';
import CreateAssetPage from './pages/CreateAssetPage';
import EditAssetPage from './pages/EditAssetPage';
import AssetDetailsPage from './pages/AssetDetailsPage';
import ArchivedAssetsPage from './pages/ArchivedAssetsPage';

// Day 4 Pages
import TrustedPeoplePage from './pages/TrustedPeoplePage';
import CreateTrustedPersonPage from './pages/CreateTrustedPersonPage';
import TrustedPersonDetailsPage from './pages/TrustedPersonDetailsPage';
import EditTrustedPersonPage from './pages/EditTrustedPersonPage';
import ManageAccessPage from './pages/ManageAccessPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';

// Day 5 Pages
import ContinuityDashboard from './pages/ContinuityDashboard';
import ContinuitySettingsPage from './pages/ContinuitySettingsPage';
import LegacyRulesPage from './pages/LegacyRulesPage';
import CreateLegacyRulePage from './pages/CreateLegacyRulePage';
import LegacyRuleDetailsPage from './pages/LegacyRuleDetailsPage';
import EditLegacyRulePage from './pages/EditLegacyRulePage';
import EligibleRulesPage from './pages/EligibleRulesPage';
import ConfirmationsPage from './pages/ConfirmationsPage';
import ConfirmationDetailsPage from './pages/ConfirmationDetailsPage';
import NotificationCenterPage from './pages/NotificationCenterPage';

// Day 6 Pages
import EmergencyAccessPage from './pages/EmergencyAccessPage';
import EmergencyRequestForm from './pages/EmergencyRequestForm';
import ReleasePortalPage from './pages/ReleasePortalPage';
import ManageReleasesPage from './pages/ManageReleasesPage';
import ReleaseActivityPage from './pages/ReleaseActivityPage';

// Day 7 Pages
import SecurityDashboard from './pages/SecurityDashboard';
import SecuritySettingsPage from './pages/SecuritySettingsPage';
import PrivacyCenterPage from './pages/PrivacyCenterPage';

// Day 8 Pages
import ActivityPage from './pages/ActivityPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Auth/Public invitation routes (no layout wrapper) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/trusted-invite/accept" element={<AcceptInvitationPage />} />

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vault" element={<VaultDashboard />} />
            <Route path="/vault/assets/new" element={<CreateAssetPage />} />
            <Route path="/vault/assets/:assetId" element={<AssetDetailsPage />} />
            <Route path="/vault/assets/:assetId/edit" element={<EditAssetPage />} />
            <Route path="/vault/archived" element={<ArchivedAssetsPage />} />
            
            {/* Trusted People Routes */}
            <Route path="/trusted-people" element={<TrustedPeoplePage />} />
            <Route path="/trusted-people/new" element={<CreateTrustedPersonPage />} />
            <Route path="/trusted-people/:trustedPersonId" element={<TrustedPersonDetailsPage />} />
            <Route path="/trusted-people/:trustedPersonId/edit" element={<EditTrustedPersonPage />} />
            <Route path="/trusted-people/:trustedPersonId/access" element={<ManageAccessPage />} />

            {/* Day 5 Continuity & Rules Routes */}
            <Route path="/continuity" element={<ContinuityDashboard />} />
            <Route path="/continuity/settings" element={<ContinuitySettingsPage />} />
            <Route path="/legacy-rules" element={<LegacyRulesPage />} />
            <Route path="/legacy-rules/new" element={<CreateLegacyRulePage />} />
            <Route path="/legacy-rules/:ruleId" element={<LegacyRuleDetailsPage />} />
            <Route path="/legacy-rules/:ruleId/edit" element={<EditLegacyRulePage />} />
            <Route path="/legacy-rules/eligible" element={<EligibleRulesPage />} />
            <Route path="/confirmations" element={<ConfirmationsPage />} />
            <Route path="/confirmations/:confirmationId" element={<ConfirmationDetailsPage />} />
            <Route path="/notifications" element={<NotificationCenterPage />} />

            {/* Day 6 Emergency Access & Releases Routes */}
            <Route path="/emergency-access" element={<EmergencyAccessPage />} />
            <Route path="/emergency-access/request" element={<EmergencyRequestForm />} />
            <Route path="/my-releases" element={<ReleasePortalPage />} />
            <Route path="/my-releases/:releaseId" element={<ReleasePortalPage />} />
            <Route path="/releases" element={<ManageReleasesPage />} />
            <Route path="/releases/:releaseId/activity" element={<ReleaseActivityPage />} />

            {/* Day 7 Security & Privacy Routes */}
            <Route path="/security" element={<SecurityDashboard />} />
            <Route path="/settings/security" element={<SecuritySettingsPage />} />
            <Route path="/privacy" element={<PrivacyCenterPage />} />

            {/* Day 8 Activity & Notification Settings Routes */}
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}


