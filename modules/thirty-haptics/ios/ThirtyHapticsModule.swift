import ExpoModulesCore
import CoreHaptics

public class ThirtyHapticsModule: Module {
  private var engine: CHHapticEngine?
  private var player: CHHapticPatternPlayer?

  public func definition() -> ModuleDefinition {
    Name("ThirtyHaptics")

    AsyncFunction("isAvailable") { () -> Bool in
      CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    AsyncFunction("startSwell") { (phase: String, durationMs: Double) in
      try self.startSwell(phase: phase, durationMs: durationMs)
    }

    AsyncFunction("stop") {
      self.stopPlayback()
    }

    OnDestroy {
      self.stopPlayback()
      self.engine?.stop(completionHandler: nil)
    }
  }

  private func ensureEngine() throws -> CHHapticEngine {
    if let engine = engine {
      return engine
    }
    let engine = try CHHapticEngine()
    engine.isAutoShutdownEnabled = false
    engine.stoppedHandler = { [weak self] _ in
      self?.player = nil
    }
    engine.resetHandler = { [weak self] in
      try? self?.engine?.start()
    }
    try engine.start()
    self.engine = engine
    return engine
  }

  private func startSwell(phase: String, durationMs: Double) throws {
    stopPlayback()
    guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
    let engine = try ensureEngine()
    try engine.start()

    let duration = max(0.25, durationMs / 1000.0)
    let pattern = try makePattern(phase: phase, duration: duration)
    let player = try engine.makePlayer(with: pattern)
    try player.start(atTime: CHHapticTimeImmediate)
    self.player = player
  }

  private func stopPlayback() {
    try? player?.stop(atTime: CHHapticTimeImmediate)
    player = nil
  }

  private func makePattern(phase: String, duration: TimeInterval) throws -> CHHapticPattern {
    // Continuous intensity envelope. Inhale swells, exhale recedes, hold stays quiet.
    let steps = max(6, Int(duration / 0.08))
    var events: [CHHapticEvent] = []
    let slice = duration / Double(steps)

    for i in 0..<steps {
      let t = Double(i) / Double(max(steps - 1, 1))
      let intensity: Float
      let sharpness: Float
      switch phase {
      case "in":
        intensity = Float(0.12 + 0.62 * t)
        sharpness = Float(0.18 + 0.22 * t)
      case "out":
        intensity = Float(0.68 - 0.56 * t)
        sharpness = Float(0.32 - 0.18 * t)
      default:
        intensity = 0.16
        sharpness = 0.12
      }
      let event = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
          CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
        ],
        relativeTime: Double(i) * slice,
        duration: slice + 0.01
      )
      events.append(event)
    }
    return try CHHapticPattern(events: events, parameters: [])
  }
}
