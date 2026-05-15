import { useState, useCallback } from 'react';
import { MOCK_PATIENTS } from '../data/mockData';

// ─── usePatients ─────────────────────────────────────────────────────────────
// Manages the patient list state. In a real app, replace the mock with API calls.
// API shape: GET /api/patients  →  { patients: Patient[] }
// ─────────────────────────────────────────────────────────────────────────────
export function usePatients() {
  const [patients, setPatients] = useState(MOCK_PATIENTS);

  const getPatient = useCallback(
    (id) => patients.find((p) => p.id === id) || null,
    [patients]
  );

  const updateStatus = useCallback((id, status) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  }, []);

  const addAssessment = useCallback((patientId, assessment) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, assessments: [...p.assessments, assessment] }
          : p
      )
    );
  }, []);

  const addEvaluation = useCallback((patientId, evaluation) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, evaluations: [...p.evaluations, evaluation] }
          : p
      )
    );
  }, []);

  const addDiagnostic = useCallback((patientId, diagnostic) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, diagnostics: [...p.diagnostics, diagnostic] }
          : p
      )
    );
  }, []);

  const updateDiagnostic = useCallback((patientId, diagnosticId, updates) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              diagnostics: p.diagnostics.map((d) =>
                d.id === diagnosticId ? { ...d, ...updates } : d
              )
            }
          : p
      )
    );
  }, []);

  const addTreatment = useCallback((patientId, treatment) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, treatments: [...p.treatments, treatment] }
          : p
      )
    );
  }, []);

  return {
    patients,
    getPatient,
    updateStatus,
    addAssessment,
    addEvaluation,
    addDiagnostic,
    updateDiagnostic,
    addTreatment
  };
}
