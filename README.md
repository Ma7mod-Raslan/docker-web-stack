# Todo App — Docker Stack

## Quick Start
```bash
docker compose up -d --build
```

| Service   | URL                        |
|-----------|----------------------------|
| App        | http://localhost           |
| Grafana    | http://localhost:3001      |
| Prometheus | http://localhost:9090 (internal) |

Grafana login: `admin` / `admin123`

---

## Networks

| Network        | Services                        | Why isolated?                              |
|----------------|---------------------------------|--------------------------------------------|
| frontend-net   | proxy, frontend                 | Frontend has no reason to talk to DB       |
| backend-net    | proxy, backend, db              | Backend needs DB; proxy routes /api here   |
| monitoring-net | cadvisor, prometheus, grafana   | Monitoring traffic separate from app traffic|

---

## Restart Policies — Why each choice?

| Service    | Policy          | Reason                                               |
|------------|-----------------|------------------------------------------------------|
| proxy      | `always`        | Public entry point — must always be up               |
| frontend   | `unless-stopped` | Stateless — restart on crash, respect manual stop   |
| backend    | `on-failure`    | Restart only on crash, not on manual stop            |
| db         | `unless-stopped` | Data service — restart on crash, respect maintenance|
| cadvisor   | `unless-stopped` | Monitoring — restart on crash                       |
| prometheus | `unless-stopped` | Monitoring — restart on crash                       |
| grafana    | `unless-stopped` | Monitoring — restart on crash                       |

---

## Log Drivers — Why each choice?

| Service    | Driver      | Reason                                              |
|------------|-------------|-----------------------------------------------------|
| db         | `json-file` | Structured logs, easy to parse for errors           |
| backend    | `json-file` | API logs useful for debugging                       |
| frontend   | `json-file` | Nginx access logs useful                            |
| proxy      | `json-file` | Traffic logs important for debugging                |
| cadvisor   | `none`      | Monitoring tool, its own logs aren't useful         |
| prometheus | `json-file` | Keep scrape errors visible                          |
| grafana    | `json-file` | Keep login/alert errors visible                     |

---

## Resource Limits — Why each value?

| Service    | CPU   | RAM   | Reason                                          |
|------------|-------|-------|-------------------------------------------------|
| db         | 0.5   | 512M  | MySQL needs memory for query cache              |
| backend    | 0.5   | 256M  | Node.js + mysql2 — moderate usage              |
| frontend   | 0.25  | 64M   | Static nginx — very lightweight                 |
| proxy      | 0.25  | 64M   | Nginx proxy — lightweight                       |
| cadvisor   | 0.25  | 128M  | Metrics collection — moderate                   |
| prometheus | 0.5   | 256M  | Time-series storage needs memory                |
| grafana    | 0.5   | 256M  | Dashboard rendering                             |

---

## Simulate a Crash & Watch Behavior

```bash
# Kill the backend container manually
docker kill todo-backend

# Watch Docker restart it (on-failure policy)
docker ps -a
docker logs todo-backend
```
