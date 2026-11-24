# Git hooks

Enable the shared hooks once per clone:

```sh
git config core.hooksPath .githooks
```

`pre-commit` runs `gitleaks protect --staged` using `.gitleaks.toml`. If gitleaks is not installed it prints a warning and lets the commit through. Install gitleaks with `winget install gitleaks` or `brew install gitleaks`.

On Linux and macOS, make the hook executable: `chmod +x .githooks/pre-commit`.
