export function resolveCommit(env = process.env) {
  return env.RENDER_GIT_COMMIT || env.GIT_SHA || 'dev';
}
