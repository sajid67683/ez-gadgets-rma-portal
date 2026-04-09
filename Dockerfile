FROM python:3.14-slim
WORKDIR
COPY
RUN
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]