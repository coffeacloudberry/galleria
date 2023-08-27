PY_REQ=require_dev.txt requirements.txt

.PHONY: mypy pylint check isort black format test coverage

mypy:
	python -m mypy --install-types --config-file mypy.ini src/

pylint:
	python -m pylint src/

check: mypy pylint

# documentation: https://github.com/PyCQA/isort/wiki/isort-Settings
isort:
	python -m isort src/ --force-single-line
	python -m isort tests/ --force-single-line

black:
	python -m black src/
	python -m black tests/

format: isort black

# for debug purpose, add the --setup-show flag to pytest
test:
	python -m pytest --capture=tee-sys

coverage:
	python -m coverage run -m pytest && \
	python -m coverage html --include="./src/*"

update:
	pip3 install --upgrade pip \
	${foreach file, ${PY_REQ}, && pip3 install -r ${file} -U}
