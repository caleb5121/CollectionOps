import Foundation

struct ScoreEngine {

    static func momentum(for week: WeekData) -> Double {
        let orders = week.dailyOrders.map { Double($0) }
        let revenue = week.dailyRevenue
        guard orders.count >= 7 else { return 50 }

        let firstHalfRevenue = (revenue[0] + revenue[1] + revenue[2]) / 3.0
        let lastHalfRevenue = (revenue[4] + revenue[5] + revenue[6]) / 3.0
        let firstHalfOrders = (orders[0] + orders[1] + orders[2]) / 3.0
        let lastHalfOrders = (orders[4] + orders[5] + orders[6]) / 3.0

        let gR = (lastHalfRevenue - firstHalfRevenue) / max(firstHalfRevenue, 1.0)
        let gO = (lastHalfOrders - firstHalfOrders) / max(firstHalfOrders, 1.0)

        let gRClamped = max(-0.5, min(0.5, gR))
        let gOClamped = max(-0.5, min(0.5, gO))

        let g = (gRClamped + gOClamped) / 2.0
        return Double(Int((g + 0.5) * 100.0))
    }

    static func flow(currentWeek: WeekData, allWeeks: [WeekData]) -> Double? {
        let previous = allWeeks.filter { $0.weekStart < currentWeek.weekStart }
        guard previous.count >= 2 else { return nil }

        let baselineOrders = previous.map { Double($0.totalOrders) }.reduce(0, +) / Double(previous.count)
        let baselineRevenue = previous.map { $0.totalRevenue }.reduce(0, +) / Double(previous.count)

        let dO = abs(Double(currentWeek.totalOrders) - baselineOrders) / max(baselineOrders, 1.0)
        let dR = abs(currentWeek.totalRevenue - baselineRevenue) / max(baselineRevenue, 1.0)

        let flowRaw = 1.0 - min((dO + dR) / 2.0, 1.0)
        return Double(Int(flowRaw * 100.0))
    }

    static func efficiency(for week: WeekData, shippingConfig: ShippingConfig?) -> Double {
        let aovScore = aovConsistencyScore(week: week)
        let corrScore = orderRevenueCorrelation(week: week)

        let raw: Double
        if let config = shippingConfig, config.isConfigured {
            let aov = week.averageOrderValue
            let shipRatio = config.blendedShippingCost / max(aov, 1.0)
            let shipScore = (1.0 - min(shipRatio / 0.5, 1.0)) * 100.0
            raw = (aovScore + corrScore + shipScore) / 3.0
        } else {
            raw = (aovScore + corrScore) / 2.0
        }

        return Double(Int(max(0, min(100, raw))))
    }

    private static func aovConsistencyScore(week: WeekData) -> Double {
        let dailyAOV: [Double] = zip(week.dailyRevenue, week.dailyOrders).compactMap { rev, ord in
            ord > 0 ? rev / Double(ord) : nil
        }
        guard dailyAOV.count >= 2 else { return 75 }

        let mean = dailyAOV.reduce(0, +) / Double(dailyAOV.count)
        guard mean > 0 else { return 50 }

        let variance = dailyAOV.reduce(0) { $0 + pow($1 - mean, 2) } / Double(dailyAOV.count)
        let cv = sqrt(variance) / mean

        return max(0, min(100, (1.0 - min(cv, 1.0)) * 100.0))
    }

    private static func orderRevenueCorrelation(week: WeekData) -> Double {
        let activeDays = zip(week.dailyOrders, week.dailyRevenue).filter { $0.0 > 0 }
        guard activeDays.count >= 3 else { return 50 }

        let orders = activeDays.map { Double($0.0) }
        let revenue = activeDays.map { $0.1 }

        let meanO = orders.reduce(0, +) / Double(orders.count)
        let meanR = revenue.reduce(0, +) / Double(revenue.count)

        var num = 0.0
        var denO = 0.0
        var denR = 0.0

        for i in 0..<orders.count {
            let dO = orders[i] - meanO
            let dR = revenue[i] - meanR
            num += dO * dR
            denO += dO * dO
            denR += dR * dR
        }

        let den = sqrt(denO * denR)
        guard den > 0 else { return 50 }

        let r = num / den
        return max(0, min(100, (r + 1.0) / 2.0 * 100.0))
    }
}
