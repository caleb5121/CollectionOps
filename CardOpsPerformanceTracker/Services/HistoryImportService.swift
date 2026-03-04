import Foundation

nonisolated enum ImportPhase: Sendable, Equatable {
    case idle
    case parsing
    case normalizing
    case deduplicating
    case segmenting
    case saving
    case complete
    case failed(String)

    var label: String {
        switch self {
        case .idle: return "Ready"
        case .parsing: return "Parsing CSV…"
        case .normalizing: return "Normalizing dates…"
        case .deduplicating: return "Removing duplicates…"
        case .segmenting: return "Segmenting into weeks…"
        case .saving: return "Saving weeks…"
        case .complete: return "Import complete"
        case .failed(let msg): return "Failed: \(msg)"
        }
    }

    var progress: Double {
        switch self {
        case .idle: return 0
        case .parsing: return 0.15
        case .normalizing: return 0.30
        case .deduplicating: return 0.50
        case .segmenting: return 0.70
        case .saving: return 0.90
        case .complete: return 1.0
        case .failed: return 0
        }
    }
}

nonisolated struct HistoryImportService: Sendable {

    struct SegmentResult: Sendable {
        let weeks: [WeekData]
        let totalOrders: Int
        let totalRevenue: Double
        let duplicatesRemoved: Int
        let skippedRows: Int
        let dateRangeStart: Date
        let dateRangeEnd: Date
        let partialWeeksCount: Int
    }

    static func parseAndSegment(
        fileURL: URL,
        game: String
    ) throws -> SegmentResult {
        let allRecords = try FileParsingService.parseFile(at: fileURL)
        guard !allRecords.isEmpty else { throw ParsingError.noDataFound }

        let (dedupedRecords, duplicatesRemoved) = deduplicateRecords(allRecords)
        guard !dedupedRecords.isEmpty else { throw ParsingError.noDataFound }

        let skippedRows = allRecords.count - dedupedRecords.count - duplicatesRemoved

        let calendar = Calendar.current
        let sorted = dedupedRecords.sorted { $0.orderDate < $1.orderDate }

        let earliestDate = calendar.startOfDay(for: sorted.first!.orderDate)
        let latestDate = calendar.startOfDay(for: sorted.last!.orderDate)

        let weeks = segmentIntoWeeks(records: sorted, game: game, startDate: earliestDate, calendar: calendar)

        let partialCount = weeks.filter(\.isPartial).count
        let totalOrders = dedupedRecords.reduce(0) { $0 + $1.quantity }
        let totalRevenue = dedupedRecords.reduce(0.0) { $0 + $1.productPrice }

        return SegmentResult(
            weeks: weeks,
            totalOrders: totalOrders,
            totalRevenue: totalRevenue,
            duplicatesRemoved: duplicatesRemoved,
            skippedRows: skippedRows,
            dateRangeStart: earliestDate,
            dateRangeEnd: latestDate,
            partialWeeksCount: partialCount
        )
    }

    private static func deduplicateRecords(_ records: [OrderRecord]) -> (records: [OrderRecord], removed: Int) {
        var seen = Set<String>()
        var unique: [OrderRecord] = []
        var removed = 0

        for record in records {
            let key: String
            if let orderId = record.orderId, !orderId.isEmpty {
                key = orderId + "_" + String(format: "%.2f", record.productPrice)
            } else {
                key = "\(record.orderDate.timeIntervalSince1970)_\(String(format: "%.2f", record.productPrice))_\(record.quantity)"
            }

            if seen.contains(key) {
                removed += 1
            } else {
                seen.insert(key)
                unique.append(record)
            }
        }

        return (unique, removed)
    }

    private static func segmentIntoWeeks(
        records: [OrderRecord],
        game: String,
        startDate: Date,
        calendar: Calendar
    ) -> [WeekData] {
        let latestDate = calendar.startOfDay(for: records.last!.orderDate)

        var weeks: [WeekData] = []
        var blockStart = startDate

        while blockStart <= latestDate {
            guard let blockEnd = calendar.date(byAdding: .day, value: 6, to: blockStart) else { break }

            let isPartial: Bool
            let effectiveEnd: Date

            if blockEnd > latestDate {
                effectiveEnd = latestDate
                let span = calendar.dateComponents([.day], from: blockStart, to: effectiveEnd).day ?? 0
                isPartial = span < 6
            } else {
                effectiveEnd = blockEnd
                isPartial = false
            }

            let daysInBlock = (calendar.dateComponents([.day], from: blockStart, to: effectiveEnd).day ?? 0) + 1
            let blockRecords = records.filter { record in
                let day = calendar.startOfDay(for: record.orderDate)
                return day >= blockStart && day <= effectiveEnd
            }

            if !blockRecords.isEmpty {
                var dailyOrders = [Int](repeating: 0, count: 7)
                var dailyRevenue = [Double](repeating: 0.0, count: 7)
                var totalShipping = 0.0
                var totalFees = 0.0
                var totalOrders = 0
                var totalRevenue = 0.0
                var totalCards = 0

                for record in blockRecords {
                    let day = calendar.startOfDay(for: record.orderDate)
                    let dayIndex = calendar.dateComponents([.day], from: blockStart, to: day).day ?? 0
                    guard dayIndex >= 0, dayIndex < 7 else { continue }

                    dailyOrders[dayIndex] += 1
                    dailyRevenue[dayIndex] += record.productPrice
                    totalShipping += record.shippingPrice
                    totalFees += record.fees
                    totalOrders += 1
                    totalRevenue += record.productPrice
                    totalCards += record.quantity
                }

                let week = WeekData(
                    game: game,
                    weekStart: blockStart,
                    weekEnd: effectiveEnd,
                    dailyOrders: Array(dailyOrders.prefix(isPartial ? daysInBlock : 7)),
                    dailyRevenue: Array(dailyRevenue.prefix(isPartial ? daysInBlock : 7)),
                    totalOrders: totalOrders,
                    totalRevenue: totalRevenue,
                    totalShipping: totalShipping,
                    totalFees: totalFees,
                    isPartial: isPartial,
                    cardsCount: totalCards
                )
                weeks.append(week)
            }

            guard let nextStart = calendar.date(byAdding: .day, value: 7, to: blockStart) else { break }
            blockStart = nextStart
        }

        return weeks
    }

    static func findConflicts(newWeeks: [WeekData], existingWeeks: [WeekData]) -> [WeekData] {
        let calendar = Calendar.current
        return newWeeks.filter { newWeek in
            existingWeeks.contains { existing in
                existing.game == newWeek.game &&
                calendar.isDate(existing.weekStart, inSameDayAs: newWeek.weekStart) &&
                calendar.isDate(existing.weekEnd, inSameDayAs: newWeek.weekEnd)
            }
        }
    }
}
