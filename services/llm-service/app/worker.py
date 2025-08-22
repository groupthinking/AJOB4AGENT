import pika
import json
import time
import random
from models import TailoringPayload, TailoredOutput

RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672'
IN_QUEUE = 'job_to_tailor_queue'
OUT_QUEUE = 'job_completed_queue'

def main():
    connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
    channel = connection.channel()

    channel.queue_declare(queue=IN_QUEUE, durable=True)
    channel.queue_declare(queue=OUT_QUEUE, durable=True)
    
    print('LLM Worker: Waiting for jobs. To exit press CTRL+C')

    def callback(ch, method, properties, body):
        print(f" [x] Received job")
        payload_dict = json.loads(body)
        
        try:
            # Validate payload with Pydantic models
            payload = TailoringPayload(**payload_dict)

            # --- Placeholder for Core LLM Logic ---
            tailored_resume = f"TAILORED RESUME for {payload.job_data.job_title} at {payload.job_data.company_name}."
            cover_letter = f"TAILORED COVER LETTER for {payload.job_data.company_name}."
            recruiter_name = payload.job_data.recruiter_info.name if payload.job_data.recruiter_info else "Hiring Team"
            outreach_message = f"Hi {recruiter_name}, I'm very interested in the {payload.job_data.job_title} role."
            confidence_score = round(random.uniform(0.75, 0.95), 2)
            # --- End Placeholder ---

            response = TailoredOutput(
                job_id=payload.job_data.job_id,
                status="success",
                tailored_resume=tailored_resume,
                cover_letter=cover_letter,
                outreach_message=outreach_message,
                confidence_score=confidence_score
            )
            
            # Publish result to the completed queue
            channel.basic_publish(
                exchange='',
                routing_key=OUT_QUEUE,
                body=response.json(),
                properties=pika.BasicProperties(delivery_mode=2) # make message persistent
            )
            print(f" [x] Finished job, published to {OUT_QUEUE}")

        except Exception as e:
            print(f" [!] Error processing job: {e}")
            # Optionally publish to an error queue
        
        # Acknowledge the message was processed successfully
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_qos(prefetch_count=1) # Process one message at a time
    channel.basic_consume(queue=IN_QUEUE, on_message_callback=callback)
    channel.start_consuming()

if __name__ == '__main__':
    # Loop to handle connection retries
    while True:
        try:
            main()
        except pika.exceptions.AMQPConnectionError:
            print("Connection lost. Retrying in 5 seconds...")
            time.sleep(5)
