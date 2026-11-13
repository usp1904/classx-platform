// ClassX Platform — PM2 production process manager
// Run: pm2 start ecosystem.config.js --env production
// For 500-1000 concurrent users: single Node instance keeps in-memory sessions intact.
// Nginx handles connection pooling, gzip, static caching, rate limiting.
// Scale beyond one CPU: add Redis session store, then switch instances to 'max'.

module.exports = {
  apps: [
    {
      name: 'classx-platform',
      script: 'server/index.js',
      cwd: '/var/www/classx',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      ignore_watch: ['node_modules', 'server/public', 'logs'],
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        HOST: '0.0.0.0',
        CORS_ORIGIN: 'https://yourdomain.com',
        NODE_OPTIONS: '--max-old-space-size=3072',
        RAG_EMBEDDING_PROVIDER: 'local',
        RAG_RERANK_PROVIDER: 'none',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8787,
        HOST: '0.0.0.0',
        CORS_ORIGIN: 'https://yourdomain.com',
        NODE_OPTIONS: '--max-old-space-size=3072',
        OPENROUTER_API_KEY: 'REPLACE_WITH_YOUR_OPENROUTER_KEY',
        OPENAI_BASE_URL: 'https://openrouter.ai/api/v1',
        TUTOR_MODEL: 'openai/gpt-4o-mini',
        RAG_EMBEDDING_PROVIDER: 'local',
        RAG_RERANK_PROVIDER: 'none',
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      restart_delay: 4000,
    },
  ],
};
