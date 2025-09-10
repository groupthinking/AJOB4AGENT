import pandas as pd
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import uvicorn

app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serves the main dashboard page."""
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
