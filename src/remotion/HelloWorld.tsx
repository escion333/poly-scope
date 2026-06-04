import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export type HelloWorldProps = {
  title: string
  subtitle: string
}

export const HelloWorld = ({ title, subtitle }: HelloWorldProps) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Spring-driven entrance for the title.
  const enter = spring({ frame, fps, config: { damping: 200 } })
  const titleY = interpolate(enter, [0, 1], [40, 0])
  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: 130,
          fontWeight: 800,
          margin: 0,
          opacity: enter,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          color: '#22d3ee',
          fontSize: 56,
          fontWeight: 500,
          marginTop: 16,
          opacity: subtitleOpacity,
        }}
      >
        {subtitle}
      </p>
    </AbsoluteFill>
  )
}
