import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

// Fetched once for the whole authenticated app — status badges render
// per-row in patient list tables, so they must never trigger their own fetch.
const LookupContext = createContext({
  statusConfig: {},
  diagnosticTests: [],
  treatmentOptions: [],
  loaded: false,
});

export function LookupProvider({ children }) {
  const [state, setState] = useState({
    statusConfig: {},
    diagnosticTests: [],
    treatmentOptions: [],
    loaded: false,
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/status-config'),
      api.get('/api/diagnostic-tests'),
      api.get('/api/treatment-options'),
    ])
      .then(([statusRes, testsRes, treatmentsRes]) => {
        setState({
          statusConfig: statusRes.data.statusConfig,
          diagnosticTests: testsRes.data.diagnosticTests,
          treatmentOptions: treatmentsRes.data.treatmentOptions,
          loaded: true,
        });
      })
      .catch(() => setState((s) => ({ ...s, loaded: true })));
  }, []);

  return <LookupContext.Provider value={state}>{children}</LookupContext.Provider>;
}

export function useLookup() {
  return useContext(LookupContext);
}

// Only 4 possible body areas — cached at module scope so navigating between
// patients of the same body area doesn't refetch.
const assessmentConfigCache = new Map();

export function useAssessmentConfig(bodyArea) {
  const [config, setConfig] = useState(() => (bodyArea ? assessmentConfigCache.get(bodyArea) : null) || null);

  useEffect(() => {
    if (!bodyArea) { setConfig(null); return; }
    if (assessmentConfigCache.has(bodyArea)) { setConfig(assessmentConfigCache.get(bodyArea)); return; }
    api.get('/api/questions', { params: { body_area: bodyArea } })
      .then((res) => {
        assessmentConfigCache.set(bodyArea, res.data);
        setConfig(res.data);
      })
      .catch(() => setConfig(null));
  }, [bodyArea]);

  return config;
}
