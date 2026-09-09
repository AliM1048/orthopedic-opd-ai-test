import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enLogin from './locales/en/login.json';
import enPhysicianEvaluation from './locales/en/physicianEvaluation.json';
import enSurgeryEvaluation from './locales/en/surgeryEvaluation.json';
import enNurseDashboard from './locales/en/nurseDashboard.json';
import enAllPatients from './locales/en/allPatients.json';
import enPatientStatus from './locales/en/patientStatus.json';
import enPatientProfile from './locales/en/patientProfile.json';
import enPatientRecordPanel from './locales/en/patientRecordPanel.json';
import enAssessment from './locales/en/assessment.json';
import enAnalytics from './locales/en/analytics.json';
import enMessages from './locales/en/messages.json';
import enDocumentGenerator from './locales/en/documentGenerator.json';
import enClerkTasks from './locales/en/clerkTasks.json';
import enSurgeries from './locales/en/surgeries.json';
import enPromPublicFill from './locales/en/promPublicFill.json';
import enComponents from './locales/en/components.json';

import arCommon from './locales/ar/common.json';
import arNav from './locales/ar/nav.json';
import arLogin from './locales/ar/login.json';
import arPhysicianEvaluation from './locales/ar/physicianEvaluation.json';
import arSurgeryEvaluation from './locales/ar/surgeryEvaluation.json';
import arNurseDashboard from './locales/ar/nurseDashboard.json';
import arAllPatients from './locales/ar/allPatients.json';
import arPatientStatus from './locales/ar/patientStatus.json';
import arPatientProfile from './locales/ar/patientProfile.json';
import arPatientRecordPanel from './locales/ar/patientRecordPanel.json';
import arAssessment from './locales/ar/assessment.json';
import arAnalytics from './locales/ar/analytics.json';
import arMessages from './locales/ar/messages.json';
import arDocumentGenerator from './locales/ar/documentGenerator.json';
import arClerkTasks from './locales/ar/clerkTasks.json';
import arSurgeries from './locales/ar/surgeries.json';
import arPromPublicFill from './locales/ar/promPublicFill.json';
import arComponents from './locales/ar/components.json';

// Each page/feature gets its own namespace file under locales/<lang>/<namespace>.json
// so translation work on different screens never touches the same file. Keys are
// looked up as "namespace.key" (see useLanguage's t()). Add new namespaces here as
// screens are translated.
export const translations = {
  en: {
    common: enCommon,
    nav: enNav,
    login: enLogin,
    physicianEvaluation: enPhysicianEvaluation,
    surgeryEvaluation: enSurgeryEvaluation,
    nurseDashboard: enNurseDashboard,
    allPatients: enAllPatients,
    patientStatus: enPatientStatus,
    patientProfile: enPatientProfile,
    patientRecordPanel: enPatientRecordPanel,
    assessment: enAssessment,
    analytics: enAnalytics,
    messages: enMessages,
    documentGenerator: enDocumentGenerator,
    clerkTasks: enClerkTasks,
    surgeries: enSurgeries,
    promPublicFill: enPromPublicFill,
    components: enComponents,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    login: arLogin,
    physicianEvaluation: arPhysicianEvaluation,
    surgeryEvaluation: arSurgeryEvaluation,
    nurseDashboard: arNurseDashboard,
    allPatients: arAllPatients,
    patientStatus: arPatientStatus,
    patientProfile: arPatientProfile,
    patientRecordPanel: arPatientRecordPanel,
    assessment: arAssessment,
    analytics: arAnalytics,
    messages: arMessages,
    documentGenerator: arDocumentGenerator,
    clerkTasks: arClerkTasks,
    surgeries: arSurgeries,
    promPublicFill: arPromPublicFill,
    components: arComponents,
  },
};

export const SUPPORTED_LANGUAGES = ['en', 'ar'];
export const DEFAULT_LANGUAGE = 'en';
