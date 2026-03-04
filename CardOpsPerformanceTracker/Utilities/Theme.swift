import SwiftUI

enum CardOpsTheme {
    static let background = Color(red: 0.11, green: 0.12, blue: 0.14)
    static let panelBackground = Color(red: 0.16, green: 0.18, blue: 0.22)
    static let panelBackgroundElevated = Color(red: 0.19, green: 0.21, blue: 0.26)
    static let panelBorder = Color.white.opacity(0.08)

    static let brandRed = Color(red: 0.80, green: 0.20, blue: 0.22)
    static let momentum = Color(red: 0.33, green: 0.76, blue: 0.54)
    static let flow = Color(red: 0.40, green: 0.63, blue: 0.98)
    static let efficiency = Color(red: 0.93, green: 0.71, blue: 0.31)

    static let momentumGreen = momentum
    static let flowBlue = flow
    static let efficiencyAmber = efficiency

    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.72)
    static let textTertiary = Color.white.opacity(0.46)

    static func accent(for game: String) -> Color {
        switch game {
        case "Pokémon":
            return Color(red: 0.80, green: 0.24, blue: 0.24)
        case "Yu-Gi-Oh!":
            return Color(red: 0.66, green: 0.35, blue: 0.94)
        case "Magic":
            return Color(red: 0.31, green: 0.67, blue: 0.89)
        case "Sports Cards":
            return Color(red: 0.40, green: 0.76, blue: 0.48)
        case "One Piece":
            return Color(red: 0.96, green: 0.55, blue: 0.24)
        default:
            return brandRed
        }
    }
}
