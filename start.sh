#!/bin/bash
# Запуск Uvicorn. Указываем порт $PORT, который предоставляет хостинг
# host 0.0.0.0 нужен, чтобы сервер слушал все входящие соединения
exec uvicorn main:app --host 0.0.0.0 --port $PORT