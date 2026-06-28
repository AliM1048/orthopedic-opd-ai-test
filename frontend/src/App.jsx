import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import DashboardLayout from './layouts/DashboardLayout';
import { usePatients } from './hooks/usePatients';

import Login from './pages/Login';
import NurseDashboard from './pages/NurseDashboard';
import PatientProfile from './pages/PatientProfile';
import PreVisitAssessment from './pages/PreVisitAssessment';
import PhysicianEvaluation from './pages/PhysicianEvaluation';
import DiagnosticRequests from './pages/DiagnosticRequests';
import TreatmentPathway from './pages/TreatmentPathway';
import AllPatients from './pages/AllPatients';

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
    addTreatment
    ,
    createPatient
  } = usePatients(token);

  const handleLogin = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
  };

  if (!token) {
    return (
      <BrowserRouter>
        <Login onLogin={handleLogin} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
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
                onAddEvaluation={addEvaluation}
              />
            }
          />
          <Route
            path="/diagnostics"
            element={
              <DiagnosticRequests
                patients={patients}
                onAddDiagnostic={addDiagnostic}
              />
            }
          />
          <Route
            path="/treatment"
            element={
              <TreatmentPathway
                patients={patients}
                onAddTreatment={addTreatment}
              />
            }
          />
          <Route
            path="/patients"
            element={<AllPatients patients={patients} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
}
