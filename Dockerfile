# 1. Use a lightweight Python base image
FROM python:3.14-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy just the requirements first (makes builds much faster)
COPY requirements.txt .

# 4. Install your Python packages, plus gunicorn for production
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 5. Copy the rest of your app code
COPY . .

# 6. Expose the port your app runs on
EXPOSE 5000

# 7. Start the app using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]