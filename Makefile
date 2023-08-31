PY_REQ=requirements_dev.txt requirements_cli.txt

.PHONY: mypy
mypy:
	python -m mypy --config-file mypy.ini photo_manager_cli/src/ && \
	python -m mypy --config-file mypy.ini webtrack_cli/src/

.PHONY: pylint
pylint:
	python -m pylint photo_manager_cli/src/ webtrack_cli/src/

.PHONY: check
check: mypy pylint

# documentation: https://github.com/PyCQA/isort/wiki/isort-Settings
.PHONY: isort
isort:
	python -m isort --force-single-line \
		photo_manager_cli/src/ \
		photo_manager_cli/tests/ \
		webtrack_cli/src/ \
		webtrack_cli/tests/

.PHONY: black
black:
	python -m black \
		photo_manager_cli/src/ \
		photo_manager_cli/tests/ \
		webtrack_cli/src/ \
		webtrack_cli/tests/

.PHONY: format
format: isort black

# for debug purpose, add the --setup-show flag to pytest
.PHONY: test
test:
	python -m pytest --capture=tee-sys

.PHONY: coverage
coverage:
	python -m coverage run -m pytest && \
	python -m coverage html --include="photo_manager_cli/src/*,webtrack_cli/src/*"

.PHONY: update
update:
	pip3 install --upgrade pip \
	${foreach file, ${PY_REQ}, && pip3 install -r ${file} -U}
