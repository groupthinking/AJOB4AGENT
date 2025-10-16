.PHONY: install run clean

install:
	pip install --upgrade pip
	pip install -r requirements.txt

run:
	@echo "▶️  Running the main job automation pipeline..."
	@python -m src.main
	@echo "✅  Pipeline run complete."

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete

# Future commands for running the dashboard, tests, etc. can be added here.
dashboard:
	uvicorn src.dashboard:app --host 0.0.0.0 --port 8000 --reload
