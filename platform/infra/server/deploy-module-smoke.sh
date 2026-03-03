#!/usr/bin/env bash
set -euo pipefail

# Smoke-тест деплоя нового модуля (версия для ручного деплоя через FileZilla)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BASE_URL="${BASE_URL:-http://grummm.ru}"

cd "${REPO_ROOT}" || { echo "Не удалось перейти в корень проекта: $REPO_ROOT"; exit 1; }

command -v docker >/dev/null 2>&1 || { echo "ERROR: docker не установлен"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "ERROR: docker compose plugin не установлен"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl не установлен"; exit 1; }

echo "[1/4] Commit checkpoint"
echo "Skipped (ручной деплой через FileZilla — git на сервере отсутствует)"

echo "[2/4] Сборка контейнеров"
docker compose -f "${COMPOSE_FILE}" build nginx backend postgres

echo "[3/4] Перезапуск сервисов"
docker compose -f "${COMPOSE_FILE}" up -d --force-recreate nginx backend postgres
docker compose -f "${COMPOSE_FILE}" exec -T nginx nginx -s reload

sleep 8

check_route() {
  local route="$1"
  local tmp_file
  tmp_file="$(mktemp)"

  local code
  code="$(curl -k -sS -o "${tmp_file}" -w "%{http_code}" "${BASE_URL}${route}")"

  if [[ ! "${code}" =~ ^[23] ]]; then
    echo "ОШИБКА: ${route} → HTTP ${code}"
    cat "${tmp_file}"
    rm -f "${tmp_file}"
    return 1
  fi

  if ! grep -qiE "platform|frontend|placeholder|landing|app|projects" "${tmp_file}" 2>/dev/null; then
    echo "Предупреждение: ${route} вернул HTTP ${code}, но ожидаемый контент не найден"
    head -n 10 "${tmp_file}"
  else
    echo "OK: ${route} → HTTP ${code}"
  fi

  rm -f "${tmp_file}"
}

echo "[4/4] Проверка маршрутов"
check_route "/projects"
check_route "/app"

echo "Smoke-тест завершён."
echo "Если что-то не OK — смотрите логи:"
echo "  docker compose logs -f nginx backend"
