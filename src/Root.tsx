import { MyComposition } from "./Composition";
import { EarthStopComposition } from "./EarthStop";
import { ChaseComposition } from "./Chase";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <EarthStopComposition />
      <ChaseComposition />
    </>
  );
};
