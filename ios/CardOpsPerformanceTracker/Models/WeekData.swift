import Foundation

nonisolated struct WeekData: Identifiable, Codable, Sendable, Equatable {
    let id: UUID
    let game: String
    let weekStart: Date
    let weekEnd: Date
    let dailyOrders: [Int]
    let dailyRevenue: [Double]
    let totalOrders: Int
    let totalRevenue: Double
    let totalShipping: Double
    let totalFees: Double
    let uploadedAt: Date
    let isPartial: Bool
    let cardsCount: Int?

    init(
        id: UUID = UUID(),
        game: String = "Unassigned",
        weekStart: Date,
        weekEnd: Date,
        dailyOrders: [Int],
        dailyRevenue: [Double],
        totalOrders: Int,
        totalRevenue: Double,
        totalShipping: Double = 0,
        totalFees: Double = 0,
        uploadedAt: Date = Date(),
        isPartial: Bool = false,
        cardsCount: Int? = nil
    ) {
        self.id = id
        self.game = game
        self.weekStart = weekStart
        self.weekEnd = weekEnd
        self.dailyOrders = dailyOrders
        self.dailyRevenue = dailyRevenue
        self.totalOrders = totalOrders
        self.totalRevenue = totalRevenue
        self.totalShipping = totalShipping
        self.totalFees = totalFees
        self.uploadedAt = uploadedAt
        self.isPartial = isPartial
        self.cardsCount = cardsCount
    }

    var averageOrderValue: Double {
        totalOrders > 0 ? totalRevenue / Double(totalOrders) : 0
    }

    var weekLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let suffix = isPartial ? " (partial)" : ""
        return "\(formatter.string(from: weekStart)) – \(formatter.string(from: weekEnd))\(suffix)"
    }
}
