import { BrewFlow } from '../../brew/brewFlow';

/*
 * This code was ported from Visualizer's parse_brew_flow by AI for parity
 */

// ---------- Types ----------
type BrewPoint = {
  timestamp: string; // "HH:MM:SS.mmm"
  unix_timestamp?: number; // computed
  [k: string]: any; // e.g. actual_weight, value, flow_value, actual_pressure, actual_temperature
};

// ---------- Maps (from Visualizer Ruby) ----------
const DATA_LABELS_MAP: Record<string, string> = {
  weight: 'espresso_weight',
  waterFlow: 'espresso_flow',
  realtimeFlow: 'espresso_flow_weight',
  pressureFlow: 'espresso_pressure',
  temperatureFlow: 'espresso_temperature_mix',
  basketTemperatureFlow: 'espresso_temperature_basket',
  targetTemperatureFlow: 'espresso_temperature_goal',
};

const DATA_VALUES_MAP: Record<string, string> = {
  weight: 'actual_weight',
  waterFlow: 'value',
  realtimeFlow: 'flow_value',
  pressureFlow: 'actual_pressure',
  temperatureFlow: 'actual_temperature',
  basketTemperatureFlow: 'actual_temperature',
  targetTemperatureFlow: 'actual_temperature',
};

// ---------- Class ----------
export class DecentBrewFlow {
  private timeframe: number[] = [];
  private data: Record<string, number[]> = {};
  private parsed = false;

  constructor(private readonly brewFlow: BrewFlow | null | undefined) {}

  /** Public accessor: timeframe only. */
  public getElapsed(): readonly number[] | undefined {
    if (!this.parsed) this.parse();
    return Object.freeze([...this.timeframe]);
  }

  /** Public accessor: data only. */
  public getData(): Readonly<Record<string, readonly number[]>> | undefined {
    if (!this.parsed) this.parse();
    const copy: Record<string, readonly number[]> = {};
    for (const k of Object.keys(this.data))
      copy[k] = Object.freeze([...this.data[k]]);
    return Object.freeze(copy);
  }

  // ---------- Internal parsing (Ruby parity) ----------
  private parse(): void {
    const brewFlow = this.brewFlow!;
    const relevantKeys = Object.keys(brewFlow)
      .filter((k) => Array.isArray(brewFlow[k]) && brewFlow[k].length > 1)
      .filter((k) => Object.prototype.hasOwnProperty.call(DATA_LABELS_MAP, k));

    if (relevantKeys.length === 0) return;

    // Prepare data buckets
    this.data = {};
    for (const k of relevantKeys) {
      this.data[DATA_LABELS_MAP[k]] = [];
    }

    // Copy + add unix_timestamp + sort
    const flowCopy: Record<string, BrewPoint[]> = {};
    for (const k of Object.keys(brewFlow)) {
      const arr = (brewFlow[k] ?? []).map((d) => {
        const copy: BrewPoint = { ...d };
        copy.unix_timestamp = this.parseClockToSeconds(copy.timestamp);
        return copy;
      });
      arr.sort((a, b) => a.unix_timestamp! - b.unix_timestamp!);
      flowCopy[k] = arr;
    }

    // Longest series is the clock
    let longestKey = relevantKeys[0];
    for (const k of relevantKeys) {
      if (flowCopy[k].length > flowCopy[longestKey].length) longestKey = k;
    }
    const longest = flowCopy[longestKey];
    if (!longest.length) return;

    const start = Number(longest[0].unix_timestamp);
    this.timeframe = [];

    for (const d of longest) {
      const dt = Number(d.unix_timestamp) - start;
      const rounded = Math.round(dt * 10_000) / 10_000; // round(4)
      this.timeframe.push(rounded);

      for (const key of relevantKeys) {
        const series = flowCopy[key];
        const closest = this.closestByUnixTimestamp(
          series,
          Number(d.unix_timestamp),
        );
        const valueField = DATA_VALUES_MAP[key];
        const raw = closest?.[valueField];
        const num = typeof raw === 'number' ? raw : Number(raw);
        this.data[DATA_LABELS_MAP[key]].push(num > 0 ? num : 0);
      }
    }

    this.parsed = true;
  }

  // ---------- Helpers ----------
  /** Ruby: Time.strptime("%H:%M:%S.%L").to_f equivalent → seconds as float. */
  private parseClockToSeconds(ts: string): number {
    const m = ts.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
    if (!m) return NaN;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = Number(m[3]);
    const ms = Number(m[4].padEnd(3, '0'));
    return hh * 3600 + mm * 60 + ss + ms / 1000;
  }

  /** Nearest neighbor by unix_timestamp. */
  private closestByUnixTimestamp(arr: BrewPoint[], target: number): BrewPoint {
    let lo = 0;
    let hi = arr.length - 1;
    if (hi <= 0) return arr[0];

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const t = arr[mid].unix_timestamp!;
      if (t === target) return arr[mid];
      if (t < target) lo = mid + 1;
      else hi = mid - 1;
    }

    if (lo >= arr.length) return arr[arr.length - 1];
    if (hi < 0) return arr[0];

    const loDiff = Math.abs(arr[lo].unix_timestamp! - target);
    const hiDiff = Math.abs(arr[hi].unix_timestamp! - target);
    return loDiff < hiDiff ? arr[lo] : arr[hi];
  }
}
