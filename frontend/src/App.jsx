import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';

import DashboardLayout from './layouts/DashboardLayout';
import { usePatients } from './hooks/usePatients';
import { LookupProvider } from './hooks/useLookupData';
import { ThemeProvider } from './hooks/useTheme';

import Login from './pages/Login';
import NurseDashboard from './pages/NurseDashboard';
import PatientProfile from './pages/PatientProfile';
import PreVisitAssessment from './pages/PreVisitAssessment';
import PhysicianEvaluation from './pages/PhysicianEvaluation';
import SurgeryEvaluation from './pages/SurgeryEvaluation';
import Surgeries from './pages/Surgeries';
import AllPatients from './pages/AllPatients';
import Analytics from './pages/Analytics';
import DocumentGenerator from './pages/DocumentGenerator';
import PatientStatus from './pages/PatientStatus';
import ClerkTasks from './pages/ClerkTasks';
import Messages from './pages/Messages';
import PromPublicFill from './pages/PromPublicFill';

// Nurses are restricted to the dashboard + physician evaluation + patient
// messaging (chat isn't a specialized clinical action — the backend itself
// gates it on "any logged-in staff", no role restriction); every other role
// keeps seeing everything, unchanged (see DashboardLayout's matching
// `restricted` nav-item flags, and forbid_roles("nurse") on the backend for
// the surgery-evaluations endpoints).
const NURSE_ALLOWED_PATHS = ['/', '/evaluation', '/messages', '/assessment'];
// Dynamic segments the nurse dashboard itself links to (row click -> patient
// profile) — checked separately since they aren't exact matches.
const NURSE_ALLOWED_PREFIXES = ['/patient/'];

// Everything a logged-in user can reach — split out so the public,
// no-login PROM link route (below) never gets caught behind the auth gate.
function AuthedApp({ user, patients, actions }) {
  const location = useLocation();
  const {
    updateStatus, updateBodyArea, addAssessment, addEvaluation, updateEvaluation,
    addSurgeryEvaluation, updateSurgeryEvaluation, uploadEvaluationDocument, deleteEvaluationDocument,
    addDiagnostic, deleteDiagnostic, addTreatment, deleteTreatment, markEvaluationSent, markSurgeryEvaluationSent,
  } = actions;

  const nurseCanAccess = NURSE_ALLOWED_PATHS.includes(location.pathname)
    || NURSE_ALLOWED_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (user?.role === 'nurse' && !nurseCanAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <LookupProvider>
      <DashboardLayout user={user}>
        <Routes>
          <Route
            path="/"
            element={<NurseDashboard patients={patients} onUpdateStatus={updateStatus} createPatient={actions.createPatient} />}
          />
          <Route
            path="/patient/:id"
            element={<PatientProfile patients={patients} />}
          />
          <Route
            path="/assessment"
            element={
              <PreVisitAssessment
                patients={patients}
                user={user}
                onAddAssessment={addAssessment}
                onUpdateStatus={updateStatus}
                onUpdateBodyArea={updateBodyArea}
              />
            }
          />
          <Route
            path="/evaluation"
            element={
              <PhysicianEvaluation
                patients={patients}
                user={user}
                onAddEvaluation={addEvaluation}
                onUpdateEvaluation={updateEvaluation}
                onAddDiagnostic={addDiagnostic}
                onDeleteDiagnostic={deleteDiagnostic}
                onAddTreatment={addTreatment}
                onDeleteTreatment={deleteTreatment}
                onMarkEvaluationSent={markEvaluationSent}
                onUploadDocument={uploadEvaluationDocument}
                onDeleteDocument={deleteEvaluationDocument}
              />
            }
          />
          <Route
            path="/surgeries"
            element={<Surgeries patients={patients} />}
          />
          <Route
            path="/surgery-evaluation"
            element={
              <SurgeryEvaluation
                patients={patients}
                user={user}
                onAddSurgeryEvaluation={addSurgeryEvaluation}
                onUpdateSurgeryEvaluation={updateSurgeryEvaluation}
                onAddDiagnostic={addDiagnostic}
                onDeleteDiagnostic={deleteDiagnostic}
                onAddTreatment={addTreatment}
                onDeleteTreatment={deleteTreatment}
                onMarkSurgeryEvaluationSent={markSurgeryEvaluationSent}
              />
            }
          />
          <Route
            path="/patients"
            element={<AllPatients patients={patients} />}
          />
          <Route
            path="/analytics"
            element={<Analytics patients={patients} />}
          />
          <Route
            path="/records"
            element={<PatientStatus patients={patients} />}
          />
          <Route
            path="/clerk-tasks"
            element={<ClerkTasks />}
          />
          <Route
            path="/messages"
            element={<Messages patients={patients} />}
          />
          <Route
            path="/documents/new"
            element={<DocumentGenerator patients={patients} user={user} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </LookupProvider>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const {
    patients,
    updateStatus,
    updateBodyArea,
    addAssessment,
    addEvaluation,
    updateEvaluation,
    addSurgeryEvaluation,
    updateSurgeryEvaluation,
    uploadEvaluationDocument,
    deleteEvaluationDocument,
    addDiagnostic,
    deleteDiagnostic,
    addTreatment,
    deleteTreatment,
    markEvaluationSent,
    markSurgeryEvaluationSent,
    createPatient
  } = usePatients(token);

  const handleLogin = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public — no login required, opened from a doctor-generated link/QR */}
          <Route path="/prom/:token" element={<PromPublicFill />} />
          <Route
            path="*"
            element={
              !token ? (
                <Login onLogin={handleLogin} />
              ) : (
                <AuthedApp
                  user={user}
                  patients={patients}
                  actions={{
                    updateStatus, updateBodyArea, addAssessment, addEvaluation, updateEvaluation,
                    addSurgeryEvaluation, updateSurgeryEvaluation, uploadEvaluationDocument, deleteEvaluationDocument,
                    addDiagnostic, deleteDiagnostic, addTreatment, deleteTreatment, markEvaluationSent, markSurgeryEvaluationSent,
                    createPatient,
                  }}
                />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
