import { renderPipelineStatusModel } from './pipelineStatus.ts';
import type { PipelineStatusModel } from './pipelineStatus.ts';
import type { LayeredAnswer, PipelineStage, VisualAidVideo } from '../types.ts';

export type AnswerLayerTabId =
  | 'coreIntuition'
  | 'boardAnswer'
  | 'competitiveBridge'
  | 'examinersTrap';

export interface StudyWorkspaceTab {
  id: AnswerLayerTabId;
  label: string;
  content: string | null;
}

export interface StudyWorkspaceModelProps {
  syllabus?: {
    subjects: unknown[];
    activeSubjectId: string | null;
    activeChapterId: string | null;
  };
  referenceContext?: {
    citations: unknown[];
    chunks: unknown[];
    visualAidVideo: VisualAidVideo | null;
  };
  answerLayers?: Partial<LayeredAnswer> | null;
  activeTab?: AnswerLayerTabId;
  pipelineStages?: PipelineStage[];
}

export interface StudyWorkspaceModel {
  layout: {
    type: 'split-pane';
    responsiveClass: string;
    canvasBg: string;
    panelBg: string;
    inkColor: string;
    hairlineBorder: string;
  };
  leftPane: {
    id: 'syllabus-nav';
    className: string;
    subjectsCount: number;
    activeSubjectId: string | null;
    activeChapterId: string | null;
  };
  centerPane: {
    id: 'reference-context';
    className: string;
    citationsCount: number;
    chunksCount: number;
    visualAidVideo: VisualAidVideo | null;
  };
  mainPane: {
    id: 'answer-workspace';
    className: string;
    pipelineStatus: PipelineStatusModel;
    tabs: StudyWorkspaceTab[];
    activeTab: AnswerLayerTabId;
    activeContent: string | null;
  };
}

export function renderStudyWorkspaceModel(
  props: StudyWorkspaceModelProps = {},
  pipelineRenderer: (stages?: PipelineStage[]) => PipelineStatusModel = renderPipelineStatusModel,
): StudyWorkspaceModel {
  const {
    syllabus = { subjects: [], activeSubjectId: null, activeChapterId: null },
    referenceContext = { citations: [], chunks: [], visualAidVideo: null },
    answerLayers = null,
    activeTab = 'coreIntuition',
    pipelineStages = [],
  } = props;

  const tabs: StudyWorkspaceTab[] = [
    { id: 'coreIntuition', label: 'Core Intuition', content: answerLayers?.coreIntuition || null },
    { id: 'boardAnswer', label: 'CBSE Board Answer', content: answerLayers?.boardAnswer || null },
    { id: 'competitiveBridge', label: 'Competitive Exam Bridge', content: answerLayers?.competitiveBridge || null },
    { id: 'examinersTrap', label: "Examiner's Trap", content: answerLayers?.examinersTrap || null },
  ];

  return {
    layout: {
      type: 'split-pane',
      responsiveClass: 'flex flex-col lg:grid lg:grid-cols-12 gap-4',
      canvasBg: '#FAF9F6',
      panelBg: '#F3F1EC',
      inkColor: '#18181B',
      hairlineBorder: '1px solid #E4E2DD',
    },
    leftPane: {
      id: 'syllabus-nav',
      className: 'lg:sticky top-0 lg:h-screen overflow-y-auto lg:col-span-3 border-r border-[#E4E2DD]',
      subjectsCount: Array.isArray(syllabus.subjects) ? syllabus.subjects.length : 0,
      activeSubjectId: syllabus.activeSubjectId ?? null,
      activeChapterId: syllabus.activeChapterId ?? null,
    },
    centerPane: {
      id: 'reference-context',
      className: 'lg:col-span-4 border-r border-[#E4E2DD] p-4 overflow-y-auto',
      citationsCount: Array.isArray(referenceContext.citations) ? referenceContext.citations.length : 0,
      chunksCount: Array.isArray(referenceContext.chunks) ? referenceContext.chunks.length : 0,
      visualAidVideo: referenceContext.visualAidVideo ?? null,
    },
    mainPane: {
      id: 'answer-workspace',
      className: 'lg:col-span-5 p-4',
      pipelineStatus: pipelineRenderer(pipelineStages),
      tabs,
      activeTab,
      activeContent: tabs.find((t) => t.id === activeTab)?.content || null,
    },
  };
}
