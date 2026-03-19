---
"podkit": minor
---

Add tab completion for option values and dynamic config names

Options like `--quality`, `--type`, `--encoding`, and `--format` now offer their known values when pressing tab (e.g. `max`, `high`, `medium`, `low`). The `--device` and `--collection` flags complete with names from your config file. Works in both zsh and bash.
