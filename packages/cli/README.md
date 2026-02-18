# `neaps` Command Line Interface

Command line interface for tide predictions. Search for stations, view high/low tides, and generate water level timelines from your terminal.

## Install

### Homebrew (macOS / Linux)

```sh
brew install openwatersio/tap/neaps
```

### Shell script (macOS / Linux)

```sh
curl -fsSL https://raw.githubusercontent.com/openwatersio/neaps/main/install.sh | sh
```

### npm

```sh
npm install -g @neaps/cli
```

### Download binary

Pre-built binaries for macOS (Intel & Apple Silicon), Linux, and Windows are available on the [GitHub Releases](https://github.com/openwatersio/neaps/releases) page.

## Usage

### Find stations

Search for tide prediction stations by name, region, or country:

```sh
neaps stations "san francisco"
```

Find stations near a location:

```sh
neaps stations --near 37.8,-122.5
```

Combine search with proximity:

```sh
neaps stations "portland" --near 45.5,-122.7
```

Options:

| Flag | Description |
|------|-------------|
| `-n, --near <lat,lon>` | Find stations near coordinates |
| `-l, --limit <n>` | Maximum results (default: 10) |
| `--all` | Show all matching stations |
| `-f, --format <format>` | Output format: `text`, `json` |

### Tide extremes (high/low)

Get predicted high and low tides for a station:

```sh
neaps extremes --station noaa/9414290
```

Use your current location:

```sh
neaps extremes --ip
```

Options:

| Flag | Description |
|------|-------------|
| `-s, --station <id>` | Station ID |
| `-n, --near <lat,lon>` | Find nearest station to coordinates |
| `--ip` | Use IP geolocation to find nearest station |
| `--start <date>` | Start date in ISO format (default: now) |
| `--end <date>` | End date (default: 72h from start) |
| `-u, --units <units>` | `meters` or `feet` (default: meters) |
| `-f, --format <format>` | Output format: `text`, `json` |

### Water level timeline

Get a water level timeline with an ASCII chart:

```sh
neaps timeline --station noaa/9414290
```

Specify a date range and interval:

```sh
neaps timeline --station noaa/9414290 --start 2026-01-01 --end 2026-01-02 --interval 30
```

Options:

| Flag | Description |
|------|-------------|
| `-s, --station <id>` | Station ID |
| `-n, --near <lat,lon>` | Find nearest station to coordinates |
| `--ip` | Use IP geolocation to find nearest station |
| `--start <date>` | Start date in ISO format (default: now) |
| `--end <date>` | End date (default: 24h from start) |
| `-u, --units <units>` | `meters` or `feet` (default: meters) |
| `--interval <minutes>` | Minutes between data points (default: 60) |
| `-f, --format <format>` | Output format: `text`, `json` |

### JSON output

All commands support `--format json` for machine-readable output:

```sh
neaps extremes --station noaa/9414290 --format json
neaps timeline --station noaa/9414290 --format json
neaps stations "seattle" --format json
```

## License

MIT
