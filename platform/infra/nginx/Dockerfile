FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY platform/infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY platform/infra/nginx/docker-entrypoint.sh /docker-entrypoint.sh
COPY platform/frontend/dist/ /usr/share/nginx/html/
COPY platform/infra/nginx/static/ /usr/share/nginx/html/
COPY platform/infra/nginx/static/index.html /opt/nginx-fallback/__fallback_index.html

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
