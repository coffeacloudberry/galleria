.PHONY: mypy
mypy:
	python -m mypy cli/src/

.PHONY: check
check: mypy
	ruff check
	cargo clippy

.PHONY: format
format:
	ruff format

.PHONY: install
install:
	poetry install --with test && \
	mkdir tests/end_to_end/results
	npm i npm-check-updates --location=global
	npm install

.PHONY: update
update:
	poetry update --with test
	cargo update # Update Cargo.lock. No need to update Cargo.toml.
	ncu -u
	npm install

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
