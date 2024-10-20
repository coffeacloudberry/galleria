.PHONY: mypy
mypy:
	python -m mypy cli/src/

.PHONY: check
check: mypy
	ruff check

.PHONY: format
format:
	ruff format

.PHONY: install
install:
	poetry install --with test && \
	mkdir tests/end_to_end/results

.PHONY: update
update:
	poetry update --with test

# coverage here instead of the addopts config to skip coverage and handle
# breakpoints when running 1 test in PyCharm
.PHONY: py-test
py-test:
	python -m pytest --cov=cli/src --cov-report xml:_coverage.xml --no-cov-on-fail

.PHONY: js-test
js-test:
	npm run test

.PHONY: e2e-test
e2e-test:
	cd tests/end_to_end/results && \
	robot .. && \
	cd ../../..

.PHONY: test
test: js-test py-test e2e-test
