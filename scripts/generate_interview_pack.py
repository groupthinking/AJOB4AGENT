import argparse
import sys
import os

# This is a bit of a hack to allow the script to import from the src directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.generation import get_openai_client, create_interview_pack

def main():
    """
    Main function to generate an interview pack for a given company.
    """
    parser = argparse.ArgumentParser(description="Generate an Interview Preparation Pack for a company.")
    parser.add_argument("--company", type=str, required=True, help="The name of the company to research.")
    args = parser.parse_args()

    company_name = args.company
    print(f"🔥 Generating interview pack for: {company_name}")

    # For now, this script reads from a sample file.
    # A future version could take article text via stdin or other means.
    try:
        with open("data/sample_articles.txt", 'r', encoding='utf-8') as f:
            articles_text = f.read()
        print("📰 Successfully read sample articles.")
    except FileNotFoundError:
        print("❌ Error: `data/sample_articles.txt` not found. Please create it with sample text.")
        return

    client = get_openai_client()
    if not client:
        print("❌ Halting: OpenAI client could not be initialized. Is OPENAI_API_KEY set?")
        return

    create_interview_pack(client, company_name, articles_text)

if __name__ == "__main__":
    main()
