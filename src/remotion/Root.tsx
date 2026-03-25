import { Composition } from "remotion";
import { LandingVideo } from "./LandingVideo";
import { StoriesVideo } from "./StoriesVideo";

export const RemotionRoot = () => (
  <>
    <Composition
      id="LandingVideo"
      component={LandingVideo}
      durationInFrames={510}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="StoriesVideo"
      component={StoriesVideo}
      durationInFrames={320}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
