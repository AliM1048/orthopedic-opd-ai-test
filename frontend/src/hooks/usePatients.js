import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export function usePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/api/patients`)
      .then((res) => setPatients(res.data.patients))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  const getPatient = useCallback(
    (id) => patients.find((p) => p.id === id) || null,
    [patients]
  );

  const updateStatus = useCallback((id, status) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    axios.patch(`${API_BASE}/api/patients/${id}/status`, { status })
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === id ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const addAssessment = useCallback((patientId, assessment) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, assessments: [...p.assessments, assessment] }
          : p
      )
    );
    axios.post(`${API_BASE}/api/patients/${patientId}/assessments`, assessment)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const addEvaluation = useCallback((patientId, evaluation) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, evaluations: [...p.evaluations, evaluation] }
          : p
      )
    );
    axios.post(`${API_BASE}/api/patients/${patientId}/evaluations`, evaluation)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const addDiagnostic = useCallback((patientId, diagnostic) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, diagnostics: [...p.diagnostics, diagnostic] }
          : p
      )
    );
    axios.post(`${API_BASE}/api/patients/${patientId}/diagnostics`, diagnostic)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
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
    axios.patch(`${API_BASE}/api/patients/${patientId}/diagnostics/${diagnosticId}`, updates)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const addTreatment = useCallback((patientId, treatment) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, treatments: [...p.treatments, treatment] }
          : p
      )
    );
    axios.post(`${API_BASE}/api/patients/${patientId}/treatments`, treatment)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  return {
    patients,
    loading,
    getPatient,
    updateStatus,
    addAssessment,
    addEvaluation,
    addDiagnostic,
    updateDiagnostic,
    addTreatment
  };
}
