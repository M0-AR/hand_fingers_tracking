.PHONY: serve check test

serve:
	python3 -m http.server 8000

check:
	bash scripts/verify.sh

test:
	python3 -m unittest discover -s tests -v
