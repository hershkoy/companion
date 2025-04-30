.PHONY: install start test lint clean docker-chroma

# Development Setup
install:
	cd backend && python -m venv venv && \
	. venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

# Start Services
start-backend:
	cd backend && . venv/bin/activate && flask run --debug

start-frontend:
	cd frontend && npm start

start: start-backend start-frontend

# Testing
test-backend:
	cd backend && . venv/bin/activate && pytest

test-frontend:
	cd frontend && npm test

test: test-backend test-frontend

# Linting
lint-backend:
	cd backend && . venv/bin/activate && \
	black . && \
	flake8 . && \
	isort .

lint-frontend:
	cd frontend && \
	npm run lint && \
	npm run format

lint: lint-backend lint-frontend

# Database
db-init:
	cd backend && . venv/bin/activate && python db/init_db.py

# Docker Chroma
docker-chroma-up:
	docker-compose up -d chroma

docker-chroma-down:
	docker-compose down

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type d -name "*.egg-info" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -r {} +
	find . -type d -name "node_modules" -exec rm -r {} +
	find . -type d -name "build" -exec rm -r {} +
	find . -type d -name "dist" -exec rm -r {} +

# Help
help:
	@echo "Available commands:"
	@echo "  install            - Install dependencies for both backend and frontend"
	@echo "  start             - Start both backend and frontend servers"
	@echo "  test              - Run all tests"
	@echo "  lint              - Run linting and formatting"
	@echo "  db-init           - Initialize the database"
	@echo "  docker-chroma-up  - Start Chroma in Docker"
	@echo "  docker-chroma-down- Stop Chroma container"
	@echo "  clean             - Remove temporary files and build artifacts" 