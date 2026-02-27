{
  "apps": [{
    "name": "jike-server",
    "script": "server/useData/useData.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3001
    },
    "env_production": {
      "NODE_ENV": "production"
    },
    "error_file": "./logs/pm2-error.log",
    "out_file": "./logs/pm2-out.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "merge_logs": true,
    "max_memory_restart": "500M",
    "autorestart": true,
    "watch": false
  }]
}
