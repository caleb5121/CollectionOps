import SwiftUI

struct GaugeRingView: View {
    let value: Double
    let label: String
    let subLabel: String
    let color: Color
    let delta: Double
    let locked: Bool
    let lockedMessage: String

    @State private var animatedProgress: Double = 0

    init(
        value: Double,
        label: String,
        subLabel: String,
        color: Color,
        delta: Double = 0,
        locked: Bool = false,
        lockedMessage: String = ""
    ) {
        self.value = value
        self.label = label
        self.subLabel = subLabel
        self.color = color
        self.delta = delta
        self.locked = locked
        self.lockedMessage = lockedMessage
    }

    private var displayValue: Int { Int(animatedProgress.rounded()) }
    private var progress: Double { locked ? 0 : animatedProgress / 100 }
    private let ringLineWidth: CGFloat = 16
    private let ringSize: CGFloat = 112

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                // Track with inner shadow illusion
                Circle()
                    .stroke(color.opacity(0.10), lineWidth: ringLineWidth)

                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.black.opacity(0.35), Color.black.opacity(0.12)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: ringLineWidth - 2
                    )

                // Active arc with glow
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        AngularGradient(
                            colors: [color.opacity(0.60), color, color.opacity(0.85)],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: ringLineWidth, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .shadow(
                        color: color.opacity(locked ? 0 : (delta >= 0 ? 0.55 : 0.18)),
                        radius: locked ? 0 : (delta >= 0 ? 8 : 4),
                        x: 0, y: 0
                    )

                // Center content
                VStack(spacing: 1) {
                    if locked {
                        Text("—")
                            .font(.system(size: 30, weight: .heavy, design: .default))
                            .foregroundStyle(CardOpsTheme.textTertiary)
                    } else {
                        Text("\(displayValue)")
                            .font(.system(size: 30, weight: .heavy, design: .default))
                            .foregroundStyle(CardOpsTheme.textPrimary)
                            .contentTransition(.numericText())
                            .kerning(-0.5)
                    }
                }
            }
            .frame(width: ringSize, height: ringSize)

            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)
                .kerning(-0.2)

            if locked {
                Text(lockedMessage)
                    .font(.caption2)
                    .foregroundStyle(CardOpsTheme.textTertiary)
                    .multilineTextAlignment(.center)
            } else {
                Text(subLabel)
                    .font(.caption2)
                    .foregroundStyle(CardOpsTheme.textTertiary)
            }

            HStack(spacing: 3) {
                Image(systemName: delta >= 0 ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(delta >= 0 ? CardOpsTheme.momentum : CardOpsTheme.brandRed)
                Text("\(abs(delta), specifier: "%.0f") vs last wk")
                    .font(.caption2)
                    .foregroundStyle(CardOpsTheme.textSecondary.opacity(0.7))
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear { updateAnimation(to: value) }
        .onChange(of: value) { _, newValue in updateAnimation(to: newValue) }
        .onChange(of: locked) { _, _ in updateAnimation(to: value) }
    }

    private func updateAnimation(to newValue: Double) {
        guard !locked else {
            animatedProgress = 0
            return
        }
        withAnimation(.easeOut(duration: 0.15)) {
            animatedProgress = newValue
        }
    }
}
