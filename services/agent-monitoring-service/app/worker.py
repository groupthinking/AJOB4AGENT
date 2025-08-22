import pika
import json
import time
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import ApplicationLog, ApplicationStatus

RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672')
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://user:password@postgres:5432/agent_db')
CONSUME_QUEUE = 'application_status_queue'

# Setup Database Connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()

    channel.queue_declare(queue=CONSUME_QUEUE, durable=True)
    print('Agent Monitoring Service: Waiting for status logs. To exit press CTRL+C')

    def callback(ch, method, properties, body):
        print(f"[x] Received status log")
        log_data = json.loads(body)
        
        db = SessionLocal()
        try:
            # Create a new log entry
            db_log = ApplicationLog(
                job_id=log_data.get('job_id'),
                platform=log_data.get('platform'),
            try:
                status_value = log_data.get('status')
                status_enum = ApplicationStatus(status_value)
            except (ValueError, TypeError) as e:
                print(f"[!] Invalid status value '{log_data.get('status')}' for job {log_data.get('job_id')}: {e}")
                db.close()
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            db_log = ApplicationLog(
                job_id=log_data.get('job_id'),
                platform=log_data.get('platform'),
                status=status_enum,
                details=log_data.get('details')
            )
            db.add(db_log)
            db.commit()
            print(f"[x] Successfully logged status for job {log_data.get('job_id')} to database.")
        except Exception as e:
            print(f"[!] Error writing to database: {e}")
            db.rollback()
        finally:
            db.close()
        
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=CONSUME_QUEUE, on_message_callback=callback)
    channel.start_consuming()

if __name__ == '__main__':
    # Wait for DB to be ready and run migrations (Alembic would be used here in prod)
    time.sleep(10) 
    from models import Base
    Base.metadata.create_all(bind=engine)

    while True:
        try:
            main()
        except pika.exceptions.AMQPConnectionError:
            print("RabbitMQ connection lost. Retrying in 5 seconds...")
            time.sleep(5)