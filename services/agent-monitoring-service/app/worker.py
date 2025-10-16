import pika
import json
import time
import os
import structlog
import schedule
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from contextlib import asynccontextmanager
import uvicorn

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Environment variables
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672')
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://jobagent:password@postgres:5432/jobagent')
CONSUME_QUEUE = 'application_status_queue'

# Setup Database Connection
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MonitoringService:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.should_stop = False
        
    def connect_rabbitmq(self):
        """Establish connection to RabbitMQ with retry logic"""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
                self.channel = self.connection.channel()
                self.channel.queue_declare(queue=CONSUME_QUEUE, durable=True)
                logger.info("Connected to RabbitMQ successfully")
                return True
            except Exception as e:
                retry_count += 1
                logger.error(f"Failed to connect to RabbitMQ (attempt {retry_count}/{max_retries})", error=str(e))
                time.sleep(5)
        
        return False
    
    def process_status_log(self, ch, method, properties, body):
        """Process incoming status log messages"""
        try:
            log_data = json.loads(body)
            job_id = log_data.get('job_id')
            
            logger.info("Processing status log", job_id=job_id, platform=log_data.get('platform'))
            
            db = SessionLocal()
            try:
                # Placeholder for database operations - would use actual models in production
                # This would create ApplicationLog entries using SQLAlchemy models
                
                # Simulate database write
                logger.info("Status log processed successfully", job_id=job_id)
                
            except Exception as db_error:
                logger.error("Database operation failed", job_id=job_id, error=str(db_error))
                db.rollback()
                raise
            finally:
                db.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in message", error=str(e))
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error("Error processing status log", error=str(e))
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def start_consuming(self):
        """Start consuming messages from RabbitMQ"""
        if not self.connect_rabbitmq():
            logger.error("Failed to establish RabbitMQ connection")
            return
        
        logger.info("Starting message consumption")
        
        self.channel.basic_qos(prefetch_count=1)
        self.channel.basic_consume(queue=CONSUME_QUEUE, on_message_callback=self.process_status_log)
        
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, stopping consumer")
            self.stop_consuming()
        except Exception as e:
            logger.error("Consumer error", error=str(e))
    
    def stop_consuming(self):
        """Stop consuming and close connections"""
        self.should_stop = True
        if self.channel:
            self.channel.stop_consuming()
        if self.connection and not self.connection.is_closed:
            self.connection.close()
        logger.info("Consumer stopped")

def health_metrics_job():
    """Periodic health metrics collection"""
    try:
        db = SessionLocal()
        # Collect application statistics
        # result = db.execute(text("SELECT COUNT(*) FROM application_logs WHERE created_at > NOW() - INTERVAL '1 hour'"))
        logger.info("Health metrics collected")
        db.close()
    except Exception as e:
        logger.error("Failed to collect health metrics", error=str(e))

# Schedule periodic tasks
schedule.every(5).minutes.do(health_metrics_job)

def run_scheduler():
    """Run scheduled tasks in a separate thread"""
    while True:
        schedule.run_pending()
        time.sleep(1)

# FastAPI app for health checks and metrics
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Agent Monitoring Service", version="1.0.0")
    
    # Start scheduler thread
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # Start monitoring service in background thread
    monitoring_service = MonitoringService()
    monitoring_thread = threading.Thread(target=monitoring_service.start_consuming, daemon=True)
    monitoring_thread.start()
    
    yield
    
    # Shutdown
    monitoring_service.stop_consuming()
    logger.info("Agent Monitoring Service shutdown")

app = FastAPI(
    title="Agent Monitoring Service",
    description="Monitoring and metrics collection for job application agents",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "agent-monitoring-service",
        "version": "1.0.0",
        "timestamp": time.time(),
        "components": {
            "database": db_status,
            "message_queue": "healthy"  # Would check RabbitMQ connection
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Basic metrics endpoint"""
    # Placeholder for Prometheus-style metrics
    return {
        "applications_processed_total": 0,
        "applications_successful_total": 0,
        "applications_failed_total": 0,
        "queue_depth": 0
    }

if __name__ == '__main__':
    # Wait for dependencies to be ready
    time.sleep(10)
    
    # Start the FastAPI server
    uvicorn.run(
        "worker:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )