.PHONY: mypy pylint check isort black format

mypy:
	python -m mypy --install-types --config-file mypy.ini src/

pylint:
	python -m pylint src/

check: mypy pylint

# documentation: https://github.com/PyCQA/isort/wiki/isort-Settings
isort:
	python -m isort src/ --force-single-line

black:
	python -m black src/

format: isort black
