FROM python:3.12-slim

WORKDIR /app

# WHY copy requirements first, then source?
# Docker layer caching — if requirements.txt hasn't changed,
# the pip install layer is reused on rebuild. Only changed
# source files trigger a rebuild. Faster CI builds.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]