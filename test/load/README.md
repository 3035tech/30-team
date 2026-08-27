# Load Testing — 30Team

Testes de carga com **k6** para validar performance em cenários realistas.

## Setup

```bash
# Instalar k6 (macOS)
brew install k6

# Instalar k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Executar testes

```bash
# Smoke test (1 VU, 30s)
k6 run test/load/smoke-test.js

# Load test médio (10 VUs, 5min)
k6 run test/load/load-test.js

# Stress test (ramp-up até 50 VUs)
k6 run test/load/stress-test.js

# Contra ambiente específico
BASE_URL=https://staging.30team.com k6 run test/load/smoke-test.js
```

## Métricas

k6 reporta automaticamente:
- **http_req_duration**: latência de requests
- **http_req_failed**: taxa de erro
- **http_reqs**: throughput (req/s)
- **iteration_duration**: tempo total por iteração

Thresholds configurados:
- 95% dos requests < 500ms
- 99% dos requests < 1000ms
- Taxa de erro < 1%

## Estrutura

| Arquivo | Descrição | VUs | Duração |
|---------|-----------|-----|---------|
| `smoke-test.js` | Sanity check básico | 1 | 30s |
| `load-test.js` | Carga esperada | 10 | 5min |
| `stress-test.js` | Limite superior | 1→50 | 10min |
| `scenarios/` | Cenários específicos | var | var |

## Cenários

### Smoke Test
- 1 usuário virtual
- 30 segundos
- Valida que endpoints respondem sem erro

### Load Test
- 10 usuários concorrentes
- 5 minutos constantes
- Simula carga diária média

### Stress Test
- Ramp-up: 1→50 VUs em 2min
- Plateau: 50 VUs por 5min
- Ramp-down: 50→0 em 2min
- Identifica breaking point

## Resultados

k6 gera relatório em stdout. Para CI/CD:

```bash
k6 run --out json=results.json test/load/smoke-test.js
```

Integração com Grafana/Datadog (futuro):
```bash
k6 run --out influxdb=http://localhost:8086/k6 test/load/smoke-test.js
```

## Notas

- **DTOV:** Não usar load testing contra banco de teste (poluição de dados)
- **Produção:** Coordenar com ops antes de stress test
- **Autenticação:** Testes usam JWT mock ou credencial de teste dedicada
