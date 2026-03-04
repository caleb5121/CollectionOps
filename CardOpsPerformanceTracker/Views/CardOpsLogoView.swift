import SwiftUI

struct CardOpsWordmark: View {
    let accent: Color

    init(accent: Color = CardOpsTheme.brandRed) {
        self.accent = accent
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "square.stack.3d.up.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(accent)
            Text("CardOps")
                .font(.headline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)
        }
    }
}

struct CardOpsLogoMark: View {
    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            ZStack {
                RoundedRectangle(cornerRadius: size * 0.24)
                    .fill(CardOpsTheme.panelBackground)

                RoundedRectangle(cornerRadius: size * 0.24)
                    .strokeBorder(CardOpsTheme.panelBorder, lineWidth: size * 0.02)

                Image(systemName: "square.stack.3d.up.fill")
                    .font(.system(size: size * 0.42, weight: .semibold))
                    .foregroundStyle(CardOpsTheme.brandRed)
            }
        }
    }
}
