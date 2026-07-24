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

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const {
    patients,
    updateStatus,
    addAssessment,
    addEvaluation,
    addDiagnostic,
    addTreatment,
    markEvaluationSent,
    createPatient
  } = usePatients(token);

  const handleLogin = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
  };

  if (!token) {
    return (
      <ThemeProvider>
        <BrowserRouter>
          <Login onLogin={handleLogin} />
        </BrowserRouter>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <LookupProvider>
          <DashboardLayout user={user}>
            <Routes>
              <Route
                path="/"
                element={<NurseDashboard patients={patients} onUpdateStatus={updateStatus} createPatient={createPatient} />}
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
                    onAddAssessment={addAssessment}
                    onUpdateStatus={updateStatus}
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
                    onAddDiagnostic={addDiagnostic}
                    onAddTreatment={addTreatment}
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DashboardLayout>
        </LookupProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
