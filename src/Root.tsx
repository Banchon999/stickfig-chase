import { MyComposition } from "./Composition";
import { EarthStopComposition } from "./EarthStop";
import { ChaseComposition } from "./Chase";
import { ScaleTestComposition } from "./two5d/ScaleTest";
import { BoundariesComposition } from "./two5d/Boundaries";
import { SoapManualComposition } from "./two5d/SoapManual";
import { ElevatorManualComposition } from "./two5d/ElevatorManual";
import { ChibiTestComposition } from "./two5d/ChibiTest";
import { ToiletTestComposition } from "./two5d/ToiletTest";
import { ToiletManualComposition } from "./two5d/ToiletManual";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <EarthStopComposition />
      <ChaseComposition />
      <ScaleTestComposition />
      <BoundariesComposition />
      <SoapManualComposition />
      <ElevatorManualComposition />
      <ChibiTestComposition />
      <ToiletTestComposition />
      <ToiletManualComposition />
    </>
  );
};
