# Multi-stage build for production optimization
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# Copy requirements file
COPY requirements.txt ./

# Install Python packages
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appuser && useradd -r -g appuser appuser

# Copy Python packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Set the working directory
WORKDIR /usr/src/app

# Copy application code - both legacy app/ and new src/ structure
COPY ./app ./app
COPY ./src ./src

# Change ownership to appuser
RUN chown -R appuser:appuser /usr/src/app

# Switch to non-root user
USER appuser

# Add local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Set Python path to include src directory
ENV PYTHONPATH=/usr/src/app

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8002/health || exit 1

# Run the FastAPI application (using new src structure)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]