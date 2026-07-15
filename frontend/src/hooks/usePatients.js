import { useState, useCallback, useEffect } from 'react';
import api from '../api';

export function usePatients(token) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!token && !stored) {
      setLoading(false);
      return;
    }
    // fetch when a token becomes available (login) or on mount if stored
    api.get('/api/patients')
      .then((res) => setPatients(res.data.patients))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, [token]);

  const getPatient = useCallback(
    (id) => patients.find((p) => p.id === id) || null,
    [patients]
  );

  const updateStatus = useCallback((id, status) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    api.patch(`/api/patients/${id}/status`, { status })
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
    api.post(`/api/patients/${patientId}/assessments`, assessment)
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
    api.post(`/api/patients/${patientId}/evaluations`, evaluation)
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
    api.post(`/api/patients/${patientId}/diagnostics`, diagnostic)
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
    api.patch(`/api/patients/${patientId}/diagnostics/${diagnosticId}`, updates)
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
    api.post(`/api/patients/${patientId}/treatments`, treatment)
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const markEvaluationSent = useCallback((patientId, evaluationId) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? {
              ...p,
              evaluations: p.evaluations.map((e) =>
                e.id === evaluationId ? { ...e, sentToPatient: true } : e
              )
            }
          : p
      )
    );
    return api.patch(`/api/patients/${patientId}/evaluations/${evaluationId}`, { sentToPatient: true })
      .then((res) => {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? res.data : p))
        );
      })
      .catch(() => {});
  }, []);

  const createPatient = useCallback((patientData) => {
    // optimistic UI: add placeholder until server returns
    return api.post('/api/patients', patientData)
      .then((res) => {
        setPatients((prev) => [res.data, ...prev]);
        return res.data;
      })
      .catch((err) => { throw err; });
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
    addTreatment,
    markEvaluationSent,
    createPatient
  };
}
