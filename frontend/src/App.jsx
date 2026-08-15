import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import AllPatients from './pages/AllPatients';
import Analytics from './pages/Analytics';
import DocumentGenerator from './pages/DocumentGenerator';
import PatientStatus from './pages/PatientStatus';
import ClerkTasks from './pages/ClerkTasks';
import PromPublicFill from './pages/PromPublicFill';

// Everything a logged-in user can reach — split out so the public,
// no-login PROM link route (below) never gets caught behind the auth gate.
function AuthedApp({ user, patients, actions }) {
  const {
    updateStatus, updateBodyArea, addAssessment, addEvaluation, updateEvaluation,
    addDiagnostic, deleteDiagnostic, addTreatment, deleteTreatment, markEvaluationSent,
  } = actions;

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
    addDiagnostic,
    deleteDiagnostic,
    addTreatment,
    deleteTreatment,
    markEvaluationSent,
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
                    addDiagnostic, deleteDiagnostic, addTreatment, deleteTreatment, markEvaluationSent,
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
