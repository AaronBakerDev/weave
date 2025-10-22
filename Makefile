DEV?=bash scripts/dev.sh

.PHONY: dev down

dev:
	@$(DEV)

down:
	@$(DEV) down

