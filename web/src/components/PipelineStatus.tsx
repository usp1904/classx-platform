import { formatStageBadge, renderPipelineStatusModel } from '../lib/pipelineStatus.ts';
import type { PipelineStage } from '../types.ts';

export { formatStageBadge, renderPipelineStatusModel };

export interface PipelineStatusProps {
  stages?: PipelineStage[];
  className?: string;
}

export function PipelineStatus({ stages = [], className = '' }: PipelineStatusProps) {
  const model = renderPipelineStatusModel(stages);
  if (!model.mounted) return null;

  return (
    <div
      className={`pipeline-status-panel ${model.fontClass} border border-[#E4E2DD] bg-transparent p-3 rounded ${className}`}
      style={{ borderColor: model.borderColor }}
      aria-label="Pipeline execution status"
      role="status"
    >
      <div className="flex items-center justify-between mb-2 text-[11px] uppercase tracking-wider text-[#52525B]">
        <span>RAG Pipeline Trace</span>
        <span>{model.stages.length} stages</span>
      </div>
      <div className="space-y-1">
        {model.stages.map((stage, idx) => (
          <div
            key={`${stage.node || 'stage'}-${idx}`}
            className="flex items-center justify-between gap-2 text-xs py-0.5"
          >
            <span className="text-[#18181B] font-medium truncate">{stage.node || 'node'}</span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-semibold shrink-0"
              style={stage.badgeStyle}
            >
              {stage.badgeText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PipelineStatus;
