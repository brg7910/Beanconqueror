import { Bean } from 'src/classes/bean/bean';
import { Brew } from 'src/classes/brew/brew';
import { BrewFlow } from 'src/classes/brew/brewFlow';
import { Mill } from 'src/classes/mill/mill';
import { Preparation } from 'src/classes/preparation/preparation';
import { Water } from 'src/classes/water/water';
import { IVisualizerMap } from 'src/interfaces/visualizer/iVisualizerMap';
import { DecentBrewFlow } from './decentBrewFlow';

export interface PressureBlock {
  pressure?: number[];
  goal?: number[];
}

export interface FlowBlock {
  flow?: number[];
  by_weight?: number[];
  by_weight_raw?: number[];
  goal?: number[];
}

export interface TemperatureBlock {
  basket: number[];
  mix: number[];
  goal: number[];
}

export interface TotalsBlock {
  weight?: number[];
  water_dispensed?: number[];
}

export interface Profile {
  title?: string;
}

export interface AppBlock {
  data?: {
    settings?: Record<string, unknown>;
  };
}

export class DecentVisualizer implements IVisualizerMap {
  public timestamp: number | string; // Visualizer uses Time.at(json["timestamp"])

  public profile: Profile; // Visualizer uses json["profile"] / profile.title

  // TODO
  public elapsed: number[]; // Visualizer uses json["elapsed"]

  // BrewFlow
  public pressure: PressureBlock; // Visualizer digs: pressure.pressure/by_weight/by_weight_raw/goal
  public flow: FlowBlock; // Visualizer digs: flow.flow/by_weight/by_weight_raw/goal

  // Temperature Flow
  public temperature: TemperatureBlock; // Visualizer digs: temperature.basket/mix/goal
  public totals: TotalsBlock; // Visualizer digs: totals.weight/water_dispensed

  // Empty?
  public state_change: unknown; // Visualizer uses json["state_change"]

  // Extras?
  public app: AppBlock; // Visualizer digs: app.data.settings

  constructor() {
    this.timestamp = 0;
    this.elapsed = [];

    this.profile = {
      title: '',
    };

    this.pressure = {
      pressure: [],
      goal: [],
    };

    this.flow = {
      flow: [],
      by_weight: [],
      by_weight_raw: [],
      goal: [],
    };

    this.temperature = {
      basket: [],
      mix: [],
      goal: [],
    };

    this.totals = {
      weight: [],
      water_dispensed: [],
    };

    this.state_change = []; // unknown shape; default to empty list

    this.app = {
      data: {
        settings: {},
      },
    };
  }

  public mapBrew(brew: Brew) {
    // properties
    this.timestamp = brew.config.unix_timestamp;

    // settings
    this.app.data.settings['grinder_setting'] = brew.grind_size;
    this.app.data.settings['drink_weight'] = brew.brew_beverage_quantity;
    this.app.data.settings['bean_weight'] = brew.grind_weight;
    this.app.data.settings['drink_tds'] = brew.tds;

    //TODO:Fix
    // this.app.data.settings["drink_ey"] = brew.ey;
  }
  public mapBean(bean: Bean) {
    // settings
    this.app.data.settings['bean_brand'] = bean.roaster;
    this.app.data.settings['bean_type'] = bean.name;
    this.app.data.settings['roast_level'] = bean.roast;
    this.app.data.settings['roast_date'] = bean.roastingDate;
  }
  public mapMill(mill: Mill) {
    // settings
    this.app.data.settings['grinder_model'] = mill.name;
  }

  public mapPreparation(preparation: Preparation) {
    // properties
    this.profile.title = preparation.name;
  }

  public mapWater(water: Water) {
    // TODO?
  }

  /*

    "weight" => "espresso_weight" , 
    "waterFlow" => "espresso_flow", 
    "realtimeFlow" => "espresso_flow_weight", 

      %w[pressure flow].each do |key|
        @data["espresso_#{key}"] = json.dig(key, key)
  */
  public mapBrewFlow(brewFlow: BrewFlow) {
    // creates Decent style data from BrewFlow
    const decentBrewFlow = new DecentBrewFlow(brewFlow);
    const decentFlowData = decentBrewFlow.getData();

    // timeframe
    this.elapsed = decentBrewFlow.getElapsed().slice();

    // temperature flows
    this.temperature.mix = decentFlowData['espresso_temperature_mix']?.slice() ?? [];
    this.temperature.goal = decentFlowData['espresso_temperature_goal']?.slice() ?? [];
    this.temperature.basket = decentFlowData['espresso_temperature_basket']?.slice() ?? [];

    // pressure flow
    this.pressure.pressure = decentFlowData['espresso_pressure']?.slice() ?? [];
    
    // total weight
    this.totals.weight = decentFlowData['espresso_weight']?.slice() ?? [];
    
    // weight flows
    this.flow.flow = decentFlowData['espresso_flow']?.slice() ?? [];
    this.flow.by_weight = decentFlowData['espresso_flow_weight']?.slice() ?? [];
  }

  public setVisualizerId(string: any): void {
    // not implemented for Decent data, Visualizer hashes the json
  }

  public hasFlowData(): boolean {
    return (
      this.flow.flow.length > 0 ||
      this.flow.by_weight.length > 0 ||
      this.flow.by_weight_raw.length > 0
    );
  }
}
