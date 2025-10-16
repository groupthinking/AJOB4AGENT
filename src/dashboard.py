import pandas as pd
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import uvicorn

app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """
    Render and return the main dashboard HTML page.
    
    Renders the "dashboard.html" Jinja2 template with the provided Request in the template context and returns a TemplateResponse suitable for an HTML response.
    
    Parameters:
        request (Request): The incoming HTTP request; included in the template context for URL generation and request-specific data.
    
    Returns:
        templates.TemplateResponse: A TemplateResponse containing the rendered dashboard HTML.
    """
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/data/applications", response_class=HTMLResponse)
async def get_applications_data(request: Request):
    """Provides the applications table HTML fragment."""
    try:
        df = pd.read_csv("crm/applications.csv")
        applications_data = df.sort_values(by="timestamp", ascending=False).to_dict(orient="records")
    except FileNotFoundError:
        applications_data = []

    return templates.TemplateResponse(
        "fragments/applications_table.html",
        {"request": request, "applications": applications_data}
    )

if __name__ == "__main__":
    # This allows running the dashboard directly for development
    # Use `make dashboard` for production-like runs
    uvicorn.run("dashboard:app", host="0.0.0.0", port=8000, reload=True)
