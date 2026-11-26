import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudyWorkspace } from '../components/StudyWorkspace';
import { useApp } from '../lib/store';

export default function DoubtTutor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { curriculum } = useApp();

  const subjects = curriculum?.subjects ?? [];
  const paramSubject = searchParams.get('subject') || '';
  const paramChapter = searchParams.get('chapter') || '';
  const paramQuery = searchParams.get('q') || '';

  const activeSubjectId = useMemo(() => {
    if (subjects.some((s) => s.id === paramSubject)) return paramSubject;
    return subjects[0]?.id || 'mathematics';
  }, [subjects, paramSubject]);

  const activeChapterId = useMemo(() => {
    const sub = subjects.find((s) => s.id === activeSubjectId);
    if (sub && sub.chapters.some((c) => c.id === paramChapter)) return paramChapter;
    return sub?.chapters[0]?.id || 'real-numbers';
  }, [subjects, activeSubjectId, paramChapter]);

  const handleSelectChapter = (subjectId: string, chapterId: string) => {
    setSearchParams({ subject: subjectId, chapter: chapterId });
  };

  const handleTestYourself = (subjectId: string, chapterId: string) => {
    navigate(`/practice?subject=${encodeURIComponent(subjectId)}&chapter=${encodeURIComponent(chapterId)}&count=2`);
  };

  return (
    <div className="space-y-4">
      <StudyWorkspace
        subjects={subjects}
        activeSubjectId={activeSubjectId}
        activeChapterId={activeChapterId}
        onSelectChapter={handleSelectChapter}
        initialQuery={paramQuery}
        onTestYourself={handleTestYourself}
      />
    </div>
  );
}
