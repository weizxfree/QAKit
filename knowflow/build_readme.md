
sudo snap install astral-uv --classic
uv run download_deps.py



docker build -f Dockerfile.deps -t infiniflow/ragflow_deps .
docker build --build-arg LIGHTEN=1 -f Dockerfile -t infiniflow/ragflow:nightly-slim .



修改 service.tamp 3306
修改 8.134.177.47：18001


