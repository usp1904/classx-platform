import type { PipelineStage } from '../types.ts';

export interface StageBadgeFormat {
  badgeText: string;
  badgeStyle: {
    color: string;
    backgroundColor: string;
  };
}

export interface RenderedPipelineStage {
  node: string | null;
  status: string | undefined;
  badgeText: string;
  badgeStyle: {
    color: string;
    backgroundColor: string;
  };
  output: string | null;
}

export interface PipelineStatusModel {
  mounted: boolean;
  fontClass: string;
  borderColor: string;
  stages: RenderedPipelineStage[];
}

export function formatStageBadge(stage?: Partial<PipelineStage> | null): StageBadgeFormat {
  const status = stage?.status;
  switch (status) {
    case 'running':
      return {
        badgeText: '[RUNNING]',
        badgeStyle: { color: '#1B4332', backgroundColor: 'transparent' },
      };
    case 'completed':
      return {
        badgeText: `[OK: ${stage?.output ? String(stage.output).slice(0, 30) : 'DONE'}]`,
        badgeStyle: { color: '#1B4332', backgroundColor: '#DCFCE7' },
      };
    case 'rewrite':
      return {
        badgeText: '[REWRITE]',
        badgeStyle: { color: '#B45309', backgroundColor: '#FEF08A' },
      };
    case 'failed':
      return {
        badgeText: `[FAIL: ${stage?.error ? String(stage.error).slice(0, 30) : 'ERROR'}]`,
        badgeStyle: { color: '#B91C1C', backgroundColor: '#FEE2E2' },
      };
    default:
      return {
        badgeText: '[PENDING]',
        badgeStyle: { color: '#71717A', backgroundColor: 'transparent' },
      };
  }
}

export function renderPipelineStatusModel(
  stages: PipelineStage[] = [],
  badgeFormatter: (stage?: Partial<PipelineStage> | null) => StageBadgeFormat = formatStageBadge,
): PipelineStatusModel {
  if (!Array.isArray(stages) || stages.length === 0) {
    return {
      mounted: false,
      fontClass: 'font-mono',
      borderColor: '#E4E2DD',
      stages: [],
    };
  }

  return {
    mounted: true,
    fontClass: 'font-mono',
    borderColor: '#E4E2DD',
    stages: stages.map((stage) => {
      const { badgeText, badgeStyle } = badgeFormatter(stage);
      return {
        node: stage?.node ?? null,
        status: stage?.status,
        badgeText,
        badgeStyle,
        output: stage?.output || null,
      };
    }),
  };
}
