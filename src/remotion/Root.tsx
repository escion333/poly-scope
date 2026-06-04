import { Composition } from 'remotion'
import { HelloWorld } from './HelloWorld'

// Every composition the Studio / renderer knows about is registered here.
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'Poly Scope',
          subtitle: 'Remotion is ready',
        }}
      />
    </>
  )
}
