import SectionStatusItem from './SectionStatusItem';

function getSectionStatus(section, answers) {
  const required = section.questions.filter(q => q.required);
  const allQs = section.questions;
  const answeredRequired = required.filter(q => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  });
  const answeredAll = allQs.filter(q => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  });

  if (answeredAll.length === 0) return 'not-started';
  if (answeredRequired.length === required.length) return 'completed';
  return 'in-progress';
}

function countAnswered(section, answers) {
  return section.questions.filter(q => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;
}

export default function AssessmentSidebar({ sections, currentSectionId, answers, onSelectSection }) {
  return (
    <div className="asb-panel">
      <div className="asb-title">Sections</div>
      <div className="asb-list">
        {sections.map((section) => {
          const status = getSectionStatus(section, answers);
          const answered = countAnswered(section, answers);
          return (
            <SectionStatusItem
              key={section.id}
              section={section}
              status={status}
              isActive={section.id === currentSectionId}
              questionCount={section.questions.length}
              answeredCount={answered}
              onClick={() => onSelectSection(section.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export { getSectionStatus, countAnswered };
