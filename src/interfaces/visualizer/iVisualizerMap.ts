import { BrewFlow } from '../../classes/brew/brewFlow';
import { IBean } from '../bean/iBean';
import { IBrew } from '../brew/iBrew';
import { IMill } from '../mill/iMill';
import { IPreparation } from '../preparation/iPreparation';
import { IWater } from '../water/iWater';

export interface IVisualizerMap {
  mapBrew(brew: IBrew): void;
  mapBean(bean: IBean): void;
  mapWater(water: IWater): void;
  mapPreparation(perpertation: IPreparation): void;
  mapMill(mill: IMill): void;
  mapBrewFlow(brewFlow: BrewFlow): void;
  setVisualizerId(string): void;
  hasFlowData(): boolean;
}
