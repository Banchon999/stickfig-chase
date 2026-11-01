import { MyComposition } from "./Composition";
import { EarthStopComposition } from "./EarthStop";
import { ChaseComposition } from "./Chase";
import { ScaleTestComposition } from "./two5d/ScaleTest";
import { BoundariesComposition } from "./two5d/Boundaries";
import { SoapManualComposition } from "./two5d/SoapManual";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <EarthStopComposition />
      <ChaseComposition />
      <ScaleTestComposition />
      <BoundariesComposition />
      <SoapManualComposition />
    </>
  );
};
